import {
  AssessmentQuestionStatus,
  AssessmentStatus,
  AttemptStatus,
  Difficulty,
  PathItemStatus,
  PathItemType,
  PathStatus,
  Prisma,
  QuestionType,
  SpacedRepetitionStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { cache, cacheKeys } from '../config/redis';
import { logger } from '../config/logger';
import { judgeService } from '../judge/judge.service';
import { ApiError } from '../middleware/errorHandler';
import { learningPathService } from './learning-path.service';

const ACTIVE_STATUSES: AssessmentStatus[] = [AssessmentStatus.SCHEDULED, AssessmentStatus.IN_PROGRESS];
const TERMINAL_STATUSES: AssessmentStatus[] = [
  AssessmentStatus.COMPLETED,
  AssessmentStatus.NEEDS_PRACTICE,
  AssessmentStatus.ABANDONED,
];

const difficultyWeight: Record<string, number> = {
  easy: 1,
  medium: 1.25,
  hard: 1.5,
  expert: 1.75,
};

const statusForApi = (status: AssessmentStatus) => status.toLowerCase();
const questionStatusForApi = (status: AssessmentQuestionStatus) => status.toLowerCase();

export interface SelectionCandidate {
  id: string;
  skillId: string;
  difficulty: Difficulty;
  companyTags: string[];
  companyIds: string[];
  acceptedBefore: boolean;
  mastered: boolean;
  lastAttemptedAt: Date | null;
}

export interface QuestionScoreInput {
  difficulty: Difficulty;
  testCasesPassed: number;
  testCasesTotal: number;
  timeSpentSeconds: number;
}

export function scoreAssessmentQuestion(input: QuestionScoreInput, timeBudgetSeconds: number) {
  const correctness = input.testCasesTotal > 0
    ? (input.testCasesPassed / input.testCasesTotal) * 100
    : 0;
  const timeEfficiency = correctness <= 0
    ? 0
    : Math.max(0, Math.min(100, (1 - input.timeSpentSeconds / Math.max(1, timeBudgetSeconds)) * 100));
  return {
    correctnessScore: Math.round(correctness * 100) / 100,
    timeEfficiencyScore: Math.round(timeEfficiency * 100) / 100,
    weightedScore: Math.round((correctness * 0.8 + timeEfficiency * 0.2) * 100) / 100,
    difficultyWeight: difficultyWeight[input.difficulty] ?? 1,
  };
}

export function calculateOverallAssessmentScore(
  questions: Array<QuestionScoreInput & { weightedScore?: number }>,
  timeBudgetSeconds: number
) {
  if (questions.length === 0) return 0;
  const perQuestionBudget = timeBudgetSeconds / questions.length;
  let weightedTotal = 0;
  let totalWeight = 0;
  for (const question of questions) {
    const calculated = question.weightedScore === undefined
      ? scoreAssessmentQuestion(question, perQuestionBudget)
      : { weightedScore: question.weightedScore, difficultyWeight: difficultyWeight[question.difficulty] ?? 1 };
    weightedTotal += calculated.weightedScore * calculated.difficultyWeight;
    totalWeight += calculated.difficultyWeight;
  }
  return Math.round(weightedTotal / Math.max(1, totalWeight));
}

export function selectAssessmentQuestions(
  candidates: SelectionCandidate[],
  options: {
    count: number;
    targetSkillId?: string | null;
    targetCompanyId?: string | null;
    targetCompanyName?: string | null;
    intendedDifficulties: Difficulty[];
    now?: Date;
  }
) {
  const now = options.now ?? new Date();
  const recentCutoff = now.getTime() - 14 * 24 * 60 * 60 * 1000;
  const desiredCounts = new Map<Difficulty, number>();
  const seenQuestionIds = new Set<string>();
  options.intendedDifficulties.forEach((difficulty) => {
    desiredCounts.set(difficulty, (desiredCounts.get(difficulty) ?? 0) + 1);
  });

  const ranked = candidates
    .filter((candidate) => {
      if (candidate.mastered || seenQuestionIds.has(candidate.id)) return false;
      seenQuestionIds.add(candidate.id);
      return true;
    })
    .map((candidate) => {
      const companyMatch = Boolean(
        options.targetCompanyId && candidate.companyIds.includes(options.targetCompanyId)
      ) || Boolean(
        options.targetCompanyName
        && candidate.companyTags.some((tag) => tag.toLowerCase() === options.targetCompanyName!.toLowerCase())
      );
      const recent = Boolean(candidate.lastAttemptedAt && candidate.lastAttemptedAt.getTime() >= recentCutoff);
      const score =
        (candidate.skillId === options.targetSkillId ? 80 : 0)
        + (companyMatch ? 50 : 0)
        + (desiredCounts.has(candidate.difficulty) ? 30 : 0)
        - (candidate.acceptedBefore ? 60 : 0)
        - (recent ? 25 : 0);
      return { candidate, score };
    })
    .sort((first, second) => second.score - first.score || first.candidate.id.localeCompare(second.candidate.id));

  if (options.targetSkillId) return ranked.slice(0, options.count).map(({ candidate }) => candidate);

  const selected: SelectionCandidate[] = [];
  const selectedIds = new Set<string>();
  const selectedSkills = new Set<string>();
  for (const { candidate } of ranked) {
    if (selectedSkills.has(candidate.skillId)) continue;
    selected.push(candidate);
    selectedIds.add(candidate.id);
    selectedSkills.add(candidate.skillId);
    if (selected.length === options.count) return selected;
  }
  for (const { candidate } of ranked) {
    if (selectedIds.has(candidate.id)) continue;
    selected.push(candidate);
    if (selected.length === options.count) break;
  }
  return selected;
}

const assessmentInclude = Prisma.validator<Prisma.AssessmentSessionInclude>()({
  targetSkill: { select: { id: true, name: true } },
  targetCompany: { select: { id: true, name: true } },
  learningPathItem: { select: { id: true, title: true, pathId: true } },
  questions: {
    orderBy: { orderIndex: 'asc' },
    include: {
      question: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          problemStatement: true,
          difficulty: true,
          starterCode: true,
          testCases: true,
          constraints: true,
          topicTags: true,
          skillId: true,
          skill: { select: { id: true, name: true } },
        },
      },
      attempts: {
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          status: true,
          code: true,
          language: true,
          testCasesPassed: true,
          testCasesTotal: true,
          executionTime: true,
          submittedAt: true,
        },
      },
    },
  },
});

