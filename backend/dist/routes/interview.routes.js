"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interviewRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const interview_service_1 = require("../services/interview.service");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
exports.interviewRouter = router;
// Validation schemas
const createInterviewSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    interviewType: zod_1.z.enum(['technical', 'behavioral', 'mixed', 'system-design']),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
    targetCompanyId: zod_1.z.string().uuid().optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
    durationMinutes: zod_1.z.number().int().min(15).max(180).optional(),
});
const submitAnswerSchema = zod_1.z.object({
    answer: zod_1.z.string().min(1, 'Answer is required'),
});
const getInterviewsQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'abandoned']).optional(),
    page: zod_1.z.string().transform(Number).default('1'),
    limit: zod_1.z.string().transform(Number).default('10'),
});
/**
 * @route   POST /api/v1/interviews
 * @desc    Create a new interview session
 * @access  Private
 */
router.post('/', auth_1.authenticate, (0, validate_1.validate)({ body: createInterviewSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const interview = await interview_service_1.interviewService.createInterview(req.user.id, {
        ...req.body,
        scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
    });
    res.status(201).json({
        success: true,
        data: interview,
    });
}));
/**
 * @route   GET /api/v1/interviews
 * @desc    Get user's interviews
 * @access  Private
 */
router.get('/', auth_1.authenticate, (0, validate_1.validate)({ query: getInterviewsQuerySchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = req.query.page;
    const limit = req.query.limit;
    const status = req.query.status;
    const result = await interview_service_1.interviewService.getUserInterviews(req.user.id, {
        status,
        page,
        limit,
    });
    res.json({
        success: true,
        data: result.interviews,
        meta: {
            page,
            limit,
            total: result.total,
        },
    });
}));
/**
 * @route   GET /api/v1/interviews/:id
 * @desc    Get interview by ID
 * @access  Private
 */
router.get('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const interview = await interview_service_1.interviewService.getInterview(req.params.id, req.user.id);
    res.json({
        success: true,
        data: interview,
    });
}));
/**
 * @route   POST /api/v1/interviews/:id/start
 * @desc    Start an interview
 * @access  Private
 */
router.post('/:id/start', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const interview = await interview_service_1.interviewService.startInterview(req.params.id, req.user.id);
    res.json({
        success: true,
        data: interview,
        message: 'Interview started successfully',
    });
}));
/**
 * @route   GET /api/v1/interviews/:id/current-question
 * @desc    Get current question for interview
 * @access  Private
 */
router.get('/:id/current-question', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const question = await interview_service_1.interviewService.getCurrentQuestion(req.params.id, req.user.id);
    res.json({
        success: true,
        data: question,
    });
}));
/**
 * @route   POST /api/v1/interviews/:id/answer
 * @desc    Submit answer for current question
 * @access  Private
 */
router.post('/:id/answer', auth_1.authenticate, (0, validate_1.validate)({ body: submitAnswerSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await interview_service_1.interviewService.submitAnswer(req.params.id, req.user.id, req.body.answer);
    res.json({
        success: true,
        data: result,
    });
}));
/**
 * @route   POST /api/v1/interviews/:id/skip
 * @desc    Skip current question
 * @access  Private
 */
router.post('/:id/skip', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const nextQuestion = await interview_service_1.interviewService.skipQuestion(req.params.id, req.user.id);
    res.json({
        success: true,
        data: { nextQuestion },
    });
}));
/**
 * @route   POST /api/v1/interviews/:id/complete
 * @desc    Complete an interview
 * @access  Private
 */
router.post('/:id/complete', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const interview = await interview_service_1.interviewService.completeInterview(req.params.id, req.user.id);
    res.json({
        success: true,
        data: interview,
        message: 'Interview completed successfully',
    });
}));
/**
 * @route   POST /api/v1/interviews/:id/cancel
 * @desc    Cancel an interview
 * @access  Private
 */
router.post('/:id/cancel', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await interview_service_1.interviewService.cancelInterview(req.params.id, req.user.id);
    res.json({
        success: true,
        message: 'Interview cancelled successfully',
    });
}));
/**
 * @route   DELETE /api/v1/interviews/:id
 * @desc    Delete an interview
 * @access  Private
 */
router.delete('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await interview_service_1.interviewService.deleteInterview(req.params.id, req.user.id);
    res.json({
        success: true,
        message: 'Interview deleted successfully',
    });
}));
//# sourceMappingURL=interview.routes.js.map