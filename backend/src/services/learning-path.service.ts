import {
  AttemptStatus,
  Difficulty,
  PathItemStatus,
  PathItemType,
  PathStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';

export type LearningPathGoalType = 'general' | 'skill' | 'company' | 'interview';

export interface LearningPathInput {
  name: string;
  description?: string;
  goalType: LearningPathGoalType;
  targetSkillId?: string;
  targetCompanyId?: string;
  weeklyStudyMinutes: number;
  targetCompletionDate?: Date;
}

interface PlannedPathItem {
  itemType: PathItemType;
  questionId?: string;
  skillId?: string;
  title: string;
  description: string;
  phase: string;
  selectionReason: string;
  orderIndex: number;
  scheduledDate: Date;
  estimatedMinutes: number;
}

export interface LearningPathPreview {
  summary: string;
  estimatedHours: number;
  targetCompletionDate: Date;
  items: PlannedPathItem[];
}

const difficultyRank: Record<Difficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
};

const phaseForDifficulty = (difficulty: Difficulty) => {
  if (difficulty === Difficulty.easy) return 'Foundation';
  if (difficulty === Difficulty.medium) return 'Guided Practice';
  return 'Timed Practice';
};

const estimateForDifficulty = (difficulty: Difficulty) => {
  if (difficulty === Difficulty.easy) return 25;
  if (difficulty === Difficulty.medium) return 35;
  return 45;
};

