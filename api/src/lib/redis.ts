import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on('error', (err) => logger.error(err, 'Redis error'));
redis.on('connect', () => logger.info('Redis connected'));
