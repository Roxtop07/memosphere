import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

// Only create Redis client if not skipping Redis
if (process.env.SKIP_REDIS !== 'true') {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.warn('Redis connection failed after 3 attempts - giving up');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true, // Don't connect automatically
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('error', (err: Error) => {
    // Only log error once, not repeatedly
    if (!redisClient?.status || redisClient.status === 'connecting') {
      logger.error('Redis client error:', err.message);
    }
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });
}

export async function connectRedis() {
  if (!redisClient) {
    logger.info('Redis skipped (SKIP_REDIS=true)');
    return null;
  }
  
  try {
    await redisClient.connect();
    await redisClient.ping();
    logger.info('Redis connection established');
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error instanceof Error ? error.message : error);
    throw error;
  }
}

export { redisClient };
export default redisClient;