type AssessmentWithDetails = Prisma.AssessmentSessionGetPayload<{ include: typeof assessmentInclude }>;

class AssessmentService {
  async createAssessment(
    userId: string,
    input: {
      learningPathItemId?: string;
      targetSkillId?: string;
      targetCompanyId?: string;
      questionCount?: number;
      durationMinutes?: number;
    }
  ) {
    const questionCount = Math.max(2, Math.min(3, input.questionCount ?? 3));
    const durationMinutes = Math.max(15, Math.min(180, input.durationMinutes ?? 60));

    let targetSkillId = input.targetSkillId;
    let targetCompanyId = input.targetCompanyId;
    let targetCompanyName: string | null = null;

    if (input.learningPathItemId) {
      const existing = await prisma.assessmentSession.findFirst({
        where: {
          userId,
          learningPathItemId: input.learningPathItemId,
          status: { in: ACTIVE_STATUSES },
        },
        include: assessmentInclude,
      });
      if (existing) return this.serialize(existing);

      const milestone = await prisma.learningPathItem.findFirst({
        where: {
          id: input.learningPathItemId,
          itemType: PathItemType.MILESTONE,
          status: { in: [PathItemStatus.PENDING, PathItemStatus.IN_PROGRESS] },
          learningPath: { userId, status: PathStatus.ACTIVE },
        },
        include: {
          learningPath: {
            include: {
              targetCompany: { select: { id: true, name: true } },
              targetSkill: { select: { id: true, name: true } },
            },
          },
        },
      });
      if (!milestone) throw ApiError.notFound('DSA assessment milestone not found');
      targetSkillId = milestone.learningPath.targetSkillId ?? undefined;
      targetCompanyId = milestone.learningPath.targetCompanyId ?? undefined;
      targetCompanyName = milestone.learningPath.targetCompany?.name ?? null;
    } else if (targetCompanyId) {
      const company = await prisma.company.findUnique({ where: { id: targetCompanyId }, select: { name: true } });
      if (!company) throw ApiError.notFound('Target company not found');
      targetCompanyName = company.name;
    }

    const proficiency = targetSkillId
      ? await prisma.userSkill.findUnique({
          where: { userId_skillId: { userId, skillId: targetSkillId } },
          select: { proficiencyLevel: true },
        })
      : null;
    const intendedDifficulties = this.difficultyMix(proficiency?.proficiencyLevel ?? 30, questionCount);

    const rawCandidates = await prisma.question.findMany({
      where: { isActive: true, type: QuestionType.CODING },
      include: {
        questionCompanies: { select: { companyId: true } },
        attempts: {
          where: { userId },
          orderBy: { submittedAt: 'desc' },
          select: { status: true, submittedAt: true },
        },
        spacedRepetitions: {
          where: { userId },
          select: { status: true },
        },
      },
      take: 250,
    });

    const selected = selectAssessmentQuestions(
      rawCandidates.map((question) => ({
        id: question.id,
        skillId: question.skillId,
        difficulty: question.difficulty,
        companyTags: question.companyTags,
        companyIds: question.questionCompanies.map((company) => company.companyId),
        acceptedBefore: question.attempts.some((attempt) => attempt.status === AttemptStatus.ACCEPTED),
        mastered: question.spacedRepetitions.some((review) => review.status === SpacedRepetitionStatus.MASTERED),
        lastAttemptedAt: question.attempts[0]?.submittedAt ?? null,
      })),
      { count: questionCount, targetSkillId, targetCompanyId, targetCompanyName, intendedDifficulties }
    );

    if (selected.length < 2) {
      throw ApiError.validation('Not enough eligible DSA questions for an assessment', {
        questions: ['Add at least two active, non-mastered coding questions to the question bank'],
      });
    }

    const created = await prisma.assessmentSession.create({
      data: {
        userId,
        learningPathItemId: input.learningPathItemId,
        targetSkillId,
        targetCompanyId,
        questionCount: selected.length,
        durationMinutes,
        questions: {
          create: selected.map((question, index) => ({
            questionId: question.id,
            orderIndex: index + 1,
          })),
        },
      },
      include: assessmentInclude,
    });
    await this.invalidateDashboard(userId);
    logger.info('DSA assessment created', { assessmentId: created.id, userId, questionCount: selected.length });
    return this.serialize(created);
  }

