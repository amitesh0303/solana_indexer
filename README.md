# SolIndexer

A high-performance Solana indexing platform with sub-second latency, a GraphQL API, and a developer dashboard.

## Architecture

```
Solana Validator (Geyser gRPC)
        │
        ▼
┌─────────────────────────────────────────┐
│          Rust Indexer (indexer/)         │
│  Receiver → Parser Engine → Writer      │
│  Prometheus metrics on :9090/metrics    │
└───────────────┬─────────────────────────┘
                │ PostgreSQL / TimescaleDB
                │ Redis pub/sub
                ▼
┌─────────────────────────────────────────┐
│         Node.js API (api/)               │
│  Apollo GraphQL  │  REST  │  WebSocket  │
│  Auth + Rate Limiting (API keys)        │
│  BullMQ webhook delivery worker        │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│       Next.js Dashboard (dashboard/)    │
│  Overview · Query Explorer             │
│  API Keys · Webhooks                   │
└─────────────────────────────────────────┘
```

## Quick Start (local dev)

### Prerequisites

- Docker + Docker Compose
- Rust 1.79+
- Node.js 20 LTS
- A Yellowstone gRPC endpoint (e.g. Helius, Triton)

### 1. Clone and configure

```bash
git clone https://github.com/amitesh0303/solana_indexer
cd solana_indexer

# Create environment files
cat > .env << 'ENVEOF'
GRPC_ENDPOINT=https://your-geyser-endpoint.com
GRPC_TOKEN=your_token_here
DATABASE_URL=postgres://solindexer:solindexer@localhost:5432/solindexer
REDIS_URL=redis://localhost:6379
ENVEOF
```

### 2. Start infrastructure

```bash
# Start PostgreSQL (TimescaleDB) + Redis
docker compose up -d postgres redis

# Wait for healthy status
docker compose ps
```

### 3. Run the API

```bash
cd api
npm install
npx prisma generate
npx prisma migrate dev  # applies schema to local DB

# Start the API server
npm run dev
# → GraphQL playground at http://localhost:4000/graphql
```

### 4. Run the dashboard

```bash
cd dashboard
npm install
npm run dev
# → Dashboard at http://localhost:3000
```

### 5. Run the indexer

```bash
cd indexer
GRPC_ENDPOINT=https://... DATABASE_URL=postgres://... REDIS_URL=redis://... \
  cargo run --release
```

### Run everything with Docker Compose

```bash
# Build and start all services
docker compose up --build

# Include monitoring (Prometheus + Grafana)
docker compose --profile monitoring up --build
```

Access points:
| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| GraphQL API | http://localhost:4000/graphql |
| REST API | http://localhost:4000/v1/ |
| Metrics (indexer) | http://localhost:9090/metrics |
| Grafana | http://localhost:3001 (admin/admin) |

---

## Project Structure

```
solana_indexer/
├── indexer/                # Rust Geyser indexer
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── config.rs       # Env-based config
│   │   ├── indexer.rs      # Main run loop
│   │   ├── receiver/       # Yellowstone gRPC client
│   │   ├── parser/         # Pluggable parser engine
│   │   │   ├── spl_token.rs
│   │   │   ├── nft.rs
│   │   │   ├── jupiter.rs
│   │   │   └── raydium.rs
│   │   ├── writer/         # DB + Redis writer
│   │   └── metrics/        # Prometheus metrics
│   └── Dockerfile
│
├── api/                    # Node.js API layer
│   ├── src/
│   │   ├── index.ts        # Express + Apollo + WS server
│   │   ├── graphql/        # Schema + resolvers
│   │   ├── rest/           # REST router
│   │   ├── middleware/     # Auth + rate limiting + metrics
│   │   ├── services/       # Webhook BullMQ service
│   │   └── lib/            # Prisma, Redis, Logger
│   ├── prisma/schema.prisma
│   └── Dockerfile
│
├── dashboard/              # Next.js 14 developer dashboard
│   ├── app/
│   │   ├── page.tsx        # Public landing page
│   │   ├── dashboard/      # Overview (usage charts)
│   │   ├── explorer/       # GraphQL query editor
│   │   ├── keys/           # API key management
│   │   └── webhooks/       # Webhook management
│   └── Dockerfile
│
├── db/
│   └── migrations/
│       └── 001_init.sql    # Schema + TimescaleDB hypertables
│
├── infra/
│   └── prometheus.yml      # Prometheus scrape config
│
└── docker-compose.yml      # Local dev orchestration
```

---

## GraphQL API Examples

### Query recent token transfers

```graphql
query RecentTransfers {
  tokenTransfers(
    account: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    first: 10
  ) {
    edges {
      node {
        signature
        blockTime
        amount
        decimals
        source
        destination
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

### Subscribe to real-time transactions

```graphql
subscription OnNewTx {
  transactionAdded(
    account: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
  ) {
    signature
    slot
    blockTime
    success
    fee
  }
}
```

### Authentication

All API requests require an `x-api-key` header:

```bash
curl -X POST https://api.solindexer.io/graphql \
  -H "Content-Type: application/json" \
  -H "x-api-key: si_prod_YOUR_KEY" \
  -d '{"query": "{ transaction(signature: \"...\") { signature slot success } }"}'
```

---

## Webhook Payload Example

```json
{
  "event": "token_transfer",
  "timestamp": "2024-11-01T14:22:01Z",
  "data": {
    "signature": "5KtPn1Pg...",
    "blockTime": "2024-11-01T14:22:01Z",
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "source": "9WzDXwBb...",
    "destination": "HN7cABqL...",
    "amount": "1000000",
    "decimals": 6
  }
}
```

Payloads are signed with HMAC-SHA256 if you configure a webhook secret:

```
X-SolIndexer-Signature: sha256=abc123...
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Indexer | Rust 1.79, Tokio, sqlx, redis-rs |
| Geyser integration | Yellowstone gRPC (Tonic/Prost) |
| API | Node.js 20, Apollo Server 4, Express 4, Prisma 5 |
| Auth | SHA-256 API key hashing, rate-limiter-flexible |
| Queue | BullMQ (Redis-backed) |
| DB | PostgreSQL 16 + TimescaleDB 2.14 |
| Cache | Redis 7 |
| Dashboard | Next.js 14, Tailwind CSS 3.4, Recharts 2, Monaco Editor |
| State | Zustand 4.5 |
| Monitoring | Prometheus, Grafana, Jaeger |
| Deployment | Docker, Kubernetes, Helm, Vercel |
