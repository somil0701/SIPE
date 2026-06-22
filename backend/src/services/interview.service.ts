import {
  Difficulty as PrismaDifficulty,
  InterviewStatus as PrismaInterviewStatus,
  InterviewType as PrismaInterviewType,
} from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/errorHandler';
import { aiService } from './ai.service';
import {
  interviewTypeForApi,
  serializeInterview,
} from '../utils/apiFormat';
import {
  InterviewSession,
  InterviewQuestion,
  CreateInterviewInput,
} from '../types';

/**
 * Interview Service
 * 
 * Handles mock interview functionality:
 * - Create interview sessions
 * - Generate questions
 * - Evaluate answers
 * - Generate summaries
 */

class InterviewService {
  /**
   * Create a new interview session
   */
  async createInterview(userId: string, input: CreateInterviewInput): Promise<InterviewSession> {
    const {
      title,
      interviewType,
      difficulty,
      targetCompanyId,
      scheduledAt,
      durationMinutes,
    } = input;

    const interview = await prisma.interviewSession.create({
      data: {
        userId,
        title: title || `${interviewType} Interview`,
        interviewType: this.toPrismaInterviewType(interviewType),
        difficulty: difficulty ? this.toPrismaDifficulty(difficulty) : PrismaDifficulty.medium,
        targetCompanyId,
        scheduledAt: scheduledAt || new Date(),
        durationMinutes: durationMinutes || 60,
        status: PrismaInterviewStatus.SCHEDULED,
      },
    });

    logger.info('Interview session created', { interviewId: interview.id, userId });

    return serializeInterview(interview) as unknown as InterviewSession;
  }

