import {
  Difficulty as PrismaDifficulty,
  QuestionType as PrismaQuestionType,
  SpacedRepetitionStatus as PrismaSpacedRepetitionStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { cache, cacheKeys, cacheTTL } from '../config/redis';
import { ApiError } from '../middleware/errorHandler';
import { Question, QuestionFilter } from '../types';
import { serializeQuestion } from '../utils/apiFormat';

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
  async getQuestions(
    filter: QuestionFilter,
    userId?: string
  ): Promise<{ questions: Question[]; total: number; totalPages: number }> {
    const {
      difficulty,
      skillId,
      type,
      company,
      search,
      isPremium,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    // Build cache key
    const cacheKey = cacheKeys.questionsList(JSON.stringify(filter));
    
    // Try cache first (only for non-user-specific queries)
    if (!userId) {
      const cached = await cache.get<{ questions: Question[]; total: number; totalPages: number }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build where clause
    const where: any = { isActive: true };

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
    const total = await prisma.question.count({ where });
    const totalPages = Math.ceil(total / limit);

    const sortField = this.getSafeSortField(sortBy);

    // Get questions
    const questions = await prisma.question.findMany({
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
    let questionsWithStatus = questions.map((question) => serializeQuestion(question)) as unknown as Question[];
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
      await cache.set(cacheKey, result, cacheTTL.questionsList);
    }

    return result;
  }

  /**
   * Get question by ID
   */
  async getQuestionById(questionId: string, userId?: string): Promise<Question> {
    // Try cache first
    const cacheKey = cacheKeys.question(questionId);
    const cached = await cache.get<Question>(cacheKey);
    
    if (cached && !userId) {
      return cached;
    }

    const question = await prisma.question.findFirst({
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
      throw ApiError.notFound('Question not found');
    }

    // Cache question
    await cache.set(cacheKey, question, cacheTTL.question);

    return serializeQuestion(question) as unknown as Question;
  }

  /**
   * Get question by slug
   */
  async getQuestionBySlug(slug: string, _userId?: string): Promise<Question> {
    const question = await prisma.question.findFirst({
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
      throw ApiError.notFound('Question not found');
    }

    return serializeQuestion(question) as unknown as Question;
  }

  /**
   * Get recommended questions for user (adaptive learning)
   */
  async getRecommendedQuestions(userId: string, limit: number = 5): Promise<Question[]> {
    // Get user's skill profile
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { proficiencyLevel: 'asc' },
    });

    // Get weak skills (proficiency < 50)
    const weakSkills = userSkills.filter((us) => us.proficiencyLevel < 50);

    // Get questions for weak skills
    const recommendedQuestions: Question[] = [];

    const weakSkillQuestionGroups = await Promise.all(
      weakSkills.slice(0, 3).map((userSkill) =>
        prisma.question.findMany({
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
          take: Math.ceil(limit / Math.max(weakSkills.length, 1)),
          orderBy: { acceptanceRate: 'desc' },
        })
      )
    );

    for (const questions of weakSkillQuestionGroups) {
      recommendedQuestions.push(...(questions.map((question) => serializeQuestion(question)) as unknown as Question[]));
    }

    // If not enough weak skill questions, add popular questions
    if (recommendedQuestions.length < limit) {
      const additionalQuestions = await prisma.question.findMany({
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

      recommendedQuestions.push(
        ...(additionalQuestions.map((question) => serializeQuestion(question)) as unknown as Question[])
      );
    }

    return recommendedQuestions.slice(0, limit);
  }

  /**
   * Get questions for spaced repetition review
   */
  async getDueReviewQuestions(userId: string, limit: number = 10): Promise<Question[]> {
    const dueReviews = await prisma.spacedRepetition.findMany({
      where: {
        userId,
        nextReviewDate: { lte: new Date() },
        status: PrismaSpacedRepetitionStatus.ACTIVE,
      },
      include: { question: true },
      take: limit,
      orderBy: { nextReviewDate: 'asc' },
    });

    return dueReviews.map((sr) => serializeQuestion(sr.question) as unknown as Question);
  }

  /**
   * Search questions
   */
  async searchQuestions(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ questions: Question[]; total: number }> {
    const questions = await prisma.question.findMany({
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

    const total = await prisma.question.count({
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
      questions: questions.map((question) => serializeQuestion(question)) as unknown as Question[],
      total,
    };
  }

  /**
   * Get company-specific questions
   */
  async getCompanyQuestions(
    company: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ questions: Question[]; total: number }> {
    const questions = await prisma.question.findMany({
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

    const total = await prisma.question.count({
      where: {
        isActive: true,
        companyTags: { has: company },
      },
    });

    return {
      questions: questions.map((question) => serializeQuestion(question)) as unknown as Question[],
      total,
    };
  }

  /**
   * Add attempt status to questions
   */
  private async addAttemptStatus(questions: Question[], userId: string): Promise<Question[]> {
    const questionIds = questions.map((q) => q.id);

    const attempts = await prisma.attempt.findMany({
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
    })) as Question[];
  }

  /**
   * Map proficiency level to difficulty
   */
  private mapProficiencyToDifficulty(proficiency: number): PrismaDifficulty {
    if (proficiency < 25) return PrismaDifficulty.easy;
    if (proficiency < 50) return PrismaDifficulty.medium;
    if (proficiency < 75) return PrismaDifficulty.hard;
    return PrismaDifficulty.expert;
  }

  /**
   * Increment question attempt count
   */
  async incrementAttemptCount(questionId: string, solved: boolean): Promise<void> {
    const updated = await prisma.question.update({
      where: { id: questionId },
      data: {
        totalAttempts: { increment: 1 },
        ...(solved && { totalSolves: { increment: 1 } }),
      },
    });

    await prisma.question.update({
      where: { id: questionId },
      data: {
        acceptanceRate: updated.totalAttempts > 0
          ? Math.round((updated.totalSolves / updated.totalAttempts) * 1000) / 10
          : 0,
      },
    });

    // Invalidate cache
    await cache.del(cacheKeys.question(questionId));
  }

  private toPrismaQuestionType(type: string): PrismaQuestionType {
    const typeMap: Record<string, PrismaQuestionType> = {
      coding: PrismaQuestionType.CODING,
      CODING: PrismaQuestionType.CODING,
      'system-design': PrismaQuestionType.SYSTEM_DESIGN,
      SYSTEM_DESIGN: PrismaQuestionType.SYSTEM_DESIGN,
      behavioral: PrismaQuestionType.BEHAVIORAL,
      BEHAVIORAL: PrismaQuestionType.BEHAVIORAL,
      theoretical: PrismaQuestionType.THEORETICAL,
      THEORETICAL: PrismaQuestionType.THEORETICAL,
      quiz: PrismaQuestionType.QUIZ,
      QUIZ: PrismaQuestionType.QUIZ,
    };

    return typeMap[type] ?? PrismaQuestionType.CODING;
  }

  private getSafeSortField(sortBy: string): string {
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
export const questionService = new QuestionService();
