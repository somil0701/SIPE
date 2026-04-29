import { LoginInput, RegisterInput, AuthTokens, User } from '../types';
declare class AuthService {
    /**
     * Register a new user
     */
    register(input: RegisterInput): Promise<{
        user: User;
        tokens: AuthTokens;
    }>;
    /**
     * Login user
     */
    login(input: LoginInput): Promise<{
        user: User;
        tokens: AuthTokens;
    }>;
    /**
     * Refresh access token
     */
    refreshToken(refreshToken: string): Promise<AuthTokens>;
    /**
     * Change user password
     */
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    /**
     * Request password reset
     */
    requestPasswordReset(email: string): Promise<void>;
    /**
     * Get current user
     */
    getCurrentUser(userId: string): Promise<User>;
    /**
     * Initialize user skills for all active skills
     */
    private initializeUserSkills;
    /**
     * Log user activity
     */
    private logActivity;
}
export declare const authService: AuthService;
export {};
//# sourceMappingURL=auth.service.d.ts.map