  /**
   * Start an interview
   */
  async startInterview(interviewId: string, userId: string): Promise<InterviewSession> {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: interviewId, userId },
    });

    if (!interview) {
      throw ApiError.notFound('Interview not found');
    }

    if (interview.status !== PrismaInterviewStatus.SCHEDULED) {
      throw ApiError.badRequest('Interview has already started or completed');
    }

    const updated = await prisma.interviewSession.update({
      where: { id: interviewId },
      data: {
        status: PrismaInterviewStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    // Generate first question
    await this.generateNextQuestion(interviewId, userId);

    return serializeInterview(updated) as unknown as InterviewSession;
  }

  /**
   * Get interview by ID
   */
  async getInterview(interviewId: string, userId: string): Promise<InterviewSession> {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: interviewId, userId },
      include: {
        interviewQuestions: {
          orderBy: { questionOrder: 'asc' },
        },
        targetCompany: true,
      },
    });

    if (!interview) {
      throw ApiError.notFound('Interview not found');
    }

    return serializeInterview(interview) as unknown as InterviewSession;
  }

  /**
   * Get user's interviews
   */
  async getUserInterviews(
    userId: string,
    options: { status?: string; page?: number; limit?: number } = {}
  ): Promise<{ interviews: InterviewSession[]; total: number }> {
    const { status, page = 1, limit = 10 } = options;

    const where: any = { userId };
    if (status) where.status = this.toPrismaInterviewStatus(status);

    const [interviews, total] = await Promise.all([
      prisma.interviewSession.findMany({
        where,
        include: {
          targetCompany: {
            select: { name: true, logoUrl: true },
          },
          _count: {
            select: { interviewQuestions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.interviewSession.count({ where }),
    ]);

    return {
      interviews: interviews.map((interview) => serializeInterview(interview)) as unknown as InterviewSession[],
      total,
    };
  }

  /**
   * Get current question for interview
   */
  async getCurrentQuestion(interviewId: string, userId: string): Promise<InterviewQuestion | null> {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: interviewId, userId },
    });

    if (!interview) {
      throw ApiError.notFound('Interview not found');
    }

    const currentQuestion = await prisma.interviewQuestion.findFirst({
      where: {
        interviewSessionId: interviewId,
        userAnswer: null,
      },
      orderBy: { questionOrder: 'asc' },
    });

    return currentQuestion as InterviewQuestion | null;
  }

  /**
   * Submit answer for current question
   */
  async submitAnswer(
    interviewId: string,
    userId: string,
    answer: string
  ): Promise<{ feedback: string; score?: number; nextQuestion?: InterviewQuestion }> {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: interviewId, userId },
      include: {
        interviewQuestions: {
          orderBy: { questionOrder: 'asc' },
        },
      },
    });

    if (!interview) {
      throw ApiError.notFound('Interview not found');
    }

    if (interview.status !== PrismaInterviewStatus.IN_PROGRESS) {
      throw ApiError.badRequest('Interview is not in progress');
    }

    // Get current question
    const currentQuestion = await prisma.interviewQuestion.findFirst({
      where: {
        interviewSessionId: interviewId,
        userAnswer: null,
      },
      orderBy: { questionOrder: 'asc' },
    });

    if (!currentQuestion) {
      throw ApiError.badRequest('No active question');
    }

    // Evaluate answer with AI
    const evaluation = await aiService.evaluateInterviewAnswer(
      currentQuestion.questionText,
      answer,
      currentQuestion.expectedTopics as string[]
    );

    // Update question with answer and evaluation
    await prisma.interviewQuestion.update({
      where: { id: currentQuestion.id },
      data: {
        userAnswer: answer,
        answerSubmittedAt: new Date(),
        aiEvaluation: evaluation.feedback,
        score: evaluation.score,
        followUpNeeded: evaluation.followUpNeeded,
      },
    });

    // Generate next question or complete interview
    let nextQuestion: InterviewQuestion | undefined;
    
    if (evaluation.followUpNeeded && evaluation.followUpQuestion) {
      // Add follow-up question
      nextQuestion = await this.addFollowUpQuestion(
        interviewId,
        evaluation.followUpQuestion,
        currentQuestion.questionOrder + 1
      );
    } else {
      // Check if we should generate next question or complete
      const questionCount = interview.interviewQuestions.length;
      const elapsedMinutes = interview.startedAt
        ? Math.floor((Date.now() - interview.startedAt.getTime()) / (1000 * 60))
        : 0;

      if (questionCount < 5 && elapsedMinutes < (interview.durationMinutes || 60)) {
        nextQuestion = await this.generateNextQuestion(interviewId, userId);
      } else {
        await this.completeInterview(interviewId, userId);
      }
    }

    return {
      feedback: evaluation.feedback,
      score: evaluation.score,
      nextQuestion,
    };
  }

  /**
   * Skip current question
   */
  async skipQuestion(interviewId: string, userId: string): Promise<InterviewQuestion | null> {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: interviewId, userId },
    });

    if (!interview) {
      throw ApiError.notFound('Interview not found');
    }

    // Mark current question as skipped (empty answer)
    const currentQuestion = await prisma.interviewQuestion.findFirst({
      where: {
        interviewSessionId: interviewId,
        userAnswer: null,
      },
      orderBy: { questionOrder: 'asc' },
    });

    if (currentQuestion) {
      await prisma.interviewQuestion.update({
        where: { id: currentQuestion.id },
        data: {
          userAnswer: '[Skipped]',
          answerSubmittedAt: new Date(),
          score: 0,
        },
      });
    }

    // Generate next question or complete
    const questionCount = await prisma.interviewQuestion.count({
      where: { interviewSessionId: interviewId },
    });

    const elapsedMinutes = interview.startedAt
      ? Math.floor((Date.now() - interview.startedAt.getTime()) / (1000 * 60))
      : 0;

    if (questionCount < 5 && elapsedMinutes < (interview.durationMinutes || 60)) {
      return this.generateNextQuestion(interviewId, userId);
    } else {
      await this.completeInterview(interviewId, userId);
      return null;
    }
  }

  /**
   * Complete an interview
   */
  async completeInterview(interviewId: string, userId?: string): Promise<InterviewSession> {
    const interview = await prisma.interviewSession.findFirst({
      where: {
        id: interviewId,
        ...(userId ? { userId } : {}),
      },
      include: {
        interviewQuestions: {
          orderBy: { questionOrder: 'asc' },
        },
      },
    });

    if (!interview) {
      throw ApiError.notFound('Interview not found');
    }

    // Calculate scores
    const questions = interview.interviewQuestions;
    const scores = questions.map((q) => q.score || 0).filter((s) => s > 0);
    
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Generate transcript
    const transcript = questions
      .map(
        (q) =>
          `Q: ${q.questionText}\nA: ${q.userAnswer || '[No answer]'}\nFeedback: ${q.aiEvaluation || ''}\n`
      )
      .join('\n---\n');

    // Generate summary with AI
    const summary = await aiService.generateInterviewSummary(
      transcript,
      questions.map((q) => ({
        question: q.questionText,
        answer: q.userAnswer || '',
        score: q.score || 0,
      }))
    );

    // Update interview
    const updated = await prisma.interviewSession.update({
      where: { id: interviewId },
      data: {
        status: PrismaInterviewStatus.COMPLETED,
        endedAt: new Date(),
        overallScore,
        transcript,
        summaryFeedback: summary.summary,
        strengths: summary.strengths,
        areasToImprove: summary.areasToImprove,
      },
    });

    logger.info('Interview completed', { interviewId, overallScore });

    return serializeInterview(updated) as unknown as InterviewSession;
  }

  /**
   * Generate next question for interview
   */
  private async generateNextQuestion(
    interviewId: string,
    userId: string
  ): Promise<InterviewQuestion> {
    const interview = await prisma.interviewSession.findUnique({
      where: { id: interviewId },
      include: {
        interviewQuestions: {
          orderBy: { questionOrder: 'asc' },
        },
        targetCompany: true,
      },
    });

    if (!interview) {
      throw ApiError.notFound('Interview not found');
    }

    // Get user's resume for personalization
    const resume = await prisma.resume.findFirst({
      where: { userId, isActive: true },
      orderBy: { uploadedAt: 'desc' },
    });

    // Get user's skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { proficiencyLevel: 'asc' },
      take: 5,
    });

    // Generate question with AI
    const questionData = await aiService.generateInterviewQuestion({
      interviewType: interviewTypeForApi(interview.interviewType),
      difficulty: interview.difficulty,
      previousQuestions: interview.interviewQuestions.map((q) => q.questionText),
      userSkills: userSkills.map((us) => us.skill.name),
      resumeData: resume?.parsedData as any,
    });

    // Create question
    const question = await prisma.interviewQuestion.create({
      data: {
        interviewSessionId: interviewId,
        questionText: questionData.questionText!,
        questionType: questionData.questionType,
        expectedTopics: questionData.expectedTopics || [],
        questionOrder: interview.interviewQuestions.length + 1,
      },
    });

    return question as InterviewQuestion;
  }

  /**
   * Add a follow-up question
   */
  private async addFollowUpQuestion(
    interviewId: string,
    questionText: string,
    order: number
  ): Promise<InterviewQuestion> {
    const question = await prisma.interviewQuestion.create({
      data: {
        interviewSessionId: interviewId,
        questionText,
        questionType: 'follow-up',
        expectedTopics: [],
        questionOrder: order,
      },
    });

    return question as InterviewQuestion;
  }

  /**
   * Cancel an interview
   */
  async cancelInterview(interviewId: string, userId: string): Promise<void> {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: interviewId, userId },
    });

    if (!interview) {
      throw ApiError.notFound('Interview not found');
    }

    if (interview.status === PrismaInterviewStatus.COMPLETED) {
      throw ApiError.badRequest('Cannot cancel a completed interview');
    }

    await prisma.interviewSession.update({
      where: { id: interviewId },
      data: { status: PrismaInterviewStatus.CANCELLED },
    });

    logger.info('Interview cancelled', { interviewId });
  }

  /**
   * Delete an interview
   */
  async deleteInterview(interviewId: string, userId: string): Promise<void> {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: interviewId, userId },
    });

    if (!interview) {
      throw ApiError.notFound('Interview not found');
    }

    await prisma.interviewSession.delete({
      where: { id: interviewId },
    });

    logger.info('Interview deleted', { interviewId });
  }

  private toPrismaInterviewType(interviewType: string): PrismaInterviewType {
    const typeMap: Record<string, PrismaInterviewType> = {
      technical: PrismaInterviewType.TECHNICAL,
      TECHNICAL: PrismaInterviewType.TECHNICAL,
      behavioral: PrismaInterviewType.BEHAVIORAL,
      BEHAVIORAL: PrismaInterviewType.BEHAVIORAL,
      mixed: PrismaInterviewType.MIXED,
      MIXED: PrismaInterviewType.MIXED,
      'system-design': PrismaInterviewType.SYSTEM_DESIGN,
      SYSTEM_DESIGN: PrismaInterviewType.SYSTEM_DESIGN,
    };

    return typeMap[interviewType] ?? PrismaInterviewType.TECHNICAL;
  }

  private toPrismaInterviewStatus(status: string): PrismaInterviewStatus {
    const statusMap: Record<string, PrismaInterviewStatus> = {
      scheduled: PrismaInterviewStatus.SCHEDULED,
      SCHEDULED: PrismaInterviewStatus.SCHEDULED,
      in_progress: PrismaInterviewStatus.IN_PROGRESS,
      IN_PROGRESS: PrismaInterviewStatus.IN_PROGRESS,
      completed: PrismaInterviewStatus.COMPLETED,
      COMPLETED: PrismaInterviewStatus.COMPLETED,
      cancelled: PrismaInterviewStatus.CANCELLED,
      CANCELLED: PrismaInterviewStatus.CANCELLED,
      abandoned: PrismaInterviewStatus.ABANDONED,
      ABANDONED: PrismaInterviewStatus.ABANDONED,
    };

    return statusMap[status] ?? PrismaInterviewStatus.SCHEDULED;
  }

  private toPrismaDifficulty(difficulty: string): PrismaDifficulty {
    const difficultyMap: Record<string, PrismaDifficulty> = {
      easy: PrismaDifficulty.easy,
      medium: PrismaDifficulty.medium,
      hard: PrismaDifficulty.hard,
      expert: PrismaDifficulty.expert,
    };

    return difficultyMap[difficulty] ?? PrismaDifficulty.medium;
  }
}

// Export singleton instance
export const interviewService = new InterviewService();
