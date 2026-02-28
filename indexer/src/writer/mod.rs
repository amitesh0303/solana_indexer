//! DB writer — batches `ParsedEvent`s and persists them to PostgreSQL/TimescaleDB.
//! Also publishes real-time update summaries to Redis pub/sub.

use crate::metrics::Metrics;
use crate::parser::{ParsedEvent, TokenTransferEvent, TransactionEvent};
use crate::receiver::{AccountUpdate, BlockUpdate};
use redis::aio::ConnectionManager;
use sqlx::PgPool;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::mpsc::Receiver;
use tracing::{debug, error, info};

pub struct Writer {
    pool: PgPool,
    redis: ConnectionManager,
    batch_size: usize,
    metrics: Arc<Metrics>,
}

impl Writer {
    pub fn new(
        pool: PgPool,
        redis: ConnectionManager,
        batch_size: usize,
        metrics: Arc<Metrics>,
    ) -> Self {
        Self {
            pool,
            redis,
            batch_size,
            metrics,
        }
    }

    /// Drain the channel, accumulating events into batches, then flush.
    pub async fn run(mut self, mut rx: Receiver<ParsedEvent>) {
        let mut batch: Vec<ParsedEvent> = Vec::with_capacity(self.batch_size);

        loop {
            // Collect up to batch_size events, with a 100ms max wait.
            let deadline = tokio::time::Instant::now()
                + std::time::Duration::from_millis(100);

            loop {
                match tokio::time::timeout_at(deadline, rx.recv()).await {
                    Ok(Some(event)) => {
                        batch.push(event);
                        if batch.len() >= self.batch_size {
                            break;
                        }
                    }
                    Ok(None) => {
                        // Channel closed
                        if !batch.is_empty() {
                            self.flush_batch(&batch).await;
                        }
                        info!("Writer channel closed; exiting");
                        return;
                    }
                    Err(_) => break, // timeout — flush what we have
                }
            }

            if !batch.is_empty() {
                self.flush_batch(&batch).await;
                batch.clear();
            }
        }
    }

    async fn flush_batch(&mut self, batch: &[ParsedEvent]) {
        let start = Instant::now();
        let mut txs = Vec::new();
        let mut transfers = Vec::new();
        let mut accounts = Vec::new();
        let mut blocks = Vec::new();

        for event in batch {
            match event {
                ParsedEvent::Transaction(e) => txs.push(e.clone()),
                ParsedEvent::TokenTransfer(e) => transfers.push(e.clone()),
                ParsedEvent::AccountUpdate(e) => accounts.push(e.clone()),
                ParsedEvent::Block(e) => blocks.push(e.clone()),
                _ => {} // Swaps, NFTs — would have their own tables
            }
        }

        let mut ok = true;
        if !txs.is_empty() {
            ok &= self.write_transactions(&txs).await;
        }
        if !transfers.is_empty() {
            ok &= self.write_token_transfers(&transfers).await;
        }
        if !accounts.is_empty() {
            ok &= self.write_account_states(&accounts).await;
        }
        if !blocks.is_empty() {
            ok &= self.write_blocks(&blocks).await;
        }

        let elapsed = start.elapsed();
        self.metrics
            .db_write_latency_ms
            .record(elapsed.as_secs_f64() * 1000.0);
        if ok {
            debug!("Flushed {} events in {:.1}ms", batch.len(), elapsed.as_secs_f64() * 1000.0);
        }
    }

