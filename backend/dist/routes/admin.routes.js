"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const admin_service_1 = require("../services/admin.service");
const router = (0, express_1.Router)();
// Protect all admin routes
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('admin'));
router.get('/stats', async (_req, res, next) => {
    try {
        const stats = await admin_service_1.adminService.getDashboardStats();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/growth-chart', async (_req, res, next) => {
    try {
        const chartData = await admin_service_1.adminService.getGrowthChartData();
        res.json({
            success: true,
            data: chartData,
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/users', async (req, res, next) => {
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const search = req.query.search;
        const role = req.query.role;
        const isPremium = req.query.isPremium ? req.query.isPremium === 'true' : undefined;
        const result = await admin_service_1.adminService.getUsers({ page, limit, search, role, isPremium });
        res.json({
            success: true,
            data: result.users,
            meta: result.meta,
        });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/users/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role, isPremium, isBanned } = req.body;
        const user = await admin_service_1.adminService.updateUser(id, { role, isPremium, isBanned });
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
});
// --- Questions ---
router.get('/questions', async (req, res, next) => {
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const search = req.query.search;
        const difficulty = req.query.difficulty;
        const result = await admin_service_1.adminService.getQuestions({ page, limit, search, difficulty });
        res.json({
            success: true,
            data: result.questions,
            meta: result.meta,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/questions', async (req, res, next) => {
    try {
        const question = await admin_service_1.adminService.createQuestion(req.body);
        res.json({
            success: true,
            data: question,
        });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/questions/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const question = await admin_service_1.adminService.updateQuestion(id, req.body);
        res.json({
            success: true,
            data: question,
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/questions/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const question = await admin_service_1.adminService.deleteQuestion(id);
        res.json({
            success: true,
            data: question,
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/skills', async (_req, res, next) => {
    try {
        const skills = await admin_service_1.adminService.getSkills();
        res.json({
            success: true,
            data: skills,
        });
    }
    catch (error) {
        next(error);
    }
});
// --- Mock Interviews ---
router.get('/interviews', async (req, res, next) => {
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const status = req.query.status;
        const result = await admin_service_1.adminService.getMockInterviews({ page, limit, status });
        res.json({
            success: true,
            data: result.interviews,
            meta: result.meta,
        });
    }
    catch (error) {
        next(error);
    }
});
// --- Resumes ---
router.get('/resumes', async (req, res, next) => {
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const status = req.query.status;
        const result = await admin_service_1.adminService.getResumes({ page, limit, status });
        res.json({
            success: true,
            data: result.resumes,
            meta: result.meta,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.adminRoutes = router;
//# sourceMappingURL=admin.routes.js.map