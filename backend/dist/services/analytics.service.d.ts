import { UserAnalytics, SkillBreakdown, DailyAnalytics } from '../types';
/**
 * Analytics Service
 *
 * Handles analytics and statistics:
 * - User progress tracking
 * - Skill analysis
 * - Weak topic detection
 * - Performance metrics
 */
declare class AnalyticsService {
    /**
     * Get comprehensive user analytics
     */
    getUserAnalytics(userId: string): Promise<UserAnalytics>;
    /**
     * Get user stats
     */
    private getUserStats;
    /**
     * Get skill breakdown
     */
    private getSkillBreakdown;
    /**
     * Get weekly progress
     */
    private getWeeklyProgress;
    /**
     * Get difficulty breakdown
     */
    private getDifficultyBreakdown;
    /**
     * Get streak information
     */
    private getStreakInfo;
    /**
     * Get weak topics for user
     */
    getWeakTopics(userId: string, limit?: number): Promise<SkillBreakdown[]>;
    /**
     * Get strong topics for user
     */
    getStrongTopics(userId: string, limit?: number): Promise<SkillBreakdown[]>;
    /**
     * Get daily analytics
     */
    getDailyAnalytics(userId: string, days?: number): Promise<DailyAnalytics[]>;
    /**
     * Update daily analytics
     */
    updateDailyAnalytics(userId: string, data: {
        questionsAttempted?: number;
        questionsSolved?: number;
        timeSpent?: number;
    }): Promise<void>;
    /**
     * Get leaderboard
     */
    getLeaderboard(type: 'global' | 'weekly', limit?: number): Promise<{
        userId: string;
        fullName: string;
        avatarUrl?: string;
        score: number;
        questionsSolved: number;
    }[]>;
    /**
     * Helper: Get week start date
     */
    private getWeekStart;
}
export declare const analyticsService: AnalyticsService;
export {};
//# sourceMappingURL=analytics.service.d.ts.map