import { Router } from 'express';
import { prisma } from '../config/database';
import { cache, cacheKeys } from '../config/redis';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { analyticsService } from '../services/analytics.service';
import { interviewService } from '../services/interview.service';
import { questionService } from '../services/question.service';
import { learningPathService } from '../services/learning-path.service';

const router = Router();
const DASHBOARD_CACHE_TTL_SECONDS = 60;

function isCurrentDashboardCache(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const dashboard = value as { today?: unknown; activeLearningPath?: unknown };
  if (!Array.isArray(dashboard.today)) return false;
  if (!dashboard.activeLearningPath) return true;
  if (typeof dashboard.activeLearningPath !== 'object') return false;

  const path = dashboard.activeLearningPath as Record<string, unknown>;
  return typeof path.totalItems === 'number'
    && typeof path.completedItems === 'number'
    && typeof path.progressPercentage === 'number'
    && Array.isArray(path.pathItems);
}

async function getSpacedRepetitionSummary(userId: string) {
  const now = new Date();

  const [totalCards, masteredCards, dueToday] = await Promise.all([
    prisma.spacedRepetition.count({
      where: { userId },
    }),
    prisma.spacedRepetition.count({
      where: { userId, status: 'MASTERED' },
    }),
    prisma.spacedRepetition.count({
      where: {
        userId,
        nextReviewDate: { lte: now },
        status: 'ACTIVE',
      },
    }),
  ]);

  return {
    totalCards,
    masteredCards,
    dueToday,
  };
}

/**
 * @route   GET /api/v1/dashboard
 * @desc    Get dashboard summary in a single authenticated request
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const cacheKey = cacheKeys.dashboard(userId);
    const cached = await cache.get(cacheKey);

    if (cached && isCurrentDashboardCache(cached)) {
      res.json({
        success: true,
        data: cached,
      });
      return;
    }
    if (cached) await cache.del(cacheKey);

    const [
      analytics,
      recommendedQuestions,
      recentInterviews,
      spacedRepetition,
      today,
      activeLearningPath,
    ] = await Promise.all([
      analyticsService.getUserAnalytics(userId),
      questionService.getRecommendedQuestions(userId, 3),
      interviewService.getUserInterviews(userId, { limit: 3 }),
      getSpacedRepetitionSummary(userId),
      learningPathService.getTodayQueue(userId),
      prisma.learningPath.findFirst({
        where: { userId, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          totalItems: true,
          completedItems: true,
          progressPercentage: true,
          estimatedHours: true,
          pathItems: {
            where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
            select: {
              id: true,
              title: true,
              phase: true,
              status: true,
              itemType: true,
              estimatedMinutes: true,
              scheduledDate: true,
              question: { select: { title: true, slug: true, difficulty: true } },
            },
            orderBy: [{ scheduledDate: 'asc' }, { orderIndex: 'asc' }],
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const dashboard = {
      analytics,
      recommendedQuestions: activeLearningPath ? [] : recommendedQuestions,
      recentInterviews: recentInterviews.interviews,
      spacedRepetition,
      today,
      activeLearningPath,
    };

    await cache.set(cacheKey, dashboard, DASHBOARD_CACHE_TTL_SECONDS);

    res.json({
      success: true,
      data: dashboard,
    });
  })
);

export { router as dashboardRouter };
