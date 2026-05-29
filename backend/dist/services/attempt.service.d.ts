import { Attempt, AttemptInput, AttemptFeedback, AttemptStatus, RunCodeInput } from '../types';
/**
 * Attempt Service
 *
 * Handles code submission and evaluation:
 * - Submit solution
 * - Run test cases
 * - Generate AI feedback
 * - Update user skills
 */
declare class AttemptService {
    /**
     * Submit a solution attempt
     */
    submitAttempt(userId: string, input: AttemptInput): Promise<Attempt>;
    /**
     * Evaluate attempt (run test cases + AI feedback)
     */
    private evaluateAttempt;
    /**
     * Run code once with custom stdin without creating a persisted attempt.
     */
    runCode(_userId: string, input: RunCodeInput): Promise<import("../judge/types").JudgeRunResult>;
    /**
     * Get attempt by ID
     */
    getAttemptById(attemptId: string, userId: string): Promise<Attempt>;
    /**
     * Get user's attempts
     */
    getUserAttempts(userId: string, options?: {
        questionId?: string;
        status?: AttemptStatus;
        page?: number;
        limit?: number;
    }): Promise<{
        attempts: Attempt[];
        total: number;
    }>;
    /**
     * Get attempt feedback
     */
    getAttemptFeedback(attemptId: string, userId: string): Promise<AttemptFeedback>;
    /**
     * Update user skills based on attempt
     */
    private updateUserSkills;
    /**
     * Calculate XP gain
     */
    private calculateXPGain;
    /**
     * Calculate proficiency change
     */
    private calculateProficiencyDelta;
    /**
     * Update spaced repetition
     */
    private updateSpacedRepetition;
    private toPrismaAttemptStatus;
}
export declare const attemptService: AttemptService;
export {};
//# sourceMappingURL=attempt.service.d.ts.map