  async listAssessments(userId: string) {
    const sessions = await prisma.assessmentSession.findMany({
      where: { userId },
      include: assessmentInclude,
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    return Promise.all(sessions.map(async (session) => {
      const current = await this.expireIfNeeded(session);
      return this.serialize(current);
    }));
  }

  async getAssessment(id: string, userId: string) {
    const assessment = await this.getOwned(id, userId);
    return this.serialize(await this.expireIfNeeded(assessment));
  }

  async startAssessment(id: string, userId: string) {
    const updated = await prisma.$transaction(async (tx) => {
      await this.lock(tx, id);
      const assessment = await tx.assessmentSession.findFirst({ where: { id, userId } });
      if (!assessment) throw ApiError.notFound('Assessment not found');
      if (TERMINAL_STATUSES.includes(assessment.status)) return assessment;
      if (assessment.status === AssessmentStatus.IN_PROGRESS) return assessment;

      const now = new Date();
      const started = await tx.assessmentSession.update({
        where: { id },
        data: {
          status: AssessmentStatus.IN_PROGRESS,
          startedAt: now,
          expiresAt: new Date(now.getTime() + assessment.durationMinutes * 60 * 1000),
        },
      });
      await tx.assessmentQuestion.updateMany({
        where: { assessmentSessionId: id, status: AssessmentQuestionStatus.PENDING },
        data: { status: AssessmentQuestionStatus.IN_PROGRESS, startedAt: now },
      });
      if (assessment.learningPathItemId) {
        await tx.learningPathItem.updateMany({
          where: { id: assessment.learningPathItemId, status: PathItemStatus.PENDING },
          data: { status: PathItemStatus.IN_PROGRESS },
        });
      }
      return started;
    });
    await this.invalidateDashboard(userId);
    logger.info('DSA assessment started', { assessmentId: id, userId });
    return this.serialize(await this.getOwned(updated.id, userId));
  }

  async runCode(
    id: string,
    assessmentQuestionId: string,
    userId: string,
    input: { code: string; language: string; input?: string }
  ) {
    const context = await this.requireCurrentQuestion(id, assessmentQuestionId, userId);
    if (this.isExpired(context.assessment)) {
      await this.completeAssessment(id, userId);
      throw ApiError.conflict('Assessment time has expired');
    }
    return judgeService.runCustomInput(input.code, input.language, input.input ?? '');
  }

  async submitQuestion(
    id: string,
    assessmentQuestionId: string,
    userId: string,
    input: { code: string; language: string; submissionKey: string }
  ) {
    const existing = await prisma.attempt.findFirst({
      where: { assessmentQuestionId, submissionKey: input.submissionKey, userId },
    });
    if (existing) return this.submissionResponse(existing);

    const prepared = await prisma.$transaction(async (tx) => {
      await this.lock(tx, id);
      const context = await this.requireCurrentQuestion(id, assessmentQuestionId, userId, tx);
      if (this.isExpired(context.assessment)) throw ApiError.conflict('Assessment time has expired');
      const pending = await tx.attempt.findFirst({
        where: {
          assessmentQuestionId,
          status: { in: [AttemptStatus.PENDING, AttemptStatus.RUNNING] },
        },
      });
      if (pending) throw ApiError.conflict('A submission is already being judged');

      const previousAttempts = await tx.attempt.count({ where: { userId, questionId: context.question.questionId } });
      const now = new Date();
      const timeSpent = Math.max(0, Math.round((now.getTime() - (context.question.startedAt ?? now).getTime()) / 1000));
      const attempt = await tx.attempt.create({
        data: {
          userId,
          questionId: context.question.questionId,
          code: input.code,
          language: input.language,
          timeSpent,
          status: AttemptStatus.RUNNING,
          isPractice: false,
          attemptNumber: previousAttempts + 1,
          assessmentSessionId: id,
          assessmentQuestionId,
          submissionKey: input.submissionKey,
        },
      });
      return { attempt, question: context.question, assessment: context.assessment, timeSpent };
    });

    try {
      const testCases = Array.isArray(prepared.question.question.testCases)
        ? prepared.question.question.testCases
        : [];
      const result = await judgeService.judgeSubmission(input.code, input.language, testCases);
      const verdict = this.attemptStatus(result.verdict);
      const questionBudget = (prepared.assessment.durationMinutes * 60) / prepared.assessment.questionCount;
      const scoring = scoreAssessmentQuestion({
        difficulty: prepared.question.question.difficulty,
        testCasesPassed: result.testCasesPassed,
        testCasesTotal: result.testCasesTotal,
        timeSpentSeconds: prepared.timeSpent,
      }, questionBudget);

      await prisma.$transaction(async (tx) => {
        await this.lock(tx, id);
        await tx.attempt.updateMany({
          where: { id: prepared.attempt.id, status: { in: [AttemptStatus.PENDING, AttemptStatus.RUNNING] } },
          data: {
            status: verdict,
            testCasesPassed: result.testCasesPassed,
            testCasesTotal: result.testCasesTotal,
            executionTime: result.executionTime,
          },
        });
        if (result.results.length > 0) {
          await tx.attemptTestCase.createMany({
            data: result.results.map((testCase) => ({
              attemptId: prepared.attempt.id,
              testCaseIndex: testCase.index,
              input: testCase.input,
              expectedOutput: testCase.expected,
              actualOutput: testCase.actual,
              passed: testCase.passed,
              executionTime: testCase.executionTime,
              errorMessage: testCase.error ?? undefined,
            })),
          });
        }
        await tx.assessmentQuestion.update({
          where: { id: assessmentQuestionId },
          data: {
            status: AssessmentQuestionStatus.SUBMITTED,
            completedAt: new Date(),
            submittedCode: input.code,
            language: input.language,
            timeSpentSeconds: prepared.timeSpent,
            testCasesPassed: result.testCasesPassed,
            testCasesTotal: result.testCasesTotal,
            verdict,
            correctnessScore: scoring.correctnessScore,
            timeEfficiencyScore: scoring.timeEfficiencyScore,
            weightedScore: scoring.weightedScore,
          },
        });
        await this.activateNext(tx, id, prepared.question.orderIndex);
      });
      logger.info('Assessment submission judged', { assessmentId: id, assessmentQuestionId, attemptId: prepared.attempt.id, verdict });
    } catch (error) {
      await prisma.attempt.updateMany({
        where: { id: prepared.attempt.id, status: { in: [AttemptStatus.PENDING, AttemptStatus.RUNNING] } },
        data: { status: AttemptStatus.RUNTIME_ERROR },
      });
      throw error;
    }

    const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id: prepared.attempt.id } });
    const remaining = await prisma.assessmentQuestion.count({
      where: { assessmentSessionId: id, status: { in: [AssessmentQuestionStatus.PENDING, AssessmentQuestionStatus.IN_PROGRESS] } },
    });
    if (remaining === 0) await this.completeAssessment(id, userId);
    return this.submissionResponse(attempt);
  }

  async skipQuestion(id: string, assessmentQuestionId: string, userId: string) {
    await prisma.$transaction(async (tx) => {
      await this.lock(tx, id);
      const context = await this.requireCurrentQuestion(id, assessmentQuestionId, userId, tx);
      if (this.isExpired(context.assessment)) throw ApiError.conflict('Assessment time has expired');
      const now = new Date();
      const timeSpent = Math.max(0, Math.round((now.getTime() - (context.question.startedAt ?? now).getTime()) / 1000));
      await tx.assessmentQuestion.update({
        where: { id: assessmentQuestionId },
        data: { status: AssessmentQuestionStatus.SKIPPED, completedAt: now, timeSpentSeconds: timeSpent },
      });
      await this.activateNext(tx, id, context.question.orderIndex);
    });
    const remaining = await prisma.assessmentQuestion.count({
      where: { assessmentSessionId: id, status: { in: [AssessmentQuestionStatus.PENDING, AssessmentQuestionStatus.IN_PROGRESS] } },
    });
    if (remaining === 0) return this.completeAssessment(id, userId);
    return this.getAssessment(id, userId);
  }

  async completeAssessment(id: string, userId: string) {
    const outcome = await prisma.$transaction(async (tx) => {
      await this.lock(tx, id);
      const assessment = await tx.assessmentSession.findFirst({
        where: { id, userId },
        include: assessmentInclude,
      });
      if (!assessment) throw ApiError.notFound('Assessment not found');
      if (TERMINAL_STATUSES.includes(assessment.status)) return { assessment, finalized: false };
      if (assessment.status === AssessmentStatus.SCHEDULED) throw ApiError.badRequest('Start the assessment before completing it');

      const completedAt = new Date();
      await tx.assessmentQuestion.updateMany({
        where: { assessmentSessionId: id, status: { in: [AssessmentQuestionStatus.PENDING, AssessmentQuestionStatus.IN_PROGRESS] } },
        data: { status: AssessmentQuestionStatus.UNANSWERED, completedAt },
      });
      const questions = await tx.assessmentQuestion.findMany({
        where: { assessmentSessionId: id },
        include: { question: { include: { skill: true } } },
        orderBy: { orderIndex: 'asc' },
      });
      const overallScore = calculateOverallAssessmentScore(
        questions.map((question) => ({
          difficulty: question.question.difficulty,
          testCasesPassed: question.testCasesPassed,
          testCasesTotal: question.testCasesTotal,
          timeSpentSeconds: question.timeSpentSeconds,
          weightedScore: question.weightedScore,
        })),
        assessment.durationMinutes * 60
      );
      const passed = overallScore >= assessment.passingThreshold;
      const skillScores = new Map<string, { name: string; total: number; count: number }>();
      questions.forEach((question) => {
        const current = skillScores.get(question.question.skillId) ?? { name: question.question.skill.name, total: 0, count: 0 };
        current.total += question.correctnessScore;
        current.count += 1;
        skillScores.set(question.question.skillId, current);
      });
      const strengths: string[] = [];
      const weakSkills: string[] = [];
      skillScores.forEach((skill) => {
        const average = skill.total / Math.max(1, skill.count);
        (average >= 70 ? strengths : weakSkills).push(skill.name);
      });
      const result = {
        passed,
        threshold: assessment.passingThreshold,
        strengths,
        weakSkills,
        recommendedQuestionIds: questions
          .filter((question) => question.correctnessScore < 70)
          .map((question) => question.questionId),
      };
      await tx.assessmentSession.update({
        where: { id },
        data: {
          status: passed ? AssessmentStatus.COMPLETED : AssessmentStatus.NEEDS_PRACTICE,
          completedAt,
          overallScore,
          result,
        },
      });
      const updated = await tx.assessmentSession.findUniqueOrThrow({ where: { id }, include: assessmentInclude });
      return { assessment: updated, finalized: true };
    });

    if (outcome.finalized) await this.runCompletionAutomation(outcome.assessment);
    return this.serialize(outcome.assessment);
  }

  async abandonAssessment(id: string, userId: string) {
    const updated = await prisma.$transaction(async (tx) => {
      await this.lock(tx, id);
      const assessment = await tx.assessmentSession.findFirst({ where: { id, userId } });
      if (!assessment) throw ApiError.notFound('Assessment not found');
      if (TERMINAL_STATUSES.includes(assessment.status)) return assessment;
      const abandoned = await tx.assessmentSession.update({
        where: { id },
        data: { status: AssessmentStatus.ABANDONED, completedAt: new Date() },
      });
      if (assessment.learningPathItemId) {
        await tx.learningPathItem.updateMany({
          where: { id: assessment.learningPathItemId, status: PathItemStatus.IN_PROGRESS },
          data: { status: PathItemStatus.PENDING },
        });
      }
      return abandoned;
    });
    await this.invalidateDashboard(userId);
    return this.serialize(await this.getOwned(updated.id, userId));
  }

  private async runCompletionAutomation(assessment: AssessmentWithDetails) {
    try {
      if (assessment.status === AssessmentStatus.COMPLETED) {
        await learningPathService.markAssessmentMilestoneCompleted(
          assessment.userId,
          assessment.id,
          assessment.overallScore ?? 0,
          assessment.learningPathItemId
        );
      } else if (assessment.status === AssessmentStatus.NEEDS_PRACTICE) {
        await learningPathService.recordAssessmentNeedsPractice(
          assessment.userId,
          assessment.id,
          assessment.overallScore ?? 0,
          assessment.learningPathItemId,
          assessment.questions
            .filter((question) => question.correctnessScore < 70)
            .map((question) => ({
              questionId: question.questionId,
              skillId: question.question.skillId,
              title: question.question.title,
              difficulty: question.question.difficulty,
            }))
        );
      }
    } catch (error) {
      logger.error('Assessment learning-path automation failed', {
        assessmentId: assessment.id,
        userId: assessment.userId,
        status: assessment.status,
        error,
      });
    }
    await this.invalidateDashboard(assessment.userId);
  }

  private async getOwned(id: string, userId: string) {
    const assessment = await prisma.assessmentSession.findFirst({
      where: { id, userId },
      include: assessmentInclude,
    });
    if (!assessment) throw ApiError.notFound('Assessment not found');
    return assessment;
  }

  private async requireCurrentQuestion(
    id: string,
    assessmentQuestionId: string,
    userId: string,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ) {
    const assessment = await client.assessmentSession.findFirst({ where: { id, userId } });
    if (!assessment) throw ApiError.notFound('Assessment not found');
    if (assessment.status !== AssessmentStatus.IN_PROGRESS) throw ApiError.conflict('Assessment is not in progress');
    const question = await client.assessmentQuestion.findFirst({
      where: {
        id: assessmentQuestionId,
        assessmentSessionId: id,
        status: AssessmentQuestionStatus.IN_PROGRESS,
      },
      include: { question: true },
    });
    if (!question) throw ApiError.conflict('Only the current assessment question can be changed');
    return { assessment, question };
  }

  private async activateNext(tx: Prisma.TransactionClient, assessmentId: string, completedOrder: number) {
    const next = await tx.assessmentQuestion.findFirst({
      where: { assessmentSessionId: assessmentId, orderIndex: { gt: completedOrder }, status: AssessmentQuestionStatus.PENDING },
      orderBy: { orderIndex: 'asc' },
      select: { id: true },
    });
    if (next) {
      await tx.assessmentQuestion.update({
        where: { id: next.id },
        data: { status: AssessmentQuestionStatus.IN_PROGRESS, startedAt: new Date() },
      });
    }
  }

  private async expireIfNeeded(assessment: AssessmentWithDetails) {
    if (assessment.status === AssessmentStatus.IN_PROGRESS && this.isExpired(assessment)) {
      await this.completeAssessment(assessment.id, assessment.userId);
      return this.getOwned(assessment.id, assessment.userId);
    }
    return assessment;
  }

  private isExpired(assessment: { expiresAt: Date | null }) {
    return Boolean(assessment.expiresAt && assessment.expiresAt.getTime() <= Date.now());
  }

  private difficultyMix(proficiency: number, count: number): Difficulty[] {
    const base = proficiency < 35
      ? [Difficulty.easy, Difficulty.medium, Difficulty.medium]
      : proficiency < 70
      ? [Difficulty.medium, Difficulty.medium, Difficulty.hard]
      : [Difficulty.medium, Difficulty.hard, Difficulty.hard];
    return base.slice(0, count);
  }

  private attemptStatus(verdict: string): AttemptStatus {
    const statuses = AttemptStatus as unknown as Record<string, AttemptStatus>;
    return statuses[verdict] ?? AttemptStatus.RUNTIME_ERROR;
  }

  private submissionResponse(attempt: {
    id: string;
    status: AttemptStatus;
    testCasesPassed: number;
    testCasesTotal: number;
    executionTime: number | null;
  }) {
    return {
      attemptId: attempt.id,
      verdict: attempt.status.toLowerCase(),
      testCasesPassed: attempt.testCasesPassed,
      testCasesTotal: attempt.testCasesTotal,
      executionTime: attempt.executionTime,
    };
  }

  private serialize(assessment: AssessmentWithDetails) {
    const terminal = TERMINAL_STATUSES.includes(assessment.status);
    const currentQuestion = assessment.questions.find((question) => question.status === AssessmentQuestionStatus.IN_PROGRESS);
    return {
      id: assessment.id,
      learningPathItemId: assessment.learningPathItemId,
      targetSkill: assessment.targetSkill,
      targetCompany: assessment.targetCompany,
      questionCount: assessment.questionCount,
      durationMinutes: assessment.durationMinutes,
      passingThreshold: assessment.passingThreshold,
      status: statusForApi(assessment.status),
      startedAt: assessment.startedAt,
      expiresAt: assessment.expiresAt,
      completedAt: assessment.completedAt,
      overallScore: assessment.overallScore,
      result: assessment.result,
      currentQuestionId: currentQuestion?.id ?? null,
      questions: assessment.questions.map((selected) => {
        return {
        id: selected.id,
        orderIndex: selected.orderIndex,
        status: questionStatusForApi(selected.status),
        verdict: selected.verdict?.toLowerCase() ?? null,
        testCasesPassed: selected.testCasesPassed,
        testCasesTotal: selected.testCasesTotal,
        timeSpentSeconds: selected.timeSpentSeconds,
        correctnessScore: selected.correctnessScore,
        timeEfficiencyScore: selected.timeEfficiencyScore,
        weightedScore: selected.weightedScore,
        submittedCode: selected.submittedCode,
        language: selected.language,
        question: this.safeQuestion(selected.question),
        };
      }),
    };
  }

  private safeQuestion(question: AssessmentWithDetails['questions'][number]['question']) {
    const rawTestCases = (Array.isArray(question.testCases) ? question.testCases : []) as Array<Record<string, any>>;
    const examples = rawTestCases
      .filter((testCase) => testCase?.isExample === true)
      .map((testCase) => ({
        input: typeof testCase.input === 'string'
          ? testCase.input
          : Array.isArray(testCase.args)
          ? testCase.args.map((value: unknown) => typeof value === 'string' ? value : JSON.stringify(value)).join('\n')
          : String(testCase.input ?? ''),
        expectedOutput: typeof testCase.expectedOutput === 'string'
          ? testCase.expectedOutput
          : String(testCase.expected ?? ''),
      }));
    const { testCases: _hiddenTestCases, ...safe } = question;
    return { ...safe, examples };
  }

  private async lock(tx: Prisma.TransactionClient, id: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
  }

  private async invalidateDashboard(userId: string) {
    await cache.del(cacheKeys.dashboard(userId));
  }
}

export const assessmentService = new AssessmentService();
