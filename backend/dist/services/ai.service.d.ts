import { AIAnswerEvaluationInput, AIMockInterviewInput, AIResumeAnalysisInput, AIFeedbackOutput, Resource, InterviewQuestion, ResumeParsedData, DetectedSkill } from '../types';
/**
 * AI Service
 *
 * Handles all interactions with LLM APIs for:
 * - Question generation
 * - Answer evaluation
 * - Mock interviews
 * - Resume analysis
 */
declare class AIService {
    private openai;
    private model;
    constructor();
    private hasUsableApiKey;
    /**
     * Evaluate user's code solution
     */
    evaluateAnswer(input: AIAnswerEvaluationInput): Promise<AIFeedbackOutput>;
    /**
     * Generate mock interview question
     */
    generateInterviewQuestion(input: AIMockInterviewInput): Promise<Partial<InterviewQuestion>>;
    /**
     * Evaluate mock interview answer
     */
    evaluateInterviewAnswer(question: string, answer: string, expectedTopics: string[]): Promise<{
        score: number;
        feedback: string;
        followUpNeeded: boolean;
        followUpQuestion?: string;
    }>;
    /**
     * Analyze resume and extract information
     */
    analyzeResume(input: AIResumeAnalysisInput): Promise<{
        parsedData: ResumeParsedData;
        skills: DetectedSkill[];
    }>;
    /**
     * Generate personalized learning recommendations
     */
    generateLearningRecommendations(weakSkills: string[], strongSkills: string[], recentAttempts: {
        skill: string;
        accuracy: number;
    }[]): Promise<{
        recommendations: string[];
        resources: Resource[];
    }>;
    /**
     * Generate interview summary
     */
    generateInterviewSummary(transcript: string, questions: {
        question: string;
        answer: string;
        score: number;
    }[]): Promise<{
        overallScore: number;
        summary: string;
        strengths: string[];
        areasToImprove: string[];
    }>;
    /**
     * Validate AI feedback output structure
     */
    private validateFeedbackOutput;
    private fallbackCodeFeedback;
    private fallbackInterviewQuestion;
    private fallbackInterviewEvaluation;
    private fallbackResumeAnalysis;
    private fallbackLearningRecommendations;
    private fallbackInterviewSummary;
}
export declare const aiService: AIService;
export {};
//# sourceMappingURL=ai.service.d.ts.map