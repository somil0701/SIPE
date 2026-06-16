import { Prisma, PrismaClient } from '@prisma/client';
import { getNewQuestions as getDPQuestions } from './seedDP';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DP questions only...');

  const allSkills = await prisma.skill.findMany();
  const skills: Record<string, (typeof allSkills)[number]> = {};

  for (const skill of allSkills) {
    skills[skill.slug] = skill;
  }

  if (!skills['dynamic-programming']) {
    throw new Error('Dynamic Programming skill not found. Run seedTopics.ts first.');
  }

  const dpQuestions = getDPQuestions(skills);
  let createdCount = 0;
  let skippedCount = 0;

  for (const question of dpQuestions) {
    const existing = await prisma.question.findUnique({
      where: { slug: question.slug },
      select: { id: true },
    });

    if (existing) {
      skippedCount++;
      continue;
    }

    await prisma.question.create({
      data: {
        ...question,
        starterCode: question.starterCode as Prisma.InputJsonValue,
        solutionCode: question.solutionCode as Prisma.InputJsonValue,
        testCases: question.testCases as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    createdCount++;
  }

  console.log(`DP seed complete. Created ${createdCount}, skipped ${skippedCount}.`);
}

main()
  .catch((error) => {
    console.error(error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
