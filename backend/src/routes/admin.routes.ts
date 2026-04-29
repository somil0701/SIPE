import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { adminService } from '../services/admin.service';

const router = Router();

// Protect all admin routes
router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/growth-chart', async (_req, res, next) => {
  try {
    const chartData = await adminService.getGrowthChartData();
    res.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const isPremium = req.query.isPremium ? req.query.isPremium === 'true' : undefined;

    const result = await adminService.getUsers({ page, limit, search, role, isPremium });
    res.json({
      success: true,
      data: result.users,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, isPremium, isBanned } = req.body;
    
    const user = await adminService.updateUser(id, { role, isPremium, isBanned });
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// --- Questions ---

router.get('/questions', async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string;
    const difficulty = req.query.difficulty as string;

    const result = await adminService.getQuestions({ page, limit, search, difficulty });
    res.json({
      success: true,
      data: result.questions,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/questions', async (req, res, next) => {
  try {
    const question = await adminService.createQuestion(req.body);
    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const question = await adminService.updateQuestion(id, req.body);
    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const question = await adminService.deleteQuestion(id);
    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/skills', async (_req, res, next) => {
  try {
    const skills = await adminService.getSkills();
    res.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    next(error);
  }
});

// --- Mock Interviews ---
router.get('/interviews', async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const status = req.query.status as string;

    const result = await adminService.getMockInterviews({ page, limit, status });
    res.json({
      success: true,
      data: result.interviews,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

// --- Resumes ---
router.get('/resumes', async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const status = req.query.status as string;

    const result = await adminService.getResumes({ page, limit, status });
    res.json({
      success: true,
      data: result.resumes,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

export const adminRoutes = router;
