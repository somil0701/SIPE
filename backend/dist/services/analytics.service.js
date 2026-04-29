"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = void 0;
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
/**
 * Analytics Service
 *
 * Handles analytics and statistics:
 * - User progress tracking
 * - Skill analysis
 * - Weak topic detection
 * - Performance metrics
 */
class AnalyticsService {
    /**
     * Get comprehensive user analytics
     */
    async getUserAnalytics(userId) {
        // Try cache first
        const cacheKey = redis_1.cacheKeys.userAnalytics(userId);
        const cached = await redis_1.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Get user stats
        const stats = await this.getUserStats(userId);
        // Get skill breakdown
        const skillBreakdown = await this.getSkillBreakdown(userId);
        // Get weekly progress
        const weeklyProgress = await this.getWeeklyProgress(userId);
        // Get difficulty breakdown
        const difficultyBreakdown = await this.getDifficultyBreakdown(userId);
        // Get streak info
        const { currentStreak, longestStreak } = await this.getStreakInfo(userId);
        const analytics = {
            userId,
            ...stats,
            currentStreak,
            longestStreak,
            skillBreakdown,
            weeklyProgress,
            difficultyBreakdown,
        };
        // Cache result
        await redis_1.cache.set(cacheKey, analytics, redis_1.cacheTTL.analytics);
        return analytics;
    }
    /**
     * Get user stats
     */
    async getUserStats(userId) {
        const [totalAttempts, totalSolved, uniqueAttempted, uniqueSolved, timeSpent,] = await Promise.all([
            database_1.prisma.attempt.count({ where: { userId } }),
            database_1.prisma.attempt.count({ where: { userId, status: 'ACCEPTED' } }),
            database_1.prisma.attempt.groupBy({
                by: ['questionId'],
                where: { userId },
                _count: true,
            }),
            database_1.prisma.attempt.groupBy({
                by: ['questionId'],
                where: { userId, status: 'ACCEPTED' },
                _count: true,
            }),
            database_1.prisma.attempt.aggregate({
                where: { userId },
                _sum: { timeSpent: true },
            }),
        ]);
        const uniqueQuestionsAttempted = uniqueAttempted.length;
        const uniqueQuestionsSolved = uniqueSolved.length;
        const overallAccuracy = totalAttempts > 0
            ? Math.round((totalSolved / totalAttempts) * 100)
            : 0;
        return {
            totalAttempts,
            totalSolved,
            uniqueQuestionsAttempted,
            uniqueQuestionsSolved,
            overallAccuracy,
            totalTimeSpent: timeSpent._sum.timeSpent || 0,
        };
    }
    /**
     * Get skill breakdown
     */
    async getSkillBreakdown(userId) {
        const userSkills = await database_1.prisma.userSkill.findMany({
            where: { userId },
            include: { skill: true },
            orderBy: { proficiencyLevel: 'desc' },
        });
        return userSkills.map((us) => ({
            skillId: us.skillId,
            skillName: us.skill.name,
            attempted: us.questionsAttempted,
            solved: us.questionsSolved,
            accuracy: Math.round(us.accuracyRate),
            proficiencyLevel: us.proficiencyLevel,
        }));
    }
    /**
     * Get weekly progress
     */
    async getWeeklyProgress(userId) {
        const twelveWeeksAgo = new Date();
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
        const dailyStats = await database_1.prisma.analyticsDaily.findMany({
            where: {
                userId,
                date: { gte: twelveWeeksAgo },
            },
            orderBy: { date: 'asc' },
        });
        // Group by week
        const weeklyMap = new Map();
        dailyStats.forEach((day) => {
            const weekStart = this.getWeekStart(day.date);
            const weekKey = weekStart.toISOString().split('T')[0];
            const existing = weeklyMap.get(weekKey) || { attempted: 0, solved: 0, time: 0 };
            existing.attempted += day.questionsAttempted;
            existing.solved += day.questionsSolved;
            existing.time += day.totalTimeMinutes;
            weeklyMap.set(weekKey, existing);
        });
        return Array.from(weeklyMap.entries()).map(([week, data]) => ({
            week,
            questionsAttempted: data.attempted,
            questionsSolved: data.solved,
            accuracy: data.attempted > 0 ? Math.round((data.solved / data.attempted) * 100) : 0,
            timeSpent: data.time,
        }));
    }
    /**
     * Get difficulty breakdown
     */
    async getDifficultyBreakdown(userId) {
        const attempts = await database_1.prisma.attempt.findMany({
            where: { userId },
            include: { question: { select: { difficulty: true } } },
        });
        const breakdown = {
            easy: { attempted: 0, solved: 0 },
            medium: { attempted: 0, solved: 0 },
            hard: { attempted: 0, solved: 0 },
            expert: { attempted: 0, solved: 0 },
        };
        attempts.forEach((attempt) => {
            const difficulty = attempt.question.difficulty;
            if (breakdown[difficulty]) {
                breakdown[difficulty].attempted++;
                if (attempt.status === 'ACCEPTED') {
                    breakdown[difficulty].solved++;
                }
            }
        });
        return breakdown;
    }
    /**
     * Get streak information
     */
    async getStreakInfo(userId) {
        const activities = await database_1.prisma.analyticsDaily.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        let previousDate = null;
        for (const activity of activities) {
            if (activity.questionsAttempted > 0) {
                if (!previousDate) {
                    tempStreak = 1;
                }
                else {
                    const dayDiff = Math.floor((previousDate.getTime() - activity.date.getTime()) / (1000 * 60 * 60 * 24));
                    if (dayDiff === 1) {
                        tempStreak++;
                    }
                    else {
                        longestStreak = Math.max(longestStreak, tempStreak);
                        tempStreak = 1;
                    }
                }
                previousDate = activity.date;
            }
            else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 0;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        // Calculate current streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const latestActivity = activities[0];
        if (latestActivity) {
            const latestDate = new Date(latestActivity.date);
            latestDate.setHours(0, 0, 0, 0);
            const dayDiff = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
            if (dayDiff <= 1 && latestActivity.questionsAttempted > 0) {
                currentStreak = tempStreak;
            }
        }
        return { currentStreak, longestStreak };
    }
    /**
     * Get weak topics for user
     */
    async getWeakTopics(userId, limit = 5) {
        const userSkills = await database_1.prisma.userSkill.findMany({
            where: {
                userId,
                questionsAttempted: { gt: 0 },
            },
            include: { skill: true },
            orderBy: { accuracyRate: 'asc' },
            take: limit,
        });
        return userSkills.map((us) => ({
            skillId: us.skillId,
            skillName: us.skill.name,
            attempted: us.questionsAttempted,
            solved: us.questionsSolved,
            accuracy: Math.round(us.accuracyRate),
            proficiencyLevel: us.proficiencyLevel,
        }));
    }
    /**
     * Get strong topics for user
     */
    async getStrongTopics(userId, limit = 5) {
        const userSkills = await database_1.prisma.userSkill.findMany({
            where: {
                userId,
                questionsAttempted: { gt: 0 },
            },
            include: { skill: true },
            orderBy: [{ accuracyRate: 'desc' }, { questionsSolved: 'desc' }],
            take: limit,
        });
        return userSkills.map((us) => ({
            skillId: us.skillId,
            skillName: us.skill.name,
            attempted: us.questionsAttempted,
            solved: us.questionsSolved,
            accuracy: Math.round(us.accuracyRate),
            proficiencyLevel: us.proficiencyLevel,
        }));
    }
    /**
     * Get daily analytics
     */
    async getDailyAnalytics(userId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const analytics = await database_1.prisma.analyticsDaily.findMany({
            where: {
                userId,
                date: { gte: startDate },
            },
            orderBy: { date: 'desc' },
        });
        return analytics.map((a) => ({
            date: a.date.toISOString().split('T')[0],
            sessionCount: a.sessionCount,
            totalTimeMinutes: a.totalTimeMinutes,
            questionsAttempted: a.questionsAttempted,
            questionsSolved: a.questionsSolved,
            accuracyRate: Math.round(a.accuracyRate),
        }));
    }
    /**
     * Update daily analytics
     */
    async updateDailyAnalytics(userId, data) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existing = await database_1.prisma.analyticsDaily.findUnique({
            where: {
                userId_date: { userId, date: today },
            },
        });
        if (existing) {
            await database_1.prisma.analyticsDaily.update({
                where: { id: existing.id },
                data: {
                    questionsAttempted: { increment: data.questionsAttempted || 0 },
                    questionsSolved: { increment: data.questionsSolved || 0 },
                    totalTimeMinutes: { increment: Math.floor((data.timeSpent || 0) / 60) },
                    sessionCount: { increment: 1 },
                },
            });
        }
        else {
            await database_1.prisma.analyticsDaily.create({
                data: {
                    userId,
                    date: today,
                    questionsAttempted: data.questionsAttempted || 0,
                    questionsSolved: data.questionsSolved || 0,
                    totalTimeMinutes: Math.floor((data.timeSpent || 0) / 60),
                    sessionCount: 1,
                },
            });
        }
        // Invalidate cache
        await redis_1.cache.del(redis_1.cacheKeys.userAnalytics(userId));
    }
    /**
     * Get leaderboard
     */
    async getLeaderboard(type, limit = 10) {
        const cacheKey = redis_1.cacheKeys.leaderboard(`${type}:${limit}`);
        const cached = await redis_1.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        let leaderboard = [];
        if (type === 'global') {
            const topUsers = await database_1.prisma.userSkill.groupBy({
                by: ['userId'],
                _sum: {
                    xpPoints: true,
                    questionsSolved: true,
                },
                orderBy: {
                    _sum: {
                        xpPoints: 'desc',
                    },
                },
                take: limit,
            });
            const userDetails = await database_1.prisma.user.findMany({
                where: {
                    id: { in: topUsers.map((u) => u.userId) },
                },
                select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                },
            });
            const userMap = new Map(userDetails.map((u) => [u.id, u]));
            leaderboard = topUsers.map((u) => ({
                userId: u.userId,
                fullName: userMap.get(u.userId)?.fullName || 'Unknown',
                avatarUrl: userMap.get(u.userId)?.avatarUrl || undefined,
                score: u._sum.xpPoints || 0,
                questionsSolved: u._sum.questionsSolved || 0,
            }));
        }
        else {
            // Weekly leaderboard
            const weekStart = this.getWeekStart(new Date());
            const weeklyStats = await database_1.prisma.analyticsDaily.groupBy({
                by: ['userId'],
                where: {
                    date: { gte: weekStart },
                },
                _sum: {
                    questionsSolved: true,
                    questionsAttempted: true,
                },
                orderBy: {
                    _sum: {
                        questionsSolved: 'desc',
                    },
                },
                take: limit,
            });
            const userDetails = await database_1.prisma.user.findMany({
                where: {
                    id: { in: weeklyStats.map((u) => u.userId) },
                },
                select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                },
            });
            const userMap = new Map(userDetails.map((u) => [u.id, u]));
            leaderboard = weeklyStats.map((u) => ({
                userId: u.userId,
                fullName: userMap.get(u.userId)?.fullName || 'Unknown',
                avatarUrl: userMap.get(u.userId)?.avatarUrl || undefined,
                score: ((u._sum?.questionsSolved || 0) * 100) + ((u._sum?.questionsAttempted || 0) * 10),
                questionsSolved: u._sum?.questionsSolved || 0,
            }));
        }
        // Cache for 1 hour
        await redis_1.cache.set(cacheKey, leaderboard, 60 * 60);
        return leaderboard;
    }
    /**
     * Helper: Get week start date
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }
}
// Export singleton instance
exports.analyticsService = new AnalyticsService();
//# sourceMappingURL=analytics.service.js.map