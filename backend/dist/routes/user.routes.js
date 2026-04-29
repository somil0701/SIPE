"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
exports.userRouter = router;
// Validation schemas
const updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2).optional(),
    preferredLanguage: zod_1.z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'ruby']).optional(),
    studyGoalMinutes: zod_1.z.number().int().min(15).max(480).optional(),
    timezone: zod_1.z.string().optional(),
});
const updateSkillsSchema = zod_1.z.object({
    skills: zod_1.z.array(zod_1.z.object({
        skillId: zod_1.z.string().uuid(),
        proficiencyLevel: zod_1.z.number().int().min(0).max(100),
    })),
});
/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await database_1.prisma.user.findUnique({
        where: { id: req.user.id },
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
        throw errorHandler_1.ApiError.notFound('User not found');
    }
    res.json({
        success: true,
        data: user,
    });
}));
/**
 * @route   PATCH /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.patch('/profile', auth_1.authenticate, (0, validate_1.validate)({ body: updateProfileSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await database_1.prisma.user.update({
        where: { id: req.user.id },
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
    await redis_1.cache.del(redis_1.cacheKeys.user(req.user.id));
    res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully',
    });
}));
/**
 * @route   GET /api/v1/users/skills
 * @desc    Get user's skills
 * @access  Private
 */
router.get('/skills', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const skills = await database_1.prisma.userSkill.findMany({
        where: { userId: req.user.id },
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
}));
/**
 * @route   PUT /api/v1/users/skills
 * @desc    Update user's skills (onboarding)
 * @access  Private
 */
router.put('/skills', auth_1.authenticate, (0, validate_1.validate)({ body: updateSkillsSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { skills } = req.body;
    // Update each skill
    await Promise.all(skills.map(async (skill) => {
        await database_1.prisma.userSkill.updateMany({
            where: {
                userId: req.user.id,
                skillId: skill.skillId,
            },
            data: {
                proficiencyLevel: skill.proficiencyLevel,
            },
        });
    }));
    // Mark onboarding as completed
    await database_1.prisma.user.update({
        where: { id: req.user.id },
        data: { onboardingCompleted: true },
    });
    // Invalidate cache
    await redis_1.cache.delPattern(`user:${req.user.id}:skills*`);
    res.json({
        success: true,
        message: 'Skills updated successfully',
    });
}));
/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [totalAttempts, totalSolved, uniqueQuestions, totalTimeSpent, skillCount,] = await Promise.all([
        database_1.prisma.attempt.count({ where: { userId: req.user.id } }),
        database_1.prisma.attempt.count({ where: { userId: req.user.id, status: 'ACCEPTED' } }),
        database_1.prisma.attempt.groupBy({
            by: ['questionId'],
            where: { userId: req.user.id },
        }),
        database_1.prisma.attempt.aggregate({
            where: { userId: req.user.id },
            _sum: { timeSpent: true },
        }),
        database_1.prisma.userSkill.count({ where: { userId: req.user.id } }),
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
}));
/**
 * @route   DELETE /api/v1/users/account
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete('/account', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await database_1.prisma.user.update({
        where: { id: req.user.id },
        data: {
            deletedAt: new Date(),
            email: `deleted_${Date.now()}_${req.user.email}`,
        },
    });
    // Invalidate cache
    await redis_1.cache.del(redis_1.cacheKeys.user(req.user.id));
    res.json({
        success: true,
        message: 'Account deleted successfully',
    });
}));
//# sourceMappingURL=user.routes.js.map