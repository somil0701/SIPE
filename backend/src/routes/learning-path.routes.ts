import { Router } from 'express';
import { z } from 'zod';
import {
  Difficulty as PrismaDifficulty,
  PathItemStatus as PrismaPathItemStatus,
  PathItemType as PrismaPathItemType,
  PathStatus as PrismaPathStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { analyticsService } from '../services/analytics.service';
import { serializeLearningPath } from '../utils/apiFormat';

const router = Router();

// Validation schemas
const createLearningPathSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  targetSkillId: z.string().uuid().optional(),
  targetCompanyId: z.string().uuid().optional(),
  estimatedHours: z.number().int().min(1).optional(),
});

const updatePathItemSchema = z.object({
  status: z.enum(['PENDING', 'in_progress', 'completed', 'skipped']),
});

const toPrismaPathItemStatus = (status: string): PrismaPathItemStatus => {
  const statusMap: Record<string, PrismaPathItemStatus> = {
    PENDING: PrismaPathItemStatus.PENDING,
    in_progress: PrismaPathItemStatus.IN_PROGRESS,
    completed: PrismaPathItemStatus.COMPLETED,
    skipped: PrismaPathItemStatus.SKIPPED,
  };

  return statusMap[status] ?? PrismaPathItemStatus.PENDING;
};

/**
 * @route   GET /api/v1/learning-paths
 * @desc    Get user's learning paths
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const paths = await prisma.learningPath.findMany({
      where: { userId: req.user!.id },
      include: {
        targetSkill: {
          select: { name: true },
        },
        targetCompany: {
          select: { name: true },
        },
        _count: {
          select: { pathItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: paths.map((path) => serializeLearningPath(path)),
    });
  })
);

/**
 * @route   POST /api/v1/learning-paths
 * @desc    Create a new learning path
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate({ body: createLearningPathSchema }),
  asyncHandler(async (req, res) => {
    const { name, description, targetSkillId, targetCompanyId, estimatedHours } = req.body;

    // Generate personalized path items based on user's weak areas
    const weakTopics = await analyticsService.getWeakTopics(req.user!.id, 5);
    
    // Get questions for weak topics
    const pathItems: {
      itemType: PrismaPathItemType;
      questionId: string;
      title: string;
      description: string;
      orderIndex: number;
      estimatedMinutes: number;
    }[] = [];
    let orderIndex = 1;

    for (const topic of weakTopics) {
      const questions = await prisma.question.findMany({
        where: {
          skillId: topic.skillId,
          isActive: true,
          difficulty: PrismaDifficulty.easy,
        },
        take: 3,
        orderBy: { acceptanceRate: 'desc' },
      });

      for (const question of questions) {
        pathItems.push({
          itemType: PrismaPathItemType.QUESTION,
          questionId: question.id,
          title: question.title,
          description: `Practice ${topic.skillName} with an ${question.difficulty} question.`,
          orderIndex: orderIndex++,
          estimatedMinutes: 30,
        });
      }
    }

    // Create learning path
    const path = await prisma.learningPath.create({
      data: {
        userId: req.user!.id,
        name,
        description,
        targetSkillId,
        targetCompanyId,
        estimatedHours,
        totalItems: pathItems.length,
        pathItems: {
          create: pathItems,
        },
      },
      include: {
        pathItems: {
          include: {
            question: {
              select: {
                id: true,
                title: true,
                difficulty: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: serializeLearningPath(path),
      message: 'Learning path created successfully',
    });
  })
);

/**
 * @route   GET /api/v1/learning-paths/:id
 * @desc    Get learning path by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        pathItems: {
          include: {
            question: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                slug: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        targetSkill: true,
        targetCompany: true,
      },
    });

    if (!path) {
      throw ApiError.notFound('Learning path not found');
    }

    res.json({
      success: true,
      data: serializeLearningPath(path),
    });
  })
);

/**
 * @route   PATCH /api/v1/learning-paths/:id/items/:itemId
 * @desc    Update learning path item status
 * @access  Private
 */
router.patch(
  '/:id/items/:itemId',
  authenticate,
  validate({ body: updatePathItemSchema }),
  asyncHandler(async (req, res) => {
    const prismaStatus = toPrismaPathItemStatus(req.body.status);

    // Verify path belongs to user
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!path) {
      throw ApiError.notFound('Learning path not found');
    }

    // Update item
    const item = await prisma.learningPathItem.update({
      where: { id: req.params.itemId },
      data: {
        status: prismaStatus,
        completedAt: prismaStatus === PrismaPathItemStatus.COMPLETED ? new Date() : null,
      },
    });

    // Update path progress
    const totalItems = await prisma.learningPathItem.count({
      where: { pathId: req.params.id },
    });

    const completedItems = await prisma.learningPathItem.count({
      where: { pathId: req.params.id, status: PrismaPathItemStatus.COMPLETED },
    });

    const isCompleted = totalItems > 0 && completedItems === totalItems;

    await prisma.learningPath.update({
      where: { id: req.params.id },
      data: {
        completedItems,
        progressPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        status: isCompleted ? PrismaPathStatus.COMPLETED : PrismaPathStatus.ACTIVE,
        actualCompletionDate: isCompleted ? new Date() : null,
      },
    });

    res.json({
      success: true,
      data: item,
      message: 'Item updated successfully',
    });
  })
);

/**
 * @route   POST /api/v1/learning-paths/:id/pause
 * @desc    Pause learning path
 * @access  Private
 */
router.post(
  '/:id/pause',
  authenticate,
  asyncHandler(async (req, res) => {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!path) {
      throw ApiError.notFound('Learning path not found');
    }

    await prisma.learningPath.update({
      where: { id: req.params.id },
      data: { status: PrismaPathStatus.PAUSED },
    });

    res.json({
      success: true,
      message: 'Learning path paused',
    });
  })
);

/**
 * @route   POST /api/v1/learning-paths/:id/resume
 * @desc    Resume learning path
 * @access  Private
 */
router.post(
  '/:id/resume',
  authenticate,
  asyncHandler(async (req, res) => {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!path) {
      throw ApiError.notFound('Learning path not found');
    }

    await prisma.learningPath.update({
      where: { id: req.params.id },
      data: { status: PrismaPathStatus.ACTIVE },
    });

    res.json({
      success: true,
      message: 'Learning path resumed',
    });
  })
);

/**
 * @route   DELETE /api/v1/learning-paths/:id
 * @desc    Delete learning path
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!path) {
      throw ApiError.notFound('Learning path not found');
    }

    await prisma.learningPath.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Learning path deleted successfully',
    });
  })
);

export { router as learningPathRouter };
