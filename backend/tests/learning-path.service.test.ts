jest.mock('../src/config/database', () => {
  const prisma: any = {
    learningPathItem: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
      count: jest.fn(),
    },
    learningPath: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    skill: { findMany: jest.fn(), findFirst: jest.fn() },
    company: { findUnique: jest.fn() },
    userSkill: { findMany: jest.fn() },
    attempt: { findMany: jest.fn() },
    spacedRepetition: { findMany: jest.fn() },
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

import { Difficulty, PathItemStatus, PathItemType, PathStatus } from '@prisma/client';
import { prisma } from '../src/config/database';
import { learningPathService } from '../src/services/learning-path.service';

const db = prisma as any;

describe('LearningPathService completion integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback(db));
    db.$executeRaw.mockResolvedValue(1);
    db.learningPathItem.updateMany.mockResolvedValue({ count: 1 });
    db.learningPathItem.count.mockImplementation(({ where }: any) => {
      if (where.status === PathItemStatus.COMPLETED) return Promise.resolve(1);
      if (where.status === PathItemStatus.SKIPPED) return Promise.resolve(0);
      return Promise.resolve(3);
    });
    db.learningPath.update.mockResolvedValue({});
    db.learningPath.findMany.mockResolvedValue([]);
  });

  it('completes only the explicitly supplied path item for an accepted attempt', async () => {
    db.learningPathItem.findFirst.mockResolvedValue({ id: 'item-1', pathId: 'path-1' });

    await learningPathService.markAcceptedAttempt('user-1', 'question-1', 'attempt-1', 'item-1');

    expect(db.learningPathItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'item-1', questionId: 'question-1' }),
    }));
    expect(db.learningPathItem.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'item-1' }),
      data: expect.objectContaining({ attemptId: 'attempt-1', status: PathItemStatus.COMPLETED }),
    }));
  });

  it('is idempotent when the task is already complete', async () => {
    db.learningPathItem.findFirst.mockResolvedValue(null);

    await learningPathService.markAcceptedAttempt('user-1', 'question-1', 'attempt-1', 'item-1');

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.learningPathItem.updateMany).not.toHaveBeenCalled();
  });

  it('does not guess an assessment milestone without an exact path item link', async () => {
    await learningPathService.markAssessmentMilestoneCompleted('user-1', 'assessment-1', 84);

    expect(db.learningPathItem.findFirst).not.toHaveBeenCalled();
  });

  it('completes the exact linked assessment milestone once with score evidence', async () => {
    db.learningPathItem.findFirst.mockResolvedValue({ id: 'milestone-1', pathId: 'path-1' });

    await learningPathService.markAssessmentMilestoneCompleted('user-1', 'assessment-1', 84, 'milestone-1');

    expect(db.learningPathItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'milestone-1', itemType: PathItemType.MILESTONE }),
    }));
    expect(db.learningPathItem.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'milestone-1' }),
      data: expect.objectContaining({
        completionEvidence: expect.objectContaining({ assessmentId: 'assessment-1', score: 84 }),
      }),
    }));
  });

  it('keeps a failed milestone pending and inserts targeted remediation once', async () => {
    db.learningPathItem.findFirst.mockResolvedValue({ id: 'milestone-1', pathId: 'path-1', orderIndex: 5 });
    db.learningPathItem.count.mockImplementation(({ where }: any) => {
      if (where.selectionReason) return Promise.resolve(0);
      if (where.status === PathItemStatus.COMPLETED) return Promise.resolve(2);
      if (where.status === PathItemStatus.SKIPPED) return Promise.resolve(0);
      return Promise.resolve(6);
    });
    db.learningPathItem.createMany.mockResolvedValue({ count: 1 });
    db.learningPathItem.update.mockResolvedValue({});

    await learningPathService.recordAssessmentNeedsPractice(
      'user-1',
      'assessment-1',
      55,
      'milestone-1',
      [{ questionId: 'question-1', skillId: 'skill-1', title: 'Two Sum', difficulty: Difficulty.easy }]
    );

    expect(db.learningPathItem.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ questionId: 'question-1', itemType: PathItemType.REVIEW })],
    }));
    expect(db.learningPathItem.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'milestone-1' },
      data: expect.objectContaining({
        status: PathItemStatus.PENDING,
        completionEvidence: expect.objectContaining({ result: 'needs_practice', score: 55 }),
      }),
    }));
  });

  it('completes only the next matching review item', async () => {
    db.learningPathItem.findFirst.mockResolvedValue({ id: 'review-1', pathId: 'path-1' });

    await learningPathService.markReviewCompleted('user-1', 'question-1');

    expect(db.learningPathItem.updateMany).toHaveBeenCalledTimes(1);
    expect(db.learningPathItem.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'review-1' }),
      data: expect.objectContaining({ status: PathItemStatus.COMPLETED }),
    }));
  });

  it('rejects updates to path items the user does not own', async () => {
    db.learningPathItem.findFirst.mockResolvedValue(null);

    await expect(
      learningPathService.updateItemStatus('user-2', 'path-1', 'item-1', PathItemStatus.IN_PROGRESS)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('preserves the active path status while recalculating partial progress', async () => {
    db.learningPathItem.findFirst.mockResolvedValue({ id: 'item-1', pathId: 'path-1' });

    await learningPathService.markAcceptedAttempt('user-1', 'question-1', 'attempt-1', 'item-1');

    expect(db.learningPath.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PathStatus.ACTIVE, progressPercentage: 33 }),
    }));
  });

  it('serializes progress mutations with a database advisory lock', async () => {
    db.learningPathItem.findFirst.mockResolvedValue({ id: 'item-1', pathId: 'path-1' });

    await learningPathService.markAcceptedAttempt('user-1', 'question-1', 'attempt-1', 'item-1');

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.learningPathItem.updateMany.mock.invocationCallOrder[0]
    );
  });
});

describe('LearningPathService generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.skill.findMany.mockResolvedValue([{ id: 'skill-1' }]);
    db.userSkill.findMany.mockResolvedValue([{
      skillId: 'skill-1',
      questionsAttempted: 4,
      accuracyRate: 50,
      skill: { id: 'skill-1', name: 'Arrays' },
    }]);
    db.attempt.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    db.spacedRepetition.findMany.mockResolvedValue([{
      id: 'sr-1',
      questionId: 'review-question',
      nextReviewDate: new Date('2026-06-20T00:00:00.000Z'),
      question: {
        id: 'review-question',
        title: 'Two Sum Review',
        skillId: 'skill-1',
        skill: { id: 'skill-1', name: 'Arrays' },
      },
    }]);
    db.question.findMany.mockResolvedValue(
      Array.from({ length: 4 }, (_, index) => ({
        id: `question-${index}`,
        title: `Question ${index}`,
        difficulty: Difficulty.easy,
        skillId: 'skill-1',
        skill: { id: 'skill-1', name: 'Arrays' },
      }))
    );
  });

  it('places real spaced-repetition work before new practice', async () => {
    const preview = await learningPathService.previewPath('user-1', {
      name: 'DSA foundations',
      goalType: 'general',
      weeklyStudyMinutes: 300,
    });

    expect(preview.items[0]).toMatchObject({
      itemType: PathItemType.REVIEW,
      questionId: 'review-question',
      phase: 'Review & Retention',
    });
    expect(preview.items[1].itemType).toBe(PathItemType.QUESTION);
    expect(preview.items.at(-1)?.itemType).toBe(PathItemType.MILESTONE);
    expect(preview.items.at(-1)?.title).toBe('DSA assessment checkpoint');
  });
});