    async fn write_transactions(&mut self, txs: &[TransactionEvent]) -> bool {
        for tx in txs {
            let result = sqlx::query(
                r#"
                INSERT INTO transactions (signature, slot, block_time, success, fee, compute_units, accounts, log_messages)
                VALUES ($1, $2, to_timestamp($3), $4, $5, $6, $7, $8)
                ON CONFLICT (signature) DO NOTHING
                "#,
            )
            .bind(&tx.signature)
            .bind(tx.slot as i64)
            .bind(tx.block_time as f64)
            .bind(tx.success)
            .bind(tx.fee as i64)
            .bind(tx.compute_units as i64)
            .bind(&tx.accounts)
            .bind(&tx.log_messages)
            .execute(&self.pool)
            .await;

            if let Err(e) = result {
                error!("Failed to write transaction {}: {e}", tx.signature);
                self.metrics.db_errors.increment(1);
                return false;
            }

            // Publish to Redis
            let channel = format!("tx:account:{}", tx.accounts.first().cloned().unwrap_or_default());
            let payload = serde_json::to_string(tx).unwrap_or_default();
            let _ = redis::cmd("PUBLISH")
                .arg(&channel)
                .arg(&payload)
                .query_async::<()>(&mut self.redis)
                .await;
        }
        true
    }

    async fn write_token_transfers(&mut self, transfers: &[TokenTransferEvent]) -> bool {
        for t in transfers {
            let result = sqlx::query(
                r#"
                INSERT INTO token_transfers (signature, block_time, mint, source, destination, amount, decimals)
                VALUES ($1, to_timestamp($2), $3, $4, $5, $6, $7)
                ON CONFLICT DO NOTHING
                "#,
            )
            .bind(&t.signature)
            .bind(t.block_time as f64)
            .bind(&t.mint)
            .bind(&t.source)
            .bind(&t.destination)
            .bind(t.amount as i64)
            .bind(t.decimals as i16)
            .execute(&self.pool)
            .await;

            if let Err(e) = result {
                error!("Failed to write token transfer: {e}");
                self.metrics.db_errors.increment(1);
                return false;
            }

            let channel = format!("token_transfer:{}", t.mint);
            let payload = serde_json::to_string(t).unwrap_or_default();
            let _ = redis::cmd("PUBLISH")
                .arg(&channel)
                .arg(&payload)
                .query_async::<()>(&mut self.redis)
                .await;
        }
        true
    }

    async fn write_account_states(&mut self, accounts: &[AccountUpdate]) -> bool {
        for a in accounts {
            let result = sqlx::query(
                r#"
                INSERT INTO account_states (pubkey, slot, owner, lamports, executable, rent_epoch, data)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (pubkey, slot) DO UPDATE
                SET owner = EXCLUDED.owner, lamports = EXCLUDED.lamports,
                    executable = EXCLUDED.executable, rent_epoch = EXCLUDED.rent_epoch,
                    data = EXCLUDED.data
                "#,
            )
            .bind(&a.pubkey)
            .bind(a.slot as i64)
            .bind(&a.owner)
            .bind(a.lamports as i64)
            .bind(a.executable)
            .bind(a.rent_epoch as i64)
            .bind(&a.data)
            .execute(&self.pool)
            .await;

            if let Err(e) = result {
                error!("Failed to write account state {}: {e}", a.pubkey);
                self.metrics.db_errors.increment(1);
                return false;
            }

            let channel = format!("account:{}", a.pubkey);
            let payload = serde_json::to_string(a).unwrap_or_default();
            let _ = redis::cmd("PUBLISH")
                .arg(&channel)
                .arg(&payload)
                .query_async::<()>(&mut self.redis)
                .await;
        }
        true
    }

    async fn write_blocks(&mut self, blocks: &[BlockUpdate]) -> bool {
        for b in blocks {
            let result = sqlx::query(
                r#"
                INSERT INTO blocks (slot, parent_slot, block_time, block_height, leader, indexed_at)
                VALUES ($1, $2, to_timestamp($3), $4, $5, NOW())
                ON CONFLICT (slot) DO NOTHING
                "#,
            )
            .bind(b.slot as i64)
            .bind(b.parent_slot as i64)
            .bind(b.block_time as f64)
            .bind(b.block_height as i64)
            .bind(&b.leader)
            .execute(&self.pool)
            .await;

            if let Err(e) = result {
                error!("Failed to write block {}: {e}", b.slot);
                self.metrics.db_errors.increment(1);
                return false;
            }
        }
        true
    }
}
