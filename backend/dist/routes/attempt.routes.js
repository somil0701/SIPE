"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attemptRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const attempt_service_1 = require("../services/attempt.service");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
exports.attemptRouter = router;
// Validation schemas
const submitAttemptSchema = zod_1.z.object({
    questionId: zod_1.z.string().uuid('Invalid question ID'),
    code: zod_1.z.string().min(1, 'Code is required'),
    language: zod_1.z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'ruby']),
    timeSpent: zod_1.z.number().int().min(0, 'Time spent must be positive'),
});
const getAttemptsQuerySchema = zod_1.z.object({
    questionId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['PENDING', 'running', 'ACCEPTED', 'wrong_answer', 'time_limit_exceeded', 'RUNTIME_ERROR', 'compilation_error', 'PARTIALLY_ACCEPTED']).optional(),
    page: zod_1.z.string().transform(Number).default('1'),
    limit: zod_1.z.string().transform(Number).default('20'),
});
/**
 * @route   POST /api/v1/attempts
 * @desc    Submit a solution attempt
 * @access  Private
 */
router.post('/', auth_1.authenticate, (0, validate_1.validate)({ body: submitAttemptSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const attempt = await attempt_service_1.attemptService.submitAttempt(req.user.id, req.body);
    res.status(201).json({
        success: true,
        data: attempt,
        message: 'Solution submitted successfully. Evaluation in progress.',
    });
}));
/**
 * @route   GET /api/v1/attempts
 * @desc    Get user's attempts
 * @access  Private
 */
router.get('/', auth_1.authenticate, (0, validate_1.validate)({ query: getAttemptsQuerySchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { questionId, status, page, limit } = req.query;
    const result = await attempt_service_1.attemptService.getUserAttempts(req.user.id, {
        questionId: questionId,
        status: status,
        page: parseInt(page),
        limit: parseInt(limit),
    });
    res.json({
        success: true,
        data: result.attempts,
        meta: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.total,
        },
    });
}));
/**
 * @route   GET /api/v1/attempts/:id
 * @desc    Get attempt by ID
 * @access  Private
 */
router.get('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const attempt = await attempt_service_1.attemptService.getAttemptById(req.params.id, req.user.id);
    res.json({
        success: true,
        data: attempt,
    });
}));
/**
 * @route   GET /api/v1/attempts/:id/feedback
 * @desc    Get AI feedback for attempt
 * @access  Private
 */
router.get('/:id/feedback', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const feedback = await attempt_service_1.attemptService.getAttemptFeedback(req.params.id, req.user.id);
    res.json({
        success: true,
        data: feedback,
    });
}));
//# sourceMappingURL=attempt.routes.js.map