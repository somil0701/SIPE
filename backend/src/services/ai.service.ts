import OpenAI from 'openai';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  AIAnswerEvaluationInput,
  AIMockInterviewInput,
  AIResumeAnalysisInput,
  AIFeedbackOutput,
  Resource,
  InterviewQuestion,
  ResumeParsedData,
  DetectedSkill,
} from '../types';

/**
 * AI Service
 * 
 * Handles all interactions with LLM APIs for:
 * - Question generation
 * - Answer evaluation
 * - Mock interviews
 * - Resume analysis
 */

class AIService {
  private openai: OpenAI;
  private model: string;
  private provider: 'groq' | 'openai' | 'local-fallback';

  constructor() {
    if (this.hasUsableGroqKey()) {
      this.openai = new OpenAI({
        apiKey: env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
        timeout: 20000,
        maxRetries: 1,
      });
      this.model = env.GROQ_MODEL;
      this.provider = 'groq';
      return;
    }

    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY || 'missing-api-key',
      timeout: 20000,
      maxRetries: 1,
    });
    this.model = env.OPENAI_MODEL;
    this.provider = this.hasUsableOpenAIKey() ? 'openai' : 'local-fallback';
  }

  private hasUsableGroqKey(): boolean {
    const key = env.GROQ_API_KEY?.trim();
    return Boolean(key && key.length > 20 && !key.includes('your-groq-api-key'));
  }

  private hasUsableOpenAIKey(): boolean {
    const key = env.OPENAI_API_KEY?.trim();
    return Boolean(key && key.startsWith('sk-') && !key.includes('your-openai-api-key'));
  }

  private hasUsableApiKey(): boolean {
    return this.provider !== 'local-fallback';
  }

  getProvider(): 'groq' | 'openai' | 'local-fallback' {
    return this.provider;
  }

  /**
   * Evaluate user's code solution
   */
  async evaluateAnswer(input: AIAnswerEvaluationInput): Promise<AIFeedbackOutput> {
    if (!this.hasUsableApiKey()) {
      return this.fallbackCodeFeedback(input);
    }

    try {
      const { code, language, userExplanation } = input;

      const systemPrompt = `You are an expert technical interviewer and code reviewer. 
Evaluate the provided code solution comprehensively.

Provide your evaluation in the following JSON format:
{
  "overallScore": number (0-100),
  "summary": string (2-3 sentences),
  "approachUsed": string (briefly name the algorithmic approach or data structure used),
  "codeQualityScore": number (0-100),
  "codeQualityFeedback": string,
  "timeComplexity": string (e.g., "O(n)"),
  "spaceComplexity": string (e.g., "O(1)"),
  "strengths": string[] (3-5 items),
  "weaknesses": string[] (2-4 items),
  "suggestions": string[] (3-5 actionable improvements),
  "resources": [{ "title": string, "url": string, "type": string }]
}

Be thorough but constructive. Focus on both correctness and best practices.`;

      const userPrompt = `Please evaluate this ${language} solution:

\`\`\`${language}
${code}
\`\`\`

${userExplanation ? `User explanation: ${userExplanation}` : ''}

Analyze the code and provide detailed feedback.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      const feedback = JSON.parse(content) as AIFeedbackOutput;
      
      // Validate response structure
      return this.validateFeedbackOutput(feedback);
    } catch (error) {
      logger.error('AI evaluation failed; using fallback feedback', {
        error,
        questionId: input.questionId,
      });
      return this.fallbackCodeFeedback(input);
    }
  }

  /**
   * Generate mock interview question
   */
  async generateInterviewQuestion(input: AIMockInterviewInput): Promise<Partial<InterviewQuestion>> {
    if (!this.hasUsableApiKey()) {
      return this.fallbackInterviewQuestion(input);
    }

    try {
      const { interviewType, difficulty, previousQuestions = [], userSkills = [], resumeData } = input;

      const systemPrompt = `You are an experienced technical interviewer at a top tech company.
Generate a realistic interview question based on the provided context.

Respond in JSON format:
{
  "questionText": string (the actual question),
  "questionType": string ("coding", "system-design", "behavioral", "algorithm"),
  "expectedTopics": string[] (what a good answer should cover),
  "difficulty": string ("easy", "medium", "hard")
}

Make the question challenging but fair for the specified difficulty level.`;

      const userPrompt = `Generate a ${difficulty} ${interviewType} interview question.

${userSkills.length > 0 ? `Candidate skills: ${userSkills.join(', ')}` : ''}

${resumeData ? `Candidate background: ${JSON.stringify(resumeData.experience?.[0] || {})}` : ''}

${previousQuestions.length > 0 ? `Previous questions asked (avoid similar): ${previousQuestions.join(', ')}` : ''}

Generate a unique, engaging question.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      return JSON.parse(content);
    } catch (error) {
      logger.error('Interview question generation failed; using fallback question', { error, input });
      return this.fallbackInterviewQuestion(input);
    }
  }

  /**
   * Evaluate mock interview answer
   */
  async evaluateInterviewAnswer(
    question: string,
    answer: string,
    expectedTopics: string[]
  ): Promise<{ score: number; feedback: string; followUpNeeded: boolean; followUpQuestion?: string }> {
    if (!this.hasUsableApiKey()) {
      return this.fallbackInterviewEvaluation(answer, expectedTopics);
    }

    try {
      const systemPrompt = `You are evaluating a candidate's interview response.

Provide evaluation in JSON format:
{
  "score": number (0-100),
  "feedback": string (constructive feedback, 2-4 sentences),
  "followUpNeeded": boolean (true if answer was incomplete or unclear),
  "followUpQuestion": string (optional, if followUpNeeded is true)
}

Be fair but thorough. Consider technical accuracy, clarity, and completeness.`;

      const userPrompt = `Question: ${question}

Candidate's Answer: ${answer}

Expected topics to cover: ${expectedTopics.join(', ')}

Evaluate this response.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      return JSON.parse(content);
    } catch (error) {
      logger.error('Interview answer evaluation failed; using fallback evaluation', {
        error,
        question,
      });
      return this.fallbackInterviewEvaluation(answer, expectedTopics);
    }
  }

  /**
   * Analyze resume and extract information
   */
  async analyzeResume(input: AIResumeAnalysisInput): Promise<{
    parsedData: ResumeParsedData;
    skills: DetectedSkill[];
  }> {
    if (!this.hasUsableApiKey()) {
      return this.fallbackResumeAnalysis(input.resumeText);
    }

    try {
      const { resumeText } = input;

      const systemPrompt = `You are an expert resume parser and skills extractor.
Analyze the resume and extract structured information.

Respond in JSON format:
{
  "parsedData": {
    "name": string,
    "email": string,
    "phone": string,
    "summary": string,
    "experience": [{ "company": string, "title": string, "startDate": string, "endDate": string, "description": string }],
    "education": [{ "institution": string, "degree": string, "field": string, "graduationDate": string }],
    "projects": [{ "name": string, "description": string, "technologies": string[], "link": string }],
    "skills": string[]
  },
  "detectedSkills": [{ "skillName": string, "confidenceScore": number, "yearsExperience": number, "context": string }]
}

Extract as much detail as possible. Infer years of experience where possible.`;

      const userPrompt = `Parse this resume:

${resumeText}

Extract all relevant information and skills.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 3000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      const result = JSON.parse(content);
      
      return {
        parsedData: result.parsedData,
        skills: result.detectedSkills,
      };
    } catch (error) {
      logger.error('Resume analysis failed; using fallback parser', { error });
      return this.fallbackResumeAnalysis(input.resumeText);
    }
  }

  /**
   * Generate personalized learning recommendations
   */
  async generateLearningRecommendations(
    weakSkills: string[],
    strongSkills: string[],
    recentAttempts: { skill: string; accuracy: number }[]
  ): Promise<{ recommendations: string[]; resources: Resource[] }> {
    if (!this.hasUsableApiKey()) {
      return this.fallbackLearningRecommendations(weakSkills, strongSkills);
    }

    try {
      const systemPrompt = `You are a technical learning coach.
Based on the user's performance data, generate personalized learning recommendations.

Respond in JSON format:
{
  "recommendations": string[] (3-5 specific, actionable recommendations),
  "resources": [{ "title": string, "url": string, "type": string }]
}

Focus on practical next steps the user can take to improve.`;

      const userPrompt = `Weak areas: ${weakSkills.join(', ')}
Strong areas: ${strongSkills.join(', ')}
Recent performance: ${JSON.stringify(recentAttempts)}

Generate personalized learning recommendations.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      return JSON.parse(content);
    } catch (error) {
      logger.error('Learning recommendations generation failed; using fallback recommendations', {
        error,
        recentAttempts,
      });
      return this.fallbackLearningRecommendations(weakSkills, strongSkills);
    }
  }

  /**
   * Generate interview summary
   */
  async generateInterviewSummary(
    transcript: string,
    questions: { question: string; answer: string; score: number }[]
  ): Promise<{
    overallScore: number;
    summary: string;
    strengths: string[];
    areasToImprove: string[];
  }> {
    if (!this.hasUsableApiKey()) {
      return this.fallbackInterviewSummary(questions);
    }

    try {
      const systemPrompt = `You are a senior technical interviewer providing feedback.
Generate a comprehensive interview summary.

Respond in JSON format:
{
  "overallScore": number (0-100),
  "summary": string (3-5 sentences overall assessment),
  "strengths": string[] (3-5 specific strengths demonstrated),
  "areasToImprove": string[] (3-5 specific areas for improvement)
}

Be constructive and specific. Provide actionable feedback.`;

      const userPrompt = `Interview Transcript:
${transcript}

Question Scores: ${JSON.stringify(questions.map(q => ({ question: q.question.substring(0, 100), score: q.score })))}

Generate a comprehensive interview summary.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      return JSON.parse(content);
    } catch (error) {
      logger.error('Interview summary generation failed; using fallback summary', { error, transcript });
      return this.fallbackInterviewSummary(questions);
    }
  }

  /**
   * Validate AI feedback output structure
   */
  private validateFeedbackOutput(feedback: Partial<AIFeedbackOutput>): AIFeedbackOutput {
    return {
      overallScore: feedback.overallScore ?? 50,
      summary: feedback.summary ?? 'Evaluation completed.',
      approachUsed: feedback.approachUsed ?? 'Could not determine the approach from the submitted code.',
      codeQualityScore: feedback.codeQualityScore ?? 50,
      codeQualityFeedback: feedback.codeQualityFeedback ?? 'No specific feedback provided.',
      timeComplexity: feedback.timeComplexity ?? 'Unknown',
      spaceComplexity: feedback.spaceComplexity ?? 'Unknown',
      strengths: feedback.strengths ?? [],
      weaknesses: feedback.weaknesses ?? [],
      suggestions: feedback.suggestions ?? [],
      resources: feedback.resources ?? [],
    };
  }

  private fallbackCodeFeedback(input: AIAnswerEvaluationInput): AIFeedbackOutput {
    const hasLoopOrMap = /\b(for|while|map|reduce|filter|forEach)\b/.test(input.code);
    const hasReturn = /\breturn\b/.test(input.code);
    const score = hasReturn ? (hasLoopOrMap ? 82 : 72) : 45;

    return {
      overallScore: score,
      summary: hasReturn
        ? 'Fallback review completed locally. The solution has a plausible structure and returns a value for the tested cases.'
        : 'Fallback review completed locally. Add a clear return value so the evaluator can compare your output.',
      approachUsed: hasLoopOrMap
        ? 'Iterative traversal or collection-based processing detected.'
        : 'Approach could not be confidently identified by the local fallback reviewer.',
      codeQualityScore: score,
      codeQualityFeedback: 'Local fallback feedback is based on basic structure checks because no usable AI provider key is configured.',
      timeComplexity: hasLoopOrMap ? 'O(n)' : 'Unknown',
      spaceComplexity: 'O(1)',
      strengths: hasReturn ? ['Defines a return path', 'Keeps the solution concise'] : ['Submission was received'],
      weaknesses: hasReturn ? ['Full semantic review requires an AI key'] : ['No return statement detected'],
      suggestions: [
        'Add comments only where they clarify non-obvious logic',
        'Consider edge cases from the prompt constraints',
        'Run through the example test cases before submitting',
      ],
      resources: [
        {
          title: 'JavaScript algorithms practice',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
          type: 'documentation',
        },
      ],
    };
  }

  private fallbackInterviewQuestion(input: AIMockInterviewInput): Partial<InterviewQuestion> {
    const skill = input.userSkills?.[0] || 'problem solving';
    const type = input.interviewType || 'technical';

    if (type === 'behavioral') {
      return {
        questionText: 'Tell me about a time you had to debug a difficult production issue. What signals did you use and what did you change?',
        questionType: 'behavioral',
        expectedTopics: ['ownership', 'debugging process', 'communication', 'impact'],
      };
    }

    if (type === 'system-design') {
      return {
        questionText: 'Design a URL shortening service that supports custom aliases, analytics, and high read traffic.',
        questionType: 'system-design',
        expectedTopics: ['API design', 'data model', 'caching', 'scaling', 'trade-offs'],
      };
    }

    return {
      questionText: `Walk me through how you would solve a ${input.difficulty || 'medium'} problem involving ${skill}. Include edge cases and complexity.`,
      questionType: 'technical',
      expectedTopics: ['approach', 'edge cases', 'time complexity', 'space complexity'],
    };
  }

  private fallbackInterviewEvaluation(
    answer: string,
    expectedTopics: string[]
  ): { score: number; feedback: string; followUpNeeded: boolean; followUpQuestion?: string } {
    const normalized = answer.toLowerCase();
    const coveredTopics = expectedTopics.filter((topic) =>
      normalized.includes(topic.toLowerCase().split(' ')[0])
    );
    const lengthScore = Math.min(45, Math.floor(answer.trim().length / 8));
    const topicScore = expectedTopics.length
      ? Math.round((coveredTopics.length / expectedTopics.length) * 45)
      : 30;
    const score = Math.max(25, Math.min(90, lengthScore + topicScore + 10));
    const followUpNeeded = score < 65;

    return {
      score,
      feedback: followUpNeeded
        ? 'Good start. Add more detail about trade-offs, edge cases, and how you would validate the solution.'
        : 'Solid answer. You covered the main shape of the problem and gave enough detail to continue deeper.',
      followUpNeeded,
      followUpQuestion: followUpNeeded
        ? 'What is one trade-off or failure case you would handle differently in production?'
        : undefined,
    };
  }

  private fallbackResumeAnalysis(resumeText: string): {
    parsedData: ResumeParsedData;
    skills: DetectedSkill[];
  } {
    const knownSkills = [
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'PostgreSQL',
      'Redis',
      'System Design',
      'Python',
      'AWS',
    ];
    const skills = knownSkills
      .filter((skill) => resumeText.toLowerCase().includes(skill.toLowerCase()))
      .map((skillName) => ({
        skillName,
        confidenceScore: 0.75,
        yearsExperience: 1,
        context: 'Detected by local keyword fallback parser',
      }));

    const parsedData: ResumeParsedData = {
      summary: resumeText.trim().slice(0, 240) || 'Resume uploaded for interview preparation.',
      experience: [],
      education: [],
      projects: [],
      skills: skills.map((skill) => skill.skillName),
    };

    return { parsedData, skills };
  }

  private fallbackLearningRecommendations(
    weakSkills: string[],
    strongSkills: string[]
  ): { recommendations: string[]; resources: Resource[] } {
    const focus = weakSkills.slice(0, 3);
    const recommendations = focus.length
      ? focus.map((skill) => `Practice two targeted ${skill} questions and review the missed edge cases.`)
      : ['Keep a steady cadence: one coding problem, one review session, and one interview prompt per day.'];

    if (strongSkills[0]) {
      recommendations.push(`Use ${strongSkills[0]} as an anchor strength during mock interviews.`);
    }

    return {
      recommendations,
      resources: [
        {
          title: 'Interview preparation practice',
          url: 'https://leetcode.com/problemset/',
          type: 'practice',
        },
      ],
    };
  }

  private fallbackInterviewSummary(
    questions: { question: string; answer: string; score: number }[]
  ): {
    overallScore: number;
    summary: string;
    strengths: string[];
    areasToImprove: string[];
  } {
    const answered = questions.filter((question) => question.answer && question.answer !== '[Skipped]');
    const average = questions.length
      ? Math.round(questions.reduce((sum, question) => sum + question.score, 0) / questions.length)
      : 0;

    return {
      overallScore: average,
      summary: `Interview completed with ${answered.length} answered question(s). This summary used the local fallback evaluator because no usable AI provider key is configured.`,
      strengths: ['Completed the interview flow', 'Provided responses for evaluation'],
      areasToImprove: ['Add more concrete examples', 'Call out trade-offs and edge cases explicitly'],
    };
  }
}

// Export singleton instance
export const aiService = new AIService();
