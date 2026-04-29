"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spacedRepetitionRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const errorHandler_1 = require("../middleware/errorHandler");
const apiFormat_1 = require("../utils/apiFormat");
const router = (0, express_1.Router)();
exports.spacedRepetitionRouter = router;
// Validation schemas
const reviewSchema = zod_1.z.object({
    qualityRating: zod_1.z.number().int().min(0).max(5, 'Quality rating must be between 0 and 5'),
});
/**
 * @route   GET /api/v1/spaced-repetition
 * @desc    Get all spaced repetition entries for user
 * @access  Private
 */
router.get('/', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const entries = await database_1.prisma.spacedRepetition.findMany({
        where: { userId: req.user.id },
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
        data: entries.map((entry) => (0, apiFormat_1.serializeSpacedRepetition)(entry)),
    });
}));
/**
 * @route   GET /api/v1/spaced-repetition/due
 * @desc    Get due reviews for today
 * @access  Private
 */
router.get('/due', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const dueReviews = await database_1.prisma.spacedRepetition.findMany({
        where: {
            userId: req.user.id,
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
        data: dueReviews.map((entry) => (0, apiFormat_1.serializeSpacedRepetition)(entry)),
        count: dueReviews.length,
    });
}));
/**
 * @route   GET /api/v1/spaced-repetition/stats
 * @desc    Get spaced repetition statistics
 * @access  Private
 */
router.get('/stats', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [totalCards, masteredCards, dueToday, dueThisWeek, reviewHistory,] = await Promise.all([
        database_1.prisma.spacedRepetition.count({
            where: { userId: req.user.id },
        }),
        database_1.prisma.spacedRepetition.count({
            where: { userId: req.user.id, status: 'MASTERED' },
        }),
        database_1.prisma.spacedRepetition.count({
            where: {
                userId: req.user.id,
                nextReviewDate: { lte: new Date() },
                status: 'ACTIVE',
            },
        }),
        database_1.prisma.spacedRepetition.count({
            where: {
                userId: req.user.id,
                nextReviewDate: {
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
                status: 'ACTIVE',
            },
        }),
        database_1.prisma.spacedRepetitionReview.findMany({
            where: {
                spacedRepetition: { userId: req.user.id },
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
}));
/**
 * @route   GET /api/v1/spaced-repetition/:id
 * @desc    Get spaced repetition entry by ID
 * @access  Private
 */
router.get('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const entry = await database_1.prisma.spacedRepetition.findFirst({
        where: { id: req.params.id, userId: req.user.id },
        include: {
            question: true,
            reviews: {
                orderBy: { reviewedAt: 'desc' },
                take: 10,
            },
        },
    });
    if (!entry) {
        throw errorHandler_1.ApiError.notFound('Entry not found');
    }
    res.json({
        success: true,
        data: (0, apiFormat_1.serializeSpacedRepetition)(entry),
    });
}));
/**
 * @route   POST /api/v1/spaced-repetition/:id/review
 * @desc    Submit a review for spaced repetition item
 * @access  Private
 */
router.post('/:id/review', auth_1.authenticate, (0, validate_1.validate)({ body: reviewSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { qualityRating } = req.body;
    const entry = await database_1.prisma.spacedRepetition.findFirst({
        where: { id: req.params.id, userId: req.user.id },
    });
    if (!entry) {
        throw errorHandler_1.ApiError.notFound('Entry not found');
    }
    // SM-2 Algorithm
    let { interval, repetitions, easeFactor } = entry;
    const previousInterval = interval;
    const previousEf = easeFactor;
    if (qualityRating >= 3) {
        // Correct response
        if (repetitions === 0) {
            interval = 1;
        }
        else if (repetitions === 1) {
            interval = 6;
        }
        else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
    }
    else {
        // Incorrect response
        repetitions = 0;
        interval = 1;
    }
    // Update ease factor
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - qualityRating) * (0.08 + (5 - qualityRating) * 0.02));
    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    // Update entry
    const updated = await database_1.prisma.spacedRepetition.update({
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
    await database_1.prisma.spacedRepetitionReview.create({
        data: {
            srId: req.params.id,
            qualityRating,
            previousInterval,
            newInterval: interval,
            previousEf,
            newEf: easeFactor,
        },
    });
    res.json({
        success: true,
        data: (0, apiFormat_1.serializeSpacedRepetition)(updated),
        message: 'Review recorded successfully',
    });
}));
/**
 * @route   POST /api/v1/spaced-repetition/questions/:questionId/add
 * @desc    Add a question to spaced repetition
 * @access  Private
 */
router.post('/questions/:questionId/add', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const questionId = req.params.questionId;
    // Check if question exists
    const question = await database_1.prisma.question.findUnique({
        where: { id: questionId },
    });
    if (!question) {
        throw errorHandler_1.ApiError.notFound('Question not found');
    }
    // Check if already in spaced repetition
    const existing = await database_1.prisma.spacedRepetition.findUnique({
        where: {
            userId_questionId: { userId: req.user.id, questionId },
        },
    });
    if (existing) {
        throw errorHandler_1.ApiError.conflict('Question already in spaced repetition');
    }
    // Create entry
    const entry = await database_1.prisma.spacedRepetition.create({
        data: {
            userId: req.user.id,
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
        data: (0, apiFormat_1.serializeSpacedRepetition)(entry),
        message: 'Question added to spaced repetition',
    });
}));
/**
 * @route   DELETE /api/v1/spaced-repetition/:id
 * @desc    Remove question from spaced repetition
 * @access  Private
 */
router.delete('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const entry = await database_1.prisma.spacedRepetition.findFirst({
        where: { id: req.params.id, userId: req.user.id },
    });
    if (!entry) {
        throw errorHandler_1.ApiError.notFound('Entry not found');
    }
    await database_1.prisma.spacedRepetition.delete({
        where: { id: req.params.id },
    });
    res.json({
        success: true,
        message: 'Question removed from spaced repetition',
    });
}));
/**
 * @route   POST /api/v1/spaced-repetition/:id/reset
 * @desc    Reset spaced repetition progress for a question
 * @access  Private
 */
router.post('/:id/reset', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const entry = await database_1.prisma.spacedRepetition.findFirst({
        where: { id: req.params.id, userId: req.user.id },
    });
    if (!entry) {
        throw errorHandler_1.ApiError.notFound('Entry not found');
    }
    const updated = await database_1.prisma.spacedRepetition.update({
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
    await database_1.prisma.spacedRepetitionReview.deleteMany({
        where: { srId: req.params.id },
    });
    res.json({
        success: true,
        data: (0, apiFormat_1.serializeSpacedRepetition)(updated),
        message: 'Progress reset successfully',
    });
}));
//# sourceMappingURL=spaced-repetition.routes.js.map