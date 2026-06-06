import 'dotenv/config';
import { prisma } from './src/config/database';
import { resumeReviewService } from './src/services/resume-review.service';

async function debugResume() {
  const latestResume = await prisma.resume.findFirst({
    orderBy: { uploadedAt: 'desc' }
  });

  if (!latestResume || !latestResume.parsedText) {
    console.error('No parsed resume found in DB');
    process.exit(1);
  }

  console.log('Found resume:', latestResume.fileName);
  console.log('Testing getGeminiResumeReview directly...');

  const result = await (resumeReviewService as any).getGeminiResumeReview(latestResume.parsedText);
  if (result) {
    console.log('Gemini returned successfully!');
  } else {
    console.error('Gemini returned null (fallback triggered).');
  }
}

debugResume().finally(() => prisma.$disconnect());
