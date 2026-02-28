# ─── Build stage ─────────────────────────────────────────────────────────────
FROM rust:1.79-slim AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Cargo.toml ./
COPY src ./src

RUN cargo build --release 2>&1

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/sol-indexer /app/sol-indexer

ENV RUST_LOG=info

EXPOSE 9090

ENTRYPOINT ["/app/sol-indexer"]
