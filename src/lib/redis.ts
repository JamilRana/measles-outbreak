import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis = globalForRedis.redis ?? new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => console.log('Redis connected successfully.'));
redis.on('ready', () => console.log('Redis is ready to receive commands.'));

// Only log connection errors if not in build phase to avoid noise in logs
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  redis.on('error', (err) => console.error('Redis connection error:', err));
}

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Helper to wrap cache logic (Read-Through)
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 60 // Default 60 seconds for safety
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log(`[Cache] HIT: ${key}`);
      return JSON.parse(cached) as T;
    }
  } catch (e) {
    console.error(`[Cache] Error reading key ${key}:`, e);
  }

  console.log(`[Cache] MISS: ${key}. Fetching fresh data...`);
  const data = await fetchFn();
  
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (err) {
    console.error(`[Cache] Failed to set key ${key}:`, err);
  }

  return data;
}

// Helper for invalidation
export async function invalidateCache(key: string | string[]) {
  const keys = Array.isArray(key) ? key : [key];
  if (keys.length === 0) return;
  
  try {
    await redis.del(...keys);
    console.log(`[Cache] INVALIDATED keys: ${keys.join(', ')}`);
  } catch (err) {
    console.error(`[Cache] Invalidation failed for keys ${keys.join(', ')}:`, err);
  }
}

export async function invalidateByPattern(pattern: string) {
  try {
    let cursor = '0';
    let totalInvalidated = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
        totalInvalidated += keys.length;
      }
    } while (cursor !== '0');
    console.log(`[Cache] PATTERN INVALIDATED: ${pattern} (Total keys: ${totalInvalidated})`);
  } catch (err) {
    console.error(`[Cache] Pattern invalidation failed for ${pattern}:`, err);
  }
}
