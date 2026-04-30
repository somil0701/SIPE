"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.cache = exports.cacheTTL = exports.cacheKeys = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("./logger");
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
const redisOptions = {
    connectTimeout: 1000,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
    tls: {},
};
// Create Redis client
const redis = new ioredis_1.default(env_1.env.REDIS_URL, redisOptions);
exports.redis = redis;
// Event handlers
redis.on('connect', () => {
    logger_1.logger.info('Redis connected');
});
redis.on('ready', () => {
    logger_1.logger.info('Redis ready');
});
redis.on('error', (error) => {
    logger_1.logger.error('Redis error', { error: error.message });
});
redis.on('reconnecting', () => {
    logger_1.logger.warn('Redis reconnecting...');
});
redis.on('end', () => {
    logger_1.logger.warn('Redis connection ended');
});
// Connect on startup
// redis.connect().catch((error) => {
// logger.error('Redis initial connection failed', { error });
// });
// Cache key helpers
exports.cacheKeys = {
    // User cache
    user: (userId) => `user:${userId}`,
    userSession: (sessionId) => `session:${sessionId}`,
    // Question cache
    question: (questionId) => `question:${questionId}`,
    questionsList: (params) => `questions:list:${params}`,
    // User skills cache
    userSkills: (userId) => `user:${userId}:skills`,
    userSkill: (userId, skillId) => `user:${userId}:skill:${skillId}`,
    // Attempt cache
    userAttempts: (userId) => `user:${userId}:attempts`,
    attempt: (attemptId) => `attempt:${attemptId}`,
    // Analytics cache
    userAnalytics: (userId) => `user:${userId}:analytics`,
    leaderboard: (type) => `leaderboard:${type}`,
    // Rate limiting
    rateLimit: (key) => `ratelimit:${key}`,
    // Spaced repetition
    dueReviews: (userId) => `user:${userId}:due-reviews`,
    // General
    stats: 'app:stats',
    health: 'app:health',
};
// Cache TTL helpers (in seconds)
exports.cacheTTL = {
    user: 60 * 60, // 1 hour
    question: 60 * 60 * 24, // 24 hours
    questionsList: 60 * 5, // 5 minutes
    userSkills: 60 * 15, // 15 minutes
    analytics: 60 * 5, // 5 minutes
    leaderboard: 60 * 60, // 1 hour
    default: 60 * 10, // 10 minutes
};
// Cache helper functions
exports.cache = {
    /**
     * Get cached data with automatic JSON parsing
     */
    async get(key) {
        try {
            const data = await redis.get(key);
            if (!data)
                return null;
            return JSON.parse(data);
        }
        catch (error) {
            logger_1.logger.error('Cache get error', { key, error });
            return null;
        }
    },
    /**
     * Set cache with automatic JSON serialization
     */
    async set(key, value, ttlSeconds) {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await redis.setex(key, ttlSeconds, serialized);
            }
            else {
                await redis.set(key, serialized);
            }
        }
        catch (error) {
            logger_1.logger.error('Cache set error', { key, error });
        }
    },
    /**
     * Delete cache key
     */
    async del(key) {
        try {
            await redis.del(key);
        }
        catch (error) {
            logger_1.logger.error('Cache delete error', { key, error });
        }
    },
    /**
     * Delete cache keys by pattern
     */
    async delPattern(pattern) {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        }
        catch (error) {
            logger_1.logger.error('Cache delete pattern error', { pattern, error });
        }
    },
    /**
     * Check if key exists
     */
    async exists(key) {
        try {
            const result = await redis.exists(key);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error('Cache exists error', { key, error });
            return false;
        }
    },
    /**
     * Increment counter
     */
    async increment(key, amount = 1) {
        try {
            return await redis.incrby(key, amount);
        }
        catch (error) {
            logger_1.logger.error('Cache increment error', { key, error });
            return 0;
        }
    },
    /**
     * Set expiration on key
     */
    async expire(key, seconds) {
        try {
            await redis.expire(key, seconds);
        }
        catch (error) {
            logger_1.logger.error('Cache expire error', { key, error });
        }
    },
    /**
     * Get TTL of key
     */
    async ttl(key) {
        try {
            return await redis.ttl(key);
        }
        catch (error) {
            logger_1.logger.error('Cache TTL error', { key, error });
            return -1;
        }
    },
    /**
     * Add to sorted set
     */
    async zadd(key, score, member) {
        try {
            await redis.zadd(key, score, member);
        }
        catch (error) {
            logger_1.logger.error('Cache zadd error', { key, error });
        }
    },
    /**
     * Get range from sorted set
     */
    async zrange(key, start, stop, withScores = false) {
        try {
            if (withScores) {
                return await redis.zrange(key, start, stop, 'WITHSCORES');
            }
            return await redis.zrange(key, start, stop);
        }
        catch (error) {
            logger_1.logger.error('Cache zrange error', { key, error });
            return [];
        }
    },
    /**
     * Get score from sorted set
     */
    async zscore(key, member) {
        try {
            const score = await redis.zscore(key, member);
            return score ? parseFloat(score) : null;
        }
        catch (error) {
            logger_1.logger.error('Cache zscore error', { key, error });
            return null;
        }
    },
};
//# sourceMappingURL=redis.js.map