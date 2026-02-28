/**
 * Webhook delivery service using BullMQ.
 * Triggered by the indexer via Redis pub/sub → enqueue → worker HTTP delivery.
 */

import { Queue, Worker, Job } from 'bullmq';
import axios from 'axios';
import { createHmac } from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

interface WebhookJob {
  webhookId: string;
  url: string;
  secret?: string | null;
  event: string;
  data: unknown;
  attempt: number;
}

const QUEUE_NAME = 'webhooks';
const MAX_ATTEMPTS = 5;

// BullMQ uses its own ioredis bundled version — pass raw connection options
const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const parsedUrl = new URL(redisUrl);
const redisConnection = {
  host: parsedUrl.hostname,
  port: parseInt(parsedUrl.port || '6379', 10),
  password: parsedUrl.password || undefined,
};

const webhookQueue = new Queue<WebhookJob>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

/**
 * Enqueue webhook deliveries for all active webhooks matching event + filters.
 */
export async function triggerWebhooks(event: string, data: unknown): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: { event, active: true },
  });

  for (const wh of webhooks) {
    const filters = wh.filters as Record<string, string>;
    const payload = data as Record<string, string>;

    // Simple filter matching — all filter keys must match the payload
    const matches = Object.entries(filters).every(([k, v]) => payload[k] === v);
    if (!matches) continue;

    await webhookQueue.add('deliver', {
      webhookId: wh.id,
      url: wh.url,
      secret: wh.secret,
      event,
      data,
      attempt: 1,
    }, {
      attempts: MAX_ATTEMPTS,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}

/**
 * Start the BullMQ worker that performs HTTP deliveries.
 */
export function startWebhookWorker(): Worker {
  const worker = new Worker<WebhookJob>(
    QUEUE_NAME,
    async (job: Job<WebhookJob>) => {
      const { webhookId, url, secret, event, data, attempt } = job.data;

      const body = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
      const signature = secret
        ? createHmac('sha256', secret).update(body).digest('hex')
        : undefined;

      try {
        await axios.post(url, body, {
          headers: {
            'Content-Type': 'application/json',
            'X-SolIndexer-Event': event,
            ...(signature ? { 'X-SolIndexer-Signature': signature } : {}),
          },
          timeout: 10_000,
        });

        await prisma.webhookDelivery.create({
          data: { webhookId, status: 'delivered', payload: data as object, attempt },
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.warn({ webhookId, attempt, error }, 'Webhook delivery failed');

        await prisma.webhookDelivery.create({
          data: { webhookId, status: 'failed', payload: data as object, error, attempt },
        });

        // BullMQ will retry based on job options; throw to signal failure
        throw err;
      }
    },
    { connection: redisConnection, concurrency: 10 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Webhook job permanently failed');
  });

  return worker;
}
