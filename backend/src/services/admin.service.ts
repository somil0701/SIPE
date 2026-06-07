import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';

const QUESTION_FIELDS = [
  'skillId',
  'title',
  'slug',
  'description',
  'problemStatement',
  'difficulty',
  'type',
  'starterCode',
  'solutionCode',
  'optimalTimeComplexity',
  'optimalSpaceComplexity',
  'hints',
  'testCases',
  'constraints',
  'followUpQuestions',
  'companyTags',
  'topicTags',
  'leetcodeId',
  'hackerrankId',
  'acceptanceRate',
  'totalAttempts',
  'totalSolves',
  'avgTimeSpent',
  'baseDifficultyScore',
  'adaptiveWeight',
  'explanation',
  'videoSolutionUrl',
  'articleUrl',
  'isPremium',
  'isActive',
  'verifiedBy',
];

const REQUIRED_QUESTION_FIELDS = [
  'skillId',
  'title',
  'slug',
  'description',
  'problemStatement',
  'difficulty',
  'type',
  'hints',
  'testCases',
  'constraints',
  'followUpQuestions',
  'companyTags',
  'topicTags',
];

const ARRAY_QUESTION_FIELDS = [
  'hints',
  'constraints',
  'followUpQuestions',
  'companyTags',
  'topicTags',
];

const normalizeQuestionData = (data: any, requireRequiredFields = false) => {
  if (!data || typeof data !== 'object') {
    throw ApiError.badRequest('Question payload is required');
  }

  const normalized: any = {};
  QUESTION_FIELDS.forEach((field) => {
    if (data[field] !== undefined) {
      normalized[field] = data[field];
    }
  });

  ARRAY_QUESTION_FIELDS.forEach((field) => {
    if (normalized[field] === undefined && requireRequiredFields) {
      normalized[field] = [];
    }
  });

  if (requireRequiredFields) {
    const missingFields = REQUIRED_QUESTION_FIELDS.filter((field) => {
      const value = normalized[field];
      return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      throw ApiError.validation('Question validation failed', {
        fields: missingFields.map((field) => `${field} is required`),
      });
    }
  }

  if (normalized.testCases !== undefined && !Array.isArray(normalized.testCases)) {
    throw ApiError.validation('Question validation failed', {
      testCases: ['testCases must be an array'],
    });
  }

  ARRAY_QUESTION_FIELDS.forEach((field) => {
    if (normalized[field] !== undefined && !Array.isArray(normalized[field])) {
      throw ApiError.validation('Question validation failed', {
        [field]: [`${field} must be an array`],
      });
    }
  });

  return normalized;
};

export class AdminService {
  async getDashboardStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newSignupsToday,
      dau,
      mau,
      problemsSolvedToday,
      mockInterviewsToday,
      resumesToday,
      activeLearningPaths,
      totalRevenueAggregate
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
      // DAU: users who logged in today
      prisma.user.count({ where: { lastLoginAt: { gte: today }, deletedAt: null } }),
      // MAU: users who logged in last 30 days
      prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo }, deletedAt: null } }),
      // Problems solved today
      prisma.attempt.count({ where: { status: 'ACCEPTED', submittedAt: { gte: today } } }),
      // Mock interviews today
      prisma.interviewSession.count({ where: { createdAt: { gte: today } } }),
      // Resume uploads today
      prisma.resume.count({ where: { uploadedAt: { gte: today } } }),
      // Active learning paths
      prisma.learningPath.count({ where: { status: 'ACTIVE' } }),
      // Total Revenue
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' }
      })
    ]);

    return {
      totalUsers,
      newSignupsToday,
      dau,
      mau,
      problemsSolvedToday,
      mockInterviewsToday,
      resumesToday,
      activeLearningPaths,
      totalRevenue: totalRevenueAggregate._sum.amount || 0,
    };
  }

  async getGrowthChartData() {
    const days = 7;
    const data = [];
    const now = new Date();
    // Start from 6 days ago up to today
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const newUsers = await prisma.user.count({
        where: { createdAt: { gte: d, lt: nextD }, deletedAt: null }
      });
      data.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        newUsers
      });
    }
    return data;
  }

  async getUsers(options: { page?: number; limit?: number; search?: string; role?: string; isPremium?: boolean }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.search) {
      where.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { fullName: { contains: options.search, mode: 'insensitive' } }
      ];
    }
    if (options.role) {
      where.role = options.role;
    }
    if (options.isPremium !== undefined) {
      where.isPremium = options.isPremium;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isPremium: true,
          createdAt: true,
          lastLoginAt: true,
          loginCount: true,
          deletedAt: true,
        }
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateUser(id: string, data: { role?: string; isPremium?: boolean; isBanned?: boolean }) {
    const updateData: any = {};
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isPremium !== undefined) updateData.isPremium = data.isPremium;
    if (data.isBanned !== undefined) {
      updateData.deletedAt = data.isBanned ? new Date() : null;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isPremium: true,
        createdAt: true,
        lastLoginAt: true,
        deletedAt: true,
      }
    });
    return user;
  }

  // --- Questions Management ---
  async getQuestions(options: { page?: number; limit?: number; search?: string; difficulty?: string }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { slug: { contains: options.search, mode: 'insensitive' } }
      ];
    }
    if (options.difficulty) {
      where.difficulty = options.difficulty;
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { skill: { select: { name: true } } }
      }),
      prisma.question.count({ where })
    ]);

    return {
      questions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createQuestion(data: any) {
    const questionData = normalizeQuestionData(data, true);

    return prisma.question.create({
      data: questionData
    });
  }

  async updateQuestion(id: string, data: any) {
    const questionData = normalizeQuestionData(data);

    return prisma.question.update({
      where: { id },
      data: questionData
    });
  }

  async deleteQuestion(id: string) {
    return prisma.question.delete({
      where: { id }
    });
  }

  // Helper to fetch skills for the create question dropdown
  async getSkills() {
    return prisma.skill.findMany({
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' }
    });
  }

  // --- Mock Interviews Management ---
  async getMockInterviews(options: { page?: number; limit?: number; status?: string }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) {
      where.status = options.status;
    }

    const [interviews, total] = await Promise.all([
      prisma.interviewSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true } },
          interviewQuestions: { select: { id: true } }
        }
      }),
      prisma.interviewSession.count({ where })
    ]);

    return {
      interviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // --- Resumes Management ---
  async getResumes(options: { page?: number; limit?: number; status?: string }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) {
      where.status = options.status;
    }

    const [resumes, total] = await Promise.all([
      prisma.resume.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true } }
        }
      }),
      prisma.resume.count({ where })
    ]);

    return {
      resumes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

export const adminService = new AdminService();
