import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = global as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(redisUrl, { maxRetriesPerRequest: 3 });

// Create a dedicated publisher and subscriber for real-time events
export const redisPublisher = redis.duplicate();
export const redisSubscriber = redis.duplicate();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;