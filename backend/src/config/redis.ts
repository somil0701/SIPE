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
  connectTimeout: 1000,
  enableOfflineQueue: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  lazyConnect: true,
  tls: {},
};

// Create Redis client
const redis = new Redis(env.REDIS_URL, redisOptions);

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

// Cache helper functions
export const cache = {
  /**
   * Get cached data with automatic JSON parsing
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
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
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
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
      await redis.del(key);
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
      const result = await redis.exists(key);
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
      return await redis.incrby(key, amount);
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
      await redis.expire(key, seconds);
    } catch (error) {
      logger.error('Cache expire error', { key, error });
    }
  },

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
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
      await redis.zadd(key, score, member);
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
        return await redis.zrange(key, start, stop, 'WITHSCORES');
      }
      return await redis.zrange(key, start, stop);
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
      const score = await redis.zscore(key, member);
      return score ? parseFloat(score) : null;
    } catch (error) {
      logger.error('Cache zscore error', { key, error });
      return null;
    }
  },
};

export { redis };
