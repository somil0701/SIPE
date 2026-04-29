"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interviewService = void 0;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const ai_service_1 = require("./ai.service");
const apiFormat_1 = require("../utils/apiFormat");
/**
 * Interview Service
 *
 * Handles mock interview functionality:
 * - Create interview sessions
 * - Generate questions
 * - Evaluate answers
 * - Generate summaries
 */
class InterviewService {
    /**
     * Create a new interview session
     */
    async createInterview(userId, input) {
        const { title, interviewType, difficulty, targetCompanyId, scheduledAt, durationMinutes } = input;
        const interview = await database_1.prisma.interviewSession.create({
            data: {
                userId,
                title: title || `${interviewType} Interview`,
                interviewType: this.toPrismaInterviewType(interviewType),
                difficulty: difficulty ? this.toPrismaDifficulty(difficulty) : client_1.Difficulty.medium,
                targetCompanyId,
                scheduledAt: scheduledAt || new Date(),
                durationMinutes: durationMinutes || 60,
                status: client_1.InterviewStatus.SCHEDULED,
            },
        });
        logger_1.logger.info('Interview session created', { interviewId: interview.id, userId });
        return (0, apiFormat_1.serializeInterview)(interview);
    }
    /**
     * Start an interview
     */
    async startInterview(interviewId, userId) {
        const interview = await database_1.prisma.interviewSession.findFirst({
            where: { id: interviewId, userId },
        });
        if (!interview) {
            throw errorHandler_1.ApiError.notFound('Interview not found');
        }
        if (interview.status !== client_1.InterviewStatus.SCHEDULED) {
            throw errorHandler_1.ApiError.badRequest('Interview has already started or completed');
        }
        const updated = await database_1.prisma.interviewSession.update({
            where: { id: interviewId },
            data: {
                status: client_1.InterviewStatus.IN_PROGRESS,
                startedAt: new Date(),
            },
        });
        // Generate first question
        await this.generateNextQuestion(interviewId, userId);
        return (0, apiFormat_1.serializeInterview)(updated);
    }
    /**
     * Get interview by ID
     */
    async getInterview(interviewId, userId) {
        const interview = await database_1.prisma.interviewSession.findFirst({
            where: { id: interviewId, userId },
            include: {
                interviewQuestions: {
                    orderBy: { questionOrder: 'asc' },
                },
                targetCompany: true,
            },
        });
        if (!interview) {
            throw errorHandler_1.ApiError.notFound('Interview not found');
        }
        return (0, apiFormat_1.serializeInterview)(interview);
    }
    /**
     * Get user's interviews
     */
    async getUserInterviews(userId, options = {}) {
        const { status, page = 1, limit = 10 } = options;
        const where = { userId };
        if (status)
            where.status = this.toPrismaInterviewStatus(status);
        const interviews = await database_1.prisma.interviewSession.findMany({
            where,
            include: {
                targetCompany: {
                    select: { name: true, logoUrl: true },
                },
                _count: {
                    select: { interviewQuestions: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
        const total = await database_1.prisma.interviewSession.count({ where });
        return {
            interviews: interviews.map((interview) => (0, apiFormat_1.serializeInterview)(interview)),
            total,
        };
    }
    /**
     * Get current question for interview
     */
    async getCurrentQuestion(interviewId, userId) {
        const interview = await database_1.prisma.interviewSession.findFirst({
            where: { id: interviewId, userId },
        });
        if (!interview) {
            throw errorHandler_1.ApiError.notFound('Interview not found');
        }
        const currentQuestion = await database_1.prisma.interviewQuestion.findFirst({
            where: {
                interviewSessionId: interviewId,
                userAnswer: null,
            },
            orderBy: { questionOrder: 'asc' },
        });
        return currentQuestion;
    }
    /**
     * Submit answer for current question
     */
    async submitAnswer(interviewId, userId, answer) {
        const interview = await database_1.prisma.interviewSession.findFirst({
            where: { id: interviewId, userId },
            include: {
                interviewQuestions: {
                    orderBy: { questionOrder: 'asc' },
                },
            },
        });
        if (!interview) {
            throw errorHandler_1.ApiError.notFound('Interview not found');
        }
        if (interview.status !== client_1.InterviewStatus.IN_PROGRESS) {
            throw errorHandler_1.ApiError.badRequest('Interview is not in progress');
        }
        // Get current question
        const currentQuestion = await database_1.prisma.interviewQuestion.findFirst({
            where: {
                interviewSessionId: interviewId,
                userAnswer: null,
            },
            orderBy: { questionOrder: 'asc' },
        });
        if (!currentQuestion) {
            throw errorHandler_1.ApiError.badRequest('No active question');
        }
        // Evaluate answer with AI
        const evaluation = await ai_service_1.aiService.evaluateInterviewAnswer(currentQuestion.questionText, answer, currentQuestion.expectedTopics);
        // Update question with answer and evaluation
        await database_1.prisma.interviewQuestion.update({
            where: { id: currentQuestion.id },
            data: {
                userAnswer: answer,
                answerSubmittedAt: new Date(),
                aiEvaluation: evaluation.feedback,
                score: evaluation.score,
                followUpNeeded: evaluation.followUpNeeded,
            },
        });
        // Generate next question or complete interview
        let nextQuestion;
        if (evaluation.followUpNeeded && evaluation.followUpQuestion) {
            // Add follow-up question
            nextQuestion = await this.addFollowUpQuestion(interviewId, evaluation.followUpQuestion, currentQuestion.questionOrder + 1);
        }
        else {
            // Check if we should generate next question or complete
            const questionCount = interview.interviewQuestions.length;
            const elapsedMinutes = interview.startedAt
                ? Math.floor((Date.now() - interview.startedAt.getTime()) / (1000 * 60))
                : 0;
            if (questionCount < 5 && elapsedMinutes < (interview.durationMinutes || 60)) {
                nextQuestion = await this.generateNextQuestion(interviewId, userId);
            }
            else {
                await this.completeInterview(interviewId, userId);
            }
        }
        return {
            feedback: evaluation.feedback,
            score: evaluation.score,
            nextQuestion,
        };
    }
    /**
     * Skip current question
     */
    async skipQuestion(interviewId, userId) {
        const interview = await database_1.prisma.interviewSession.findFirst({
            where: { id: interviewId, userId },
        });
        if (!interview) {
            throw errorHandler_1.ApiError.notFound('Interview not found');
        }
        // Mark current question as skipped (empty answer)
        const currentQuestion = await database_1.prisma.interviewQuestion.findFirst({
            where: {
                interviewSessionId: interviewId,
                userAnswer: null,
            },
            orderBy: { questionOrder: 'asc' },
        });
        if (currentQuestion) {
            await database_1.prisma.interviewQuestion.update({
                where: { id: currentQuestion.id },
                data: {
                    userAnswer: '[Skipped]',
                    answerSubmittedAt: new Date(),
                    score: 0,
                },
            });
        }
        // Generate next question or complete
        const questionCount = await database_1.prisma.interviewQuestion.count({
            where: { interviewSessionId: interviewId },
        });
        const elapsedMinutes = interview.startedAt
            ? Math.floor((Date.now() - interview.startedAt.getTime()) / (1000 * 60))
            : 0;
        if (questionCount < 5 && elapsedMinutes < (interview.durationMinutes || 60)) {
            return this.generateNextQuestion(interviewId, userId);
        }
        else {
            await this.completeInterview(interviewId, userId);
            return null;
        }
    }
    /**
     * Complete an interview
     */
    async completeInterview(interviewId, userId) {
        const interview = await database_1.prisma.interviewSession.findFirst({
            where: {
                id: interviewId,
                ...(userId ? { userId } : {}),
            },
            include: {
                interviewQuestions: {
                    orderBy: { questionOrder: 'asc' },
                },
            },
        });
        if (!interview) {
            throw errorHandler_1.ApiError.notFound('Interview not found');
        }
        // Calculate scores
        const questions = interview.interviewQuestions;
        const scores = questions.map((q) => q.score || 0).filter((s) => s > 0);
        const overallScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
        // Generate transcript
        const transcript = questions
            .map((q) => `Q: ${q.questionText}\nA: ${q.userAnswer || '[No answer]'}\nFeedback: ${q.aiEvaluation || ''}\n`)
            .join('\n---\n');
        // Generate summary with AI
        const summary = await ai_service_1.aiService.generateInterviewSummary(transcript, questions.map((q) => ({
            question: q.questionText,
            answer: q.userAnswer || '',
            score: q.score || 0,
        })));
        // Update interview
        const updated = await database_1.prisma.interviewSession.update({
            where: { id: interviewId },
            data: {
                status: client_1.InterviewStatus.COMPLETED,
                endedAt: new Date(),
                overallScore,
                transcript,
                summaryFeedback: summary.summary,
                strengths: summary.strengths,
                areasToImprove: summary.areasToImprove,
            },
        });
        logger_1.logger.info('Interview completed', { interviewId, overallScore });
        return (0, apiFormat_1.serializeInterview)(updated);
    }
    /**
     * Generate next question for interview
     */
    async generateNextQuestion(interviewId, userId) {
        const interview = await database_1.prisma.interviewSession.findUnique({
            where: { id: interviewId },
            include: {
                interviewQuestions: {
                    orderBy: { questionOrder: 'asc' },
                },
                targetCompany: true,
            },
        });
        if (!interview) {
            throw errorHandler_1.ApiError.notFound('Interview not found');
        }
        // Get user's resume for personalization
        const resume = await database_1.prisma.resume.findFirst({
            where: { userId, isActive: true },
            orderBy: { uploadedAt: 'desc' },
        });
        // Get user's skills
        const userSkills = await database_1.prisma.userSkill.findMany({
            where: { userId },
            include: { skill: true },
            orderBy: { proficiencyLevel: 'asc' },
            take: 5,
        });
        // Generate question with AI
        const questionData = await ai_service_1.aiService.generateInterviewQuestion({
            interviewType: (0, apiFormat_1.interviewTypeForApi)(interview.interviewType),
            difficulty: interview.difficulty,
            previousQuestions: interview.interviewQuestions.map((q) => q.questionText),
            userSkills: userSkills.map((us) => us.skill.name),
            resumeData: resume?.parsedData,
        });
        // Create question
        const question = await database_1.prisma.interviewQuestion.create({
            data: {
                interviewSessionId: interviewId,
                questionText: questionData.questionText,
                questionType: questionData.questionType,
                expectedTopics: questionData.expectedTopics || [],
                questionOrder: interview.interviewQuestions.length + 1,
            },
        });
        return question;
    }
    /**
     * Add a follow-up question
     */
    async addFollowUpQuestion(interviewId, questionText, order) {
        const question = await database_1.prisma.interviewQuestion.create({
            data: {
                interviewSessionId: interviewId,
                questionText,
                questionType: 'follow-up',
                expectedTopics: [],
                questionOrder: order,
            },
        });
        return question;
    }
    /**
     * Cancel an interview
     */
    async cancelInterview(interviewId, userId) {
        const interview = await database_1.prisma.interviewSession.findFirst({
            where: { id: interviewId, userId },
        });
        if (!interview) {
            throw errorHandler_1.ApiError.notFound('Interview not found');
        }
        if (interview.status === client_1.InterviewStatus.COMPLETED) {
            throw errorHandler_1.ApiError.badRequest('Cannot cancel a completed interview');
        }
        await database_1.prisma.interviewSession.update({
            where: { id: interviewId },
            data: { status: client_1.InterviewStatus.CANCELLED },
        });
        logger_1.logger.info('Interview cancelled', { interviewId });
    }
    /**
     * Delete an interview
     */
    async deleteInterview(interviewId, userId) {
        const interview = await database_1.prisma.interviewSession.findFirst({
            where: { id: interviewId, userId },
        });
        if (!interview) {
            throw errorHandler_1.ApiError.notFound('Interview not found');
        }
        await database_1.prisma.interviewSession.delete({
            where: { id: interviewId },
        });
        logger_1.logger.info('Interview deleted', { interviewId });
    }
    toPrismaInterviewType(interviewType) {
        const typeMap = {
            technical: client_1.InterviewType.TECHNICAL,
            TECHNICAL: client_1.InterviewType.TECHNICAL,
            behavioral: client_1.InterviewType.BEHAVIORAL,
            BEHAVIORAL: client_1.InterviewType.BEHAVIORAL,
            mixed: client_1.InterviewType.MIXED,
            MIXED: client_1.InterviewType.MIXED,
            'system-design': client_1.InterviewType.SYSTEM_DESIGN,
            SYSTEM_DESIGN: client_1.InterviewType.SYSTEM_DESIGN,
        };
        return typeMap[interviewType] ?? client_1.InterviewType.TECHNICAL;
    }
    toPrismaInterviewStatus(status) {
        const statusMap = {
            scheduled: client_1.InterviewStatus.SCHEDULED,
            SCHEDULED: client_1.InterviewStatus.SCHEDULED,
            in_progress: client_1.InterviewStatus.IN_PROGRESS,
            IN_PROGRESS: client_1.InterviewStatus.IN_PROGRESS,
            completed: client_1.InterviewStatus.COMPLETED,
            COMPLETED: client_1.InterviewStatus.COMPLETED,
            cancelled: client_1.InterviewStatus.CANCELLED,
            CANCELLED: client_1.InterviewStatus.CANCELLED,
            abandoned: client_1.InterviewStatus.ABANDONED,
            ABANDONED: client_1.InterviewStatus.ABANDONED,
        };
        return statusMap[status] ?? client_1.InterviewStatus.SCHEDULED;
    }
    toPrismaDifficulty(difficulty) {
        const difficultyMap = {
            easy: client_1.Difficulty.easy,
            medium: client_1.Difficulty.medium,
            hard: client_1.Difficulty.hard,
            expert: client_1.Difficulty.expert,
        };
        return difficultyMap[difficulty] ?? client_1.Difficulty.medium;
    }
}
// Export singleton instance
exports.interviewService = new InterviewService();
//# sourceMappingURL=interview.service.js.map