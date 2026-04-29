import { Router } from 'express';
import { z } from 'zod';
import { analyticsService } from '../services/analytics.service';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const getDailyAnalyticsSchema = z.object({
  days: z.string().transform(Number).default('30'),
});

const getLeaderboardSchema = z.object({
  type: z.enum(['global', 'weekly']).default('global'),
  limit: z.string().transform(Number).default('10'),
});

/**
 * @route   GET /api/v1/analytics
 * @desc    Get comprehensive user analytics
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const analytics = await analyticsService.getUserAnalytics(req.user!.id);
    
    res.json({
      success: true,
      data: analytics,
    });
  })
);

/**
 * @route   GET /api/v1/analytics/daily
 * @desc    Get daily analytics
 * @access  Private
 */
router.get(
  '/daily',
  authenticate,
  validate({ query: getDailyAnalyticsSchema }),
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string);
    const analytics = await analyticsService.getDailyAnalytics(req.user!.id, days);
    
    res.json({
      success: true,
      data: analytics,
    });
  })
);

/**
 * @route   GET /api/v1/analytics/weak-topics
 * @desc    Get user's weak topics
 * @access  Private
 */
router.get(
  '/weak-topics',
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const weakTopics = await analyticsService.getWeakTopics(req.user!.id, limit);
    
    res.json({
      success: true,
      data: weakTopics,
    });
  })
);

/**
 * @route   GET /api/v1/analytics/strong-topics
 * @desc    Get user's strong topics
 * @access  Private
 */
router.get(
  '/strong-topics',
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const strongTopics = await analyticsService.getStrongTopics(req.user!.id, limit);
    
    res.json({
      success: true,
      data: strongTopics,
    });
  })
);

/**
 * @route   GET /api/v1/analytics/leaderboard
 * @desc    Get leaderboard
 * @access  Public
 */
router.get(
  '/leaderboard',
  validate({ query: getLeaderboardSchema }),
  asyncHandler(async (req, res) => {
    const { type, limit } = req.query;
    const leaderboard = await analyticsService.getLeaderboard(
      type as 'global' | 'weekly',
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      data: leaderboard,
    });
  })
);

export { router as analyticsRouter };