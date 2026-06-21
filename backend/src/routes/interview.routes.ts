import { Router } from 'express';
import { z } from 'zod';
import { interviewService } from '../services/interview.service';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const createInterviewSchema = z.object({
  title: z.string().optional(),
  interviewType: z.enum(['technical', 'behavioral', 'mixed', 'system-design']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  targetCompanyId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(15).max(180).optional(),
  learningPathItemId: z.string().uuid().optional(),
});

const submitAnswerSchema = z.object({
  answer: z.string().min(1, 'Answer is required'),
});

const getInterviewsQuerySchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'abandoned']).optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
});

/**
 * @route   POST /api/v1/interviews
 * @desc    Create a new interview session
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate({ body: createInterviewSchema }),
  asyncHandler(async (req, res) => {
    const interview = await interviewService.createInterview(req.user!.id, {
      ...req.body,
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
    });
    
    res.status(201).json({
      success: true,
      data: interview,
    });
  })
);

/**
 * @route   GET /api/v1/interviews
 * @desc    Get user's interviews
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validate({ query: getInterviewsQuerySchema }),
  asyncHandler(async (req, res) => {
    const page = req.query.page as unknown as number;
    const limit = req.query.limit as unknown as number;
    const status = req.query.status as string | undefined;

    const result = await interviewService.getUserInterviews(req.user!.id, {
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
  })
);

/**
 * @route   GET /api/v1/interviews/:id
 * @desc    Get interview by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const interview = await interviewService.getInterview(
      req.params.id,
      req.user!.id
    );
    
    res.json({
      success: true,
      data: interview,
    });
  })
);

/**
 * @route   POST /api/v1/interviews/:id/start
 * @desc    Start an interview
 * @access  Private
 */
router.post(
  '/:id/start',
  authenticate,
  asyncHandler(async (req, res) => {
    const interview = await interviewService.startInterview(
      req.params.id,
      req.user!.id
    );
    
    res.json({
      success: true,
      data: interview,
      message: 'Interview started successfully',
    });
  })
);

/**
 * @route   GET /api/v1/interviews/:id/current-question
 * @desc    Get current question for interview
 * @access  Private
 */
router.get(
  '/:id/current-question',
  authenticate,
  asyncHandler(async (req, res) => {
    const question = await interviewService.getCurrentQuestion(
      req.params.id,
      req.user!.id
    );
    
    res.json({
      success: true,
      data: question,
    });
  })
);

/**
 * @route   POST /api/v1/interviews/:id/answer
 * @desc    Submit answer for current question
 * @access  Private
 */
router.post(
  '/:id/answer',
  authenticate,
  validate({ body: submitAnswerSchema }),
  asyncHandler(async (req, res) => {
    const result = await interviewService.submitAnswer(
      req.params.id,
      req.user!.id,
      req.body.answer
    );
    
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @route   POST /api/v1/interviews/:id/skip
 * @desc    Skip current question
 * @access  Private
 */
router.post(
  '/:id/skip',
  authenticate,
  asyncHandler(async (req, res) => {
    const nextQuestion = await interviewService.skipQuestion(
      req.params.id,
      req.user!.id
    );
    
    res.json({
      success: true,
      data: { nextQuestion },
    });
  })
);

/**
 * @route   POST /api/v1/interviews/:id/complete
 * @desc    Complete an interview
 * @access  Private
 */
router.post(
  '/:id/complete',
  authenticate,
  asyncHandler(async (req, res) => {
    const interview = await interviewService.completeInterview(req.params.id, req.user!.id);
    
    res.json({
      success: true,
      data: interview,
      message: 'Interview completed successfully',
    });
  })
);

/**
 * @route   POST /api/v1/interviews/:id/cancel
 * @desc    Cancel an interview
 * @access  Private
 */
router.post(
  '/:id/cancel',
  authenticate,
  asyncHandler(async (req, res) => {
    await interviewService.cancelInterview(req.params.id, req.user!.id);
    
    res.json({
      success: true,
      message: 'Interview cancelled successfully',
    });
  })
);

/**
 * @route   DELETE /api/v1/interviews/:id
 * @desc    Delete an interview
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await interviewService.deleteInterview(req.params.id, req.user!.id);
    
    res.json({
      success: true,
      message: 'Interview deleted successfully',
    });
  })
);

export { router as interviewRouter };
