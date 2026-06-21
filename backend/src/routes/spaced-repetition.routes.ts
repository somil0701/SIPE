import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { serializeSpacedRepetition } from '../utils/apiFormat';
import { learningPathService } from '../services/learning-path.service';

const router = Router();

// Validation schemas
const reviewSchema = z.object({
  qualityRating: z.number().int().min(0).max(5, 'Quality rating must be between 0 and 5'),
});

/**
 * @route   GET /api/v1/spaced-repetition
 * @desc    Get all spaced repetition entries for user
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const entries = await prisma.spacedRepetition.findMany({
      where: { userId: req.user!.id },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
            skill: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { nextReviewDate: 'asc' },
    });

    res.json({
      success: true,
      data: entries.map((entry) => serializeSpacedRepetition(entry)),
    });
  })
);

/**
 * @route   GET /api/v1/spaced-repetition/due
 * @desc    Get due reviews for today
 * @access  Private
 */
router.get(
  '/due',
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const dueReviews = await prisma.spacedRepetition.findMany({
      where: {
        userId: req.user!.id,
        nextReviewDate: { lte: new Date() },
        status: 'ACTIVE',
      },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
            description: true,
            skill: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { nextReviewDate: 'asc' },
      take: limit,
    });

    res.json({
      success: true,
      data: dueReviews.map((entry) => serializeSpacedRepetition(entry)),
      count: dueReviews.length,
    });
  })
);

/**
 * @route   GET /api/v1/spaced-repetition/stats
 * @desc    Get spaced repetition statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const [
      totalCards,
      masteredCards,
      dueToday,
      dueThisWeek,
      reviewHistory,
    ] = await Promise.all([
      prisma.spacedRepetition.count({
        where: { userId: req.user!.id },
      }),
      prisma.spacedRepetition.count({
        where: { userId: req.user!.id, status: 'MASTERED' },
      }),
      prisma.spacedRepetition.count({
        where: {
          userId: req.user!.id,
          nextReviewDate: { lte: new Date() },
          status: 'ACTIVE',
        },
      }),
      prisma.spacedRepetition.count({
        where: {
          userId: req.user!.id,
          nextReviewDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          status: 'ACTIVE',
        },
      }),
      prisma.spacedRepetitionReview.findMany({
        where: {
          spacedRepetition: { userId: req.user!.id },
          reviewedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          qualityRating: true,
          reviewedAt: true,
        },
        orderBy: { reviewedAt: 'asc' },
      }),
    ]);

    // Calculate retention rate
    const successfulReviews = reviewHistory.filter((r) => r.qualityRating >= 3).length;
    const retentionRate = reviewHistory.length > 0
      ? Math.round((successfulReviews / reviewHistory.length) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        totalCards,
        masteredCards,
        dueToday,
        dueThisWeek,
        retentionRate,
        reviewHistory: reviewHistory.map((r) => ({
          date: r.reviewedAt,
          rating: r.qualityRating,
        })),
      },
    });
  })
);

/**
 * @route   GET /api/v1/spaced-repetition/:id
 * @desc    Get spaced repetition entry by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const entry = await prisma.spacedRepetition.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        question: true,
        reviews: {
          orderBy: { reviewedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!entry) {
      throw ApiError.notFound('Entry not found');
    }

    res.json({
      success: true,
      data: serializeSpacedRepetition(entry),
    });
  })
);

/**
 * @route   POST /api/v1/spaced-repetition/:id/review
 * @desc    Submit a review for spaced repetition item
 * @access  Private
 */
router.post(
  '/:id/review',
  authenticate,
  validate({ body: reviewSchema }),
  asyncHandler(async (req, res) => {
    const { qualityRating } = req.body;

    const entry = await prisma.spacedRepetition.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!entry) {
      throw ApiError.notFound('Entry not found');
    }

    // SM-2 Algorithm
    let { interval, repetitions, easeFactor } = entry;
    const previousInterval = interval;
    const previousEf = easeFactor;

    if (qualityRating >= 3) {
      // Correct response
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      // Incorrect response
      repetitions = 0;
      interval = 1;
    }

    // Update ease factor
    easeFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - qualityRating) * (0.08 + (5 - qualityRating) * 0.02)
    );

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    // Update entry
    const updated = await prisma.spacedRepetition.update({
      where: { id: req.params.id },
      data: {
        interval,
        repetitions,
        easeFactor,
        nextReviewDate,
        lastReviewedAt: new Date(),
        reviewCount: { increment: 1 },
        successfulReviews: qualityRating >= 3 ? { increment: 1 } : undefined,
        failedReviews: qualityRating < 3 ? { increment: 1 } : undefined,
        status: repetitions >= 5 ? 'MASTERED' : 'ACTIVE',
      },
    });

    // Create review record
    await prisma.spacedRepetitionReview.create({
      data: {
        srId: req.params.id,
        qualityRating,
        previousInterval,
        newInterval: interval,
        previousEf,
        newEf: easeFactor,
      },
    });

    if (qualityRating >= 3) {
      try {
        await learningPathService.markReviewCompleted(req.user!.id, entry.questionId);
      } catch (error) {
        logger.error('Learning-path review completion failed', {
          userId: req.user!.id,
          questionId: entry.questionId,
          error,
        });
      }
    }

    res.json({
      success: true,
      data: serializeSpacedRepetition(updated),
      message: 'Review recorded successfully',
    });
  })
);

/**
 * @route   POST /api/v1/spaced-repetition/questions/:questionId/add
 * @desc    Add a question to spaced repetition
 * @access  Private
 */
router.post(
  '/questions/:questionId/add',
  authenticate,
  asyncHandler(async (req, res) => {
    const questionId = req.params.questionId;

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    // Check if already in spaced repetition
    const existing = await prisma.spacedRepetition.findUnique({
      where: {
        userId_questionId: { userId: req.user!.id, questionId },
      },
    });

    if (existing) {
      throw ApiError.conflict('Question already in spaced repetition');
    }

    // Create entry
    const entry = await prisma.spacedRepetition.create({
      data: {
        userId: req.user!.id,
        questionId,
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        status: 'ACTIVE',
      },
    });

    res.status(201).json({
      success: true,
      data: serializeSpacedRepetition(entry),
      message: 'Question added to spaced repetition',
    });
  })
);

/**
 * @route   DELETE /api/v1/spaced-repetition/:id
 * @desc    Remove question from spaced repetition
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const entry = await prisma.spacedRepetition.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!entry) {
      throw ApiError.notFound('Entry not found');
    }

    await prisma.spacedRepetition.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Question removed from spaced repetition',
    });
  })
);

/**
 * @route   POST /api/v1/spaced-repetition/:id/reset
 * @desc    Reset spaced repetition progress for a question
 * @access  Private
 */
router.post(
  '/:id/reset',
  authenticate,
  asyncHandler(async (req, res) => {
    const entry = await prisma.spacedRepetition.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!entry) {
      throw ApiError.notFound('Entry not found');
    }

    const updated = await prisma.spacedRepetition.update({
      where: { id: req.params.id },
      data: {
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        reviewCount: 0,
        successfulReviews: 0,
        failedReviews: 0,
        status: 'ACTIVE',
      },
    });

    // Delete review history
    await prisma.spacedRepetitionReview.deleteMany({
      where: { srId: req.params.id },
    });

    res.json({
      success: true,
      data: serializeSpacedRepetition(updated),
      message: 'Progress reset successfully',
    });
  })
);

export { router as spacedRepetitionRouter };
