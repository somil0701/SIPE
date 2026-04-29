"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
exports.authRouter = router;
// Validation schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    fullName: zod_1.z.string().min(2, 'Full name must be at least 2 characters'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z.string()
        .min(8, 'New password must be at least 8 characters')
        .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'New password must contain at least one number'),
});
/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', (0, validate_1.validate)({ body: registerSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await auth_service_1.authService.register(req.body);
    res.status(201).json({
        success: true,
        data: result,
    });
}));
/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', (0, validate_1.validate)({ body: loginSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await auth_service_1.authService.login(req.body);
    res.json({
        success: true,
        data: result,
    });
}));
/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', (0, validate_1.validate)({ body: refreshTokenSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const tokens = await auth_service_1.authService.refreshToken(req.body.refreshToken);
    res.json({
        success: true,
        data: tokens,
    });
}));
/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await auth_service_1.authService.getCurrentUser(req.user.id);
    res.json({
        success: true,
        data: { user },
    });
}));
/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', auth_1.authenticate, (0, validate_1.validate)({ body: changePasswordSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await auth_service_1.authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.json({
        success: true,
        message: 'Password changed successfully',
    });
}));
/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client should discard tokens)
 * @access  Private
 */
router.post('/logout', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    // In a stateless JWT setup, logout is handled client-side
    // Here we could add token to a blacklist if needed
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
}));
//# sourceMappingURL=auth.routes.js.map