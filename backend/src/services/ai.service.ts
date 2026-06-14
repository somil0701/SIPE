import OpenAI from 'openai';
import { z } from 'zod';
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

const textField = (fallback: string) =>
  z.preprocess((value) => value ?? fallback, z.string());

const scoreField = (fallback: number) =>
  z.coerce.number().min(0).max(100).default(fallback);

const lineFeedbackSchema = z.object({
  lineStart: z.coerce.number().int().min(1),
  lineEnd: z.preprocess((value) => value ?? undefined, z.coerce.number().int().min(1).optional()),
  severity: z.enum(['info', 'warning', 'error']).default('info'),
  message: textField(''),
});

const failedCaseAnalysisSchema = z.object({
  input: textField(''),
  expectedOutput: textField(''),
  actualOutput: z.string().nullable().optional(),
  likelyReason: textField(''),
});

const judgeAwareFeedbackSchema = z.object({
  overallScore: scoreField(50),
  verdict: textField('UNKNOWN'),
  confidence: z.coerce.number().min(0).max(100).default(50),
  summary: textField('Evaluation completed.'),
  algorithmDetected: textField('Unknown'),
  correctness: z.object({
    score: scoreField(50),
    mainIssue: textField('No specific correctness issue identified.'),
    bugCategory: textField('unknown'),
    evidence: z.array(z.string()).default([]),
  }).default({}),
  complexity: z.object({
    detectedTime: textField('Unknown'),
    detectedSpace: textField('Unknown'),
    expectedTime: z.string().nullable().optional(),
    willPassConstraints: z.boolean().default(false),
    explanation: textField('Complexity could not be confidently determined.'),
  }).default({}),
  failedCaseAnalysis: z.array(failedCaseAnalysisSchema).default([]),
  lineFeedback: z.array(lineFeedbackSchema).default([]),
  codeQuality: z.object({
    score: scoreField(50),
    feedback: textField('No specific code-quality feedback provided.'),
  }).default({}),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  resourceTopics: z.array(z.string()).default([]),
});

