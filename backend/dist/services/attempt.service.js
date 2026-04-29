"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attemptService = void 0;
const vm_1 = __importDefault(require("vm"));
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const ai_service_1 = require("./ai.service");
const question_service_1 = require("./question.service");
const analytics_service_1 = require("./analytics.service");
/**
 * Attempt Service
 *
 * Handles code submission and evaluation:
 * - Submit solution
 * - Run test cases
 * - Generate AI feedback
 * - Update user skills
 */
class AttemptService {
    /**
     * Submit a solution attempt
     */
    async submitAttempt(userId, input) {
        const { questionId, code, language, timeSpent } = input;
        // Verify question exists
        const question = await database_1.prisma.question.findUnique({
            where: { id: questionId },
            include: { skill: true },
        });
        if (!question) {
            throw errorHandler_1.ApiError.notFound('Question not found');
        }
        // Get attempt number
        const previousAttempts = await database_1.prisma.attempt.count({
            where: { userId, questionId },
        });
        // Create attempt
        const attempt = await database_1.prisma.attempt.create({
            data: {
                userId,
                questionId,
                code,
                language,
                timeSpent,
                status: 'PENDING',
                attemptNumber: previousAttempts + 1,
            },
        });
        // Run evaluation asynchronously
        this.evaluateAttempt(attempt.id, userId, questionId, code, language, timeSpent).catch((error) => {
            logger_1.logger.error('Attempt evaluation failed', { error, attemptId: attempt.id });
        });
        return attempt;
    }
    /**
     * Evaluate attempt (run test cases + AI feedback)
     */
    async evaluateAttempt(attemptId, userId, questionId, code, language, timeSpent) {
        try {
            // Get question with test cases
            const question = await database_1.prisma.question.findUnique({
                where: { id: questionId },
            });
            if (!question) {
                throw new Error('Question not found');
            }
            const testCases = question.testCases;
            // Run test cases (simplified - in production, use a sandboxed execution environment)
            const testResults = await this.runTestCases(code, language, testCases);
            const testCasesPassed = testResults.filter((r) => r.passed).length;
            const allPassed = testCasesPassed === testResults.length;
            // Determine status
            let status = client_1.AttemptStatus.WRONG_ANSWER;
            if (allPassed) {
                status = client_1.AttemptStatus.ACCEPTED;
            }
            else if (testCasesPassed > 0) {
                status = client_1.AttemptStatus.PARTIALLY_ACCEPTED;
            }
            // Update attempt with results
            await database_1.prisma.attempt.update({
                where: { id: attemptId },
                data: {
                    status,
                    testCasesPassed,
                    testCasesTotal: testResults.length,
                },
            });
            // Save test case results
            if (testResults.length > 0) {
                await database_1.prisma.attemptTestCase.createMany({
                    data: testResults.map((result) => ({
                        attemptId,
                        testCaseIndex: result.index,
                        input: result.input,
                        expectedOutput: result.expected,
                        actualOutput: result.actual,
                        passed: result.passed,
                        executionTime: result.executionTime,
                        errorMessage: result.error,
                    })),
                });
            }
            // Generate AI feedback
            const aiFeedback = await ai_service_1.aiService.evaluateAnswer({
                questionId,
                code,
                language,
            });
            // Save AI feedback
            await database_1.prisma.attemptFeedback.create({
                data: {
                    attemptId,
                    userId,
                    overallScore: aiFeedback.overallScore,
                    summary: aiFeedback.summary,
                    codeQualityScore: aiFeedback.codeQualityScore,
                    codeQualityFeedback: aiFeedback.codeQualityFeedback,
                    timeComplexityActual: aiFeedback.timeComplexity,
                    spaceComplexityActual: aiFeedback.spaceComplexity,
                    strengths: aiFeedback.strengths,
                    weaknesses: aiFeedback.weaknesses,
                    improvementSuggestions: aiFeedback.suggestions,
                    recommendedResources: aiFeedback.resources,
                },
            });
            // Update attempt with AI score
            await database_1.prisma.attempt.update({
                where: { id: attemptId },
                data: { aiScore: aiFeedback.overallScore },
            });
            // Update user skills
            await this.updateUserSkills(userId, question.skillId, status, aiFeedback.overallScore);
            // Update question stats
            await question_service_1.questionService.incrementAttemptCount(questionId, status === client_1.AttemptStatus.ACCEPTED);
            await analytics_service_1.analyticsService.updateDailyAnalytics(userId, {
                questionsAttempted: 1,
                questionsSolved: status === client_1.AttemptStatus.ACCEPTED ? 1 : 0,
                timeSpent,
            });
            // Update spaced repetition if applicable
            if (status === client_1.AttemptStatus.ACCEPTED) {
                await this.updateSpacedRepetition(userId, questionId, true);
            }
            // Invalidate caches
            await redis_1.cache.del(redis_1.cacheKeys.userAttempts(userId));
            await redis_1.cache.delPattern(`user:${userId}:skills*`);
            logger_1.logger.info('Attempt evaluated', { attemptId, status, score: aiFeedback.overallScore });
        }
        catch (error) {
            // Update attempt with error status
            await database_1.prisma.attempt.update({
                where: { id: attemptId },
                data: { status: client_1.AttemptStatus.RUNTIME_ERROR },
            });
            throw error;
        }
    }
    /**
     * Run test cases (simplified mock implementation)
     * In production, this would use a sandboxed code execution service
     */
    async runTestCases(code, language, testCases) {
        if (!testCases.length) {
            return [
                {
                    index: 0,
                    input: 'No test cases configured',
                    expected: 'Submission accepted for manual review',
                    actual: 'Submission accepted for manual review',
                    passed: true,
                    executionTime: 0,
                },
            ];
        }
        if (!['javascript', 'typescript'].includes(language)) {
            return testCases.map((tc, index) => ({
                index,
                input: this.stringifyTestValue(tc.input ?? tc.args ?? ''),
                expected: this.stringifyTestValue(tc.expected ?? tc.expectedOutput ?? ''),
                actual: '',
                passed: false,
                executionTime: 0,
                error: `Local evaluator currently executes JavaScript/TypeScript submissions only; received ${language}.`,
            }));
        }
        const functionName = this.detectFunctionName(code);
        return testCases.map((tc, index) => {
            const startedAt = Date.now();
            const args = Array.isArray(tc.args)
                ? tc.args
                : Array.isArray(tc.input)
                    ? tc.input
                    : [tc.input];
            const expectedValue = tc.expected ?? tc.expectedOutput;
            try {
                const sandbox = {
                    __args: args,
                    __result: undefined,
                    console: { log: () => undefined },
                    module: { exports: {} },
                    exports: {},
                };
                const context = vm_1.default.createContext(sandbox);
                const script = new vm_1.default.Script(`
${code}
;__result = ${tc.functionName || functionName}(...__args);
`);
                script.runInContext(context, { timeout: 1000 });
                const actualValue = sandbox.__result;
                const passed = this.valuesEqual(actualValue, expectedValue);
                return {
                    index,
                    input: this.stringifyTestValue(args),
                    expected: this.stringifyTestValue(expectedValue),
                    actual: this.stringifyTestValue(actualValue),
                    passed,
                    executionTime: Date.now() - startedAt,
                };
            }
            catch (error) {
                return {
                    index,
                    input: this.stringifyTestValue(args),
                    expected: this.stringifyTestValue(expectedValue),
                    actual: '',
                    passed: false,
                    executionTime: Date.now() - startedAt,
                    error: error instanceof Error ? error.message : 'Execution failed',
                };
            }
        });
    }
    detectFunctionName(code) {
        const declarationMatch = code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
        if (declarationMatch?.[1])
            return declarationMatch[1];
        const assignmentMatch = code.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
        if (assignmentMatch?.[1])
            return assignmentMatch[1];
        throw new Error('Could not detect a callable function in the submitted code');
    }
    stringifyTestValue(value) {
        if (typeof value === 'string')
            return value;
        return JSON.stringify(value);
    }
    valuesEqual(actual, expected) {
        if (typeof expected === 'string') {
            try {
                return JSON.stringify(actual) === JSON.stringify(JSON.parse(expected));
            }
            catch {
                return String(actual) === expected;
            }
        }
        return JSON.stringify(actual) === JSON.stringify(expected);
    }
    /**
     * Get attempt by ID
     */
    async getAttemptById(attemptId, userId) {
        const attempt = await database_1.prisma.attempt.findFirst({
            where: {
                id: attemptId,
                userId,
            },
            include: {
                attemptTestCases: true,
                feedback: true,
                question: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        difficulty: true,
                        skill: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        if (!attempt) {
            throw errorHandler_1.ApiError.notFound('Attempt not found');
        }
        return attempt;
    }
    /**
     * Get user's attempts
     */
    async getUserAttempts(userId, options = {}) {
        const { questionId, status, page = 1, limit = 20 } = options;
        const where = { userId };
        if (questionId)
            where.questionId = questionId;
        if (status)
            where.status = this.toPrismaAttemptStatus(status);
        const attempts = await database_1.prisma.attempt.findMany({
            where,
            include: {
                question: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        difficulty: true,
                    },
                },
                feedback: {
                    select: {
                        overallScore: true,
                    },
                },
            },
            orderBy: { submittedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
        const total = await database_1.prisma.attempt.count({ where });
        return { attempts: attempts, total };
    }
    /**
     * Get attempt feedback
     */
    async getAttemptFeedback(attemptId, userId) {
        const attempt = await database_1.prisma.attempt.findFirst({
            where: { id: attemptId, userId },
            include: { feedback: true },
        });
        if (!attempt) {
            throw errorHandler_1.ApiError.notFound('Attempt not found');
        }
        if (!attempt.feedback) {
            throw errorHandler_1.ApiError.notFound('Feedback not yet generated');
        }
        return attempt.feedback;
    }
    /**
     * Update user skills based on attempt
     */
    async updateUserSkills(userId, skillId, status, score) {
        const userSkill = await database_1.prisma.userSkill.findUnique({
            where: {
                userId_skillId: { userId, skillId },
            },
        });
        if (!userSkill) {
            logger_1.logger.warn('User skill not found', { userId, skillId });
            return;
        }
        // Calculate XP gain
        const xpGain = this.calculateXPGain(status, score);
        // Update proficiency based on performance
        const proficiencyDelta = this.calculateProficiencyDelta(userSkill.proficiencyLevel, status, score);
        const newProficiency = Math.min(100, Math.max(0, userSkill.proficiencyLevel + proficiencyDelta));
        // Update accuracy rate
        const totalAttempts = userSkill.questionsAttempted + 1;
        const totalSolved = userSkill.questionsSolved + (status === client_1.AttemptStatus.ACCEPTED ? 1 : 0);
        const newAccuracy = (totalSolved / totalAttempts) * 100;
        await database_1.prisma.userSkill.update({
            where: {
                userId_skillId: { userId, skillId },
            },
            data: {
                xpPoints: { increment: xpGain },
                proficiencyLevel: newProficiency,
                questionsAttempted: totalAttempts,
                questionsSolved: totalSolved,
                accuracyRate: newAccuracy,
                lastPracticedAt: new Date(),
            },
        });
        logger_1.logger.info('User skill updated', {
            userId,
            skillId,
            xpGain,
            newProficiency,
        });
    }
    /**
     * Calculate XP gain
     */
    calculateXPGain(status, score) {
        let baseXP = 0;
        switch (status) {
            case client_1.AttemptStatus.ACCEPTED:
                baseXP = 100;
                break;
            case client_1.AttemptStatus.PARTIALLY_ACCEPTED:
                baseXP = 50;
                break;
            default:
                baseXP = 10;
        }
        // Bonus based on score
        const scoreBonus = Math.floor(score / 10);
        return baseXP + scoreBonus;
    }
    /**
     * Calculate proficiency change
     */
    calculateProficiencyDelta(currentProficiency, status, _score) {
        if (status === client_1.AttemptStatus.ACCEPTED) {
            // Gain proficiency, but diminishing returns at higher levels
            const gain = Math.max(1, (100 - currentProficiency) / 20);
            return Math.floor(gain);
        }
        else {
            // Small loss for incorrect answers
            return -1;
        }
    }
    /**
     * Update spaced repetition
     */
    async updateSpacedRepetition(userId, questionId, success) {
        const sr = await database_1.prisma.spacedRepetition.findUnique({
            where: {
                userId_questionId: { userId, questionId },
            },
        });
        if (!sr) {
            // Create new SR entry
            await database_1.prisma.spacedRepetition.create({
                data: {
                    userId,
                    questionId,
                    interval: 1,
                    repetitions: success ? 1 : 0,
                    easeFactor: 2.5,
                    nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                },
            });
            return;
        }
        // SM-2 Algorithm
        const quality = success ? 4 : 2; // 4 = Good, 2 = Hard
        let { interval, repetitions, easeFactor } = sr;
        if (quality >= 3) {
            if (repetitions === 0) {
                interval = 1;
            }
            else if (repetitions === 1) {
                interval = 6;
            }
            else {
                interval = Math.round(interval * easeFactor);
            }
            repetitions += 1;
        }
        else {
            repetitions = 0;
            interval = 1;
        }
        easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);
        await database_1.prisma.spacedRepetition.update({
            where: { id: sr.id },
            data: {
                interval,
                repetitions,
                easeFactor,
                nextReviewDate,
                lastReviewedAt: new Date(),
                reviewCount: { increment: 1 },
                successfulReviews: success ? { increment: 1 } : undefined,
                failedReviews: !success ? { increment: 1 } : undefined,
                status: repetitions >= 5
                    ? client_1.SpacedRepetitionStatus.MASTERED
                    : client_1.SpacedRepetitionStatus.ACTIVE,
            },
        });
    }
    toPrismaAttemptStatus(status) {
        const statusMap = {
            PENDING: client_1.AttemptStatus.PENDING,
            running: client_1.AttemptStatus.RUNNING,
            RUNNING: client_1.AttemptStatus.RUNNING,
            ACCEPTED: client_1.AttemptStatus.ACCEPTED,
            wrong_answer: client_1.AttemptStatus.WRONG_ANSWER,
            WRONG_ANSWER: client_1.AttemptStatus.WRONG_ANSWER,
            time_limit_exceeded: client_1.AttemptStatus.TIME_LIMIT_EXCEEDED,
            TIME_LIMIT_EXCEEDED: client_1.AttemptStatus.TIME_LIMIT_EXCEEDED,
            RUNTIME_ERROR: client_1.AttemptStatus.RUNTIME_ERROR,
            compilation_error: client_1.AttemptStatus.COMPILATION_ERROR,
            COMPILATION_ERROR: client_1.AttemptStatus.COMPILATION_ERROR,
            PARTIALLY_ACCEPTED: client_1.AttemptStatus.PARTIALLY_ACCEPTED,
        };
        return statusMap[status] ?? client_1.AttemptStatus.PENDING;
    }
}
// Export singleton instance
exports.attemptService = new AttemptService();
//# sourceMappingURL=attempt.service.js.map