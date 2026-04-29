"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Auth Service
 *
 * Handles authentication logic:
 * - User registration
 * - User login
 * - Token refresh
 * - Password management
 */
const SALT_ROUNDS = 12;
class AuthService {
    /**
     * Register a new user
     */
    async register(input) {
        const { email, password, fullName } = input;
        // Check if user already exists
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw errorHandler_1.ApiError.conflict('User with this email already exists');
        }
        // Hash password
        const passwordHash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        // Create user
        const user = await database_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                role: 'user',
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                role: true,
                isPremium: true,
                preferredLanguage: true,
                studyGoalMinutes: true,
                onboardingCompleted: true,
                createdAt: true,
            },
        });
        // Initialize user skills for all active skills
        await this.initializeUserSkills(user.id);
        // Generate tokens
        const tokens = (0, auth_1.generateTokens)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        // Build typed response (Prisma enum → User interface)
        const userResponse = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl || undefined,
            role: user.role,
            isPremium: user.isPremium,
            preferredLanguage: user.preferredLanguage,
            studyGoalMinutes: user.studyGoalMinutes,
            onboardingCompleted: user.onboardingCompleted,
            createdAt: user.createdAt,
        };
        // Cache user data
        await redis_1.cache.set(redis_1.cacheKeys.user(user.id), userResponse, redis_1.cacheTTL.user);
        logger_1.logger.info('User registered', { userId: user.id, email });
        return { user: userResponse, tokens };
    }
    /**
     * Login user
     */
    async login(input) {
        const { email, password } = input;
        // Find user
        const user = await database_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user || user.deletedAt) {
            throw errorHandler_1.ApiError.unauthorized('Invalid email or password');
        }
        // Verify password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw errorHandler_1.ApiError.unauthorized('Invalid email or password');
        }
        // Update last login
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                loginCount: { increment: 1 },
            },
        });
        // Generate tokens
        const tokens = (0, auth_1.generateTokens)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        // Prepare user response
        const userResponse = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl || undefined,
            role: user.role,
            isPremium: user.isPremium,
            preferredLanguage: user.preferredLanguage,
            studyGoalMinutes: user.studyGoalMinutes,
            onboardingCompleted: user.onboardingCompleted,
            createdAt: user.createdAt,
        };
        // Cache user data
        await redis_1.cache.set(redis_1.cacheKeys.user(user.id), userResponse, redis_1.cacheTTL.user);
        // Log activity
        await this.logActivity(user.id, 'login');
        logger_1.logger.info('User logged in', { userId: user.id });
        return { user: userResponse, tokens };
    }
    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        // Verify refresh token
        const { userId } = (0, auth_1.verifyRefreshToken)(refreshToken);
        // Check if user exists
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                deletedAt: true,
            },
        });
        if (!user || user.deletedAt) {
            throw errorHandler_1.ApiError.unauthorized('User not found');
        }
        // Generate new tokens
        const tokens = (0, auth_1.generateTokens)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        logger_1.logger.info('Token refreshed', { userId });
        return tokens;
    }
    /**
     * Change user password
     */
    async changePassword(userId, currentPassword, newPassword) {
        // Get user
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw errorHandler_1.ApiError.notFound('User not found');
        }
        // Verify current password
        const isPasswordValid = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw errorHandler_1.ApiError.badRequest('Current password is incorrect');
        }
        // Hash new password
        const newPasswordHash = await bcrypt_1.default.hash(newPassword, SALT_ROUNDS);
        // Update password
        await database_1.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });
        logger_1.logger.info('Password changed', { userId });
    }
    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        const user = await database_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            // Don't reveal if email exists
            logger_1.logger.info('Password reset requested for non-existent email', { email });
            return;
        }
        // Generate reset token (implementation depends on your email service)
        // TODO: Implement email sending
        logger_1.logger.info('Password reset requested', { userId: user.id });
    }
    /**
     * Get current user
     */
    async getCurrentUser(userId) {
        // Try cache first
        const cached = await redis_1.cache.get(redis_1.cacheKeys.user(userId));
        if (cached) {
            return cached;
        }
        // Get from database
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                role: true,
                isPremium: true,
                preferredLanguage: true,
                studyGoalMinutes: true,
                onboardingCompleted: true,
                createdAt: true,
                deletedAt: true, // needed for soft-delete check below
            },
        });
        if (!user || user.deletedAt) {
            throw errorHandler_1.ApiError.notFound('User not found');
        }
        const userResponse = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl || undefined,
            role: user.role,
            isPremium: user.isPremium,
            preferredLanguage: user.preferredLanguage,
            studyGoalMinutes: user.studyGoalMinutes,
            onboardingCompleted: user.onboardingCompleted,
            createdAt: user.createdAt,
        };
        // Cache user data
        await redis_1.cache.set(redis_1.cacheKeys.user(userId), userResponse, redis_1.cacheTTL.user);
        return userResponse;
    }
    /**
     * Initialize user skills for all active skills
     */
    async initializeUserSkills(userId) {
        const skills = await database_1.prisma.skill.findMany({
            where: { isActive: true },
            select: { id: true },
        });
        const userSkillsData = skills.map((skill) => ({
            userId,
            skillId: skill.id,
            proficiencyLevel: 0,
            xpPoints: 0,
        }));
        await database_1.prisma.userSkill.createMany({
            data: userSkillsData,
            skipDuplicates: true,
        });
        logger_1.logger.info('User skills initialized', { userId, skillCount: skills.length });
    }
    /**
     * Log user activity
     */
    async logActivity(userId, activityType) {
        try {
            await database_1.prisma.userActivity.create({
                data: {
                    userId,
                    activityType,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to log activity', { error, userId, activityType });
        }
    }
}
// Export singleton instance
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map