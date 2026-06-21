import {
  Prisma,
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
import { judgeService } from '../judge/judge.service';
import { learningPathService } from './learning-path.service';
import { Attempt, AttemptInput, AttemptFeedback, AttemptStatus, RunCodeInput } from '../types';

type TimelineAttemptStatus = keyof typeof PrismaAttemptStatus;

const attemptFeedbackContextInclude = Prisma.validator<Prisma.AttemptInclude>()({
  feedback: true,
  attemptTestCases: {
    orderBy: { testCaseIndex: 'asc' },
  },
  question: {
    select: {
      id: true,
      title: true,
      description: true,
      problemStatement: true,
      difficulty: true,
      constraints: true,
      testCases: true,
      topicTags: true,
      companyTags: true,
      optimalTimeComplexity: true,
      optimalSpaceComplexity: true,
      questionTags: {
        include: {
          tag: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
});

type AttemptFeedbackContext = Prisma.AttemptGetPayload<{
  include: typeof attemptFeedbackContextInclude;
}>;

interface SubmissionTimelineAttempt {
  id: string;
  attemptNumber: number;
  status: TimelineAttemptStatus;
  language: string;
  code: string | null;
  timeSpent: number;
  executionTime: number | null;
  testCasesPassed: number;
  testCasesTotal: number;
  aiScore: number | null;
  submittedAt: Date;
  feedback: {
    overallScore: number | null;
    summary: string | null;
    approachUsed?: string | null;
    codeQualityScore: number | null;
    codeQualityFeedback: string | null;
    timeComplexityActual: string | null;
    spaceComplexityActual: string | null;
    strengths: string[];
    weaknesses: string[];
    improvementSuggestions: string[];
  } | null;
  failedTestCases: {
    id: string;
    testCaseIndex: number;
    input: string;
    expectedOutput: string;
    actualOutput: string | null;
    errorMessage: string | null;
    executionTime: number | null;
  }[];
}

interface MistakeMemoryItem {
  type: 'status' | 'test_case' | 'weakness';
  label: string;
  count: number;
  lastSeenAt: Date;
  suggestion: string;
  evidence: string[];
}

interface SubmissionTimeline {
  question: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
    skill: {
      id: string;
      name: string;
    };
  };
  summary: {
    totalAttempts: number;
    accepted: boolean;
    bestScore: number | null;
    bestStatus: TimelineAttemptStatus | null;
    latestStatus: TimelineAttemptStatus | null;
    latestSubmittedAt: Date | null;
    firstAcceptedAt: Date | null;
    languagesUsed: string[];
    averageTimeSpent: number | null;
  };
  mistakeMemory: MistakeMemoryItem[];
  attempts: SubmissionTimelineAttempt[];
}

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
    const { questionId, code, language, timeSpent, pathItemId } = input;

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { skill: true },
    });

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    if (pathItemId) {
      const pathItem = await prisma.learningPathItem.findFirst({
        where: {
          id: pathItemId,
          questionId,
          learningPath: { userId, status: 'ACTIVE' },
        },
        select: { id: true },
      });

      if (!pathItem) {
        throw ApiError.validation('Invalid learning-path context', {
          pathItemId: ['This task does not belong to the current user or question'],
        });
      }
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
        status: PrismaAttemptStatus.PENDING,
        attemptNumber: previousAttempts + 1,
      },
    });

    // Run evaluation asynchronously
    this.evaluateAttempt(attempt.id, userId, questionId, code, language, timeSpent, pathItemId).catch((error) => {
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
    timeSpent: number,
    pathItemId?: string
  ): Promise<void> {
    try {
      await prisma.attempt.update({
        where: { id: attemptId },
        data: { status: PrismaAttemptStatus.RUNNING },
      });

      // Get question with test cases
      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      const testCases = Array.isArray(question.testCases) ? question.testCases : [];
      const judgeResult = await judgeService.judgeSubmission(code, language, testCases);
      const status = this.toPrismaAttemptStatus(judgeResult.verdict);

      // Update attempt with results
      await prisma.attempt.update({
        where: { id: attemptId },
        data: {
          status,
          testCasesPassed: judgeResult.testCasesPassed,
          testCasesTotal: judgeResult.testCasesTotal,
          executionTime: judgeResult.executionTime,
        },
      });

      // Save test case results
      if (judgeResult.results.length > 0) {
        await prisma.attemptTestCase.createMany({
          data: judgeResult.results.map((result) => ({
            attemptId,
            testCaseIndex: result.index,
            input: result.input,
            expectedOutput: result.expected,
            actualOutput: result.actual,
            passed: result.passed,
            executionTime: result.executionTime,
            errorMessage: result.error ?? (result.verdict === 'COMPILATION_ERROR' ? judgeResult.compileOutput : undefined),
          })),
        });
      }

      // Update user skills
      await this.updateUserSkills(userId, question.skillId, status, this.calculateJudgeScore(
        status,
        judgeResult.testCasesPassed,
        judgeResult.testCasesTotal
      ));

      // Update question stats
      await questionService.incrementAttemptCount(questionId, status === PrismaAttemptStatus.ACCEPTED);

      await analyticsService.updateDailyAnalytics(userId, {
        questionsAttempted: 1,
        questionsSolved: status === PrismaAttemptStatus.ACCEPTED ? 1 : 0,
        timeSpent,
      });

      // Update spaced repetition if applicable
      if (status === PrismaAttemptStatus.ACCEPTED) {
        await this.runNonCriticalAutomation('spaced repetition update', attemptId, () =>
          this.updateSpacedRepetition(userId, questionId, true)
        );
        await this.runNonCriticalAutomation('learning-path completion', attemptId, () =>
          learningPathService.markAcceptedAttempt(userId, questionId, attemptId, pathItemId)
        );
      }

      // Invalidate caches
      await cache.del(cacheKeys.userAttempts(userId));
      await cache.delPattern(`user:${userId}:skills*`);

      logger.info('Attempt evaluated', { attemptId, status });
    } catch (error) {
      // Never overwrite a final judge verdict because a downstream update failed.
      await prisma.attempt.updateMany({
        where: {
          id: attemptId,
          status: { in: [PrismaAttemptStatus.PENDING, PrismaAttemptStatus.RUNNING] },
        },
        data: { status: PrismaAttemptStatus.RUNTIME_ERROR },
      });
      throw error;
    }
  }

  private async runNonCriticalAutomation(
    automation: string,
    attemptId: string,
    task: () => Promise<unknown>
  ): Promise<void> {
    try {
      await task();
    } catch (error) {
      logger.error('Post-attempt automation failed', { automation, attemptId, error });
    }
  }

  async generateAttemptFeedback(attemptId: string, userId: string): Promise<AttemptFeedback> {
    const attempt = await prisma.attempt.findFirst({
      where: { id: attemptId, userId },
      include: attemptFeedbackContextInclude,
    });

    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    if (attempt.feedback) {
      return attempt.feedback as unknown as AttemptFeedback;
    }

    if (attempt.status === PrismaAttemptStatus.PENDING || attempt.status === PrismaAttemptStatus.RUNNING) {
      throw ApiError.badRequest('Wait for judge evaluation to finish before generating AI review');
    }

    if (!attempt.code) {
      throw ApiError.badRequest('Cannot generate AI review for an attempt without a code snapshot');
    }

    const aiFeedback = await this.createAttemptFeedbackPayload(attempt);

    const feedback = await prisma.attemptFeedback.upsert({
      where: { attemptId },
      update: {
        overallScore: aiFeedback.overallScore,
        summary: aiFeedback.summary,
        codeQualityScore: aiFeedback.codeQualityScore,
        codeQualityFeedback: aiFeedback.codeQualityFeedback,
        timeComplexityActual: aiFeedback.timeComplexity,
        spaceComplexityActual: aiFeedback.spaceComplexity,
        strengths: aiFeedback.strengths,
        weaknesses: aiFeedback.weaknesses,
        improvementSuggestions: aiFeedback.suggestions,
        recommendedResources: aiFeedback.resourceTopics as any,
      },
      create: {
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
        recommendedResources: aiFeedback.resourceTopics as any,
      },
    });

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        aiScore: aiFeedback.overallScore,
        aiFeedback: {
          ...aiFeedback,
          provider: aiService.getProvider(),
          generatedAt: new Date().toISOString(),
        } as any,
      },
    });

    await cache.del(cacheKeys.userAttempts(userId));

    logger.info('Attempt AI feedback generated', {
      attemptId,
      score: aiFeedback.overallScore,
      provider: aiService.getProvider(),
    });

    return feedback as unknown as AttemptFeedback;
  }

  private async createAttemptFeedbackPayload(attempt: AttemptFeedbackContext) {
    try {
      const failedTestCases = attempt.attemptTestCases
        .filter((testCase) => !testCase.passed)
        .slice(0, 3)
        .map((testCase) => ({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: testCase.actualOutput,
          stderr: testCase.errorMessage,
        }));
      const joinedErrors = failedTestCases
        .map((testCase) => testCase.stderr)
        .filter(Boolean)
        .join('\n');

      return await aiService.evaluateAnswer({
        questionId: attempt.questionId,
        code: attempt.code ?? '',
        language: attempt.language,
        question: {
          title: attempt.question.title,
          statement: this.stripHtml(attempt.question.problemStatement || attempt.question.description),
          inputFormat: null,
          outputFormat: null,
          constraints: attempt.question.constraints,
          examples: this.extractQuestionExamples(attempt.question.testCases),
          tags: [
            ...attempt.question.topicTags,
            ...attempt.question.companyTags,
            ...attempt.question.questionTags.map((questionTag) => questionTag.tag.name),
          ],
          difficulty: attempt.question.difficulty,
          expectedTimeComplexity: attempt.question.optimalTimeComplexity,
          expectedSpaceComplexity: attempt.question.optimalSpaceComplexity,
        },
        submission: {
          status: attempt.status,
          passedTests: attempt.testCasesPassed,
          totalTests: attempt.testCasesTotal,
          executionTime: attempt.executionTime,
          memoryUsed: attempt.memoryUsed,
        },
        judge: {
          failedTestCases,
          compileError: attempt.status === PrismaAttemptStatus.COMPILATION_ERROR ? joinedErrors || null : null,
          runtimeError: attempt.status === PrismaAttemptStatus.RUNTIME_ERROR ? joinedErrors || null : null,
          executionTime: attempt.executionTime,
          memoryUsed: attempt.memoryUsed,
        },
      });
    } catch (error) {
      logger.error('AI feedback generation failed; using durable fallback feedback', {
        error,
        questionId: attempt.questionId,
        provider: aiService.getProvider(),
      });

      const accepted = attempt.status === PrismaAttemptStatus.ACCEPTED;
      const passRate = attempt.testCasesTotal > 0
        ? Math.round((attempt.testCasesPassed / attempt.testCasesTotal) * 100)
        : 0;
      const score = accepted ? Math.max(75, passRate) : Math.max(35, passRate);

      return {
        overallScore: score,
        verdict: attempt.status,
        confidence: 0.25,
        summary: accepted
          ? 'All visible test cases passed. AI semantic feedback was unavailable, so this fallback review is based on judge results.'
          : 'The judge completed this attempt, but AI semantic feedback was unavailable. Review failed test cases and error output first.',
        approachUsed: 'Approach unavailable because AI semantic review failed.',
        algorithmDetected: 'Unknown',
        correctness: {
          score,
          mainIssue: accepted ? 'No stored judge failure.' : 'AI review failed; inspect the first stored failing testcase.',
          bugCategory: accepted ? 'none' : 'unknown',
          evidence: [`${attempt.testCasesPassed}/${attempt.testCasesTotal} tests passed`],
        },
        complexity: {
          detectedTime: 'Unknown',
          detectedSpace: 'Unknown',
          expectedTime: attempt.question.optimalTimeComplexity,
          willPassConstraints: accepted,
          explanation: 'AI complexity analysis was unavailable.',
        },
        failedCaseAnalysis: attempt.attemptTestCases
          .filter((testCase) => !testCase.passed)
          .slice(0, 3)
          .map((testCase) => ({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: testCase.actualOutput,
            likelyReason: testCase.errorMessage ?? 'Output differed from expected output.',
          })),
        lineFeedback: [],
        codeQuality: {
          score,
          feedback: `AI provider feedback timed out or failed (${aiService.getProvider()}). This durable fallback prevents the submission from staying in a generating state.`,
        },
        codeQualityScore: score,
        codeQualityFeedback: `AI provider feedback timed out or failed (${aiService.getProvider()}). This durable fallback prevents the submission from staying in a generating state.`,
        timeComplexity: 'Unknown',
        spaceComplexity: 'Unknown',
        strengths: accepted ? ['Passed all judged test cases'] : ['Submission was executed by the judge'],
        weaknesses: accepted ? ['Semantic review unavailable'] : ['Review failed testcase evidence before resubmitting'],
        suggestions: [
          'Check edge cases from the prompt constraints',
          'Compare your approach with the expected complexity',
          'Try one small refactor after confirming the sample cases still pass',
        ],
        resourceTopics: attempt.question.topicTags.slice(0, 4),
        resources: [],
      };
    }
  }

  private stripHtml(value: string): string {
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private extractQuestionExamples(testCases: unknown): Array<{
    input: string;
    expectedOutput: string;
    explanation?: string | null;
  }> {
    if (!Array.isArray(testCases)) return [];

    return testCases
      .filter((testCase) => testCase && typeof testCase === 'object' && (testCase as any).isExample)
      .slice(0, 3)
      .map((testCase) => {
        const item = testCase as {
          input?: unknown;
          expectedOutput?: unknown;
          expected?: unknown;
          explanation?: unknown;
        };

        return {
          input: typeof item.input === 'string' ? item.input : String(item.input ?? ''),
          expectedOutput: typeof item.expectedOutput === 'string'
            ? item.expectedOutput
            : String(item.expected ?? ''),
          explanation: typeof item.explanation === 'string' ? item.explanation : null,
        };
      });
  }

  /**
   * Run code once with custom stdin without creating a persisted attempt.
   */
  async runCode(_userId: string, input: RunCodeInput) {
    const question = await prisma.question.findUnique({
      where: { id: input.questionId },
      select: { id: true },
    });

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    return judgeService.runCustomInput(input.code, input.language, input.input ?? '');
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
   * Get a question-scoped submission timeline with recurring mistake memory.
   */
  async getQuestionSubmissionTimeline(userId: string, questionId: string): Promise<SubmissionTimeline> {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
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
    });

    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    const attempts = await prisma.attempt.findMany({
      where: { userId, questionId },
      include: {
        attemptTestCases: {
          orderBy: { testCaseIndex: 'asc' },
        },
        feedback: {
          select: {
            overallScore: true,
            summary: true,
            codeQualityScore: true,
            codeQualityFeedback: true,
            timeComplexityActual: true,
            spaceComplexityActual: true,
            strengths: true,
            weaknesses: true,
            improvementSuggestions: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 25,
    });

    const timelineAttempts: SubmissionTimelineAttempt[] = attempts.map((attempt) => ({
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      language: attempt.language,
      code: attempt.code,
      timeSpent: attempt.timeSpent,
      executionTime: attempt.executionTime,
      testCasesPassed: attempt.testCasesPassed,
      testCasesTotal: attempt.testCasesTotal,
      aiScore: attempt.aiScore,
      submittedAt: attempt.submittedAt,
      feedback: attempt.feedback
        ? {
            ...attempt.feedback,
            approachUsed: this.extractApproachUsed(attempt.aiFeedback),
          }
        : null,
      failedTestCases: attempt.attemptTestCases
        .filter((testCase) => !testCase.passed)
        .map((testCase) => ({
          id: testCase.id,
          testCaseIndex: testCase.testCaseIndex,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: testCase.actualOutput,
          errorMessage: testCase.errorMessage,
          executionTime: testCase.executionTime,
        })),
    }));

    return {
      question: {
        id: question.id,
        title: question.title,
        slug: question.slug,
        difficulty: question.difficulty,
        skill: question.skill,
      },
      summary: this.buildTimelineSummary(timelineAttempts),
      mistakeMemory: this.buildMistakeMemory(timelineAttempts),
      attempts: timelineAttempts,
    };
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

  private buildTimelineSummary(attempts: SubmissionTimelineAttempt[]): SubmissionTimeline['summary'] {
    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        accepted: false,
        bestScore: null,
        bestStatus: null,
        latestStatus: null,
        latestSubmittedAt: null,
        firstAcceptedAt: null,
        languagesUsed: [],
        averageTimeSpent: null,
      };
    }

    const acceptedAttempts = attempts.filter((attempt) => attempt.status === PrismaAttemptStatus.ACCEPTED);
    const scoredAttempts = attempts.filter((attempt) => attempt.aiScore !== null);
    const bestAttempt = [...attempts].sort((first, second) => {
      const firstScore = first.aiScore ?? (first.status === PrismaAttemptStatus.ACCEPTED ? 100 : first.testCasesPassed);
      const secondScore = second.aiScore ?? (second.status === PrismaAttemptStatus.ACCEPTED ? 100 : second.testCasesPassed);
      return secondScore - firstScore;
    })[0];
    const averageTimeSpent = Math.round(
      attempts.reduce((sum, attempt) => sum + attempt.timeSpent, 0) / attempts.length
    );

    return {
      totalAttempts: attempts.length,
      accepted: acceptedAttempts.length > 0,
      bestScore: scoredAttempts.length > 0
        ? Math.max(...scoredAttempts.map((attempt) => attempt.aiScore ?? 0))
        : null,
      bestStatus: bestAttempt?.status ?? null,
      latestStatus: attempts[0]?.status ?? null,
      latestSubmittedAt: attempts[0]?.submittedAt ?? null,
      firstAcceptedAt: acceptedAttempts.length > 0
        ? acceptedAttempts[acceptedAttempts.length - 1].submittedAt
        : null,
      languagesUsed: [...new Set(attempts.map((attempt) => attempt.language))],
      averageTimeSpent,
    };
  }

  private buildMistakeMemory(attempts: SubmissionTimelineAttempt[]): MistakeMemoryItem[] {
    const memory = new Map<string, MistakeMemoryItem>();

    attempts
      .filter((attempt) => attempt.status !== PrismaAttemptStatus.ACCEPTED)
      .forEach((attempt) => {
        const key = `status:${attempt.status}`;
        const label = this.formatAttemptStatus(attempt.status);
        this.addMistakeMemoryItem(memory, key, {
          type: 'status',
          label,
          lastSeenAt: attempt.submittedAt,
          suggestion: this.statusSuggestion(attempt.status),
          evidence: [`Attempt ${attempt.attemptNumber}: ${attempt.testCasesPassed}/${attempt.testCasesTotal} tests passed`],
        });
      });

    attempts.forEach((attempt) => {
      attempt.failedTestCases.forEach((testCase) => {
        const key = `test:${testCase.testCaseIndex}`;
        this.addMistakeMemoryItem(memory, key, {
          type: 'test_case',
          label: `Test case ${testCase.testCaseIndex + 1} keeps failing`,
          lastSeenAt: attempt.submittedAt,
          suggestion: 'Re-run this input manually and trace the edge case before changing the whole solution.',
          evidence: [
            `Attempt ${attempt.attemptNumber}: expected "${this.compactEvidence(testCase.expectedOutput)}", got "${this.compactEvidence(testCase.actualOutput ?? '')}"`,
          ],
        });
      });
    });

    attempts.forEach((attempt) => {
      attempt.feedback?.weaknesses.forEach((weakness) => {
        const normalized = this.normalizeMemoryLabel(weakness);
        if (!normalized) return;

        this.addMistakeMemoryItem(memory, `weakness:${normalized}`, {
          type: 'weakness',
          label: weakness.trim(),
          lastSeenAt: attempt.submittedAt,
          suggestion: attempt.feedback?.improvementSuggestions[0] ?? 'Compare your current approach with the expected complexity and simplify the implementation.',
          evidence: [`Attempt ${attempt.attemptNumber}: AI feedback flagged this weakness`],
        });
      });
    });

    return [...memory.values()]
      .filter((item) => item.count > 1 || item.type === 'weakness')
      .sort((first, second) => {
        if (second.count !== first.count) return second.count - first.count;
        return second.lastSeenAt.getTime() - first.lastSeenAt.getTime();
      })
      .slice(0, 6);
  }

  private addMistakeMemoryItem(
    memory: Map<string, MistakeMemoryItem>,
    key: string,
    item: Omit<MistakeMemoryItem, 'count'>
  ): void {
    const existing = memory.get(key);

    if (!existing) {
      memory.set(key, {
        ...item,
        count: 1,
      });
      return;
    }

    existing.count += 1;
    existing.lastSeenAt = existing.lastSeenAt > item.lastSeenAt ? existing.lastSeenAt : item.lastSeenAt;
    existing.evidence = [...existing.evidence, ...item.evidence].slice(0, 3);
  }

  private formatAttemptStatus(status: TimelineAttemptStatus): string {
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private statusSuggestion(status: TimelineAttemptStatus): string {
    switch (status) {
      case PrismaAttemptStatus.WRONG_ANSWER:
        return 'Focus on boundary cases and output format before changing the main algorithm.';
      case PrismaAttemptStatus.TIME_LIMIT_EXCEEDED:
        return 'Look for repeated work, nested loops, or a missing data structure that would lower complexity.';
      case PrismaAttemptStatus.RUNTIME_ERROR:
        return 'Check null/empty inputs, indexing, parsing, and language-specific runtime exceptions.';
      case PrismaAttemptStatus.COMPILATION_ERROR:
        return 'Fix syntax/import/class-name issues first, then run the sample input before submitting again.';
      default:
        return 'Review the latest failed attempt and isolate one correction before resubmitting.';
    }
  }

  private normalizeMemoryLabel(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .slice(0, 80);
  }

  private compactEvidence(value: string): string {
    const compacted = value.replace(/\s+/g, ' ').trim();
    return compacted.length > 80 ? `${compacted.slice(0, 77)}...` : compacted;
  }

  private extractApproachUsed(aiFeedback: unknown): string | null {
    if (!aiFeedback || typeof aiFeedback !== 'object') return null;
    const value = (aiFeedback as { approachUsed?: unknown }).approachUsed;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
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

  private calculateJudgeScore(
    status: PrismaAttemptStatus,
    testCasesPassed: number,
    testCasesTotal: number
  ): number {
    if (testCasesTotal <= 0) {
      return status === PrismaAttemptStatus.ACCEPTED ? 80 : 35;
    }

    const passRate = Math.round((testCasesPassed / testCasesTotal) * 100);

    if (status === PrismaAttemptStatus.ACCEPTED) {
      return Math.max(80, passRate);
    }

    if (status === PrismaAttemptStatus.PARTIALLY_ACCEPTED) {
      return Math.max(45, passRate);
    }

    return Math.max(20, Math.min(70, passRate));
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
      QUEUED: PrismaAttemptStatus.PENDING,
      PENDING: PrismaAttemptStatus.PENDING,
      running: PrismaAttemptStatus.RUNNING,
      RUNNING: PrismaAttemptStatus.RUNNING,
      ACCEPTED: PrismaAttemptStatus.ACCEPTED,
      WRONG_ANSWER: PrismaAttemptStatus.WRONG_ANSWER,
      wrong_answer: PrismaAttemptStatus.WRONG_ANSWER,
      accepted: PrismaAttemptStatus.ACCEPTED,
      time_limit_exceeded: PrismaAttemptStatus.TIME_LIMIT_EXCEEDED,
      TIME_LIMIT_EXCEEDED: PrismaAttemptStatus.TIME_LIMIT_EXCEEDED,
      RUNTIME_ERROR: PrismaAttemptStatus.RUNTIME_ERROR,
      runtime_error: PrismaAttemptStatus.RUNTIME_ERROR,
      compilation_error: PrismaAttemptStatus.COMPILATION_ERROR,
      COMPILATION_ERROR: PrismaAttemptStatus.COMPILATION_ERROR,
      PARTIALLY_ACCEPTED: PrismaAttemptStatus.PARTIALLY_ACCEPTED,
      partially_accepted: PrismaAttemptStatus.PARTIALLY_ACCEPTED,
    };

    return statusMap[status] ?? PrismaAttemptStatus.PENDING;
  }
}

// Export singleton instance
export const attemptService = new AttemptService();
