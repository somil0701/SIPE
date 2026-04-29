import { Router } from 'express';
import { z } from 'zod';
import { questionService } from '../services/question.service';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const questionFilterSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  skillId: z.string().uuid().optional(),
  type: z.enum(['coding', 'system-design', 'behavioral', 'theoretical', 'quiz']).optional(),
  company: z.string().optional(),
  search: z.string().optional(),
  isPremium: z.boolean().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

/**
 * @route   GET /api/v1/questions
 * @desc    Get all questions with filtering
 * @access  Public
 */
router.get(
  '/',
  optionalAuth,
  validate({ query: questionFilterSchema }),
  asyncHandler(async (req, res) => {
    const page = req.query.page as unknown as number;
    const limit = req.query.limit as unknown as number;
    const result = await questionService.getQuestions(
      req.query,
      req.user?.id
    );
    
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
  })
);

/**
 * @route   GET /api/v1/questions/search
 * @desc    Search questions
 * @access  Public
 * NOTE: must be declared BEFORE /:id to avoid Express matching "search" as an id
 */
router.get(
  '/search',
  validate({ query: searchSchema }),
  asyncHandler(async (req, res) => {
    const { q, page, limit } = req.query as { q: string; page: unknown; limit: unknown };
    const result = await questionService.searchQuestions(
      q,
      page as number,
      limit as number
    );
    
    res.json({
      success: true,
      data: result.questions,
      meta: {
        page,
        limit,
        total: result.total,
      },
    });
  })
);

/**
 * @route   GET /api/v1/questions/recommended
 * @desc    Get recommended questions for user
 * @access  Private
 * NOTE: must be declared BEFORE /:id
 */
router.get(
  '/recommended',
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const questions = await questionService.getRecommendedQuestions(
      req.user!.id,
      limit
    );
    
    res.json({
      success: true,
      data: questions,
    });
  })
);

/**
 * @route   GET /api/v1/questions/due-reviews
 * @desc    Get due review questions (spaced repetition)
 * @access  Private
 * NOTE: must be declared BEFORE /:id
 */
router.get(
  '/due-reviews',
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const questions = await questionService.getDueReviewQuestions(
      req.user!.id,
      limit
    );
    
    res.json({
      success: true,
      data: questions,
    });
  })
);

/**
 * @route   GET /api/v1/questions/company/:company
 * @desc    Get questions for specific company
 * @access  Public
 * NOTE: must be declared BEFORE /:id
 */
router.get(
  '/company/:company',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await questionService.getCompanyQuestions(
      req.params.company,
      page,
      limit
    );
    
    res.json({
      success: true,
      data: result.questions,
      meta: {
        page,
        limit,
        total: result.total,
      },
    });
  })
);

/**
 * @route   GET /api/v1/questions/slug/:slug
 * @desc    Get question by slug
 * @access  Public
 * NOTE: must be declared BEFORE /:id to avoid "slug" being treated as an id param
 */
router.get(
  '/slug/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const question = await questionService.getQuestionBySlug(
      req.params.slug,
      req.user?.id
    );
    
    res.json({
      success: true,
      data: question,
    });
  })
);

/**
 * @route   GET /api/v1/questions/:id
 * @desc    Get question by ID
 * @access  Public
 * NOTE: this MUST come LAST among GET routes to avoid shadowing specific paths above
 */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const question = await questionService.getQuestionById(
      req.params.id,
      req.user?.id
    );
    
    res.json({
      success: true,
      data: question,
    });
  })
);

export { router as questionRouter };