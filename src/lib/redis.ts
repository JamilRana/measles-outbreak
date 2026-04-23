import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis = globalForRedis.redis ?? new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => console.log('Redis connected successfully.'));
redis.on('ready', () => console.log('Redis is ready to receive commands.'));
redis.on('error', (err) => console.error('Redis connection error:', err));

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Helper to wrap cache logic (Read-Through)
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600 // Default 1 hour
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    try {
      console.log(`Cache hit for key: ${key}`);
      return JSON.parse(cached) as T;
    } catch (e) {
      console.error(`Error parsing cache for key: ${key}`, e);
    }
  }

  console.log(`Cache miss for key: ${key}. Fetching fresh data...`);
  const data = await fetchFn();
  
  // Don't await set to avoid blocking, but handle errors
  redis.set(key, JSON.stringify(data), 'EX', ttl).catch(err => {
    console.error(`Failed to set cache for key: ${key}`, err);
  });

  return data;
}

// Helper for invalidation
export async function invalidateCache(key: string | string[]) {
  if (Array.isArray(key)) {
    if (key.length > 0) {
      await redis.del(...key);
    }
  } else {
    await redis.del(key);
  }
}

export async function invalidateByPattern(pattern: string) {
  const stream = redis.scanStream({ match: pattern });
  stream.on('data', async (keys: string[]) => {
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      keys.forEach(k => pipeline.del(k));
      await pipeline.exec();
    }
  });
}
