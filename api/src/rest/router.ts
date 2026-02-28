import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export const restRouter: ReturnType<typeof Router> = Router();

// ─── Transactions ────────────────────────────────────────────────────────────

restRouter.get('/transactions/:signature', async (req, res) => {
  const { signature } = req.params;
  try {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT t.*, COALESCE(json_agg(i.*) FILTER (WHERE i.id IS NOT NULL), '[]') AS instructions
      FROM transactions t
      LEFT JOIN instructions i ON i.signature = t.signature
      WHERE t.signature = ${signature}
      GROUP BY t.signature
      LIMIT 1
    `;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

restRouter.get('/transactions', async (req, res) => {
  const schema = z.object({
    account: z.string().optional(),
    program: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    before: z.string().optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { account, limit } = parsed.data;
  try {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT signature, slot, block_time, success, fee, compute_units
      FROM transactions
      WHERE TRUE
        ${account ? prisma.$queryRaw`AND ${account} = ANY(accounts)` : prisma.$queryRaw``}
      ORDER BY slot DESC
      LIMIT ${limit}
    `;
    return res.json({ data: rows });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Accounts ────────────────────────────────────────────────────────────────

restRouter.get('/accounts/:pubkey', async (req, res) => {
  const { pubkey } = req.params;
  try {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT pubkey, slot, owner, lamports, executable, rent_epoch
      FROM account_states
      WHERE pubkey = ${pubkey}
      ORDER BY slot DESC
      LIMIT 1
    `;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Tokens ──────────────────────────────────────────────────────────────────

restRouter.get('/tokens/:mint/transfers', async (req, res) => {
  const { mint } = req.params;
  const limit = Math.min(Number(req.query['limit'] ?? 20), 100);
  try {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT id, signature, block_time, source, destination, amount, decimals
      FROM token_transfers
      WHERE mint = ${mint}
      ORDER BY block_time DESC
      LIMIT ${limit}
    `;
    return res.json({ data: rows });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

restRouter.get('/tokens/:mint/holders', async (req, res) => {
  const { mint } = req.params;
  try {
    // Aggregate net transfers per destination to approximate current holders
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT destination AS holder,
             SUM(amount) AS total_received,
             COUNT(*)    AS transfer_count
      FROM token_transfers
      WHERE mint = ${mint}
      GROUP BY destination
      ORDER BY total_received DESC
      LIMIT 100
    `;
    return res.json({ data: rows });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Webhooks ────────────────────────────────────────────────────────────────

const webhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  event: z.string(),
  filters: z.record(z.unknown()).optional(),
  secret: z.string().optional(),
});

restRouter.get('/webhooks', async (req, res) => {
  const userId = (req as unknown as { user: { id: string } }).user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const webhooks = await prisma.webhook.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return res.json({ data: webhooks });
});

restRouter.post('/webhooks', async (req, res) => {
  const userId = (req as unknown as { user: { id: string } }).user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const webhook = await prisma.webhook.create({
    data: {
      userId,
      ...parsed.data,
      filters: (parsed.data.filters ?? {}) as object,
    },
  });
  return res.status(201).json(webhook);
});

restRouter.put('/webhooks/:id', async (req, res) => {
  const userId = (req as unknown as { user: { id: string } }).user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = webhookSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const webhook = await prisma.webhook.update({
      where: { id: req.params['id'], userId },
      data: {
        ...parsed.data,
        filters: parsed.data.filters as object | undefined,
      },
    });
    return res.json(webhook);
  } catch {
    return res.status(404).json({ error: 'Not found' });
  }
});

restRouter.delete('/webhooks/:id', async (req, res) => {
  const userId = (req as unknown as { user: { id: string } }).user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await prisma.webhook.delete({ where: { id: req.params['id'], userId } });
    return res.status(204).send();
  } catch {
    return res.status(404).json({ error: 'Not found' });
  }
});
