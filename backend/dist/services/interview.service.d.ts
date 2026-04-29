import { InterviewSession, InterviewQuestion, CreateInterviewInput } from '../types';
/**
 * Interview Service
 *
 * Handles mock interview functionality:
 * - Create interview sessions
 * - Generate questions
 * - Evaluate answers
 * - Generate summaries
 */
declare class InterviewService {
    /**
     * Create a new interview session
     */
    createInterview(userId: string, input: CreateInterviewInput): Promise<InterviewSession>;
    /**
     * Start an interview
     */
    startInterview(interviewId: string, userId: string): Promise<InterviewSession>;
    /**
     * Get interview by ID
     */
    getInterview(interviewId: string, userId: string): Promise<InterviewSession>;
    /**
     * Get user's interviews
     */
    getUserInterviews(userId: string, options?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        interviews: InterviewSession[];
        total: number;
    }>;
    /**
     * Get current question for interview
     */
    getCurrentQuestion(interviewId: string, userId: string): Promise<InterviewQuestion | null>;
    /**
     * Submit answer for current question
     */
    submitAnswer(interviewId: string, userId: string, answer: string): Promise<{
        feedback: string;
        score?: number;
        nextQuestion?: InterviewQuestion;
    }>;
    /**
     * Skip current question
     */
    skipQuestion(interviewId: string, userId: string): Promise<InterviewQuestion | null>;
    /**
     * Complete an interview
     */
    completeInterview(interviewId: string, userId?: string): Promise<InterviewSession>;
    /**
     * Generate next question for interview
     */
    private generateNextQuestion;
    /**
     * Add a follow-up question
     */
    private addFollowUpQuestion;
    /**
     * Cancel an interview
     */
    cancelInterview(interviewId: string, userId: string): Promise<void>;
    /**
     * Delete an interview
     */
    deleteInterview(interviewId: string, userId: string): Promise<void>;
    private toPrismaInterviewType;
    private toPrismaInterviewStatus;
    private toPrismaDifficulty;
}
export declare const interviewService: InterviewService;
export {};
//# sourceMappingURL=interview.service.d.ts.map