type JudgeAwareFeedback = z.infer<typeof judgeAwareFeedbackSchema>;

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
      const { code, language, userExplanation, question, submission, judge } = input;
      const numberedCode = this.numberCodeLines(code);

      const systemPrompt = `You are a senior technical interviewer reviewing a judged coding submission.
Return valid JSON only. Do not include markdown, prose outside JSON, comments, trailing commas, invented test cases, or URLs.

Review rules:
- Analyze correctness using the problem statement, constraints, submission verdict, and provided failed cases.
- Use only the failed cases provided; do not invent new inputs or outputs.
- Compare detected complexity against the expected complexity and constraints.
- Give specific bug reasons grounded in evidence, not generic advice.
- Include line-level feedback when the numbered code makes a specific issue visible.
- Mention resource topics only, never links.
- Respect the verdict score caps:
  ACCEPTED: 75-100
  WRONG_ANSWER: 0-65
  TIME_LIMIT_EXCEEDED: 0-70
  RUNTIME_ERROR: 0-60
  COMPILATION_ERROR: 0-40

Return exactly this JSON shape:
{
  "overallScore": number,
  "verdict": string,
  "confidence": number,
  "summary": string,
  "algorithmDetected": string,
  "correctness": {
    "score": number,
    "mainIssue": string,
    "bugCategory": string,
    "evidence": string[]
  },
  "complexity": {
    "detectedTime": string,
    "detectedSpace": string,
    "expectedTime": string | null,
    "willPassConstraints": boolean,
    "explanation": string
  },
  "failedCaseAnalysis": [
    {
      "input": string,
      "expectedOutput": string,
      "actualOutput": string | null,
      "likelyReason": string
    }
  ],
  "lineFeedback": [
    {
      "lineStart": number,
      "lineEnd": number,
      "severity": "info" | "warning" | "error",
      "message": string
    }
  ],
  "codeQuality": {
    "score": number,
    "feedback": string
  },
  "strengths": string[],
  "weaknesses": string[],
  "suggestions": string[],
  "resourceTopics": string[]
}`;

      const userPrompt = `Problem context:
${JSON.stringify({
  title: question?.title ?? 'Unknown question',
  statement: question?.statement ?? 'Problem statement unavailable.',
  inputFormat: question?.inputFormat ?? null,
  outputFormat: question?.outputFormat ?? null,
  constraints: question?.constraints ?? [],
  examples: question?.examples ?? [],
  tags: question?.tags ?? [],
  difficulty: question?.difficulty ?? 'unknown',
  expectedTimeComplexity: question?.expectedTimeComplexity ?? null,
  expectedSpaceComplexity: question?.expectedSpaceComplexity ?? null,
}, null, 2)}

Submission context:
${JSON.stringify({
  language,
  verdict: submission?.status ?? 'UNKNOWN',
  passedTests: submission?.passedTests ?? 0,
  totalTests: submission?.totalTests ?? 0,
  executionTime: submission?.executionTime ?? judge?.executionTime ?? null,
  memoryUsed: submission?.memoryUsed ?? judge?.memoryUsed ?? null,
  failedTestCases: judge?.failedTestCases ?? [],
  compileError: judge?.compileError ?? null,
  runtimeError: judge?.runtimeError ?? null,
}, null, 2)}

Numbered submitted code:
\`\`\`${language}
${numberedCode}
\`\`\`

${userExplanation ? `User explanation: ${userExplanation}` : ''}`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 3500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      const parsed = judgeAwareFeedbackSchema.parse(JSON.parse(content));
      return this.validateFeedbackOutput(parsed, input);
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
  private validateFeedbackOutput(feedback: JudgeAwareFeedback, input: AIAnswerEvaluationInput): AIFeedbackOutput {
    const verdict = feedback.verdict || input.submission?.status || 'UNKNOWN';
    const overallScore = this.capScoreForVerdict(feedback.overallScore, verdict);
    const codeQualityScore = this.capScoreForVerdict(feedback.codeQuality.score, verdict);

    return {
      overallScore,
      verdict,
      confidence: feedback.confidence,
      summary: feedback.summary,
      approachUsed: feedback.algorithmDetected,
      algorithmDetected: feedback.algorithmDetected,
      correctness: {
        ...feedback.correctness,
        score: this.capScoreForVerdict(feedback.correctness.score, verdict),
      },
      complexity: feedback.complexity,
      failedCaseAnalysis: feedback.failedCaseAnalysis,
      lineFeedback: feedback.lineFeedback,
      codeQuality: {
        ...feedback.codeQuality,
        score: codeQualityScore,
      },
      codeQualityScore,
      codeQualityFeedback: feedback.codeQuality.feedback,
      timeComplexity: feedback.complexity.detectedTime,
      spaceComplexity: feedback.complexity.detectedSpace,
      strengths: feedback.strengths,
      weaknesses: feedback.weaknesses,
      suggestions: feedback.suggestions,
      resourceTopics: feedback.resourceTopics,
      resources: [],
    };
  }

  private fallbackCodeFeedback(input: AIAnswerEvaluationInput): AIFeedbackOutput {
    const hasLoopOrMap = /\b(for|while|map|reduce|filter|forEach)\b/.test(input.code);
    const hasReturn = /\breturn\b/.test(input.code);
    const verdict = input.submission?.status ?? 'UNKNOWN';
    const accepted = verdict === 'ACCEPTED';
    const failedCase = input.judge?.failedTestCases?.[0];
    const baseScore = accepted
      ? (hasLoopOrMap ? 82 : 76)
      : Math.max(35, Math.round(((input.submission?.passedTests ?? 0) / Math.max(input.submission?.totalTests ?? 1, 1)) * 70));
    const score = this.capScoreForVerdict(hasReturn ? baseScore : 35, verdict);
    const mainIssue = accepted
      ? 'No correctness issue detected from stored judge results.'
      : failedCase
        ? `First stored failing case expected "${this.compactPromptValue(failedCase.expectedOutput)}" but got "${this.compactPromptValue(failedCase.actualOutput ?? '')}".`
        : 'Judge did not accept the submission; detailed failing case evidence was unavailable.';

    return {
      overallScore: score,
      verdict,
      confidence: 0.35,
      summary: accepted
        ? 'Fallback review completed locally using the stored judge verdict. The submission passed the available judged cases, but semantic AI analysis was unavailable.'
        : 'Fallback review completed locally using the stored judge verdict and failed-case evidence. Review the listed failure before changing unrelated parts of the solution.',
      approachUsed: hasLoopOrMap
        ? 'Iterative traversal or collection-based processing detected.'
        : 'Approach could not be confidently identified by the local fallback reviewer.',
      algorithmDetected: hasLoopOrMap
        ? 'Iterative traversal or collection-based processing detected.'
        : 'Unknown',
      correctness: {
        score,
        mainIssue,
        bugCategory: accepted ? 'none' : this.bugCategoryForVerdict(verdict),
        evidence: [
          `${input.submission?.passedTests ?? 0}/${input.submission?.totalTests ?? 0} tests passed`,
          ...(failedCase ? [`Failing case input: ${this.compactPromptValue(failedCase.input)}`] : []),
        ],
      },
      complexity: {
        detectedTime: hasLoopOrMap ? 'O(n)' : 'Unknown',
        detectedSpace: 'Unknown',
        expectedTime: input.question?.expectedTimeComplexity ?? null,
        willPassConstraints: accepted || verdict !== 'TIME_LIMIT_EXCEEDED',
        explanation: input.question?.expectedTimeComplexity
          ? `Expected time is ${input.question.expectedTimeComplexity}; local fallback could only infer a coarse pattern.`
          : 'Local fallback could only infer coarse complexity from code structure.',
      },
      failedCaseAnalysis: (input.judge?.failedTestCases ?? []).slice(0, 3).map((testCase) => ({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: testCase.actualOutput ?? null,
        likelyReason: testCase.stderr || 'Compare the actual output with the expected output for this stored failing case.',
      })),
      lineFeedback: hasReturn
        ? []
        : [{
            lineStart: 1,
            severity: 'warning',
            message: 'No return statement was detected by the local fallback reviewer; verify the solution prints or returns the required output.',
          }],
      codeQuality: {
        score,
        feedback: 'Local fallback feedback is based on stored judge data and basic structure checks because AI JSON generation was unavailable.',
      },
      codeQualityScore: score,
      codeQualityFeedback: 'Local fallback feedback is based on stored judge data and basic structure checks because AI JSON generation was unavailable.',
      timeComplexity: hasLoopOrMap ? 'O(n)' : 'Unknown',
      spaceComplexity: 'Unknown',
      strengths: hasReturn ? ['Defines a return path', 'Keeps the solution concise'] : ['Submission was received'],
      weaknesses: accepted
        ? ['Full semantic review was unavailable']
        : [mainIssue],
      suggestions: [
        'Trace the first stored failing case line by line',
        'Compare the implementation against the prompt constraints',
        'Confirm the output format exactly matches the expected output',
      ],
      resourceTopics: input.question?.tags?.slice(0, 4) ?? [],
      resources: [],
    };
  }

  private numberCodeLines(code: string): string {
    return code
      .split(/\r?\n/)
      .map((line, index) => `${String(index + 1).padStart(4, ' ')} | ${line}`)
      .join('\n');
  }

  private capScoreForVerdict(score: number, verdict: string): number {
    const rounded = Math.round(Number.isFinite(score) ? score : 50);
    const normalized = verdict.toUpperCase();
    if (normalized === 'ACCEPTED') return Math.min(100, Math.max(75, rounded));
    if (normalized === 'WRONG_ANSWER') return Math.min(65, Math.max(0, rounded));
    if (normalized === 'TIME_LIMIT_EXCEEDED') return Math.min(70, Math.max(0, rounded));
    if (normalized === 'RUNTIME_ERROR') return Math.min(60, Math.max(0, rounded));
    if (normalized === 'COMPILATION_ERROR') return Math.min(40, Math.max(0, rounded));
    return Math.min(100, Math.max(0, rounded));
  }

  private bugCategoryForVerdict(verdict: string): string {
    switch (verdict.toUpperCase()) {
      case 'WRONG_ANSWER':
        return 'logic_or_output_mismatch';
      case 'TIME_LIMIT_EXCEEDED':
        return 'complexity';
      case 'RUNTIME_ERROR':
        return 'runtime_exception';
      case 'COMPILATION_ERROR':
        return 'compilation';
      default:
        return 'unknown';
    }
  }

  private compactPromptValue(value: string): string {
    const compacted = value.replace(/\s+/g, ' ').trim();
    return compacted.length > 120 ? `${compacted.slice(0, 117)}...` : compacted;
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
