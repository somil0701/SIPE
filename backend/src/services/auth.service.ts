import bcrypt from 'bcrypt';
import { prisma } from '../config/database';
import { cache, cacheKeys, cacheTTL } from '../config/redis';
import { logger } from '../config/logger';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { LoginInput, RegisterInput, AuthTokens, User } from '../types';

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
  async register(input: RegisterInput): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password, fullName } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw ApiError.conflict('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
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
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Build typed response (Prisma enum → User interface)
    const userResponse: User = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl || undefined,
      role: user.role as User['role'],
      isPremium: user.isPremium,
      preferredLanguage: user.preferredLanguage,
      studyGoalMinutes: user.studyGoalMinutes,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    };

    // Cache user data
    await cache.set(cacheKeys.user(user.id), userResponse, cacheTTL.user);

    logger.info('User registered', { userId: user.id, email });

    return { user: userResponse, tokens };
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password } = input;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Prepare user response
    const userResponse: User = {
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
    await cache.set(cacheKeys.user(user.id), userResponse, cacheTTL.user);

    // Log activity
    await this.logActivity(user.id, 'login');

    logger.info('User logged in', { userId: user.id });

    return { user: userResponse, tokens };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const { userId } = verifyRefreshToken(refreshToken);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw ApiError.unauthorized('User not found');
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info('Token refreshed', { userId });

    return tokens;
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    logger.info('Password changed', { userId });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    // Generate reset token (implementation depends on your email service)
    // TODO: Implement email sending

    logger.info('Password reset requested', { userId: user.id });
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string): Promise<User> {
    // Try cache first
    const cached = await cache.get<User>(cacheKeys.user(userId));
    if (cached) {
      return cached;
    }

    // Get from database
    const user = await prisma.user.findUnique({
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
      throw ApiError.notFound('User not found');
    }

    const userResponse: User = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl || undefined,
      role: user.role as User['role'],
      isPremium: user.isPremium,
      preferredLanguage: user.preferredLanguage,
      studyGoalMinutes: user.studyGoalMinutes,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    };

    // Cache user data
    await cache.set(cacheKeys.user(userId), userResponse, cacheTTL.user);

    return userResponse;
  }

  /**
   * Initialize user skills for all active skills
   */
  private async initializeUserSkills(userId: string): Promise<void> {
    const skills = await prisma.skill.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const userSkillsData = skills.map((skill) => ({
      userId,
      skillId: skill.id,
      proficiencyLevel: 0,
      xpPoints: 0,
    }));

    await prisma.userSkill.createMany({
      data: userSkillsData,
      skipDuplicates: true,
    });

    logger.info('User skills initialized', { userId, skillCount: skills.length });
  }

  /**
   * Log user activity
   */
  private async logActivity(userId: string, activityType: string): Promise<void> {
    try {
      await prisma.userActivity.create({
        data: {
          userId,
          activityType,
        },
      });
    } catch (error) {
      logger.error('Failed to log activity', { error, userId, activityType });
    }
  }
}

// Export singleton instance
export const authService = new AuthService();