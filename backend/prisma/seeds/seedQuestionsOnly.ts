import { PrismaClient, Prisma } from '@prisma/client';
import { getNewQuestions as getArrayQuestions } from './seedQuestions';
import { getNewQuestions as getDPQuestions } from './seedDP';

const prisma = new PrismaClient();

async function seedOnlyNewQuestions() {
  console.log('Seeding new questions only...');

  // Fetch existing skills
  const allSkills = await prisma.skill.findMany();
  const skills: Record<string, any> = {};
  for (const skill of allSkills) {
    skills[skill.slug] = skill;
  }

  // If dynamic-programming doesn't exist, we can't seed DP questions without creating it
  if (!skills['dynamic-programming']) {
    console.warn('Warning: Dynamic Programming skill not found in DB. DP questions may fail to seed.');
  }

  const newQuestions = [
    ...getArrayQuestions(skills),
    ...getDPQuestions(skills),
  ];

  let addedCount = 0;
  for (const question of newQuestions) {
    if (!question.skillId) continue; // Skip if skill is missing

    await prisma.question.upsert({
      where: { slug: question.slug },
      update: {
        ...question,
        starterCode: question.starterCode as Prisma.InputJsonValue,
        solutionCode: question.solutionCode as Prisma.InputJsonValue,
        testCases: question.testCases as Prisma.InputJsonValue,
        isActive: true,
      },
      create: {
        ...question,
        starterCode: question.starterCode as Prisma.InputJsonValue,
        solutionCode: question.solutionCode as Prisma.InputJsonValue,
        testCases: question.testCases as Prisma.InputJsonValue,
        isActive: true,
      },
    });
    addedCount++;
  }

  console.log(`Successfully upserted ${addedCount} questions without wiping user data.`);
}

seedOnlyNewQuestions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
