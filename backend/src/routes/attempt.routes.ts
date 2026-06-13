import { Router } from 'express';
import { z } from 'zod';
import { attemptService } from '../services/attempt.service';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const submitAttemptSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  code: z.string().min(1, 'Code is required'),
  language: z.enum(['javascript', 'python', 'java', 'cpp']),
  timeSpent: z.number().int().min(0, 'Time spent must be positive'),
});

const runCodeSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  code: z.string().min(1, 'Code is required'),
  language: z.enum(['javascript', 'python', 'java', 'cpp']),
  input: z.string().default(''),
});

const getAttemptsQuerySchema = z.object({
  questionId: z.string().uuid().optional(),
  status: z.enum([
    'QUEUED',
    'PENDING',
    'RUNNING',
    'running',
    'ACCEPTED',
    'WRONG_ANSWER',
    'wrong_answer',
    'TIME_LIMIT_EXCEEDED',
    'time_limit_exceeded',
    'RUNTIME_ERROR',
    'runtime_error',
    'COMPILATION_ERROR',
    'compilation_error',
    'PARTIALLY_ACCEPTED',
    'partially_accepted',
  ]).optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

const questionTimelineParamsSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
});

/**
 * @route   POST /api/v1/attempts
 * @desc    Submit a solution attempt
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate({ body: submitAttemptSchema }),
  asyncHandler(async (req, res) => {
    const attempt = await attemptService.submitAttempt(req.user!.id, req.body);
    
    res.status(201).json({
      success: true,
      data: attempt,
      message: 'Solution submitted successfully. Evaluation in progress.',
    });
  })
);

/**
 * @route   POST /api/v1/attempts/run
 * @desc    Run code once with custom stdin without saving an attempt
 * @access  Private
 */
router.post(
  '/run',
  authenticate,
  validate({ body: runCodeSchema }),
  asyncHandler(async (req, res) => {
    const result = await attemptService.runCode(req.user!.id, req.body);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @route   GET /api/v1/attempts
 * @desc    Get user's attempts
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validate({ query: getAttemptsQuerySchema }),
  asyncHandler(async (req, res) => {
    const { questionId, status, page, limit } = req.query;
    const result = await attemptService.getUserAttempts(req.user!.id, {
      questionId: questionId as string,
      status: status as any,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
    
    res.json({
      success: true,
      data: result.attempts,
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total,
      },
    });
  })
);

/**
 * @route   GET /api/v1/attempts/questions/:questionId/timeline
 * @desc    Get user's submission timeline and mistake memory for a question
 * @access  Private
 */
router.get(
  '/questions/:questionId/timeline',
  authenticate,
  validate({ params: questionTimelineParamsSchema }),
  asyncHandler(async (req, res) => {
    const timeline = await attemptService.getQuestionSubmissionTimeline(
      req.user!.id,
      req.params.questionId
    );

    res.json({
      success: true,
      data: timeline,
    });
  })
);

/**
 * @route   GET /api/v1/attempts/:id
 * @desc    Get attempt by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const attempt = await attemptService.getAttemptById(
      req.params.id,
      req.user!.id
    );
    
    res.json({
      success: true,
      data: attempt,
    });
  })
);

/**
 * @route   GET /api/v1/attempts/:id/feedback
 * @desc    Get AI feedback for attempt
 * @access  Private
 */
router.get(
  '/:id/feedback',
  authenticate,
  asyncHandler(async (req, res) => {
    const feedback = await attemptService.getAttemptFeedback(
      req.params.id,
      req.user!.id
    );
    
    res.json({
      success: true,
      data: feedback,
    });
  })
);

export { router as attemptRouter };
