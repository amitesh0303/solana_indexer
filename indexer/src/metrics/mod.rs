//! Prometheus-style metrics using the `metrics` + `metrics-exporter-prometheus` crates.
//! Serves a `/metrics` and `/healthz` endpoint on a configurable port.

use anyhow::Result;
use axum::{routing::get, Router};
use metrics::{counter, gauge, histogram, Counter, Gauge, Histogram};
use metrics_exporter_prometheus::PrometheusBuilder;
use std::net::SocketAddr;
use tracing::info;

pub struct Metrics {
    pub updates_received: Counter,
    pub transactions_processed: Counter,
    pub accounts_processed: Counter,
    pub blocks_processed: Counter,
    pub stream_errors: Counter,
    pub db_errors: Counter,
    pub db_write_latency_ms: Histogram,
    pub indexer_lag_slots: Gauge,
}

impl Metrics {
    pub fn new() -> Self {
        let recorder = PrometheusBuilder::new().build_recorder();
        metrics::set_global_recorder(recorder).ok();

        Self {
            updates_received: counter!("solindexer_updates_received_total"),
            transactions_processed: counter!("solindexer_transactions_processed_total"),
            accounts_processed: counter!("solindexer_accounts_processed_total"),
            blocks_processed: counter!("solindexer_blocks_processed_total"),
            stream_errors: counter!("solindexer_stream_errors_total"),
            db_errors: counter!("solindexer_db_errors_total"),
            db_write_latency_ms: histogram!("solindexer_db_write_latency_ms"),
            indexer_lag_slots: gauge!("solindexer_indexer_lag_slots"),
        }
    }

    /// Start the HTTP server that exposes /metrics and /healthz.
    pub async fn start_server(&self, port: u16) -> Result<()> {
        let addr: SocketAddr = format!("0.0.0.0:{port}").parse()?;
        let app = Router::new()
            .route("/metrics", get(prometheus_handler))
            .route("/healthz", get(|| async { "ok" }));

        info!("Metrics server listening on http://{addr}");
        tokio::spawn(async move {
            let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
            axum::serve(listener, app).await.unwrap();
        });
        Ok(())
    }
}

async fn prometheus_handler() -> String {
    // metrics-exporter-prometheus renders via its own global recorder
    // In production wire this to the PrometheusHandle::render() call
    "# Prometheus metrics\n".to_string()
}
