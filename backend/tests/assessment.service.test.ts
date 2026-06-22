jest.mock('../src/config/database', () => {
  const prisma: any = {
    assessmentSession: {
      findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    assessmentQuestion: {
      findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn(),
    },
    attempt: {
      findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn(),
    },
    attemptTestCase: { createMany: jest.fn() },
    learningPathItem: { findFirst: jest.fn(), updateMany: jest.fn() },
    company: { findUnique: jest.fn() },
    userSkill: { findFirst: jest.fn(), findUnique: jest.fn() },
    question: { findMany: jest.fn() },
    $executeRaw: jest.fn(),
  };
  prisma.$transaction = jest.fn((callback: (tx: any) => unknown) => callback(prisma));
  return { prisma };
});

jest.mock('../src/config/redis', () => ({
  cache: { del: jest.fn().mockResolvedValue(undefined) },
  cacheKeys: { dashboard: (userId: string) => `user:${userId}:dashboard:v3` },
}));

jest.mock('../src/judge/judge.service', () => ({
  judgeService: {
    judgeSubmission: jest.fn(),
    runCustomInput: jest.fn(),
  },
}));

jest.mock('../src/services/learning-path.service', () => ({
  learningPathService: {
    markAssessmentMilestoneCompleted: jest.fn(),
    recordAssessmentNeedsPractice: jest.fn(),
  },
}));

import {
  AssessmentQuestionStatus,
  AssessmentStatus,
  AttemptStatus,
  Difficulty,
} from '@prisma/client';
import { prisma } from '../src/config/database';
import { judgeService } from '../src/judge/judge.service';
import { learningPathService } from '../src/services/learning-path.service';
import {
  assessmentService,
  calculateOverallAssessmentScore,
  scoreAssessmentQuestion,
  selectAssessmentQuestions,
  SelectionCandidate,
} from '../src/services/assessment.service';

const db = prisma as any;
const judge = judgeService as jest.Mocked<typeof judgeService>;
const pathAutomation = learningPathService as jest.Mocked<typeof learningPathService>;

const question = (overrides: any = {}) => ({
  id: 'selected-1',
  assessmentSessionId: 'assessment-1',
  questionId: 'question-1',
  orderIndex: 1,
  status: AssessmentQuestionStatus.IN_PROGRESS,
  startedAt: new Date('2026-06-21T10:00:00.000Z'),
  completedAt: null,
  submittedCode: null,
  language: null,
  timeSpentSeconds: 0,
  testCasesPassed: 0,
  testCasesTotal: 0,
  verdict: null,
  correctnessScore: 0,
  timeEfficiencyScore: 0,
  weightedScore: 0,
  attempts: [],
  question: {
    id: 'question-1', title: 'Two Sum', slug: 'two-sum', description: 'Find a pair',
    problemStatement: 'Find a pair', difficulty: Difficulty.medium, starterCode: {},
    constraints: [], topicTags: ['arrays'], skillId: 'skill-1', testCases: [],
    companyTags: [], hints: [], followUpQuestions: [], prerequisites: [],
    skill: { id: 'skill-1', name: 'Arrays' },
  },
  ...overrides,
});

const assessment = (overrides: any = {}) => ({
  id: 'assessment-1',
  userId: 'user-1',
  learningPathItemId: 'milestone-1',
  targetSkillId: 'skill-1',
  targetCompanyId: null,
  questionCount: 2,
  durationMinutes: 60,
  passingThreshold: 70,
  status: AssessmentStatus.IN_PROGRESS,
  startedAt: new Date('2026-06-21T10:00:00.000Z'),
  expiresAt: new Date('2026-06-21T11:00:00.000Z'),
  completedAt: null,
  overallScore: null,
  result: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  targetSkill: { id: 'skill-1', name: 'Arrays' },
  targetCompany: null,
  learningPathItem: { id: 'milestone-1', title: 'DSA assessment checkpoint', pathId: 'path-1' },
  questions: [question()],
  ...overrides,
});

describe('assessment question selection', () => {
  const candidate = (id: string, overrides: Partial<SelectionCandidate> = {}): SelectionCandidate => ({
    id,
    skillId: 'skill-1',
    difficulty: Difficulty.medium,
    companyTags: [],
    companyIds: [],
    acceptedBefore: false,
    mastered: false,
    lastAttemptedAt: null,
    ...overrides,
  });

  it('excludes mastered questions and duplicate IDs while preferring unseen questions', () => {
    const selected = selectAssessmentQuestions([
      candidate('mastered', { mastered: true }),
      candidate('accepted', { acceptedBefore: true }),
      candidate('new'),
      candidate('new'),
    ], {
      count: 3,
      targetSkillId: 'skill-1',
      intendedDifficulties: [Difficulty.medium, Difficulty.medium, Difficulty.hard],
    });

    expect(selected.map((item) => item.id)).toEqual(['new', 'accepted']);
  });

  it('falls back to non-company questions when company-specific coverage is sparse', () => {
    const selected = selectAssessmentQuestions([
      candidate('company-match', { companyIds: ['company-1'] }),
      candidate('general-1'),
      candidate('general-2'),
    ], {
      count: 3,
      targetCompanyId: 'company-1',
      intendedDifficulties: [Difficulty.medium, Difficulty.medium, Difficulty.hard],
    });

    expect(selected).toHaveLength(3);
    expect(selected[0].id).toBe('company-match');
    expect(selected.map((item) => item.id)).toEqual(expect.arrayContaining(['general-1', 'general-2']));
  });

  it('deprioritizes very recent attempts when alternatives exist', () => {
    const selected = selectAssessmentQuestions([
      candidate('recent', { lastAttemptedAt: new Date('2026-06-20T00:00:00.000Z') }),
      candidate('older', { lastAttemptedAt: new Date('2026-05-01T00:00:00.000Z') }),
    ], {
      count: 1,
      targetSkillId: 'skill-1',
      intendedDifficulties: [Difficulty.medium],
      now: new Date('2026-06-21T00:00:00.000Z'),
    });
    expect(selected[0].id).toBe('older');
  });

  it('spreads Mixed DSA selections across skills before repeating a topic', () => {
    const selected = selectAssessmentQuestions([
      candidate('arrays-1', { skillId: 'arrays' }),
      candidate('arrays-2', { skillId: 'arrays' }),
      candidate('graphs-1', { skillId: 'graphs' }),
      candidate('dp-1', { skillId: 'dp' }),
    ], {
      count: 3,
      intendedDifficulties: [Difficulty.medium, Difficulty.medium, Difficulty.medium],
    });

    expect(new Set(selected.map((item) => item.skillId)).size).toBe(3);
  });
});

describe('assessment question disclosure', () => {
  it('returns public examples while stripping every hidden test case', () => {
    const safeQuestion = (assessmentService as any).safeQuestion({
      ...question().question,
      testCases: [
        { input: '2 3', expectedOutput: '5', isExample: true },
        { input: 'hidden input', expectedOutput: 'hidden output', isExample: false },
      ],
    });

    expect(safeQuestion.examples).toEqual([{ input: '2 3', expectedOutput: '5' }]);
    expect(safeQuestion.testCases).toBeUndefined();
    expect(JSON.stringify(safeQuestion)).not.toContain('hidden input');
  });
});

describe('deterministic assessment scoring', () => {
  it('uses 80% correctness, 20% time efficiency, and difficulty weighting', () => {
    expect(scoreAssessmentQuestion({
      difficulty: Difficulty.medium,
      testCasesPassed: 8,
      testCasesTotal: 10,
      timeSpentSeconds: 600,
    }, 1200)).toMatchObject({ correctnessScore: 80, timeEfficiencyScore: 50, weightedScore: 74 });

    const score = calculateOverallAssessmentScore([
      { difficulty: Difficulty.easy, testCasesPassed: 10, testCasesTotal: 10, timeSpentSeconds: 600 },
      { difficulty: Difficulty.hard, testCasesPassed: 5, testCasesTotal: 10, timeSpentSeconds: 600 },
    ], 3600);
    expect(score).toBe(69);
  });

  it('scores skipped and unanswered questions as zero', () => {
    expect(calculateOverallAssessmentScore([
      { difficulty: Difficulty.medium, testCasesPassed: 0, testCasesTotal: 0, timeSpentSeconds: 0 },
      { difficulty: Difficulty.medium, testCasesPassed: 0, testCasesTotal: 0, timeSpentSeconds: 0 },
    ], 3600)).toBe(0);
  });
});

describe('assessment lifecycle and ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback(db));
    db.$executeRaw.mockResolvedValue(1);
    db.assessmentQuestion.updateMany.mockResolvedValue({ count: 1 });
    db.learningPathItem.updateMany.mockResolvedValue({ count: 1 });
  });

  it('rejects access when the assessment is not owned by the caller', async () => {
    db.assessmentSession.findFirst.mockResolvedValue(null);
    await expect(assessmentService.getAssessment('assessment-1', 'other-user')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('starts once with server-authored timestamps and resumes idempotently', async () => {
    const scheduled = assessment({ status: AssessmentStatus.SCHEDULED, startedAt: null, expiresAt: null });
    const started = assessment();
    db.assessmentSession.findFirst.mockResolvedValueOnce(scheduled).mockResolvedValueOnce(started);
    db.assessmentSession.update.mockResolvedValue(started);

    await assessmentService.startAssessment('assessment-1', 'user-1');
    expect(db.assessmentSession.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: AssessmentStatus.IN_PROGRESS, startedAt: expect.any(Date), expiresAt: expect.any(Date) }),
    }));

    jest.clearAllMocks();
    db.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback(db));
    db.$executeRaw.mockResolvedValue(1);
    db.assessmentSession.findFirst.mockResolvedValue(started);
    await assessmentService.startAssessment('assessment-1', 'user-1');
    expect(db.assessmentSession.update).not.toHaveBeenCalled();
  });

  it('auto-completes an expired in-progress session when it is read', async () => {
    const expired = assessment({ expiresAt: new Date(Date.now() - 1000) });
    const completed = assessment({ status: AssessmentStatus.NEEDS_PRACTICE, completedAt: new Date(), overallScore: 0 });
    db.assessmentSession.findFirst.mockResolvedValueOnce(expired).mockResolvedValueOnce(completed);
    const complete = jest.spyOn(assessmentService, 'completeAssessment').mockResolvedValue({} as any);

    await assessmentService.getAssessment('assessment-1', 'user-1');
    expect(complete).toHaveBeenCalledWith('assessment-1', 'user-1');
    complete.mockRestore();
  });

  it('advances sequentially after a skip', async () => {
    const active = assessment({ expiresAt: new Date(Date.now() + 60_000) });
    const current = question();
    db.assessmentSession.findFirst.mockResolvedValueOnce(active).mockResolvedValueOnce(active);
    db.assessmentQuestion.findFirst.mockResolvedValueOnce(current).mockResolvedValueOnce({ id: 'selected-2' });
    db.assessmentQuestion.update.mockResolvedValue({});
    db.assessmentQuestion.count.mockResolvedValue(1);

    await assessmentService.skipQuestion('assessment-1', 'selected-1', 'user-1');
    expect(db.assessmentQuestion.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'selected-1' }, data: expect.objectContaining({ status: AssessmentQuestionStatus.SKIPPED }),
    }));
    expect(db.assessmentQuestion.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'selected-2' }, data: expect.objectContaining({ status: AssessmentQuestionStatus.IN_PROGRESS }),
    }));
  });

  it('abandons idempotently and releases an in-progress learning-path milestone', async () => {
    const active = assessment();
    const abandoned = assessment({ status: AssessmentStatus.ABANDONED, completedAt: new Date() });
    db.assessmentSession.findFirst.mockResolvedValueOnce(active).mockResolvedValueOnce(abandoned);
    db.assessmentSession.update.mockResolvedValue(abandoned);
    db.learningPathItem.updateMany.mockResolvedValue({ count: 1 });

    await assessmentService.abandonAssessment('assessment-1', 'user-1');
    expect(db.learningPathItem.updateMany).toHaveBeenCalledWith({
      where: { id: 'milestone-1', status: 'IN_PROGRESS' },
      data: { status: 'PENDING' },
    });
  });

  it('links every persisted judge submission to the exact session and selected question', async () => {
    const active = assessment({ expiresAt: new Date(Date.now() + 60_000) });
    const current = question({ startedAt: new Date(Date.now() - 30_000) });
    const attempt = {
      id: 'attempt-1', status: AttemptStatus.ACCEPTED, testCasesPassed: 2, testCasesTotal: 2,
      executionTime: 12,
    };
    db.attempt.findFirst.mockResolvedValue(null);
    db.assessmentSession.findFirst.mockResolvedValue(active);
    db.assessmentQuestion.findFirst.mockResolvedValueOnce(current).mockResolvedValueOnce(null);
    db.attempt.count.mockResolvedValue(0);
    db.attempt.create.mockResolvedValue({ ...attempt, status: AttemptStatus.RUNNING });
    db.attempt.updateMany.mockResolvedValue({ count: 1 });
    db.attemptTestCase.createMany.mockResolvedValue({ count: 2 });
    db.assessmentQuestion.update.mockResolvedValue({});
    db.assessmentQuestion.count.mockResolvedValue(1);
    db.attempt.findUniqueOrThrow.mockResolvedValue(attempt);
    judge.judgeSubmission.mockResolvedValue({
      verdict: 'ACCEPTED', testCasesPassed: 2, testCasesTotal: 2, executionTime: 12,
      compileOutput: '',
      results: [
        { index: 0, input: 'hidden', expected: '1', actual: '1', passed: true, executionTime: 5, verdict: 'ACCEPTED' },
        { index: 1, input: 'hidden', expected: '2', actual: '2', passed: true, executionTime: 7, verdict: 'ACCEPTED' },
      ],
    } as any);

    await assessmentService.submitQuestion('assessment-1', 'selected-1', 'user-1', {
      code: 'solution', language: 'javascript', submissionKey: 'submission-key-1',
    });

    expect(db.attempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        isPractice: false,
        assessmentSessionId: 'assessment-1',
        assessmentQuestionId: 'selected-1',
        submissionKey: 'submission-key-1',
      }),
    }));
  });

  it('returns the existing attempt for a duplicate submission key without judging twice', async () => {
    db.attempt.findFirst.mockResolvedValue({
      id: 'attempt-1', status: AttemptStatus.ACCEPTED, testCasesPassed: 2, testCasesTotal: 2, executionTime: 10,
    });
    await assessmentService.submitQuestion('assessment-1', 'selected-1', 'user-1', {
      code: 'solution', language: 'javascript', submissionKey: 'submission-key-1',
    });
    expect(judge.judgeSubmission).not.toHaveBeenCalled();
  });

  it('marks unfinished questions unanswered and finalizes concurrent completion requests once', async () => {
    const completedQuestion = question({
      status: AssessmentQuestionStatus.SUBMITTED,
      testCasesPassed: 2,
      testCasesTotal: 2,
      correctnessScore: 100,
      weightedScore: 90,
      verdict: AttemptStatus.ACCEPTED,
    });
    const active = assessment({ questions: [completedQuestion] });
    const completed = assessment({
      status: AssessmentStatus.COMPLETED,
      completedAt: new Date(),
      overallScore: 90,
      result: { passed: true, threshold: 70, strengths: ['Arrays'], weakSkills: [], recommendedQuestionIds: [] },
      questions: [completedQuestion],
    });
    db.assessmentSession.findFirst.mockResolvedValueOnce(active).mockResolvedValueOnce(completed);
    db.assessmentQuestion.findMany.mockResolvedValue([completedQuestion]);
    db.assessmentSession.update.mockResolvedValue(completed);
    db.assessmentSession.findUniqueOrThrow.mockResolvedValue(completed);
    const automation = jest.spyOn(assessmentService as any, 'runCompletionAutomation').mockResolvedValue(undefined);

    const results = await Promise.all([
      assessmentService.completeAssessment('assessment-1', 'user-1'),
      assessmentService.completeAssessment('assessment-1', 'user-1'),
    ]);

    expect(results).toHaveLength(2);
    expect(db.assessmentQuestion.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: AssessmentQuestionStatus.UNANSWERED }),
    }));
    expect(db.assessmentSession.update).toHaveBeenCalledTimes(1);
    expect(automation).toHaveBeenCalledTimes(1);
    automation.mockRestore();
  });

  it('isolates learning-path automation failure from a valid completed result', async () => {
    const completed = assessment({ status: AssessmentStatus.COMPLETED, completedAt: new Date(), overallScore: 88 });
    pathAutomation.markAssessmentMilestoneCompleted.mockRejectedValue(new Error('cache unavailable'));
    await expect((assessmentService as any).runCompletionAutomation(completed)).resolves.toBeUndefined();
  });
});
