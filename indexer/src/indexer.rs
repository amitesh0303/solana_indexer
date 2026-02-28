//! Core indexer struct and main run loop.

use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{error, info, warn};

use crate::config::Config;
use crate::metrics::Metrics;
use crate::parser::{ParsedEvent, ParserEngine};
use crate::receiver::{Update, YellowstoneReceiver};
use crate::writer::Writer;

/// Main indexer — wires receiver → parser engine → writer.
pub struct Indexer {
    cfg: Config,
    parser_engine: Arc<ParserEngine>,
    metrics: Arc<Metrics>,
}

impl Indexer {
    pub async fn new(cfg: Config) -> Result<Self> {
        let metrics = Arc::new(Metrics::new());
        metrics.start_server(cfg.metrics_port).await?;

        let mut parser_engine = ParserEngine::new();
        // Register built-in parsers
        parser_engine.register(Box::new(crate::parser::spl_token::SplTokenParser::new()));
        parser_engine.register(Box::new(crate::parser::nft::NftParser::new()));
        parser_engine.register(Box::new(crate::parser::jupiter::JupiterParser::new()));
        parser_engine.register(Box::new(crate::parser::raydium::RaydiumParser::new()));

        Ok(Self {
            cfg,
            parser_engine: Arc::new(parser_engine),
            metrics,
        })
    }

    /// Main event loop: connect → receive → parse → write.
    pub async fn run(&mut self) -> Result<()> {
        let db_pool = PgPoolOptions::new()
            .max_connections(self.cfg.db_pool_size)
            .connect(&self.cfg.database_url)
            .await?;
        info!("Database pool ready (max_connections={})", self.cfg.db_pool_size);

        let redis_client = redis::Client::open(self.cfg.redis_url.as_str())?;
        let redis_conn = redis::aio::ConnectionManager::new(redis_client).await?;
        info!("Redis connection ready");

        // Internal channel: receiver → writer, with backpressure
        let (tx, rx) = mpsc::channel::<ParsedEvent>(8_192);

        let writer = Writer::new(
            db_pool.clone(),
            redis_conn,
            self.cfg.write_batch_size,
            Arc::clone(&self.metrics),
        );

        // Spawn writer task
        let _write_task = tokio::spawn(writer.run(rx));

        // Connect to Yellowstone gRPC
        let mut receiver = YellowstoneReceiver::new(
            self.cfg.grpc_endpoint.clone(),
            self.cfg.grpc_token.clone(),
        );

        let mut stream = receiver.subscribe().await?;
        info!("Subscribed to Yellowstone gRPC stream");

        loop {
            match stream.recv().await {
                Some(Ok(update)) => {
                    self.metrics.updates_received.increment(1);
                    let events = self.process_update(update);
                    for event in events {
                        if tx.send(event).await.is_err() {
                            error!("Writer channel closed — shutting down");
                            return Ok(());
                        }
                    }
                }
                Some(Err(e)) => {
                    warn!("gRPC stream error: {e}; reconnecting in 5s");
                    self.metrics.stream_errors.increment(1);
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                    stream = receiver.subscribe().await?;
                }
                None => {
                    warn!("gRPC stream ended; reconnecting");
                    stream = receiver.subscribe().await?;
                }
            }
        }
    }

    fn process_update(&self, update: Update) -> Vec<ParsedEvent> {
        match update {
            Update::Transaction(tx_update) => {
                let mut events = self.parser_engine.parse(&tx_update);
                // Wrap raw transaction metadata as an event too
                events.insert(
                    0,
                    ParsedEvent::Transaction(crate::parser::TransactionEvent {
                        signature: tx_update.signature.clone(),
                        slot: tx_update.slot,
                        block_time: tx_update.block_time,
                        success: tx_update.success,
                        fee: tx_update.fee,
                        compute_units: tx_update.compute_units,
                        accounts: tx_update.accounts.clone(),
                        log_messages: tx_update.log_messages.clone(),
                    }),
                );
                self.metrics.transactions_processed.increment(1);
                events
            }
            Update::Account(acct) => {
                self.metrics.accounts_processed.increment(1);
                vec![ParsedEvent::AccountUpdate(acct)]
            }
            Update::Block(block) => {
                self.metrics.blocks_processed.increment(1);
                self.metrics
                    .indexer_lag_slots
                    .set(block.tip_slot.saturating_sub(block.slot) as f64);
                vec![ParsedEvent::Block(block)]
            }
        }
    }
}
