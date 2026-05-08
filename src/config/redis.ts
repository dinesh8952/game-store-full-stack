import Redis from 'ioredis';
import logger from './logger';

const redis = process.env.REDIS_HOST || process.env.REDIS_PASSWORD
  ? new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    })
  : new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));

export default redis;
