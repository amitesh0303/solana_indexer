import { PubSub } from 'graphql-subscriptions';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const pubsub = new PubSub();

interface Context {
  user?: { id: string };
  apiKey?: { id: string };
  prisma: PrismaClient;
  redis: Redis;
}

const TX_CACHE_TTL = 60; // seconds

export const resolvers = {
  Query: {
    async transaction(
      _: unknown,
      { signature }: { signature: string },
      { prisma, redis }: Context,
    ) {
      // L1: Redis cache
      const cached = await redis.get(`tx:${signature}`).catch(() => null);
      if (cached) return JSON.parse(cached);

      const tx = await prisma.$queryRaw<RawTx[]>`
        SELECT t.signature, t.slot, t.block_time, t.success, t.fee, t.compute_units,
               t.accounts, t.log_messages,
               COALESCE(
                 json_agg(DISTINCT jsonb_build_object(
                   'id', i.id::text,
                   'programId', i.program_id,
                   'instructionIndex', i.instruction_index,
                   'innerIndex', i.inner_index,
                   'accounts', i.accounts,
                   'parsed', i.parsed
                 )) FILTER (WHERE i.id IS NOT NULL), '[]'
               ) AS instructions,
               COALESCE(
                 json_agg(DISTINCT jsonb_build_object(
                   'id', tt.id::text,
                   'signature', tt.signature,
                   'blockTime', tt.block_time,
                   'mint', tt.mint,
                   'source', tt.source,
                   'destination', tt.destination,
                   'amount', tt.amount::text,
                   'decimals', tt.decimals
                 )) FILTER (WHERE tt.id IS NOT NULL), '[]'
               ) AS token_transfers
        FROM transactions t
        LEFT JOIN instructions i ON i.signature = t.signature
        LEFT JOIN token_transfers tt ON tt.signature = t.signature
        WHERE t.signature = ${signature}
        GROUP BY t.signature
        LIMIT 1
      `;

      if (!tx.length) return null;
      const result = mapTx(tx[0]);
      await redis.setex(`tx:${signature}`, TX_CACHE_TTL, JSON.stringify(result));
      return result;
    },

    async transactions(
      _: unknown,
      args: {
        account?: string;
        program?: string;
        before?: string;
        after?: string;
        first?: number;
      },
      { prisma }: Context,
    ) {
      const limit = Math.min(args.first ?? 20, 100);

      const whereAccount = args.account
        ? prisma.$queryRaw`AND ${args.account} = ANY(t.accounts)`
        : prisma.$queryRaw``;

      const rows = await prisma.$queryRaw<RawTx[]>`
        SELECT t.signature, t.slot, t.block_time, t.success, t.fee, t.compute_units,
               t.accounts, t.log_messages,
               '[]'::json AS instructions,
               '[]'::json AS token_transfers
        FROM transactions t
        WHERE TRUE
          ${args.account ? prisma.$queryRaw`AND ${args.account} = ANY(t.accounts)` : prisma.$queryRaw``}
          ${args.after ? prisma.$queryRaw`AND t.slot > ${parseInt(args.after, 10)}` : prisma.$queryRaw``}
          ${args.before ? prisma.$queryRaw`AND t.slot < ${parseInt(args.before, 10)}` : prisma.$queryRaw``}
        ORDER BY t.slot DESC, t.signature DESC
        LIMIT ${limit + 1}
      `;

      const hasNextPage = rows.length > limit;
      const edges = rows.slice(0, limit).map((row) => ({
        cursor: String(row.slot),
        node: mapTx(row),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!args.after,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
      };
    },

    async tokenTransfers(
      _: unknown,
      args: { account: string; mint?: string; first?: number; after?: string },
      { prisma }: Context,
    ) {
      const limit = Math.min(args.first ?? 20, 100);

      const rows = await prisma.$queryRaw<RawTransfer[]>`
        SELECT id::text, signature, block_time, mint, source, destination,
               amount::text, decimals
        FROM token_transfers
        WHERE (source = ${args.account} OR destination = ${args.account})
          ${args.mint ? prisma.$queryRaw`AND mint = ${args.mint}` : prisma.$queryRaw``}
        ORDER BY block_time DESC
        LIMIT ${limit + 1}
      `;

      const hasNextPage = rows.length > limit;
      const edges = rows.slice(0, limit).map((row) => ({
        cursor: row.id,
        node: mapTransfer(row),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!args.after,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
      };
    },

    async account(
      _: unknown,
      { pubkey }: { pubkey: string },
      { prisma }: Context,
    ) {
      const rows = await prisma.$queryRaw<RawAccount[]>`
        SELECT pubkey, slot, owner, lamports::text, executable, rent_epoch
        FROM account_states
        WHERE pubkey = ${pubkey}
        ORDER BY slot DESC
        LIMIT 1
      `;
      return rows[0] ? mapAccount(rows[0]) : null;
    },

    async accountHistory(
      _: unknown,
      {
        pubkey,
        startSlot,
        endSlot,
      }: { pubkey: string; startSlot?: number; endSlot?: number },
      { prisma }: Context,
    ) {
      const rows = await prisma.$queryRaw<RawAccount[]>`
        SELECT pubkey, slot, owner, lamports::text, executable, rent_epoch
        FROM account_states
        WHERE pubkey = ${pubkey}
          ${startSlot != null ? prisma.$queryRaw`AND slot >= ${startSlot}` : prisma.$queryRaw``}
          ${endSlot != null ? prisma.$queryRaw`AND slot <= ${endSlot}` : prisma.$queryRaw``}
        ORDER BY slot DESC
        LIMIT 500
      `;
      return rows.map(mapAccount);
    },
  },

  Subscription: {
    transactionAdded: {
      subscribe: (_: unknown, args: { account?: string; program?: string }) => {
        const channel = args.account
          ? `tx:account:${args.account}`
          : 'tx:all';
        return pubsub.asyncIterator(channel);
      },
    },
    tokenTransfer: {
      subscribe: (_: unknown, args: { account?: string; mint?: string }) => {
        const channel = args.mint ? `token_transfer:${args.mint}` : 'token_transfer:all';
        return pubsub.asyncIterator(channel);
      },
    },
    accountChanged: {
      subscribe: (_: unknown, { pubkey }: { pubkey: string }) =>
        pubsub.asyncIterator(`account:${pubkey}`),
    },
  },
};

// ─── Raw DB row types ──────────────────────────────────────────────────────────

interface RawTx {
  signature: string;
  slot: bigint;
  block_time: Date | null;
  success: boolean;
  fee: bigint;
  compute_units: bigint;
  accounts: string[];
  log_messages: string[];
  instructions: unknown[];
  token_transfers: unknown[];
}

interface RawTransfer {
  id: string;
  signature: string;
  block_time: Date;
  mint: string;
  source: string;
  destination: string;
  amount: string;
  decimals: number;
}

interface RawAccount {
  pubkey: string;
  slot: bigint;
  owner: string;
  lamports: string;
  executable: boolean;
  rent_epoch: bigint;
}

function mapTx(row: RawTx) {
  return {
    signature: row.signature,
    slot: Number(row.slot),
    blockTime: row.block_time,
    success: row.success,
    fee: Number(row.fee),
    computeUnits: Number(row.compute_units),
    accounts: row.accounts,
    logMessages: row.log_messages,
    instructions: row.instructions ?? [],
    tokenTransfers: row.token_transfers ?? [],
  };
}

function mapTransfer(row: RawTransfer) {
  return {
    id: row.id,
    signature: row.signature,
    blockTime: row.block_time,
    mint: row.mint,
    source: row.source,
    destination: row.destination,
    amount: row.amount,
    decimals: row.decimals,
  };
}

function mapAccount(row: RawAccount) {
  return {
    pubkey: row.pubkey,
    slot: Number(row.slot),
    owner: row.owner,
    lamports: row.lamports,
    executable: row.executable,
    rentEpoch: String(row.rent_epoch),
  };
}
