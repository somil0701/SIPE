import { Router } from 'express';
import { z } from 'zod';
import { assessmentService } from '../services/assessment.service';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const id = z.string().uuid();
const language = z.enum(['javascript', 'python', 'java', 'cpp']);

const createSchema = z.object({
  learningPathItemId: id.optional(),
  targetSkillId: id.optional(),
  targetCompanyId: id.optional(),
  questionCount: z.number().int().min(2).max(3).optional(),
  durationMinutes: z.number().int().min(15).max(180).optional(),
});

const paramsSchema = z.object({ id });
const questionParamsSchema = z.object({ id, questionId: id });
const runSchema = z.object({
  code: z.string().min(1),
  language,
  input: z.string().max(20_000).optional().default(''),
});
const submitSchema = z.object({
  code: z.string().min(1),
  language,
  submissionKey: z.string().min(8).max(100),
});

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await assessmentService.listAssessments(req.user!.id) });
  })
);

router.post(
  '/',
  authenticate,
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const assessment = await assessmentService.createAssessment(req.user!.id, req.body);
    res.status(201).json({ success: true, data: assessment });
  })
);

router.get(
  '/:id',
  authenticate,
  validate({ params: paramsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await assessmentService.getAssessment(req.params.id, req.user!.id) });
  })
);

router.post(
  '/:id/start',
  authenticate,
  validate({ params: paramsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await assessmentService.startAssessment(req.params.id, req.user!.id) });
  })
);

router.post(
  '/:id/questions/:questionId/run',
  authenticate,
  validate({ params: questionParamsSchema, body: runSchema }),
  asyncHandler(async (req, res) => {
    const data = await assessmentService.runCode(
      req.params.id,
      req.params.questionId,
      req.user!.id,
      req.body
    );
    res.json({ success: true, data });
  })
);

router.post(
  '/:id/questions/:questionId/submit',
  authenticate,
  validate({ params: questionParamsSchema, body: submitSchema }),
  asyncHandler(async (req, res) => {
    const data = await assessmentService.submitQuestion(
      req.params.id,
      req.params.questionId,
      req.user!.id,
      req.body
    );
    res.status(201).json({ success: true, data });
  })
);

router.post(
  '/:id/questions/:questionId/skip',
  authenticate,
  validate({ params: questionParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await assessmentService.skipQuestion(req.params.id, req.params.questionId, req.user!.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/:id/complete',
  authenticate,
  validate({ params: paramsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await assessmentService.completeAssessment(req.params.id, req.user!.id) });
  })
);

router.post(
  '/:id/abandon',
  authenticate,
  validate({ params: paramsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await assessmentService.abandonAssessment(req.params.id, req.user!.id) });
  })
);

export { router as assessmentRouter };
