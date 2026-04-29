"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const analytics_service_1 = require("../services/analytics.service");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
exports.analyticsRouter = router;
// Validation schemas
const getDailyAnalyticsSchema = zod_1.z.object({
    days: zod_1.z.string().transform(Number).default('30'),
});
const getLeaderboardSchema = zod_1.z.object({
    type: zod_1.z.enum(['global', 'weekly']).default('global'),
    limit: zod_1.z.string().transform(Number).default('10'),
});
/**
 * @route   GET /api/v1/analytics
 * @desc    Get comprehensive user analytics
 * @access  Private
 */
router.get('/', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const analytics = await analytics_service_1.analyticsService.getUserAnalytics(req.user.id);
    res.json({
        success: true,
        data: analytics,
    });
}));
/**
 * @route   GET /api/v1/analytics/daily
 * @desc    Get daily analytics
 * @access  Private
 */
router.get('/daily', auth_1.authenticate, (0, validate_1.validate)({ query: getDailyAnalyticsSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const days = parseInt(req.query.days);
    const analytics = await analytics_service_1.analyticsService.getDailyAnalytics(req.user.id, days);
    res.json({
        success: true,
        data: analytics,
    });
}));
/**
 * @route   GET /api/v1/analytics/weak-topics
 * @desc    Get user's weak topics
 * @access  Private
 */
router.get('/weak-topics', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const weakTopics = await analytics_service_1.analyticsService.getWeakTopics(req.user.id, limit);
    res.json({
        success: true,
        data: weakTopics,
    });
}));
/**
 * @route   GET /api/v1/analytics/strong-topics
 * @desc    Get user's strong topics
 * @access  Private
 */
router.get('/strong-topics', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const strongTopics = await analytics_service_1.analyticsService.getStrongTopics(req.user.id, limit);
    res.json({
        success: true,
        data: strongTopics,
    });
}));
/**
 * @route   GET /api/v1/analytics/leaderboard
 * @desc    Get leaderboard
 * @access  Public
 */
router.get('/leaderboard', (0, validate_1.validate)({ query: getLeaderboardSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { type, limit } = req.query;
    const leaderboard = await analytics_service_1.analyticsService.getLeaderboard(type, parseInt(limit));
    res.json({
        success: true,
        data: leaderboard,
    });
}));
//# sourceMappingURL=analytics.routes.js.map