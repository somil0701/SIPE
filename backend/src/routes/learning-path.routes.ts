import { Router } from 'express';
import { PathItemStatus, PathStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/database';
import { cache, cacheKeys } from '../config/redis';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { serializeLearningPath, serializeLearningPathItem } from '../utils/apiFormat';
import {
  LearningPathGoalType,
  LearningPathInput,
  learningPathService,
} from '../services/learning-path.service';

const router = Router();

const pathInputFields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional(),
  goalType: z.enum(['general', 'skill', 'company', 'interview']).default('general'),
  targetSkillId: z.string().uuid().optional(),
  targetCompanyId: z.string().uuid().optional(),
  weeklyStudyMinutes: z.number().int().min(60).max(2400).default(300),
  targetCompletionDate: z.string().datetime().optional(),
};

const createLearningPathSchema = z.object(pathInputFields).superRefine((value, ctx) => {
  if (value.goalType === 'skill' && !value.targetSkillId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetSkillId'], message: 'Choose a target skill' });
  }
  if (value.goalType === 'company' && !value.targetCompanyId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetCompanyId'], message: 'Choose a target company' });
  }
  if (value.targetCompletionDate && new Date(value.targetCompletionDate) <= new Date()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetCompletionDate'], message: 'Target date must be in the future' });
  }
});

const previewLearningPathSchema = createLearningPathSchema;
const updatePathItemSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
});

const statusMap: Record<string, PathItemStatus> = {
  pending: PathItemStatus.PENDING,
  in_progress: PathItemStatus.IN_PROGRESS,
  completed: PathItemStatus.COMPLETED,
  skipped: PathItemStatus.SKIPPED,
};

function toServiceInput(body: any): LearningPathInput {
  return {
    name: body.name,
    description: body.description,
    goalType: body.goalType as LearningPathGoalType,
    targetSkillId: body.targetSkillId,
    targetCompanyId: body.targetCompanyId,
    weeklyStudyMinutes: body.weeklyStudyMinutes,
    targetCompletionDate: body.targetCompletionDate ? new Date(body.targetCompletionDate) : undefined,
  };
}

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const paths = await prisma.learningPath.findMany({
      where: { userId: req.user!.id },
      include: {
        targetSkill: { select: { id: true, name: true } },
        targetCompany: { select: { id: true, name: true, slug: true } },
        pathItems: {
          where: { status: { in: [PathItemStatus.PENDING, PathItemStatus.IN_PROGRESS] } },
          include: { question: { select: { slug: true, difficulty: true } } },
          orderBy: { orderIndex: 'asc' },
          take: 1,
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });

    res.json({ success: true, data: paths.map((path) => serializeLearningPath(path)) });
  })
);

router.get(
  '/options',
  authenticate,
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await learningPathService.getOptions() });
  })
);

router.get(
  '/today',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await learningPathService.getTodayQueue(req.user!.id) });
  })
);

router.post(
  '/preview',
  authenticate,
  validate({ body: previewLearningPathSchema }),
  asyncHandler(async (req, res) => {
    const preview = await learningPathService.previewPath(req.user!.id, toServiceInput(req.body));
    res.json({ success: true, data: preview });
  })
);

router.post(
  '/',
  authenticate,
  validate({ body: createLearningPathSchema }),
  asyncHandler(async (req, res) => {
    const path = await learningPathService.createPath(req.user!.id, toServiceInput(req.body));
    res.status(201).json({
      success: true,
      data: serializeLearningPath(path),
      message: 'Learning path created successfully',
    });
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        pathItems: {
          include: {
            question: {
              select: { id: true, title: true, difficulty: true, slug: true, skill: { select: { name: true } } },
            },
            attempt: { select: { id: true, status: true, submittedAt: true, aiScore: true } },
          },
          orderBy: { orderIndex: 'asc' },
        },
        targetSkill: true,
        targetCompany: true,
      },
    });

    if (!path) throw ApiError.notFound('Learning path not found');
    res.json({ success: true, data: serializeLearningPath(path) });
  })
);

router.patch(
  '/:id/items/:itemId',
  authenticate,
  validate({ body: updatePathItemSchema }),
  asyncHandler(async (req, res) => {
    const item = await learningPathService.updateItemStatus(
      req.user!.id,
      req.params.id,
      req.params.itemId,
      statusMap[req.body.status]
    );
    res.json({ success: true, data: serializeLearningPathItem(item), message: 'Item updated successfully' });
  })
);

router.post(
  '/:id/rebalance/preview',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await learningPathService.previewRebalance(req.user!.id, req.params.id) });
  })
);

router.post(
  '/:id/rebalance',
  authenticate,
  asyncHandler(async (req, res) => {
    const path = await learningPathService.rebalancePath(req.user!.id, req.params.id);
    res.json({
      success: true,
      data: path ? serializeLearningPath(path) : path,
      message: 'Learning path rebalanced using your latest performance',
    });
  })
);

router.post(
  '/:id/pause',
  authenticate,
  asyncHandler(async (req, res) => {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { status: true },
    });
    if (!path) throw ApiError.notFound('Learning path not found');
    if (path.status !== PathStatus.ACTIVE) throw ApiError.conflict('Only active paths can be paused');
    await prisma.learningPath.update({ where: { id: req.params.id }, data: { status: PathStatus.PAUSED } });
    await cache.del(cacheKeys.dashboard(req.user!.id));
    res.json({ success: true, message: 'Learning path paused' });
  })
);

router.post(
  '/:id/resume',
  authenticate,
  asyncHandler(async (req, res) => {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { status: true },
    });
    if (!path) throw ApiError.notFound('Learning path not found');
    if (path.status !== PathStatus.PAUSED) throw ApiError.conflict('Only paused paths can be resumed');
    await prisma.learningPath.update({ where: { id: req.params.id }, data: { status: PathStatus.ACTIVE } });
    await cache.del(cacheKeys.dashboard(req.user!.id));
    res.json({ success: true, message: 'Learning path resumed' });
  })
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { id: true },
    });
    if (!path) throw ApiError.notFound('Learning path not found');
    await prisma.learningPath.delete({ where: { id: req.params.id } });
    await cache.del(cacheKeys.dashboard(req.user!.id));
    res.json({ success: true, message: 'Learning path deleted successfully' });
  })
);

export { router as learningPathRouter };
