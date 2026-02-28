//! SolIndexer — high-performance Solana indexing service.
//!
//! Streams data from Yellowstone gRPC, parses it through a pluggable parser
//! engine, writes normalised events to PostgreSQL/TimescaleDB, and publishes
//! real-time updates to Redis pub/sub channels.

use anyhow::Result;
use tracing::info;
use tracing_subscriber::EnvFilter;

mod config;
mod indexer;
mod metrics;
mod parser;
mod receiver;
mod writer;

use crate::config::Config;
use crate::indexer::Indexer;

#[tokio::main]
async fn main() -> Result<()> {
    // Structured logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .json()
        .init();

    dotenv::dotenv().ok();

    let cfg = Config::from_env()?;
    info!("Starting SolIndexer v{}", env!("CARGO_PKG_VERSION"));
    info!("Connecting to gRPC endpoint: {}", cfg.grpc_endpoint);

    let mut indexer = Indexer::new(cfg).await?;
    indexer.run().await?;

    Ok(())
}
