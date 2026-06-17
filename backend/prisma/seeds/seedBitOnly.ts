import { Prisma, PrismaClient } from '@prisma/client';
import { getNewQuestions as getBitQuestions } from './seedBit';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Bit Manipulation questions only...');

  const allSkills = await prisma.skill.findMany();
  const skills: Record<string, (typeof allSkills)[number]> = {};

  for (const skill of allSkills) {
    skills[skill.slug] = skill;
    // Provide a snake_case alias to accommodate seedBit.ts's expected format
    const underscoreSlug = skill.slug.replace(/-/g, '_');
    if (underscoreSlug !== skill.slug) {
      skills[underscoreSlug] = skill;
    }
  }

  if (!skills['bit_manipulation'] && !skills['bit-manipulation']) {
    throw new Error('Bit Manipulation skill not found. Run seedTopics.ts first.');
  }

  const bitQuestions = getBitQuestions(skills);
  let createdCount = 0;
  let skippedCount = 0;

  for (const question of bitQuestions) {
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

  console.log(`Bit Manipulation seed complete. Created ${createdCount}, skipped ${skippedCount}.`);
}

main()
  .catch((error) => {
    console.error(error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
