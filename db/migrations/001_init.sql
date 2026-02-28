-- SolIndexer database schema
-- PostgreSQL 16 + TimescaleDB 2.14

-- Extensions
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ============================================================
-- Core indexer tables
-- ============================================================

CREATE TABLE IF NOT EXISTS blocks (
    slot          BIGINT PRIMARY KEY,
    parent_slot   BIGINT NOT NULL,
    block_time    TIMESTAMPTZ,
    block_height  BIGINT,
    leader        TEXT,
    rewards       JSONB,
    indexed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocks_block_time ON blocks (block_time DESC);

CREATE TABLE IF NOT EXISTS transactions (
    signature     TEXT PRIMARY KEY,
    slot          BIGINT NOT NULL REFERENCES blocks(slot) ON DELETE CASCADE,
    block_time    TIMESTAMPTZ,
    success       BOOLEAN NOT NULL,
    fee           BIGINT NOT NULL DEFAULT 0,
    compute_units BIGINT NOT NULL DEFAULT 0,
    accounts      TEXT[]  NOT NULL DEFAULT '{}',
    log_messages  TEXT[]  NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_txs_slot        ON transactions (slot);
CREATE INDEX IF NOT EXISTS idx_txs_block_time  ON transactions (block_time DESC);
CREATE INDEX IF NOT EXISTS idx_txs_accounts    ON transactions USING GIN (accounts);

CREATE TABLE IF NOT EXISTS instructions (
    id                BIGSERIAL,
    signature         TEXT NOT NULL REFERENCES transactions(signature) ON DELETE CASCADE,
    program_id        TEXT NOT NULL,
    instruction_index INT  NOT NULL,
    inner_index       INT,
    data              BYTEA,
    accounts          TEXT[] NOT NULL DEFAULT '{}',
    parsed            JSONB,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_instr_program_id ON instructions (program_id);
CREATE INDEX IF NOT EXISTS idx_instr_signature  ON instructions (signature);

-- TimescaleDB hypertable for high-volume token transfers
CREATE TABLE IF NOT EXISTS token_transfers (
    id          BIGSERIAL,
    signature   TEXT NOT NULL,
    block_time  TIMESTAMPTZ NOT NULL,
    mint        TEXT NOT NULL,
    source      TEXT NOT NULL,
    destination TEXT NOT NULL,
    amount      BIGINT NOT NULL,
    decimals    SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id, block_time)
);

SELECT create_hypertable('token_transfers', 'block_time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_tt_mint        ON token_transfers (mint, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_tt_source      ON token_transfers (source, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_tt_destination ON token_transfers (destination, block_time DESC);

CREATE TABLE IF NOT EXISTS account_states (
    pubkey      TEXT    NOT NULL,
    slot        BIGINT  NOT NULL,
    owner       TEXT    NOT NULL,
    lamports    BIGINT  NOT NULL,
    data        BYTEA,
    executable  BOOLEAN NOT NULL DEFAULT FALSE,
    rent_epoch  BIGINT  NOT NULL DEFAULT 0,
    PRIMARY KEY (pubkey, slot)
);

CREATE INDEX IF NOT EXISTS idx_as_pubkey ON account_states (pubkey, slot DESC);

-- ============================================================
-- Auth / API tables
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE,
    name          TEXT,
    avatar_url    TEXT,
    provider      TEXT NOT NULL DEFAULT 'email',
    provider_id   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    key_hash     TEXT NOT NULL UNIQUE,
    key_prefix   TEXT NOT NULL,
    rate_limit   INT  NOT NULL DEFAULT 1000,
    tier         TEXT NOT NULL DEFAULT 'free',
    revoked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id  ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);

CREATE TABLE IF NOT EXISTS usage_metrics (
    id         BIGSERIAL PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    period     DATE NOT NULL,
    requests   BIGINT NOT NULL DEFAULT 0,
    errors     BIGINT NOT NULL DEFAULT 0,
    UNIQUE (api_key_id, period)
);

CREATE INDEX IF NOT EXISTS idx_usage_key_period ON usage_metrics (api_key_id, period DESC);

CREATE TABLE IF NOT EXISTS webhooks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    url        TEXT NOT NULL,
    event      TEXT NOT NULL,
    filters    JSONB NOT NULL DEFAULT '{}',
    secret     TEXT,
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks (user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event   ON webhooks (event) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    status     TEXT NOT NULL CHECK (status IN ('delivered', 'failed', 'pending')),
    payload    JSONB,
    error      TEXT,
    attempt    INT  NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wd_webhook_id  ON webhook_deliveries (webhook_id, created_at DESC);
