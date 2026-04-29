"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.learningPathRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const errorHandler_1 = require("../middleware/errorHandler");
const analytics_service_1 = require("../services/analytics.service");
const apiFormat_1 = require("../utils/apiFormat");
const router = (0, express_1.Router)();
exports.learningPathRouter = router;
// Validation schemas
const createLearningPathSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    description: zod_1.z.string().optional(),
    targetSkillId: zod_1.z.string().uuid().optional(),
    targetCompanyId: zod_1.z.string().uuid().optional(),
    estimatedHours: zod_1.z.number().int().min(1).optional(),
});
const updatePathItemSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'in_progress', 'completed', 'skipped']),
});
const toPrismaPathItemStatus = (status) => {
    const statusMap = {
        PENDING: client_1.PathItemStatus.PENDING,
        in_progress: client_1.PathItemStatus.IN_PROGRESS,
        completed: client_1.PathItemStatus.COMPLETED,
        skipped: client_1.PathItemStatus.SKIPPED,
    };
    return statusMap[status] ?? client_1.PathItemStatus.PENDING;
};
/**
 * @route   GET /api/v1/learning-paths
 * @desc    Get user's learning paths
 * @access  Private
 */
router.get('/', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const paths = await database_1.prisma.learningPath.findMany({
        where: { userId: req.user.id },
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
        data: paths.map((path) => (0, apiFormat_1.serializeLearningPath)(path)),
    });
}));
/**
 * @route   POST /api/v1/learning-paths
 * @desc    Create a new learning path
 * @access  Private
 */
router.post('/', auth_1.authenticate, (0, validate_1.validate)({ body: createLearningPathSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { name, description, targetSkillId, targetCompanyId, estimatedHours } = req.body;
    // Generate personalized path items based on user's weak areas
    const weakTopics = await analytics_service_1.analyticsService.getWeakTopics(req.user.id, 5);
    // Get questions for weak topics
    const pathItems = [];
    let orderIndex = 1;
    for (const topic of weakTopics) {
        const questions = await database_1.prisma.question.findMany({
            where: {
                skillId: topic.skillId,
                isActive: true,
                difficulty: client_1.Difficulty.easy,
            },
            take: 3,
            orderBy: { acceptanceRate: 'desc' },
        });
        for (const question of questions) {
            pathItems.push({
                itemType: client_1.PathItemType.QUESTION,
                questionId: question.id,
                title: question.title,
                description: `Practice ${topic.skillName} with an ${question.difficulty} question.`,
                orderIndex: orderIndex++,
                estimatedMinutes: 30,
            });
        }
    }
    // Create learning path
    const path = await database_1.prisma.learningPath.create({
        data: {
            userId: req.user.id,
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
        data: (0, apiFormat_1.serializeLearningPath)(path),
        message: 'Learning path created successfully',
    });
}));
/**
 * @route   GET /api/v1/learning-paths/:id
 * @desc    Get learning path by ID
 * @access  Private
 */
router.get('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const path = await database_1.prisma.learningPath.findFirst({
        where: { id: req.params.id, userId: req.user.id },
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
        throw errorHandler_1.ApiError.notFound('Learning path not found');
    }
    res.json({
        success: true,
        data: (0, apiFormat_1.serializeLearningPath)(path),
    });
}));
/**
 * @route   PATCH /api/v1/learning-paths/:id/items/:itemId
 * @desc    Update learning path item status
 * @access  Private
 */
router.patch('/:id/items/:itemId', auth_1.authenticate, (0, validate_1.validate)({ body: updatePathItemSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const prismaStatus = toPrismaPathItemStatus(req.body.status);
    // Verify path belongs to user
    const path = await database_1.prisma.learningPath.findFirst({
        where: { id: req.params.id, userId: req.user.id },
    });
    if (!path) {
        throw errorHandler_1.ApiError.notFound('Learning path not found');
    }
    // Update item
    const item = await database_1.prisma.learningPathItem.update({
        where: { id: req.params.itemId },
        data: {
            status: prismaStatus,
            completedAt: prismaStatus === client_1.PathItemStatus.COMPLETED ? new Date() : null,
        },
    });
    // Update path progress
    const totalItems = await database_1.prisma.learningPathItem.count({
        where: { pathId: req.params.id },
    });
    const completedItems = await database_1.prisma.learningPathItem.count({
        where: { pathId: req.params.id, status: client_1.PathItemStatus.COMPLETED },
    });
    const isCompleted = totalItems > 0 && completedItems === totalItems;
    await database_1.prisma.learningPath.update({
        where: { id: req.params.id },
        data: {
            completedItems,
            progressPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
            status: isCompleted ? client_1.PathStatus.COMPLETED : client_1.PathStatus.ACTIVE,
            actualCompletionDate: isCompleted ? new Date() : null,
        },
    });
    res.json({
        success: true,
        data: item,
        message: 'Item updated successfully',
    });
}));
/**
 * @route   POST /api/v1/learning-paths/:id/pause
 * @desc    Pause learning path
 * @access  Private
 */
router.post('/:id/pause', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const path = await database_1.prisma.learningPath.findFirst({
        where: { id: req.params.id, userId: req.user.id },
    });
    if (!path) {
        throw errorHandler_1.ApiError.notFound('Learning path not found');
    }
    await database_1.prisma.learningPath.update({
        where: { id: req.params.id },
        data: { status: client_1.PathStatus.PAUSED },
    });
    res.json({
        success: true,
        message: 'Learning path paused',
    });
}));
/**
 * @route   POST /api/v1/learning-paths/:id/resume
 * @desc    Resume learning path
 * @access  Private
 */
router.post('/:id/resume', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const path = await database_1.prisma.learningPath.findFirst({
        where: { id: req.params.id, userId: req.user.id },
    });
    if (!path) {
        throw errorHandler_1.ApiError.notFound('Learning path not found');
    }
    await database_1.prisma.learningPath.update({
        where: { id: req.params.id },
        data: { status: client_1.PathStatus.ACTIVE },
    });
    res.json({
        success: true,
        message: 'Learning path resumed',
    });
}));
/**
 * @route   DELETE /api/v1/learning-paths/:id
 * @desc    Delete learning path
 * @access  Private
 */
router.delete('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const path = await database_1.prisma.learningPath.findFirst({
        where: { id: req.params.id, userId: req.user.id },
    });
    if (!path) {
        throw errorHandler_1.ApiError.notFound('Learning path not found');
    }
    await database_1.prisma.learningPath.delete({
        where: { id: req.params.id },
    });
    res.json({
        success: true,
        message: 'Learning path deleted successfully',
    });
}));
//# sourceMappingURL=learning-path.routes.js.map