import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from './logger';

/**
 * Redis Client Configuration
 * 
 * Features:
 * - Connection pooling
 * - Automatic reconnection
 * - Key prefixing
 * - Type-safe operations
 */

// Redis client options
const redisOptions: RedisOptions = {
  connectTimeout: 10000,
  enableOfflineQueue: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  lazyConnect: true,
  family: 4,
};

// Create Redis client
const redis = new Redis(env.REDIS_URL, redisOptions);
const CACHE_OPERATION_TIMEOUT_MS = 750;

// Event handlers
redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

redis.on('error', (error) => {
  logger.error('Redis error', { error: error.message });
});

redis.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

redis.on('end', () => {
  logger.warn('Redis connection ended');
});

// Connect on startup
// redis.connect().catch((error) => {
  // logger.error('Redis initial connection failed', { error });
// });

// Cache key helpers
export const cacheKeys = {
  // User cache
  user: (userId: string) => `user:${userId}`,
  userSession: (sessionId: string) => `session:${sessionId}`,

  // Question cache
  question: (questionId: string) => `question:${questionId}`,
  questionsList: (params: string) => `questions:list:${params}`,

  // User skills cache
  userSkills: (userId: string) => `user:${userId}:skills`,
  userSkill: (userId: string, skillId: string) => `user:${userId}:skill:${skillId}`,

  // Attempt cache
  userAttempts: (userId: string) => `user:${userId}:attempts`,
  attempt: (attemptId: string) => `attempt:${attemptId}`,

  // Analytics cache
  userAnalytics: (userId: string) => `user:${userId}:analytics`,
  dashboard: (userId: string) => `user:${userId}:dashboard:v4`,
  leaderboard: (type: string) => `leaderboard:${type}`,

  // Rate limiting
  rateLimit: (key: string) => `ratelimit:${key}`,

  // Spaced repetition
  dueReviews: (userId: string) => `user:${userId}:due-reviews`,

  // General
  stats: 'app:stats',
  health: 'app:health',
};

// Cache TTL helpers (in seconds)
export const cacheTTL = {
  user: 60 * 60, // 1 hour
  question: 60 * 60 * 24, // 24 hours
  questionsList: 60 * 5, // 5 minutes
  userSkills: 60 * 15, // 15 minutes
  analytics: 60 * 5, // 5 minutes
  leaderboard: 60 * 60, // 1 hour
  default: 60 * 10, // 10 minutes
};

async function withCacheTimeout<T>(
  operation: Promise<T>,
  fallback: T,
  operationName: string,
  key: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Redis ${operationName} timed out`)),
          CACHE_OPERATION_TIMEOUT_MS
        );
      }),
    ]);
  } catch (error) {
    operation.catch(() => undefined);
    logger.warn('Cache operation skipped', {
      operation: operationName,
      key,
      timeoutMs: CACHE_OPERATION_TIMEOUT_MS,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

// Cache helper functions
export const cache = {
  /**
   * Get cached data with automatic JSON parsing
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await withCacheTimeout(redis.get(key), null, 'get', key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  },

  /**
   * Set cache with automatic JSON serialization
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await withCacheTimeout(redis.setex(key, ttlSeconds, serialized), 'OK', 'setex', key);
      } else {
        await withCacheTimeout(redis.set(key, serialized), 'OK', 'set', key);
      }
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  },

  /**
   * Delete cache key
   */
  async del(key: string): Promise<void> {
    try {
      await withCacheTimeout(redis.del(key), 0, 'del', key);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  },

  /**
   * Delete cache keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error });
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await withCacheTimeout(redis.exists(key), 0, 'exists', key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  },

  /**
   * Increment counter
   */
  async increment(key: string, amount = 1): Promise<number> {
    try {
      return await withCacheTimeout(redis.incrby(key, amount), 0, 'incrby', key);
    } catch (error) {
      logger.error('Cache increment error', { key, error });
      return 0;
    }
  },

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await withCacheTimeout(redis.expire(key, seconds), 0, 'expire', key);
    } catch (error) {
      logger.error('Cache expire error', { key, error });
    }
  },

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await withCacheTimeout(redis.ttl(key), -1, 'ttl', key);
    } catch (error) {
      logger.error('Cache TTL error', { key, error });
      return -1;
    }
  },

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<void> {
    try {
      await withCacheTimeout(redis.zadd(key, score, member), 0, 'zadd', key);
    } catch (error) {
      logger.error('Cache zadd error', { key, error });
    }
  },

  /**
   * Get range from sorted set
   */
  async zrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    try {
      if (withScores) {
        return await withCacheTimeout(redis.zrange(key, start, stop, 'WITHSCORES'), [], 'zrange', key);
      }
      return await withCacheTimeout(redis.zrange(key, start, stop), [], 'zrange', key);
    } catch (error) {
      logger.error('Cache zrange error', { key, error });
      return [];
    }
  },

  /**
   * Get score from sorted set
   */
  async zscore(key: string, member: string): Promise<number | null> {
    try {
      const score = await withCacheTimeout(redis.zscore(key, member), null, 'zscore', key);
      return score ? parseFloat(score) : null;
    } catch (error) {
      logger.error('Cache zscore error', { key, error });
      return null;
    }
  },
};

export { redis };
