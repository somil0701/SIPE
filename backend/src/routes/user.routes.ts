import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { cache, cacheKeys } from '../config/redis';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  preferredLanguage: z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'ruby']).optional(),
  studyGoalMinutes: z.number().int().min(15).max(480).optional(),
  timezone: z.string().optional(),
});

const updateSkillsSchema = z.object({
  skills: z.array(z.object({
    skillId: z.string().uuid(),
    proficiencyLevel: z.number().int().min(0).max(100),
  })),
});

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        isPremium: true,
        preferredLanguage: true,
        studyGoalMinutes: true,
        timezone: true,
        onboardingCompleted: true,
        createdAt: true,
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  })
);

/**
 * @route   PATCH /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.patch(
  '/profile',
  authenticate,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        preferredLanguage: true,
        studyGoalMinutes: true,
        timezone: true,
        onboardingCompleted: true,
      },
    });

    // Invalidate cache
    await cache.del(cacheKeys.user(req.user!.id));

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  })
);

/**
 * @route   GET /api/v1/users/skills
 * @desc    Get user's skills
 * @access  Private
 */
router.get(
  '/skills',
  authenticate,
  asyncHandler(async (req, res) => {
    const skills = await prisma.userSkill.findMany({
      where: { userId: req.user!.id },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            description: true,
          },
        },
      },
      orderBy: { proficiencyLevel: 'desc' },
    });

    res.json({
      success: true,
      data: skills,
    });
  })
);

/**
 * @route   PUT /api/v1/users/skills
 * @desc    Update user's skills (onboarding)
 * @access  Private
 */
router.put(
  '/skills',
  authenticate,
  validate({ body: updateSkillsSchema }),
  asyncHandler(async (req, res) => {
    const { skills } = req.body;

    // Update each skill
    await Promise.all(
      skills.map(async (skill: { skillId: string; proficiencyLevel: number }) => {
        await prisma.userSkill.updateMany({
          where: {
            userId: req.user!.id,
            skillId: skill.skillId,
          },
          data: {
            proficiencyLevel: skill.proficiencyLevel,
          },
        });
      })
    );

    // Mark onboarding as completed
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { onboardingCompleted: true },
    });

    // Invalidate cache
    await cache.delPattern(`user:${req.user!.id}:skills*`);

    res.json({
      success: true,
      message: 'Skills updated successfully',
    });
  })
);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const [
      totalAttempts,
      totalSolved,
      uniqueQuestions,
      totalTimeSpent,
      skillCount,
    ] = await Promise.all([
      prisma.attempt.count({ where: { userId: req.user!.id } }),
      prisma.attempt.count({ where: { userId: req.user!.id, status: 'ACCEPTED' } }),
      prisma.attempt.groupBy({
        by: ['questionId'],
        where: { userId: req.user!.id },
      }),
      prisma.attempt.aggregate({
        where: { userId: req.user!.id },
        _sum: { timeSpent: true },
      }),
      prisma.userSkill.count({ where: { userId: req.user!.id } }),
    ]);

    res.json({
      success: true,
      data: {
        totalAttempts,
        totalSolved,
        uniqueQuestionsAttempted: uniqueQuestions.length,
        totalTimeSpent: totalTimeSpent._sum.timeSpent || 0,
        skillCount,
        accuracy: totalAttempts > 0 ? Math.round((totalSolved / totalAttempts) * 100) : 0,
      },
    });
  })
);

/**
 * @route   DELETE /api/v1/users/account
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete(
  '/account',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        deletedAt: new Date(),
        email: `deleted_${Date.now()}_${req.user!.email}`,
      },
    });

    // Invalidate cache
    await cache.del(cacheKeys.user(req.user!.id));

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  })
);

export { router as userRouter };