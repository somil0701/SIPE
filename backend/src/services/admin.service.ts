import { AttemptStatus as PrismaAttemptStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';

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

const uploadDirectories = Array.from(new Set([
  path.resolve(process.cwd(), env.UPLOAD_DIR),
  path.resolve(__dirname, '..', '..', env.UPLOAD_DIR),
]));

const getStoredResumeFileName = (fileUrl: string) => {
  const parsedPath = fileUrl.split('?')[0].replace(/\\/g, '/');
  const fileName = path.posix.basename(parsedPath);

  if (!fileName || fileName === '.' || fileName === '..' || fileName.includes('/') || fileName.includes('\\')) {
    throw ApiError.badRequest('Invalid resume filename');
  }

  if (fileName !== path.basename(fileName)) {
    throw ApiError.badRequest('Invalid resume filename');
  }

  return fileName;
};

const getSafeResumeFilePaths = (fileUrl: string) => {
  const fileName = getStoredResumeFileName(fileUrl);
  const filePaths = uploadDirectories.map((uploadDirectory) => {
    const filePath = path.resolve(uploadDirectory, fileName);
    const relativePath = path.relative(uploadDirectory, filePath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw ApiError.badRequest('Invalid resume file path');
    }

    return filePath;
  });

  return { fileName, filePaths };
};

const JUDGE_FAILURE_STATUSES: PrismaAttemptStatus[] = [
  PrismaAttemptStatus.WRONG_ANSWER,
  PrismaAttemptStatus.TIME_LIMIT_EXCEEDED,
  PrismaAttemptStatus.RUNTIME_ERROR,
  PrismaAttemptStatus.COMPILATION_ERROR,
  PrismaAttemptStatus.PARTIALLY_ACCEPTED,
];

const JUDGE_IN_PROGRESS_STATUSES: PrismaAttemptStatus[] = [
  PrismaAttemptStatus.PENDING,
  PrismaAttemptStatus.RUNNING,
];

const formatAttemptStatus = (status: PrismaAttemptStatus) =>
  status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const percent = (value: number, total: number) => (
  total > 0 ? Math.round((value / total) * 1000) / 10 : 0
);

const compactErrorSignature = (message: string | null | undefined) => {
  if (!message) return 'No error message captured';

  return message
    .split('\n')[0]
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140) || 'No error message captured';
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

  async getJudgeReliability(options: { days?: number } = {}) {
    const days = Math.min(Math.max(options.days || 7, 1), 30);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalSubmissions,
      acceptedSubmissions,
      timeoutSubmissions,
      runtimeErrorSubmissions,
      compilationErrorSubmissions,
      partiallyAcceptedSubmissions,
      inProgressSubmissions,
      executionAggregate,
      verdictGroups,
      languageGroups,
      recentFailures,
      failedTestCases,
    ] = await Promise.all([
      prisma.attempt.count({ where: { submittedAt: { gte: since } } }),
      prisma.attempt.count({ where: { status: PrismaAttemptStatus.ACCEPTED, submittedAt: { gte: since } } }),
      prisma.attempt.count({ where: { status: PrismaAttemptStatus.TIME_LIMIT_EXCEEDED, submittedAt: { gte: since } } }),
      prisma.attempt.count({ where: { status: PrismaAttemptStatus.RUNTIME_ERROR, submittedAt: { gte: since } } }),
      prisma.attempt.count({ where: { status: PrismaAttemptStatus.COMPILATION_ERROR, submittedAt: { gte: since } } }),
      prisma.attempt.count({ where: { status: PrismaAttemptStatus.PARTIALLY_ACCEPTED, submittedAt: { gte: since } } }),
      prisma.attempt.count({ where: { status: { in: JUDGE_IN_PROGRESS_STATUSES }, submittedAt: { gte: since } } }),
      prisma.attempt.aggregate({
        where: {
          submittedAt: { gte: since },
          executionTime: { not: null },
        },
        _avg: { executionTime: true },
        _max: { executionTime: true },
      }),
      prisma.attempt.groupBy({
        by: ['status'],
        where: { submittedAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.attempt.groupBy({
        by: ['language'],
        where: { submittedAt: { gte: since } },
        _count: { _all: true },
        _avg: {
          executionTime: true,
          testCasesPassed: true,
          testCasesTotal: true,
        },
      }),
      prisma.attempt.findMany({
        where: {
          submittedAt: { gte: since },
          status: { in: JUDGE_FAILURE_STATUSES },
        },
        orderBy: { submittedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          status: true,
          language: true,
          executionTime: true,
          testCasesPassed: true,
          testCasesTotal: true,
          submittedAt: true,
          question: {
            select: {
              title: true,
              slug: true,
            },
          },
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
          attemptTestCases: {
            where: { passed: false },
            orderBy: { testCaseIndex: 'asc' },
            take: 1,
            select: {
              testCaseIndex: true,
              errorMessage: true,
              expectedOutput: true,
              actualOutput: true,
            },
          },
        },
      }),
      prisma.attemptTestCase.findMany({
        where: {
          passed: false,
          createdAt: { gte: since },
        },
        select: {
          errorMessage: true,
          attempt: {
            select: {
              status: true,
              language: true,
            },
          },
        },
        take: 500,
      }),
    ]);

    const failureSubmissions = verdictGroups
      .filter((group) => JUDGE_FAILURE_STATUSES.includes(group.status))
      .reduce((sum, group) => sum + group._count._all, 0);

    const errorSignatureMap = new Map<string, {
      signature: string;
      count: number;
      statuses: Set<PrismaAttemptStatus>;
      languages: Set<string>;
    }>();

    failedTestCases.forEach((testCase) => {
      const signature = compactErrorSignature(testCase.errorMessage);
      const existing = errorSignatureMap.get(signature) ?? {
        signature,
        count: 0,
        statuses: new Set<PrismaAttemptStatus>(),
        languages: new Set<string>(),
      };

      existing.count += 1;
      existing.statuses.add(testCase.attempt.status);
      existing.languages.add(testCase.attempt.language);
      errorSignatureMap.set(signature, existing);
    });

    return {
      window: {
        days,
        since,
        generatedAt: new Date(),
      },
      summary: {
        totalSubmissions,
        acceptedSubmissions,
        failureSubmissions,
        inProgressSubmissions,
        successRate: percent(acceptedSubmissions, totalSubmissions),
        failureRate: percent(failureSubmissions, totalSubmissions),
        timeoutRate: percent(timeoutSubmissions, totalSubmissions),
        compilationErrorRate: percent(compilationErrorSubmissions, totalSubmissions),
        runtimeErrorRate: percent(runtimeErrorSubmissions, totalSubmissions),
        partiallyAcceptedRate: percent(partiallyAcceptedSubmissions, totalSubmissions),
        averageExecutionTimeMs: Math.round(executionAggregate._avg.executionTime ?? 0),
        maxExecutionTimeMs: executionAggregate._max.executionTime ?? 0,
      },
      verdictBreakdown: verdictGroups
        .map((group) => ({
          status: group.status,
          label: formatAttemptStatus(group.status),
          count: group._count._all,
          rate: percent(group._count._all, totalSubmissions),
        }))
        .sort((first, second) => second.count - first.count),
      languageBreakdown: languageGroups
        .map((group) => ({
          language: group.language,
          submissions: group._count._all,
          averageExecutionTimeMs: Math.round(group._avg.executionTime ?? 0),
          averagePassedTests: Math.round((group._avg.testCasesPassed ?? 0) * 10) / 10,
          averageTotalTests: Math.round((group._avg.testCasesTotal ?? 0) * 10) / 10,
          averagePassRate: percent(group._avg.testCasesPassed ?? 0, group._avg.testCasesTotal ?? 0),
        }))
        .sort((first, second) => second.submissions - first.submissions),
      topErrorSignatures: [...errorSignatureMap.values()]
        .map((item) => ({
          signature: item.signature,
          count: item.count,
          statuses: [...item.statuses].map(formatAttemptStatus),
          languages: [...item.languages],
        }))
        .sort((first, second) => second.count - first.count)
        .slice(0, 6),
      recentFailures: recentFailures.map((attempt) => {
        const failedCase = attempt.attemptTestCases[0];

        return {
          id: attempt.id,
          status: attempt.status,
          label: formatAttemptStatus(attempt.status),
          language: attempt.language,
          executionTime: attempt.executionTime,
          testCasesPassed: attempt.testCasesPassed,
          testCasesTotal: attempt.testCasesTotal,
          submittedAt: attempt.submittedAt,
          questionTitle: attempt.question.title,
          questionSlug: attempt.question.slug,
          userName: attempt.user.fullName,
          userEmail: attempt.user.email,
          firstFailedTestIndex: failedCase?.testCaseIndex ?? null,
          errorMessage: failedCase?.errorMessage ?? null,
          expectedOutput: failedCase?.expectedOutput ?? null,
          actualOutput: failedCase?.actualOutput ?? null,
        };
      }),
    };
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
      where.parsingStatus = options.status;
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

    const resumeFiles = resumes.map((resume) => {
      const { fileName: storedFileName } = getSafeResumeFilePaths(resume.fileUrl);

      return {
        id: resume.id,
        fileName: storedFileName,
        originalName: resume.fileName,
        fileType: resume.fileType,
        fileSize: resume.fileSize,
        uploadedAt: resume.uploadedAt,
        parsingStatus: resume.parsingStatus,
        parsingError: resume.parsingError,
        isActive: resume.isActive,
        downloadUrl: `/api/v1/admin/resumes/${resume.id}/download`,
        user: resume.user,
      };
    });

    return {
      resumes: resumeFiles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getResumeDownload(resumeId: string) {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
      },
    });

    if (!resume) {
      throw ApiError.notFound('Resume not found');
    }

    const { fileName: storedFileName, filePaths } = getSafeResumeFilePaths(resume.fileUrl);

    const filePath = filePaths.find((candidatePath) => fs.existsSync(candidatePath));

    if (!filePath) {
      throw ApiError.notFound('Resume file not found');
    }

    await fs.promises.access(filePath, fs.constants.R_OK);

    return {
      filePath,
      storedFileName,
      downloadName: resume.fileName || storedFileName,
      contentType: resume.fileType || 'application/octet-stream',
    };
  }
}

export const adminService = new AdminService();
