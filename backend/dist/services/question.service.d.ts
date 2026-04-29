import { Question, QuestionFilter } from '../types';
/**
 * Question Service
 *
 * Handles question-related operations:
 * - Fetch questions with filters
 * - Get question details
 * - Adaptive question selection
 * - Search functionality
 */
declare class QuestionService {
    /**
     * Get questions with filtering and pagination
     */
    getQuestions(filter: QuestionFilter, userId?: string): Promise<{
        questions: Question[];
        total: number;
        totalPages: number;
    }>;
    /**
     * Get question by ID
     */
    getQuestionById(questionId: string, userId?: string): Promise<Question>;
    /**
     * Get question by slug
     */
    getQuestionBySlug(slug: string, _userId?: string): Promise<Question>;
    /**
     * Get recommended questions for user (adaptive learning)
     */
    getRecommendedQuestions(userId: string, limit?: number): Promise<Question[]>;
    /**
     * Get questions for spaced repetition review
     */
    getDueReviewQuestions(userId: string, limit?: number): Promise<Question[]>;
    /**
     * Search questions
     */
    searchQuestions(query: string, page?: number, limit?: number): Promise<{
        questions: Question[];
        total: number;
    }>;
    /**
     * Get company-specific questions
     */
    getCompanyQuestions(company: string, page?: number, limit?: number): Promise<{
        questions: Question[];
        total: number;
    }>;
    /**
     * Add attempt status to questions
     */
    private addAttemptStatus;
    /**
     * Map proficiency level to difficulty
     */
    private mapProficiencyToDifficulty;
    /**
     * Increment question attempt count
     */
    incrementAttemptCount(questionId: string, solved: boolean): Promise<void>;
    private toPrismaQuestionType;
    private getSafeSortField;
}
export declare const questionService: QuestionService;
export {};
//# sourceMappingURL=question.service.d.ts.map