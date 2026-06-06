import 'dotenv/config';
import { prisma } from './src/config/database';
import { resumeReviewService } from './src/services/resume-review.service';

async function debugResume() {
  const latestResume = await prisma.resume.findFirst({
    orderBy: { uploadedAt: 'desc' }
  });

  if (!latestResume || !latestResume.parsedText) {
    console.error('No parsed resume found in DB');
    return;
  }

  console.log('Found resume:', latestResume.fileName);
  
  // Call getGeminiResumeReview directly
  try {
    const result = await (resumeReviewService as any).getGeminiResumeReview(latestResume.parsedText);
    if (result) {
      console.log('Gemini returned successfully with valid schema!');
    } else {
      console.error('Gemini returned null (fallback triggered). Check logger output above.');
    }
  } catch (error) {
    console.error('Uncaught error:', error);
  }
}

debugResume().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(console.error);