class LearningPathService {
  async getOptions() {
    const [skills, companies] = await Promise.all([
      prisma.skill.findMany({
        where: { isActive: true, questions: { some: { isActive: true } } },
        select: { id: true, name: true, category: true, estimatedHours: true },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.company.findMany({
        where: { questionCompanies: { some: {} } },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { skills, companies };
  }

  async previewPath(userId: string, input: LearningPathInput): Promise<LearningPathPreview> {
    return this.buildPlan(userId, input);
  }

  async createPath(userId: string, input: LearningPathInput) {
    const duplicate = await prisma.learningPath.findFirst({
      where: {
        userId,
        name: { equals: input.name, mode: 'insensitive' },
        status: { in: [PathStatus.ACTIVE, PathStatus.PAUSED] },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw ApiError.conflict('An active learning path with this name already exists');
    }

    const preview = await this.buildPlan(userId, input);

    return prisma.$transaction(async (tx) => tx.learningPath.create({
      data: {
        userId,
        name: input.name.trim(),
        description: input.description?.trim() || preview.summary,
        goalType: input.goalType,
        targetSkillId: input.targetSkillId,
        targetCompanyId: input.targetCompanyId,
        weeklyStudyMinutes: input.weeklyStudyMinutes,
        estimatedHours: preview.estimatedHours,
        startDate: new Date(),
        targetCompletionDate: preview.targetCompletionDate,
        totalItems: preview.items.length,
        pathItems: { create: preview.items },
      },
      include: {
        targetSkill: true,
        targetCompany: true,
        pathItems: {
          include: { question: { select: { id: true, title: true, slug: true, difficulty: true } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    }));
  }

  async getTodayQueue(userId: string) {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const upcomingCutoff = new Date(endOfToday.getTime() + 7 * 86400000);

    const [pathItems, dueReviews, upcomingMilestone] = await Promise.all([
      prisma.learningPathItem.findMany({
        where: {
          learningPath: { userId, status: PathStatus.ACTIVE },
          status: { in: [PathItemStatus.PENDING, PathItemStatus.IN_PROGRESS] },
          OR: [
            { status: PathItemStatus.IN_PROGRESS },
            { scheduledDate: { lte: endOfToday } },
          ],
        },
        include: {
          question: { select: { id: true, title: true, slug: true } },
          learningPath: { select: { id: true, name: true } },
        },
        orderBy: [{ scheduledDate: 'asc' }, { orderIndex: 'asc' }],
        take: 8,
      }),
      prisma.spacedRepetition.findMany({
        where: { userId, status: 'ACTIVE', nextReviewDate: { lte: now } },
        include: { question: { select: { id: true, title: true, slug: true } } },
        orderBy: { nextReviewDate: 'asc' },
        take: 5,
      }),
      prisma.learningPathItem.findFirst({
        where: {
          learningPath: { userId, status: PathStatus.ACTIVE },
          itemType: PathItemType.MILESTONE,
          status: { in: [PathItemStatus.PENDING, PathItemStatus.IN_PROGRESS] },
          scheduledDate: { gt: endOfToday, lte: upcomingCutoff },
        },
        include: { learningPath: { select: { id: true, name: true } } },
        orderBy: [{ scheduledDate: 'asc' }, { orderIndex: 'asc' }],
      }),
    ]);

    const consumedPathItemIds = new Set<string>();
    const queue: Array<{
      id: string;
      type: 'review' | 'path_task' | 'milestone';
      title: string;
      context: string;
      dueAt: Date | null;
      isOverdue: boolean;
      href: string;
      pathId?: string;
      pathItemId?: string;
      priority: number;
    }> = [];

    for (const review of dueReviews) {
      const matchingPathItem = pathItems.find((item) =>
        !consumedPathItemIds.has(item.id)
        && item.questionId === review.questionId
        && item.itemType === PathItemType.REVIEW
      );
      if (matchingPathItem) consumedPathItemIds.add(matchingPathItem.id);

      queue.push({
        id: `review:${review.id}`,
        type: 'review',
        title: review.question.title,
        context: matchingPathItem
          ? `${matchingPathItem.learningPath.name} · retention review`
          : 'Spaced repetition · retention review',
        dueAt: review.nextReviewDate,
        isOverdue: review.nextReviewDate < now,
        href: matchingPathItem
          ? `/practice/${review.question.slug}?pathItemId=${matchingPathItem.id}`
          : '/spaced-repetition',
        pathId: matchingPathItem?.pathId,
        pathItemId: matchingPathItem?.id,
        priority: 0,
      });
    }

    for (const item of pathItems) {
      if (consumedPathItemIds.has(item.id)) continue;
      const isMilestone = item.itemType === PathItemType.MILESTONE;
      queue.push({
        id: `path:${item.id}`,
        type: isMilestone ? 'milestone' : 'path_task',
        title: item.title || item.question?.title || 'Learning-path task',
        context: `${item.learningPath.name} · ${item.phase || 'Practice'}`,
        dueAt: item.scheduledDate,
        isOverdue: Boolean(item.scheduledDate && item.scheduledDate < now),
        href: isMilestone
          ? `/mock-interview?pathItemId=${item.id}`
          : item.question?.slug
          ? `/practice/${item.question.slug}?pathItemId=${item.id}`
          : `/learning-path/${item.pathId}`,
        pathId: item.pathId,
        pathItemId: item.id,
        priority: item.status === PathItemStatus.IN_PROGRESS ? 1 : item.scheduledDate && item.scheduledDate < now ? 2 : 3,
      });
    }

    if (upcomingMilestone && !queue.some((item) => item.pathItemId === upcomingMilestone.id)) {
      queue.push({
        id: `path:${upcomingMilestone.id}`,
        type: 'milestone',
        title: upcomingMilestone.title || 'Mock interview checkpoint',
        context: `${upcomingMilestone.learningPath.name} · upcoming checkpoint`,
        dueAt: upcomingMilestone.scheduledDate,
        isOverdue: false,
        href: `/mock-interview?pathItemId=${upcomingMilestone.id}`,
        pathId: upcomingMilestone.pathId,
        pathItemId: upcomingMilestone.id,
        priority: 4,
      });
    }

    return queue
      .sort((first, second) => first.priority - second.priority || (first.dueAt?.getTime() || 0) - (second.dueAt?.getTime() || 0))
      .slice(0, 6)
      .map(({ priority: _priority, ...item }) => item);
  }

  async updateItemStatus(
    userId: string,
    pathId: string,
    itemId: string,
    status: PathItemStatus
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.learningPathItem.findFirst({
        where: { id: itemId, pathId, learningPath: { userId } },
        include: { learningPath: { select: { status: true } } },
      });

      if (!item) throw ApiError.notFound('Learning path item not found');
      if (item.learningPath.status === PathStatus.COMPLETED || item.learningPath.status === PathStatus.ABANDONED) {
        throw ApiError.conflict('Completed or abandoned paths cannot be edited');
      }

      await this.lockPath(tx, pathId);

      const updated = await tx.learningPathItem.update({
        where: { id: item.id },
        data: {
          status,
          completedAt: status === PathItemStatus.COMPLETED ? new Date() : null,
          completionEvidence: status === PathItemStatus.COMPLETED
            ? { type: 'manual', completedAt: new Date().toISOString() }
            : Prisma.JsonNull,
        },
      });

      await this.recalculateProgress(tx, pathId, item.learningPath.status);
      return updated;
    });
  }

  async markAcceptedAttempt(
    userId: string,
    questionId: string,
    attemptId: string,
    pathItemId?: string
  ) {
    const item = await prisma.learningPathItem.findFirst({
      where: {
        ...(pathItemId ? { id: pathItemId } : {}),
        questionId,
        status: { in: [PathItemStatus.PENDING, PathItemStatus.IN_PROGRESS] },
        learningPath: { userId, status: PathStatus.ACTIVE },
      },
      select: { id: true, pathId: true },
      orderBy: [{ scheduledDate: 'asc' }, { orderIndex: 'asc' }],
    });

    if (!item) return;

    await prisma.$transaction(async (tx) => {
      await this.lockPath(tx, item.pathId);
      const result = await tx.learningPathItem.updateMany({
        where: {
          id: item.id,
          status: { in: [PathItemStatus.PENDING, PathItemStatus.IN_PROGRESS] },
        },
        data: {
          status: PathItemStatus.COMPLETED,
          completedAt: new Date(),
          attemptId,
          completionEvidence: { type: 'accepted_attempt', attemptId, completedAt: new Date().toISOString() },
        },
      });

      if (result.count > 0) {
        await this.recalculateProgress(tx, item.pathId, PathStatus.ACTIVE);
      }
    });

    await this.rebalanceDuePaths(userId);
  }

  async rebalanceDuePaths(userId: string) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = await prisma.learningPath.findMany({
      where: {
        userId,
        status: PathStatus.ACTIVE,
        completedItems: { gt: 0 },
        OR: [{ lastRebalancedAt: null }, { lastRebalancedAt: { lt: cutoff } }],
      },
      select: { id: true, completedItems: true },
    });

    for (const path of candidates.filter((candidate) => candidate.completedItems % 3 === 0)) {
      await this.rebalancePath(userId, path.id);
    }
  }

  async markReviewCompleted(userId: string, questionId: string) {
    const item = await prisma.learningPathItem.findFirst({
      where: {
        questionId,
        itemType: PathItemType.REVIEW,
        status: { in: [PathItemStatus.PENDING, PathItemStatus.IN_PROGRESS] },
        learningPath: { userId, status: PathStatus.ACTIVE },
      },
      select: { id: true, pathId: true },
      orderBy: [{ scheduledDate: 'asc' }, { orderIndex: 'asc' }],
    });

    if (!item) return;
    await prisma.$transaction(async (tx) => {
      await this.lockPath(tx, item.pathId);
      const result = await tx.learningPathItem.updateMany({
        where: {
          id: item.id,
          status: { in: [PathItemStatus.PENDING, PathItemStatus.IN_PROGRESS] },
        },
        data: {
          status: PathItemStatus.COMPLETED,
          completedAt: new Date(),
          completionEvidence: { type: 'spaced_repetition', questionId, completedAt: new Date().toISOString() },
        },
      });
      if (result.count > 0) {
        await this.recalculateProgress(tx, item.pathId, PathStatus.ACTIVE);
      }
    });
    await this.rebalanceDuePaths(userId);
  }

  async markInterviewMilestoneCompleted(userId: string, interviewId: string, pathItemId?: string | null) {
    if (!pathItemId) return;
    const item = await prisma.learningPathItem.findFirst({
      where: {
        id: pathItemId,
        itemType: PathItemType.MILESTONE,
        status: { in: [PathItemStatus.PENDING, PathItemStatus.IN_PROGRESS] },
        learningPath: { userId, status: PathStatus.ACTIVE },
      },
      select: { id: true, pathId: true },
    });
    if (!item) return;

    await prisma.$transaction(async (tx) => {
      await this.lockPath(tx, item.pathId);
      const result = await tx.learningPathItem.updateMany({
        where: {
          id: item.id,
          status: { in: [PathItemStatus.PENDING, PathItemStatus.IN_PROGRESS] },
        },
        data: {
          status: PathItemStatus.COMPLETED,
          completedAt: new Date(),
          completionEvidence: { type: 'mock_interview', interviewId, completedAt: new Date().toISOString() },
        },
      });
      if (result.count > 0) {
        await this.recalculateProgress(tx, item.pathId, PathStatus.ACTIVE);
      }
    });
  }

  async rebalancePath(userId: string, pathId: string) {
    const path = await prisma.learningPath.findFirst({
      where: { id: pathId, userId },
      include: { pathItems: { select: { questionId: true, status: true, orderIndex: true } } },
    });
    if (!path) throw ApiError.notFound('Learning path not found');
    if (path.status !== PathStatus.ACTIVE) throw ApiError.conflict('Only active paths can be rebalanced');

    const preview = await this.buildPlan(userId, {
      name: path.name,
      description: path.description || undefined,
      goalType: path.goalType as LearningPathGoalType,
      targetSkillId: path.targetSkillId || undefined,
      targetCompanyId: path.targetCompanyId || undefined,
      weeklyStudyMinutes: path.weeklyStudyMinutes,
      targetCompletionDate: path.targetCompletionDate && path.targetCompletionDate > new Date()
        ? path.targetCompletionDate
        : undefined,
    });

    return prisma.$transaction(async (tx) => {
      await this.lockPath(tx, pathId);
      const current = await tx.learningPath.findFirst({
        where: { id: pathId, userId, status: PathStatus.ACTIVE },
        include: { pathItems: { select: { questionId: true, status: true, orderIndex: true } } },
      });
      if (!current) throw ApiError.conflict('This path changed while rebalancing; refresh and try again');

      const preserved = current.pathItems.filter((item) =>
        item.status === PathItemStatus.COMPLETED || item.status === PathItemStatus.IN_PROGRESS
      );
      const preservedQuestionIds = new Set(preserved.map((item) => item.questionId).filter(Boolean));
      const nextItems = preview.items
        .filter((item) => !item.questionId || !preservedQuestionIds.has(item.questionId))
        .map((item, index) => ({ ...item, orderIndex: preserved.length + index + 1 }));

      await tx.learningPathItem.deleteMany({
        where: { pathId, status: { in: [PathItemStatus.PENDING, PathItemStatus.SKIPPED] } },
      });
      if (nextItems.length > 0) {
        await tx.learningPathItem.createMany({ data: nextItems.map((item) => ({ ...item, pathId })) });
      }
      await tx.learningPath.update({
        where: { id: pathId },
        data: {
          totalItems: preserved.length + nextItems.length,
          estimatedHours: preview.estimatedHours,
          targetCompletionDate: preview.targetCompletionDate,
          lastRebalancedAt: new Date(),
        },
      });
      await this.recalculateProgress(tx, pathId, PathStatus.ACTIVE);
      return tx.learningPath.findUnique({
        where: { id: pathId },
        include: {
          targetSkill: true,
          targetCompany: true,
          pathItems: {
            include: { question: { select: { id: true, title: true, slug: true, difficulty: true } } },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    });
  }

  async previewRebalance(userId: string, pathId: string) {
    const path = await prisma.learningPath.findFirst({
      where: { id: pathId, userId },
      include: {
        pathItems: {
          where: { status: { in: [PathItemStatus.PENDING, PathItemStatus.SKIPPED] } },
          select: { questionId: true, title: true },
        },
      },
    });
    if (!path) throw ApiError.notFound('Learning path not found');
    if (path.status !== PathStatus.ACTIVE) throw ApiError.conflict('Only active paths can be rebalanced');

    const preview = await this.buildPlan(userId, {
      name: path.name,
      description: path.description || undefined,
      goalType: path.goalType as LearningPathGoalType,
      targetSkillId: path.targetSkillId || undefined,
      targetCompanyId: path.targetCompanyId || undefined,
      weeklyStudyMinutes: path.weeklyStudyMinutes,
      targetCompletionDate: path.targetCompletionDate && path.targetCompletionDate > new Date()
        ? path.targetCompletionDate
        : undefined,
    });

    const currentQuestionIds = new Set(path.pathItems.map((item) => item.questionId).filter(Boolean));
    const proposedQuestionIds = new Set(preview.items.map((item) => item.questionId).filter(Boolean));

    return {
      added: preview.items
        .filter((item) => !item.questionId || !currentQuestionIds.has(item.questionId))
        .map((item) => ({ title: item.title, reason: item.selectionReason })),
      removed: path.pathItems
        .filter((item) => !item.questionId || !proposedQuestionIds.has(item.questionId))
        .map((item) => ({ title: item.title || 'Path task' })),
      retainedCount: path.pathItems.filter((item) => item.questionId && proposedQuestionIds.has(item.questionId)).length,
      estimatedHours: preview.estimatedHours,
      targetCompletionDate: preview.targetCompletionDate,
    };
  }

  private async buildPlan(userId: string, input: LearningPathInput): Promise<LearningPathPreview> {
    const [targetSkill, targetCompany, userSkills, acceptedAttempts, failedAttempts] = await Promise.all([
      input.targetSkillId
        ? prisma.skill.findFirst({ where: { id: input.targetSkillId, isActive: true } })
        : null,
      input.targetCompanyId
        ? prisma.company.findUnique({ where: { id: input.targetCompanyId } })
        : null,
      prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true },
        orderBy: [{ accuracyRate: 'asc' }, { questionsAttempted: 'desc' }],
      }),
      prisma.attempt.findMany({
        where: { userId, status: AttemptStatus.ACCEPTED },
        select: { questionId: true },
        distinct: ['questionId'],
      }),
      prisma.attempt.findMany({
        where: { userId, status: { notIn: [AttemptStatus.ACCEPTED, AttemptStatus.PENDING, AttemptStatus.RUNNING] } },
        select: { questionId: true },
        orderBy: { submittedAt: 'desc' },
        take: 30,
      }),
    ]);

    if (input.targetSkillId && !targetSkill) {
      throw ApiError.validation('Invalid learning-path target', { targetSkillId: ['Skill not found'] });
    }
    if (input.targetCompanyId && !targetCompany) {
      throw ApiError.validation('Invalid learning-path target', { targetCompanyId: ['Company not found'] });
    }

    const reliableWeakSkills = userSkills.filter((skill) =>
      skill.questionsAttempted >= 2 && skill.accuracyRate < 75
    );
    const selectedSkillIds = new Set<string>();
    if (targetSkill) selectedSkillIds.add(targetSkill.id);
    reliableWeakSkills.slice(0, targetSkill ? 3 : 4).forEach((skill) => selectedSkillIds.add(skill.skillId));

    if (selectedSkillIds.size === 0) {
      const starterSkills = await prisma.skill.findMany({
        where: { isActive: true, questions: { some: { isActive: true } } },
        select: { id: true },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        take: 3,
      });
      starterSkills.forEach((skill) => selectedSkillIds.add(skill.id));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestedTarget = input.targetCompletionDate ? new Date(input.targetCompletionDate) : null;
    const reviewHorizon = requestedTarget || new Date(today.getTime() + 21 * 86400000);
    const dueReviews = await prisma.spacedRepetition.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        nextReviewDate: { lte: reviewHorizon },
        question: {
          isActive: true,
          skillId: { in: [...selectedSkillIds] },
        },
      },
      include: {
        question: { include: { skill: { select: { id: true, name: true } } } },
      },
      orderBy: { nextReviewDate: 'asc' },
      take: 4,
    });

    const acceptedIds = new Set(acceptedAttempts.map((attempt) => attempt.questionId));
    const failedIds = new Set(failedAttempts.map((attempt) => attempt.questionId));
    const baseWhere: Prisma.QuestionWhereInput = {
      isActive: true,
      skillId: { in: [...selectedSkillIds] },
      id: { notIn: [...acceptedIds] },
    };

    let questions = await prisma.question.findMany({
      where: input.targetCompanyId
        ? { ...baseWhere, questionCompanies: { some: { companyId: input.targetCompanyId } } }
        : baseWhere,
      include: { skill: { select: { id: true, name: true } } },
      take: 60,
    });

    // Company coverage may be sparse; retain the goal while filling the remainder from weak skills.
    if (questions.length < 4 && input.targetCompanyId) {
      const fallback = await prisma.question.findMany({
        where: baseWhere,
        include: { skill: { select: { id: true, name: true } } },
        take: 40,
      });
      const seen = new Set(questions.map((question) => question.id));
      questions = [...questions, ...fallback.filter((question) => !seen.has(question.id))];
    }

    if (questions.length === 0) {
      throw ApiError.validation('No suitable questions are available for this goal yet', {
        goal: ['Try a different skill/company or add more active questions'],
      });
    }

    const skillPriority = [...selectedSkillIds];
    questions.sort((a, b) => {
      const failedPriority = Number(failedIds.has(b.id)) - Number(failedIds.has(a.id));
      if (failedPriority !== 0) return failedPriority;
      const difficulty = difficultyRank[a.difficulty] - difficultyRank[b.difficulty];
      if (difficulty !== 0) return difficulty;
      return skillPriority.indexOf(a.skillId) - skillPriority.indexOf(b.skillId);
    });

    const availableWeeks = requestedTarget
      ? Math.max(1, Math.ceil((requestedTarget.getTime() - today.getTime()) / (7 * 86400000)))
      : 3;
    const minutesBudget = Math.max(120, Math.min(2400, input.weeklyStudyMinutes * availableWeeks));
    const desiredQuestionCount = Math.max(4, Math.min(12, Math.floor(minutesBudget / 35)));
    const selected = questions.slice(0, Math.max(2, desiredQuestionCount - dueReviews.length));

    let accumulatedMinutes = 0;
    const reviewItems: PlannedPathItem[] = dueReviews.map((review, index) => {
      const scheduledDate = new Date(review.nextReviewDate);
      const estimatedMinutes = 20;
      accumulatedMinutes += estimatedMinutes;

      return {
        itemType: PathItemType.REVIEW,
        questionId: review.questionId,
        skillId: review.question.skillId,
        title: `Retention review: ${review.question.title}`,
        description: `${review.question.skill.name} · spaced repetition · ${estimatedMinutes} minutes`,
        phase: 'Review & Retention',
        selectionReason: review.nextReviewDate <= today
          ? 'Scheduled now because this review is due in your spaced-repetition cycle.'
          : 'Scheduled from your existing spaced-repetition cycle to protect retention.',
        orderIndex: index + 1,
        scheduledDate,
        estimatedMinutes,
      };
    });

    const practiceItems: PlannedPathItem[] = selected.map((question, index) => {
      const estimatedMinutes = estimateForDifficulty(question.difficulty);
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + Math.floor((accumulatedMinutes / input.weeklyStudyMinutes) * 7));
      accumulatedMinutes += estimatedMinutes;
      const isReview = failedIds.has(question.id);
      const weakSkill = userSkills.find((skill) => skill.skillId === question.skillId);
      const reason = isReview
        ? 'Selected because a recent attempt exposed an unresolved mistake.'
        : targetSkill?.id === question.skillId
        ? `Selected for your ${targetSkill.name} goal.`
        : targetCompany
        ? `Selected to build skills relevant to ${targetCompany.name}.`
        : weakSkill
        ? `Selected because your ${question.skill.name} accuracy is ${Math.round(weakSkill.accuracyRate)}%.`
        : 'Selected as a foundation task for your current goal.';

      return {
        itemType: isReview ? PathItemType.REVIEW : PathItemType.QUESTION,
        questionId: question.id,
        skillId: question.skillId,
        title: isReview ? `Revisit: ${question.title}` : question.title,
        description: `${question.skill.name} · ${question.difficulty} · ${estimatedMinutes} minutes`,
        phase: isReview ? 'Review & Retention' : phaseForDifficulty(question.difficulty),
        selectionReason: reason,
        orderIndex: reviewItems.length + index + 1,
        scheduledDate,
        estimatedMinutes,
      };
    });
    const items = [...reviewItems, ...practiceItems];

    if (items.length >= 4) {
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + Math.floor((accumulatedMinutes / input.weeklyStudyMinutes) * 7));
      items.push({
        itemType: PathItemType.MILESTONE,
        title: 'Mock interview checkpoint',
        description: 'Complete a focused technical mock interview and review the session feedback.',
        phase: 'Interview Readiness',
        selectionReason: 'A checkpoint validates whether practice is transferring to interview performance.',
        orderIndex: items.length + 1,
        scheduledDate,
        estimatedMinutes: 45,
      });
      accumulatedMinutes += 45;
    }

    const computedTarget = new Date(today);
    computedTarget.setDate(today.getDate() + Math.max(7, Math.ceil((accumulatedMinutes / input.weeklyStudyMinutes) * 7)));

    const focus = targetSkill?.name || targetCompany?.name || 'your weakest interview skills';
    return {
      summary: `A phased plan focused on ${focus}, paced at ${input.weeklyStudyMinutes} minutes per week.`,
      estimatedHours: Math.max(1, Math.ceil(accumulatedMinutes / 60)),
      targetCompletionDate: requestedTarget || computedTarget,
      items,
    };
  }

  private async recalculateProgress(
    tx: Prisma.TransactionClient,
    pathId: string,
    currentStatus: PathStatus
  ) {
    const [totalItems, completedItems, skippedItems] = await Promise.all([
      tx.learningPathItem.count({ where: { pathId } }),
      tx.learningPathItem.count({ where: { pathId, status: PathItemStatus.COMPLETED } }),
      tx.learningPathItem.count({ where: { pathId, status: PathItemStatus.SKIPPED } }),
    ]);
    const requiredItems = Math.max(0, totalItems - skippedItems);
    const isCompleted = requiredItems > 0 && completedItems === requiredItems;
    const progressPercentage = requiredItems > 0
      ? Math.round((completedItems / requiredItems) * 100)
      : 0;

    await tx.learningPath.update({
      where: { id: pathId },
      data: {
        totalItems,
        completedItems,
        progressPercentage,
        status: isCompleted
          ? PathStatus.COMPLETED
          : currentStatus === PathStatus.PAUSED
          ? PathStatus.PAUSED
          : PathStatus.ACTIVE,
        actualCompletionDate: isCompleted ? new Date() : null,
      },
    });
  }

  private async lockPath(tx: Prisma.TransactionClient, pathId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pathId}))`;
  }
}

export const learningPathService = new LearningPathService();
