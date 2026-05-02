import Redis from 'ioredis';
import logger from './logger';

// REDIS_URL should include password: redis://:password@host:port
// Set REDIS_PASSWORD in .env and docker-compose passes it via REDIS_URL
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));

export default redis;
