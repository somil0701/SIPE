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
  language: z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'ruby']),
  timeSpent: z.number().int().min(0, 'Time spent must be positive'),
});

const getAttemptsQuerySchema = z.object({
  questionId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'running', 'ACCEPTED', 'wrong_answer', 'time_limit_exceeded', 'RUNTIME_ERROR', 'compilation_error', 'PARTIALLY_ACCEPTED']).optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
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