/**
 * Auth middleware — validates API keys, applies rate limiting.
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rate',
  points: 1000,       // default; overridden per key below
  duration: 60,       // per 60 seconds
  blockDuration: 0,   // don't hard-block, just return 429
});

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawKey = req.headers['x-api-key'] as string | undefined;

  if (!rawKey) {
    res.status(401).json({ error: 'Missing x-api-key header' });
    return;
  }

  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await prisma.apiKey
    .findUnique({
      where: { keyHash },
      include: { user: true },
    })
    .catch((err) => {
      logger.error(err, 'DB error looking up API key');
      return null;
    });

  if (!apiKey || apiKey.revoked) {
    res.status(401).json({ error: 'Invalid or revoked API key' });
    return;
  }

  // Per-key rate limit
  try {
    await rateLimiter.consume(`${apiKey.id}`, 1, { customDuration: 60 });
  } catch (rlRes: unknown) {
    const retryAfter =
      typeof rlRes === 'object' && rlRes !== null && 'msBeforeNext' in rlRes
        ? Math.ceil((rlRes as { msBeforeNext: number }).msBeforeNext / 1000)
        : 60;
    res.status(429).json({ error: 'Rate limit exceeded', retryAfter });
    return;
  }

  // Record last usage asynchronously (don't block the request)
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  // Increment daily usage counter
  const today = new Date().toISOString().slice(0, 10);
  prisma.usageMetric
    .upsert({
      where: { apiKeyId_period: { apiKeyId: apiKey.id, period: new Date(today) } },
      create: { apiKeyId: apiKey.id, period: new Date(today), requests: 1 },
      update: { requests: { increment: 1 } },
    })
    .catch(() => {});

  // Attach to request context
  (req as Request & { user: unknown; apiKey: unknown }).user = apiKey.user;
  (req as Request & { user: unknown; apiKey: unknown }).apiKey = apiKey;

  next();
}
