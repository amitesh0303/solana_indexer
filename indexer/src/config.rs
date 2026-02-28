//! Configuration loaded from environment variables / .env file.

use anyhow::{Context, Result};
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    /// Yellowstone gRPC endpoint, e.g. "https://grpc.validator.example.com"
    pub grpc_endpoint: String,
    /// Optional bearer token for the gRPC connection
    pub grpc_token: Option<String>,
    /// PostgreSQL connection URL (TimescaleDB compatible)
    pub database_url: String,
    /// Redis connection URL
    pub redis_url: String,
    /// Maximum DB pool size
    pub db_pool_size: u32,
    /// Number of events to batch before writing to DB
    pub write_batch_size: usize,
    /// Port to serve Prometheus metrics / health endpoints
    pub metrics_port: u16,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            grpc_endpoint: env_var("GRPC_ENDPOINT")?,
            grpc_token: env::var("GRPC_TOKEN").ok(),
            database_url: env_var("DATABASE_URL")?,
            redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into()),
            db_pool_size: env::var("DB_POOL_SIZE")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10),
            write_batch_size: env::var("WRITE_BATCH_SIZE")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(100),
            metrics_port: env::var("METRICS_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(9090),
        })
    }
}

fn env_var(name: &str) -> Result<String> {
    env::var(name).with_context(|| format!("Missing required env var: {name}"))
}
