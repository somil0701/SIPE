import Redis from 'ioredis';
declare const redis: Redis;
export declare const cacheKeys: {
    user: (userId: string) => string;
    userSession: (sessionId: string) => string;
    question: (questionId: string) => string;
    questionsList: (params: string) => string;
    userSkills: (userId: string) => string;
    userSkill: (userId: string, skillId: string) => string;
    userAttempts: (userId: string) => string;
    attempt: (attemptId: string) => string;
    userAnalytics: (userId: string) => string;
    leaderboard: (type: string) => string;
    rateLimit: (key: string) => string;
    dueReviews: (userId: string) => string;
    stats: string;
    health: string;
};
export declare const cacheTTL: {
    user: number;
    question: number;
    questionsList: number;
    userSkills: number;
    analytics: number;
    leaderboard: number;
    default: number;
};
export declare const cache: {
    /**
     * Get cached data with automatic JSON parsing
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set cache with automatic JSON serialization
     */
    set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
    /**
     * Delete cache key
     */
    del(key: string): Promise<void>;
    /**
     * Delete cache keys by pattern
     */
    delPattern(pattern: string): Promise<void>;
    /**
     * Check if key exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Increment counter
     */
    increment(key: string, amount?: number): Promise<number>;
    /**
     * Set expiration on key
     */
    expire(key: string, seconds: number): Promise<void>;
    /**
     * Get TTL of key
     */
    ttl(key: string): Promise<number>;
    /**
     * Add to sorted set
     */
    zadd(key: string, score: number, member: string): Promise<void>;
    /**
     * Get range from sorted set
     */
    zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>;
    /**
     * Get score from sorted set
     */
    zscore(key: string, member: string): Promise<number | null>;
};
export { redis };
//# sourceMappingURL=redis.d.ts.map