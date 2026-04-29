import { Resume, DetectedSkill } from '../types';
/**
 * Resume Service
 *
 * Handles resume parsing and analysis:
 * - Upload resume
 * - Parse PDF/DOCX
 * - Extract skills
 * - Generate personalized questions
 */
declare class ResumeService {
    /**
     * Upload and parse resume
     */
    uploadResume(userId: string, file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }, fileUrl: string): Promise<Resume>;
    /**
     * Parse resume content
     */
    private parseResume;
    /**
     * Get user's resume
     */
    getUserResume(userId: string): Promise<Resume | null>;
    /**
     * Get all user resumes
     */
    getUserResumes(userId: string): Promise<Resume[]>;
    /**
     * Get resume by ID
     */
    getResumeById(resumeId: string, userId: string): Promise<Resume>;
    /**
     * Delete resume
     */
    deleteResume(resumeId: string, userId: string): Promise<void>;
    /**
     * Get skills gap analysis
     */
    getSkillsGap(userId: string): Promise<{
        detectedSkills: DetectedSkill[];
        missingSkills: {
            skillName: string;
            importance: string;
        }[];
        recommendations: string[];
    } | null>;
    /**
     * Generate personalized interview questions based on resume
     */
    generatePersonalizedQuestions(userId: string, limit?: number): Promise<{
        question: string;
        category: string;
        relevance: string;
    }[]>;
    /**
     * Calculate total years of experience
     */
    private calculateExperienceYears;
    /**
     * Generate skill recommendations
     */
    private generateRecommendations;
}
export declare const resumeService: ResumeService;
export {};
//# sourceMappingURL=resume.service.d.ts.map