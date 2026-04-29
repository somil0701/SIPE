"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeService = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const ai_service_1 = require("./ai.service");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
/**
 * Resume Service
 *
 * Handles resume parsing and analysis:
 * - Upload resume
 * - Parse PDF/DOCX
 * - Extract skills
 * - Generate personalized questions
 */
class ResumeService {
    /**
     * Upload and parse resume
     */
    async uploadResume(userId, file, fileUrl) {
        // Deactivate previous resumes
        await database_1.prisma.resume.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
        });
        // Create resume record
        const resume = await database_1.prisma.resume.create({
            data: {
                userId,
                fileName: file.originalname,
                fileUrl,
                fileType: file.mimetype,
                fileSize: file.size,
                parsingStatus: 'PENDING',
                isActive: true,
            },
        });
        // Parse resume asynchronously
        this.parseResume(resume.id, file.buffer).catch((error) => {
            logger_1.logger.error('Resume parsing failed', { error, resumeId: resume.id });
        });
        return resume;
    }
    /**
     * Parse resume content
     */
    async parseResume(resumeId, fileBuffer) {
        try {
            // Update status to processing
            await database_1.prisma.resume.update({
                where: { id: resumeId },
                data: { parsingStatus: 'processing' },
            });
            // Parse PDF
            const pdfData = await (0, pdf_parse_1.default)(fileBuffer);
            const resumeText = pdfData.text;
            // Use AI to extract structured information
            const analysis = await ai_service_1.aiService.analyzeResume({ resumeText });
            // Update resume with parsed data
            await database_1.prisma.resume.update({
                where: { id: resumeId },
                data: {
                    parsedText: resumeText,
                    parsedData: analysis.parsedData,
                    skillsDetected: analysis.skills,
                    experienceYears: this.calculateExperienceYears(analysis.parsedData.experience),
                    education: analysis.parsedData.education,
                    projects: analysis.parsedData.projects,
                    parsingStatus: 'completed',
                    parsedAt: new Date(),
                },
            });
            // Save detected skills
            for (const skill of analysis.skills) {
                // Try to find matching skill in database
                const dbSkill = await database_1.prisma.skill.findFirst({
                    where: {
                        name: { contains: skill.skillName, mode: 'insensitive' },
                        isActive: true,
                    },
                });
                await database_1.prisma.resumeSkill.create({
                    data: {
                        resumeId,
                        skillId: dbSkill?.id,
                        skillName: skill.skillName,
                        confidenceScore: skill.confidenceScore,
                        yearsExperience: skill.yearsExperience,
                        context: skill.context,
                    },
                });
            }
            logger_1.logger.info('Resume parsed successfully', { resumeId });
        }
        catch (error) {
            // Update status to failed
            await database_1.prisma.resume.update({
                where: { id: resumeId },
                data: {
                    parsingStatus: 'failed',
                    parsingError: error instanceof Error ? error.message : 'Unknown error',
                },
            });
            throw error;
        }
    }
    /**
     * Get user's resume
     */
    async getUserResume(userId) {
        const resume = await database_1.prisma.resume.findFirst({
            where: { userId, isActive: true },
            include: {
                resumeSkills: true,
            },
            orderBy: { uploadedAt: 'desc' },
        });
        return resume;
    }
    /**
     * Get all user resumes
     */
    async getUserResumes(userId) {
        const resumes = await database_1.prisma.resume.findMany({
            where: { userId },
            orderBy: { uploadedAt: 'desc' },
        });
        return resumes;
    }
    /**
     * Get resume by ID
     */
    async getResumeById(resumeId, userId) {
        const resume = await database_1.prisma.resume.findFirst({
            where: { id: resumeId, userId },
            include: {
                resumeSkills: true,
            },
        });
        if (!resume) {
            throw errorHandler_1.ApiError.notFound('Resume not found');
        }
        return resume;
    }
    /**
     * Delete resume
     */
    async deleteResume(resumeId, userId) {
        const resume = await database_1.prisma.resume.findFirst({
            where: { id: resumeId, userId },
        });
        if (!resume) {
            throw errorHandler_1.ApiError.notFound('Resume not found');
        }
        await database_1.prisma.resume.delete({
            where: { id: resumeId },
        });
        logger_1.logger.info('Resume deleted', { resumeId });
    }
    /**
     * Get skills gap analysis
     */
    async getSkillsGap(userId) {
        const resume = await database_1.prisma.resume.findFirst({
            where: { userId, isActive: true },
            include: { resumeSkills: true },
        });
        if (!resume) {
            // throw ApiError.notFound('No resume found');
            return null;
        }
        // Get all active skills
        const allSkills = await database_1.prisma.skill.findMany({
            where: { isActive: true },
        });
        const detectedSkillNames = new Set(resume.resumeSkills.map((rs) => rs.skillName.toLowerCase()));
        // Find missing important skills
        const missingSkills = allSkills
            .filter((skill) => !detectedSkillNames.has(skill.name.toLowerCase()) &&
            (skill.category === 'DATA_STRUCTURES' || skill.category === 'ALGORITHMS'))
            .slice(0, 10)
            .map((skill) => ({
            skillName: skill.name,
            importance: skill.difficultyLevel && skill.difficultyLevel <= 3 ? 'high' : 'medium',
        }));
        // Generate recommendations
        const recommendations = this.generateRecommendations(resume.resumeSkills, missingSkills);
        return {
            detectedSkills: resume.resumeSkills,
            missingSkills,
            recommendations,
        };
    }
    /**
     * Generate personalized interview questions based on resume
     */
    async generatePersonalizedQuestions(userId, limit = 5) {
        const resume = await database_1.prisma.resume.findFirst({
            where: { userId, isActive: true },
        });
        if (!resume || !resume.parsedData) {
            throw errorHandler_1.ApiError.notFound('No parsed resume found');
        }
        const parsedData = resume.parsedData;
        // Generate questions based on projects and experience
        const questions = [];
        // Project-based questions
        if (parsedData.projects) {
            for (const project of parsedData.projects.slice(0, 3)) {
                questions.push({
                    question: `Tell me about your project "${project.name}". What was your role and what technical challenges did you face?`,
                    category: 'Project Deep Dive',
                    relevance: 'high',
                });
                if (project.technologies) {
                    questions.push({
                        question: `Why did you choose ${project.technologies[0]} for ${project.name}? What alternatives did you consider?`,
                        category: 'Technical Decision',
                        relevance: 'high',
                    });
                }
            }
        }
        // Experience-based questions
        if (parsedData.experience) {
            for (const exp of parsedData.experience.slice(0, 2)) {
                questions.push({
                    question: `At ${exp.company}, what was the most impactful feature you worked on?`,
                    category: 'Experience',
                    relevance: 'medium',
                });
            }
        }
        // Skill-based questions
        const detectedSkills = resume.skillsDetected || [];
        for (const skill of detectedSkills.slice(0, 3)) {
            questions.push({
                question: `How would you explain ${skill.skillName} to a junior developer?`,
                category: 'Knowledge Assessment',
                relevance: 'high',
            });
        }
        return questions.slice(0, limit);
    }
    /**
     * Calculate total years of experience
     */
    calculateExperienceYears(experience) {
        if (!experience || experience.length === 0) {
            return 0;
        }
        let totalYears = 0;
        for (const exp of experience) {
            if (exp.startDate) {
                const start = new Date(exp.startDate);
                const end = exp.endDate ? new Date(exp.endDate) : new Date();
                const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
                totalYears += years;
            }
        }
        return Math.round(totalYears * 10) / 10;
    }
    /**
     * Generate skill recommendations
     */
    generateRecommendations(detectedSkills, missingSkills) {
        const recommendations = [];
        // Based on missing skills
        if (missingSkills.length > 0) {
            const topMissing = missingSkills.filter((s) => s.importance === 'high').slice(0, 3);
            if (topMissing.length > 0) {
                recommendations.push(`Consider strengthening your knowledge in: ${topMissing.map((s) => s.skillName).join(', ')}`);
            }
        }
        // Based on detected skills
        const strongSkills = detectedSkills.filter((s) => (s.confidenceScore || 0) > 0.8);
        if (strongSkills.length > 0) {
            recommendations.push(`Highlight your expertise in ${strongSkills[0].skillName} during interviews`);
        }
        // General recommendations
        recommendations.push('Practice explaining your projects with focus on technical decisions');
        recommendations.push('Prepare to discuss trade-offs in your technology choices');
        return recommendations;
    }
}
// Export singleton instance
exports.resumeService = new ResumeService();
//# sourceMappingURL=resume.service.js.map