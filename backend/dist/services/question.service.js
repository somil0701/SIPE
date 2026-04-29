"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionService = void 0;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const errorHandler_1 = require("../middleware/errorHandler");
const apiFormat_1 = require("../utils/apiFormat");
/**
 * Question Service
 *
 * Handles question-related operations:
 * - Fetch questions with filters
 * - Get question details
 * - Adaptive question selection
 * - Search functionality
 */
class QuestionService {
    /**
     * Get questions with filtering and pagination
     */
    async getQuestions(filter, userId) {
        const { difficulty, skillId, type, company, search, isPremium, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = filter;
        // Build cache key
        const cacheKey = redis_1.cacheKeys.questionsList(JSON.stringify(filter));
        // Try cache first (only for non-user-specific queries)
        if (!userId) {
            const cached = await redis_1.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        // Build where clause
        const where = { isActive: true };
        if (difficulty) {
            where.difficulty = difficulty;
        }
        if (skillId) {
            where.skillId = skillId;
        }
        if (type) {
            where.type = this.toPrismaQuestionType(type);
        }
        if (company) {
            where.companyTags = { has: company };
        }
        if (isPremium !== undefined) {
            where.isPremium = isPremium;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { problemStatement: { contains: search, mode: 'insensitive' } },
            ];
        }
        // Count total
        const total = await database_1.prisma.question.count({ where });
        const totalPages = Math.ceil(total / limit);
        const sortField = this.getSafeSortField(sortBy);
        // Get questions
        const questions = await database_1.prisma.question.findMany({
            where,
            select: {
                id: true,
                skillId: true,
                title: true,
                slug: true,
                description: true,
                problemStatement: true,
                difficulty: true,
                type: true,
                starterCode: true,
                hints: true,
                testCases: true,
                constraints: true,
                companyTags: true,
                topicTags: true,
                acceptanceRate: true,
                explanation: true,
                isPremium: true,
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { [sortField]: sortOrder },
        });
        // If user is provided, add attempt status
        let questionsWithStatus = questions.map((question) => (0, apiFormat_1.serializeQuestion)(question));
        if (userId) {
            questionsWithStatus = await this.addAttemptStatus(questionsWithStatus, userId);
        }
        const result = {
            questions: questionsWithStatus,
            total,
            totalPages,
        };
        // Cache result (only for non-user-specific queries)
        if (!userId) {
            await redis_1.cache.set(cacheKey, result, redis_1.cacheTTL.questionsList);
        }
        return result;
    }
    /**
     * Get question by ID
     */
    async getQuestionById(questionId, userId) {
        // Try cache first
        const cacheKey = redis_1.cacheKeys.question(questionId);
        const cached = await redis_1.cache.get(cacheKey);
        if (cached && !userId) {
            return cached;
        }
        const question = await database_1.prisma.question.findFirst({
            where: { id: questionId, isActive: true },
            select: {
                id: true,
                skillId: true,
                title: true,
                slug: true,
                description: true,
                problemStatement: true,
                difficulty: true,
                type: true,
                starterCode: true,
                hints: true,
                testCases: true,
                constraints: true,
                companyTags: true,
                topicTags: true,
                acceptanceRate: true,
                explanation: true,
                isPremium: true,
            },
        });
        if (!question) {
            throw errorHandler_1.ApiError.notFound('Question not found');
        }
        // Cache question
        await redis_1.cache.set(cacheKey, question, redis_1.cacheTTL.question);
        return (0, apiFormat_1.serializeQuestion)(question);
    }
    /**
     * Get question by slug
     */
    async getQuestionBySlug(slug, _userId) {
        const question = await database_1.prisma.question.findFirst({
            where: { slug, isActive: true },
            select: {
                id: true,
                skillId: true,
                title: true,
                slug: true,
                description: true,
                problemStatement: true,
                difficulty: true,
                type: true,
                starterCode: true,
                hints: true,
                testCases: true,
                constraints: true,
                companyTags: true,
                topicTags: true,
                acceptanceRate: true,
                explanation: true,
                isPremium: true,
            },
        });
        if (!question) {
            throw errorHandler_1.ApiError.notFound('Question not found');
        }
        return (0, apiFormat_1.serializeQuestion)(question);
    }
    /**
     * Get recommended questions for user (adaptive learning)
     */
    async getRecommendedQuestions(userId, limit = 5) {
        // Get user's skill profile
        const userSkills = await database_1.prisma.userSkill.findMany({
            where: { userId },
            include: { skill: true },
            orderBy: { proficiencyLevel: 'asc' },
        });
        // Get weak skills (proficiency < 50)
        const weakSkills = userSkills.filter((us) => us.proficiencyLevel < 50);
        // Get questions for weak skills
        const recommendedQuestions = [];
        for (const userSkill of weakSkills.slice(0, 3)) {
            const questions = await database_1.prisma.question.findMany({
                where: {
                    skillId: userSkill.skillId,
                    isActive: true,
                    difficulty: this.mapProficiencyToDifficulty(userSkill.proficiencyLevel),
                    // Exclude already solved questions
                    NOT: {
                        attempts: {
                            some: {
                                userId,
                                status: 'ACCEPTED',
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    skillId: true,
                    title: true,
                    slug: true,
                    description: true,
                    problemStatement: true,
                    difficulty: true,
                    type: true,
                    starterCode: true,
                    hints: true,
                    testCases: true,
                    constraints: true,
                    companyTags: true,
                    topicTags: true,
                    acceptanceRate: true,
                    explanation: true,
                    isPremium: true,
                },
                take: Math.ceil(limit / weakSkills.length),
                orderBy: { acceptanceRate: 'desc' },
            });
            recommendedQuestions.push(...questions.map((question) => (0, apiFormat_1.serializeQuestion)(question)));
        }
        // If not enough weak skill questions, add popular questions
        if (recommendedQuestions.length < limit) {
            const additionalQuestions = await database_1.prisma.question.findMany({
                where: {
                    isActive: true,
                    id: { notIn: recommendedQuestions.map((q) => q.id) },
                    NOT: {
                        attempts: {
                            some: {
                                userId,
                                status: 'ACCEPTED',
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    skillId: true,
                    title: true,
                    slug: true,
                    description: true,
                    problemStatement: true,
                    difficulty: true,
                    type: true,
                    starterCode: true,
                    hints: true,
                    testCases: true,
                    constraints: true,
                    companyTags: true,
                    topicTags: true,
                    acceptanceRate: true,
                    explanation: true,
                    isPremium: true,
                },
                take: limit - recommendedQuestions.length,
                orderBy: [{ acceptanceRate: 'desc' }, { totalAttempts: 'desc' }],
            });
            recommendedQuestions.push(...additionalQuestions.map((question) => (0, apiFormat_1.serializeQuestion)(question)));
        }
        return recommendedQuestions.slice(0, limit);
    }
    /**
     * Get questions for spaced repetition review
     */
    async getDueReviewQuestions(userId, limit = 10) {
        const dueReviews = await database_1.prisma.spacedRepetition.findMany({
            where: {
                userId,
                nextReviewDate: { lte: new Date() },
                status: client_1.SpacedRepetitionStatus.ACTIVE,
            },
            include: { question: true },
            take: limit,
            orderBy: { nextReviewDate: 'asc' },
        });
        return dueReviews.map((sr) => (0, apiFormat_1.serializeQuestion)(sr.question));
    }
    /**
     * Search questions
     */
    async searchQuestions(query, page = 1, limit = 20) {
        const questions = await database_1.prisma.question.findMany({
            where: {
                isActive: true,
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { problemStatement: { contains: query, mode: 'insensitive' } },
                    { topicTags: { has: query } },
                    { companyTags: { has: query } },
                ],
            },
            select: {
                id: true,
                skillId: true,
                title: true,
                slug: true,
                description: true,
                problemStatement: true,
                difficulty: true,
                type: true,
                starterCode: true,
                hints: true,
                testCases: true,
                constraints: true,
                companyTags: true,
                topicTags: true,
                acceptanceRate: true,
                explanation: true,
                isPremium: true,
            },
            skip: (page - 1) * limit,
            take: limit,
        });
        const total = await database_1.prisma.question.count({
            where: {
                isActive: true,
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { problemStatement: { contains: query, mode: 'insensitive' } },
                    { topicTags: { has: query } },
                    { companyTags: { has: query } },
                ],
            },
        });
        return {
            questions: questions.map((question) => (0, apiFormat_1.serializeQuestion)(question)),
            total,
        };
    }
    /**
     * Get company-specific questions
     */
    async getCompanyQuestions(company, page = 1, limit = 20) {
        const questions = await database_1.prisma.question.findMany({
            where: {
                isActive: true,
                companyTags: { has: company },
            },
            select: {
                id: true,
                skillId: true,
                title: true,
                slug: true,
                description: true,
                problemStatement: true,
                difficulty: true,
                type: true,
                starterCode: true,
                hints: true,
                testCases: true,
                constraints: true,
                companyTags: true,
                topicTags: true,
                acceptanceRate: true,
                explanation: true,
                isPremium: true,
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { acceptanceRate: 'desc' },
        });
        const total = await database_1.prisma.question.count({
            where: {
                isActive: true,
                companyTags: { has: company },
            },
        });
        return {
            questions: questions.map((question) => (0, apiFormat_1.serializeQuestion)(question)),
            total,
        };
    }
    /**
     * Add attempt status to questions
     */
    async addAttemptStatus(questions, userId) {
        const questionIds = questions.map((q) => q.id);
        const attempts = await database_1.prisma.attempt.findMany({
            where: {
                userId,
                questionId: { in: questionIds },
            },
            select: {
                questionId: true,
                status: true,
            },
            orderBy: { submittedAt: 'desc' },
            distinct: ['questionId'],
        });
        const attemptMap = new Map(attempts.map((a) => [a.questionId, a.status]));
        return questions.map((q) => ({
            ...q,
            attemptStatus: attemptMap.get(q.id) || null,
        }));
    }
    /**
     * Map proficiency level to difficulty
     */
    mapProficiencyToDifficulty(proficiency) {
        if (proficiency < 25)
            return client_1.Difficulty.easy;
        if (proficiency < 50)
            return client_1.Difficulty.medium;
        if (proficiency < 75)
            return client_1.Difficulty.hard;
        return client_1.Difficulty.expert;
    }
    /**
     * Increment question attempt count
     */
    async incrementAttemptCount(questionId, solved) {
        const updated = await database_1.prisma.question.update({
            where: { id: questionId },
            data: {
                totalAttempts: { increment: 1 },
                ...(solved && { totalSolves: { increment: 1 } }),
            },
        });
        await database_1.prisma.question.update({
            where: { id: questionId },
            data: {
                acceptanceRate: updated.totalAttempts > 0
                    ? Math.round((updated.totalSolves / updated.totalAttempts) * 1000) / 10
                    : 0,
            },
        });
        // Invalidate cache
        await redis_1.cache.del(redis_1.cacheKeys.question(questionId));
    }
    toPrismaQuestionType(type) {
        const typeMap = {
            coding: client_1.QuestionType.CODING,
            CODING: client_1.QuestionType.CODING,
            'system-design': client_1.QuestionType.SYSTEM_DESIGN,
            SYSTEM_DESIGN: client_1.QuestionType.SYSTEM_DESIGN,
            behavioral: client_1.QuestionType.BEHAVIORAL,
            BEHAVIORAL: client_1.QuestionType.BEHAVIORAL,
            theoretical: client_1.QuestionType.THEORETICAL,
            THEORETICAL: client_1.QuestionType.THEORETICAL,
            quiz: client_1.QuestionType.QUIZ,
            QUIZ: client_1.QuestionType.QUIZ,
        };
        return typeMap[type] ?? client_1.QuestionType.CODING;
    }
    getSafeSortField(sortBy) {
        const allowed = new Set([
            'createdAt',
            'updatedAt',
            'acceptanceRate',
            'totalAttempts',
            'avgTimeSpent',
            'baseDifficultyScore',
            'title',
            'difficulty',
        ]);
        return allowed.has(sortBy) ? sortBy : 'createdAt';
    }
}
// Export singleton instance
exports.questionService = new QuestionService();
//# sourceMappingURL=question.service.js.map