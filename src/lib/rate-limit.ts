import { redis } from './redis';

export interface RateLimitConfig {
  limit: number;      // Maximum number of requests
  window: number;     // Window size in seconds
}

// In-memory fallback if Redis is down
const memoryStore = new Map<string, number[]>();

function memoryRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const timestamps = (memoryStore.get(key) || []).filter(t => now - t < windowMs);
  
  if (timestamps.length >= limit) {
    memoryStore.set(key, timestamps);
    return { success: false, limit, remaining: 0, reset: now + windowMs };
  }
  
  timestamps.push(now);
  memoryStore.set(key, timestamps);
  return { success: true, limit, remaining: limit - timestamps.length, reset: now + windowMs };
}

/**
 * Robust Rate Limiter using Redis (Sliding Window) with In-Memory fallback
 * @param key The unique key for this rate limit (e.g., ip, user-id, api-endpoint)
 * @param config Limit and window settings
 * @returns Object indicating if request is allowed and remaining budget
 */
export async function rateLimit(key: string, config: RateLimitConfig) {
  const { limit, window } = config;
  const now = Date.now();
  const redisKey = `ratelimit:${key}`;

  try {
    // Use a pipeline for atomicity
    const pipeline = redis.pipeline();
    
    // Remove expired timestamps
    pipeline.zremrangebyscore(redisKey, 0, now - window * 1000);
    
    // Count current requests in window
    pipeline.zcard(redisKey);
    
    // Add current request
    pipeline.zadd(redisKey, now, now.toString());
    
    // Set expiry on the set itself to clean up abandoned keys
    pipeline.expire(redisKey, window);

    const results = await pipeline.exec();
    
    if (!results) {
      return memoryRateLimit(key, limit, window);
    }

    // results[1][1] is the count before adding current
    const count = (results[1][1] as number) || 0;
    const success = count < limit;
    const remaining = Math.max(0, limit - (count + 1));
    const reset = now + window * 1000;

    return {
      success,
      limit,
      remaining,
      reset,
    };
  } catch (err) {
    // Fail-safe to in-memory store
    return memoryRateLimit(key, limit, window);
  }
}

// Helper to extract client IP from headers
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

// Common rate limit profiles
export const LIMIT_PROFILES = {
  STRICT: { limit: 10, window: 60 },      // 10 requests per minute
  STANDARD: { limit: 60, window: 60 },    // 60 requests per minute
  RELAXED: { limit: 300, window: 60 },   // 300 requests per minute
  AUTH: { limit: 5, window: 60 * 5 },     // 5 attempts per 5 minutes
  SUBMIT: { limit: 30, window: 60 },      // 30 submissions per minute
};
