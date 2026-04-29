import vm from 'vm';
import {
  AttemptStatus as PrismaAttemptStatus,
  SpacedRepetitionStatus as PrismaSpacedRepetitionStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { cache, cacheKeys } from '../config/redis';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/errorHandler';
import { aiService } from './ai.service';
import { questionService } from './question.service';
import { analyticsService } from './analytics.service';
import { Attempt, AttemptInput, AttemptFeedback, AttemptStatus } from '../types';

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
  async submitAttempt(userId: string, input: AttemptInput): Promise<Attempt> {
    const { questionId, code, language, timeSpent } = input;

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { skill: true },
    });

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    // Get attempt number
    const previousAttempts = await prisma.attempt.count({
      where: { userId, questionId },
    });

    // Create attempt
    const attempt = await prisma.attempt.create({
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
      logger.error('Attempt evaluation failed', { error, attemptId: attempt.id });
    });

    return attempt as Attempt;
  }

  /**
   * Evaluate attempt (run test cases + AI feedback)
   */
  private async evaluateAttempt(
    attemptId: string,
    userId: string,
    questionId: string,
    code: string,
    language: string,
    timeSpent: number
  ): Promise<void> {
    try {
      // Get question with test cases
      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      const testCases = question.testCases as any[];
      
      // Run test cases (simplified - in production, use a sandboxed execution environment)
      const testResults = await this.runTestCases(code, language, testCases);

      const testCasesPassed = testResults.filter((r) => r.passed).length;
      const allPassed = testCasesPassed === testResults.length;

      // Determine status
      let status: PrismaAttemptStatus = PrismaAttemptStatus.WRONG_ANSWER;
      if (allPassed) {
        status = PrismaAttemptStatus.ACCEPTED;
      } else if (testCasesPassed > 0) {
        status = PrismaAttemptStatus.PARTIALLY_ACCEPTED;
      }

      // Update attempt with results
      await prisma.attempt.update({
        where: { id: attemptId },
        data: {
          status,
          testCasesPassed,
          testCasesTotal: testResults.length,
        },
      });

      // Save test case results
      if (testResults.length > 0) {
        await prisma.attemptTestCase.createMany({
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
      const aiFeedback = await aiService.evaluateAnswer({
        questionId,
        code,
        language,
      });

      // Save AI feedback
      await prisma.attemptFeedback.create({
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
          recommendedResources: aiFeedback.resources as any,
        },
      });

      // Update attempt with AI score
      await prisma.attempt.update({
        where: { id: attemptId },
        data: { aiScore: aiFeedback.overallScore },
      });

      // Update user skills
      await this.updateUserSkills(userId, question.skillId, status, aiFeedback.overallScore);

      // Update question stats
      await questionService.incrementAttemptCount(questionId, status === PrismaAttemptStatus.ACCEPTED);

      await analyticsService.updateDailyAnalytics(userId, {
        questionsAttempted: 1,
        questionsSolved: status === PrismaAttemptStatus.ACCEPTED ? 1 : 0,
        timeSpent,
      });

      // Update spaced repetition if applicable
      if (status === PrismaAttemptStatus.ACCEPTED) {
        await this.updateSpacedRepetition(userId, questionId, true);
      }

      // Invalidate caches
      await cache.del(cacheKeys.userAttempts(userId));
      await cache.delPattern(`user:${userId}:skills*`);

      logger.info('Attempt evaluated', { attemptId, status, score: aiFeedback.overallScore });
    } catch (error) {
      // Update attempt with error status
      await prisma.attempt.update({
        where: { id: attemptId },
        data: { status: PrismaAttemptStatus.RUNTIME_ERROR },
      });
      throw error;
    }
  }

  /**
   * Run test cases (simplified mock implementation)
   * In production, this would use a sandboxed code execution service
   */
  private async runTestCases(
    code: string,
    language: string,
    testCases: any[]
  ): Promise<
    {
      index: number;
      input: string;
      expected: string;
      actual: string;
      passed: boolean;
      executionTime: number;
      error?: string;
    }[]
  > {
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
          __result: undefined as unknown,
          console: { log: () => undefined },
          module: { exports: {} },
          exports: {},
        };
        const context = vm.createContext(sandbox);
        const script = new vm.Script(`
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
      } catch (error) {
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

  private detectFunctionName(code: string): string {
    const declarationMatch = code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (declarationMatch?.[1]) return declarationMatch[1];

    const assignmentMatch = code.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
    if (assignmentMatch?.[1]) return assignmentMatch[1];

    throw new Error('Could not detect a callable function in the submitted code');
  }

  private stringifyTestValue(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  private valuesEqual(actual: unknown, expected: unknown): boolean {
    if (typeof expected === 'string') {
      try {
        return JSON.stringify(actual) === JSON.stringify(JSON.parse(expected));
      } catch {
        return String(actual) === expected;
      }
    }

    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  /**
   * Get attempt by ID
   */
  async getAttemptById(attemptId: string, userId: string): Promise<Attempt> {
    const attempt = await prisma.attempt.findFirst({
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
      throw ApiError.notFound('Attempt not found');
    }

    return attempt as unknown as Attempt;
  }

  /**
   * Get user's attempts
   */
  async getUserAttempts(
    userId: string,
    options: {
      questionId?: string;
      status?: AttemptStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ attempts: Attempt[]; total: number }> {
    const { questionId, status, page = 1, limit = 20 } = options;

    const where: any = { userId };
    if (questionId) where.questionId = questionId;
    if (status) where.status = this.toPrismaAttemptStatus(status);

    const attempts = await prisma.attempt.findMany({
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

    const total = await prisma.attempt.count({ where });

    return { attempts: attempts as unknown as Attempt[], total };
  }

  /**
   * Get attempt feedback
   */
  async getAttemptFeedback(attemptId: string, userId: string): Promise<AttemptFeedback> {
    const attempt = await prisma.attempt.findFirst({
      where: { id: attemptId, userId },
      include: { feedback: true },
    });

    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    if (!attempt.feedback) {
      throw ApiError.notFound('Feedback not yet generated');
    }

    return attempt.feedback as unknown as AttemptFeedback;
  }

  /**
   * Update user skills based on attempt
   */
  private async updateUserSkills(
    userId: string,
    skillId: string,
    status: PrismaAttemptStatus,
    score: number
  ): Promise<void> {
    const userSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: { userId, skillId },
      },
    });

    if (!userSkill) {
      logger.warn('User skill not found', { userId, skillId });
      return;
    }

    // Calculate XP gain
    const xpGain = this.calculateXPGain(status, score);

    // Update proficiency based on performance
    const proficiencyDelta = this.calculateProficiencyDelta(userSkill.proficiencyLevel, status, score);
    const newProficiency = Math.min(100, Math.max(0, userSkill.proficiencyLevel + proficiencyDelta));

    // Update accuracy rate
    const totalAttempts = userSkill.questionsAttempted + 1;
    const totalSolved = userSkill.questionsSolved + (status === PrismaAttemptStatus.ACCEPTED ? 1 : 0);
    const newAccuracy = (totalSolved / totalAttempts) * 100;

    await prisma.userSkill.update({
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

    logger.info('User skill updated', {
      userId,
      skillId,
      xpGain,
      newProficiency,
    });
  }

  /**
   * Calculate XP gain
   */
  private calculateXPGain(status: PrismaAttemptStatus, score: number): number {
    let baseXP = 0;
    switch (status) {
      case PrismaAttemptStatus.ACCEPTED:
        baseXP = 100;
        break;
      case PrismaAttemptStatus.PARTIALLY_ACCEPTED:
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
  private calculateProficiencyDelta(
    currentProficiency: number,
    status: PrismaAttemptStatus,
    _score: number
  ): number {
    if (status === PrismaAttemptStatus.ACCEPTED) {
      // Gain proficiency, but diminishing returns at higher levels
      const gain = Math.max(1, (100 - currentProficiency) / 20);
      return Math.floor(gain);
    } else {
      // Small loss for incorrect answers
      return -1;
    }
  }

  /**
   * Update spaced repetition
   */
  private async updateSpacedRepetition(
    userId: string,
    questionId: string,
    success: boolean
  ): Promise<void> {
    const sr = await prisma.spacedRepetition.findUnique({
      where: {
        userId_questionId: { userId, questionId },
      },
    });

    if (!sr) {
      // Create new SR entry
      await prisma.spacedRepetition.create({
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
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }

    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    await prisma.spacedRepetition.update({
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
          ? PrismaSpacedRepetitionStatus.MASTERED
          : PrismaSpacedRepetitionStatus.ACTIVE,
      },
    });
  }

  private toPrismaAttemptStatus(status: AttemptStatus | string): PrismaAttemptStatus {
    const statusMap: Record<string, PrismaAttemptStatus> = {
      PENDING: PrismaAttemptStatus.PENDING,
      running: PrismaAttemptStatus.RUNNING,
      RUNNING: PrismaAttemptStatus.RUNNING,
      ACCEPTED: PrismaAttemptStatus.ACCEPTED,
      wrong_answer: PrismaAttemptStatus.WRONG_ANSWER,
      WRONG_ANSWER: PrismaAttemptStatus.WRONG_ANSWER,
      time_limit_exceeded: PrismaAttemptStatus.TIME_LIMIT_EXCEEDED,
      TIME_LIMIT_EXCEEDED: PrismaAttemptStatus.TIME_LIMIT_EXCEEDED,
      RUNTIME_ERROR: PrismaAttemptStatus.RUNTIME_ERROR,
      compilation_error: PrismaAttemptStatus.COMPILATION_ERROR,
      COMPILATION_ERROR: PrismaAttemptStatus.COMPILATION_ERROR,
      PARTIALLY_ACCEPTED: PrismaAttemptStatus.PARTIALLY_ACCEPTED,
    };

    return statusMap[status] ?? PrismaAttemptStatus.PENDING;
  }
}

// Export singleton instance
export const attemptService = new AttemptService();
