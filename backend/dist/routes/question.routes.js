"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const question_service_1 = require("../services/question.service");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
exports.questionRouter = router;
// Validation schemas
const questionFilterSchema = zod_1.z.object({
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
    skillId: zod_1.z.string().uuid().optional(),
    type: zod_1.z.enum(['coding', 'system-design', 'behavioral', 'theoretical', 'quiz']).optional(),
    company: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    isPremium: zod_1.z.boolean().optional(),
    page: zod_1.z.string().transform(Number).default('1'),
    limit: zod_1.z.string().transform(Number).default('20'),
    sortBy: zod_1.z.string().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
const searchSchema = zod_1.z.object({
    q: zod_1.z.string().min(1, 'Search query is required'),
    page: zod_1.z.string().transform(Number).default('1'),
    limit: zod_1.z.string().transform(Number).default('20'),
});
/**
 * @route   GET /api/v1/questions
 * @desc    Get all questions with filtering
 * @access  Public
 */
router.get('/', auth_1.optionalAuth, (0, validate_1.validate)({ query: questionFilterSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = req.query.page;
    const limit = req.query.limit;
    const result = await question_service_1.questionService.getQuestions(req.query, req.user?.id);
    res.json({
        success: true,
        data: result.questions,
        meta: {
            page,
            limit,
            total: result.total,
            totalPages: result.totalPages,
            hasNext: page < result.totalPages,
            hasPrev: page > 1,
        },
    });
}));
/**
 * @route   GET /api/v1/questions/search
 * @desc    Search questions
 * @access  Public
 * NOTE: must be declared BEFORE /:id to avoid Express matching "search" as an id
 */
router.get('/search', (0, validate_1.validate)({ query: searchSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q, page, limit } = req.query;
    const result = await question_service_1.questionService.searchQuestions(q, page, limit);
    res.json({
        success: true,
        data: result.questions,
        meta: {
            page,
            limit,
            total: result.total,
        },
    });
}));
/**
 * @route   GET /api/v1/questions/recommended
 * @desc    Get recommended questions for user
 * @access  Private
 * NOTE: must be declared BEFORE /:id
 */
router.get('/recommended', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const questions = await question_service_1.questionService.getRecommendedQuestions(req.user.id, limit);
    res.json({
        success: true,
        data: questions,
    });
}));
/**
 * @route   GET /api/v1/questions/due-reviews
 * @desc    Get due review questions (spaced repetition)
 * @access  Private
 * NOTE: must be declared BEFORE /:id
 */
router.get('/due-reviews', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const questions = await question_service_1.questionService.getDueReviewQuestions(req.user.id, limit);
    res.json({
        success: true,
        data: questions,
    });
}));
/**
 * @route   GET /api/v1/questions/company/:company
 * @desc    Get questions for specific company
 * @access  Public
 * NOTE: must be declared BEFORE /:id
 */
router.get('/company/:company', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await question_service_1.questionService.getCompanyQuestions(req.params.company, page, limit);
    res.json({
        success: true,
        data: result.questions,
        meta: {
            page,
            limit,
            total: result.total,
        },
    });
}));
/**
 * @route   GET /api/v1/questions/slug/:slug
 * @desc    Get question by slug
 * @access  Public
 * NOTE: must be declared BEFORE /:id to avoid "slug" being treated as an id param
 */
router.get('/slug/:slug', auth_1.optionalAuth, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const question = await question_service_1.questionService.getQuestionBySlug(req.params.slug, req.user?.id);
    res.json({
        success: true,
        data: question,
    });
}));
/**
 * @route   GET /api/v1/questions/:id
 * @desc    Get question by ID
 * @access  Public
 * NOTE: this MUST come LAST among GET routes to avoid shadowing specific paths above
 */
router.get('/:id', auth_1.optionalAuth, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const question = await question_service_1.questionService.getQuestionById(req.params.id, req.user?.id);
    res.json({
        success: true,
        data: question,
    });
}));
//# sourceMappingURL=question.routes.js.map