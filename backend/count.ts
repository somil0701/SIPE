import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const [users, questions, attempts, interviews, resumes, paths, activity, spaced, analytics] = await Promise.all([
    prisma.user.count(),
    prisma.question.count(),
    prisma.attempt.count(),
    prisma.interviewSession.count(),
    prisma.resume.count(),
    prisma.learningPath.count(),
    prisma.userActivity.count(),
    prisma.spacedRepetition.count(),
    prisma.analyticsDaily.count()
  ]);
  
  console.log(JSON.stringify({
    Users: users,
    Questions: questions,
    Attempts: attempts,
    MockInterviews: interviews,
    Resumes: resumes,
    LearningPaths: paths,
    ActivityLogs: activity,
    SpacedRepetition: spaced,
    AnalyticsLogs: analytics
  }, null, 2));
}

main().finally(() => prisma.$disconnect());
