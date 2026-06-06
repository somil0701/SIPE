import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  Certification,
  ContactInformation,
  DetectedSkill,
  Education,
  ExperienceAnalysis,
  JobMatchAnalysis,
  PriorityImprovement,
  Project,
  ProjectAnalysis,
  ResumeAnalysisResult,
  ResumeParsedData,
  ResumeReviewAnalysis,
  ScoreFactor,
  SkillCategoryAnalysis,
  SkillCategoryKey,
  WorkExperience,
} from '../types';

const skillCatalog: Record<SkillCategoryKey, string[]> = {
  programmingLanguages: [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'C++',
    'C#',
    'Go',
    'Rust',
    'Ruby',
    'PHP',
    'Swift',
    'Kotlin',
    'Scala',
    'SQL',
    'R',
    'MATLAB',
  ],
  frontend: [
    'React',
    'Next.js',
    'Vue',
    'Angular',
    'HTML',
    'CSS',
    'Tailwind CSS',
    'Redux',
    'Vite',
    'Webpack',
    'Material UI',
    'Framer Motion',
  ],
  backend: [
    'Node.js',
    'Express',
    'NestJS',
    'Django',
    'Flask',
    'FastAPI',
    'Spring Boot',
    'GraphQL',
    'REST API',
    'Microservices',
    'Prisma',
    'Socket.IO',
  ],
  databases: [
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'SQLite',
    'DynamoDB',
    'Firebase',
    'Supabase',
    'Elasticsearch',
  ],
  devOps: [
    'Docker',
    'Kubernetes',
    'CI/CD',
    'GitHub Actions',
    'Jenkins',
    'Terraform',
    'Linux',
    'Nginx',
    'Git',
    'Prometheus',
    'Grafana',
  ],
  cloud: [
    'AWS',
    'Azure',
    'Google Cloud',
    'GCP',
    'Vercel',
    'Netlify',
    'Lambda',
    'EC2',
    'S3',
    'Cloudflare',
  ],
  aiMl: [
    'Machine Learning',
    'Deep Learning',
    'TensorFlow',
    'PyTorch',
    'Scikit-learn',
    'Pandas',
    'NumPy',
    'OpenAI',
    'Gemini',
    'LangChain',
    'LLM',
    'NLP',
    'Computer Vision',
  ],
  other: [],
};

const allKnownSkills = Object.values(skillCatalog).flat();
const sectionHeadings = [
  'summary',
  'profile',
  'objective',
  'experience',
  'work experience',
  'professional experience',
  'employment',
  'projects',
  'personal projects',
  'education',
  'skills',
  'technical skills',
  'certifications',
  'certificates',
  'achievements',
  'awards',
  'honors',
  'publications',
];
const actionVerbs = [
  'built',
  'designed',
  'developed',
  'implemented',
  'launched',
  'led',
  'owned',
  'optimized',
  'reduced',
  'increased',
  'improved',
  'automated',
  'migrated',
  'architected',
  'delivered',
  'created',
  'integrated',
  'scaled',
  'deployed',
  'analyzed',
];
const weakPhrases = [
  'responsible for',
  'worked on',
  'helped with',
  'involved in',
  'familiar with',
  'participated in',
  'various',
  'etc',
];
const metricRegex = /(\b\d+(\.\d+)?\s?(%|x|k|m|ms|s|sec|seconds|minutes|hrs|hours|days|users|customers|requests|qps|rps|gb|mb|tb)\b|\$\s?\d+|\b\d{2,}\b)/i;
const stopWords = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'will',
  'are',
  'you',
  'your',
  'our',
  'their',
  'have',
  'has',
  'using',
  'use',
  'team',
  'work',
  'role',
  'candidate',
  'experience',
  'skills',
  'ability',
  'strong',
  'knowledge',
  'including',
  'across',
  'within',
]);

const stringArraySchema = z.array(z.coerce.string()).default([]).catch([]);
const optionalString = z.preprocess(
  (value) => (value === null || value === undefined ? undefined : String(value)),
  z.string().trim().optional()
);
const scoreSchema = z.coerce.number().min(0).max(100).catch(50);

const contactInfoSchema = z.object({
  email: optionalString,
  phone: optionalString,
  location: optionalString,
  linkedin: optionalString,
  github: optionalString,
  portfolio: optionalString,
}).partial().catch({});

const workExperienceSchema = z.object({
  company: z.coerce.string().catch('Unknown company'),
  title: z.coerce.string().catch('Experience'),
  startDate: optionalString,
  endDate: optionalString,
  description: optionalString,
  bullets: stringArraySchema,
  technologies: stringArraySchema,
  location: optionalString,
}).catch({
  company: 'Unknown company',
  title: 'Experience',
  bullets: [],
  technologies: [],
});

const educationSchema = z.object({
  institution: z.coerce.string().catch('Institution'),
  degree: z.coerce.string().catch('Degree'),
  field: optionalString,
  graduationDate: optionalString,
  location: optionalString,
  details: stringArraySchema,
}).catch({
  institution: 'Institution',
  degree: 'Degree',
  details: [],
});

const projectSchema = z.object({
  name: z.coerce.string().catch('Project'),
  description: optionalString,
  technologies: stringArraySchema,
  link: optionalString,
  role: optionalString,
  impact: optionalString,
  bullets: stringArraySchema,
}).catch({
  name: 'Project',
  technologies: [],
  bullets: [],
});

const certificationSchema = z.object({
  name: z.coerce.string().catch('Certification'),
  issuer: optionalString,
  date: optionalString,
}).catch({ name: 'Certification' });

const parsedDataSchema = z.object({
  name: optionalString,
  email: optionalString,
  phone: optionalString,
  contactInfo: contactInfoSchema,
  summary: optionalString,
  experience: z.array(workExperienceSchema).default([]).catch([]),
  education: z.array(educationSchema).default([]).catch([]),
  projects: z.array(projectSchema).default([]).catch([]),
  skills: stringArraySchema,
  certifications: z.array(certificationSchema).default([]).catch([]),
  achievements: stringArraySchema,
});

const priorityImprovementSchema = z.object({
  priority: z.enum(['high', 'medium', 'low']).catch('medium'),
  title: z.coerce.string().catch('Improve resume'),
  recommendation: z.coerce.string().catch('Add more specific evidence and metrics.'),
  impact: optionalString,
});

const projectAnalysisSchema = z.object({
  name: z.coerce.string().catch('Project'),
  technologies: stringArraySchema,
  qualityScore: scoreSchema,
  qualityRating: z.coerce.string().catch('Needs detail'),
  descriptionQuality: z.coerce.string().catch('Needs more specificity and measurable outcomes.'),
  measurableImpact: z.coerce.boolean().catch(false),
  strengths: stringArraySchema,
  weaknesses: stringArraySchema,
  suggestedDescription: z.coerce.string().catch('Rewrite with action, technology, scope, and measurable outcome.'),
});

const experienceAnalysisSchema = z.object({
  company: z.coerce.string().catch('Company'),
  title: z.coerce.string().catch('Role'),
  weakBullets: stringArraySchema,
  actionRewrites: stringArraySchema,
  quantificationIdeas: stringArraySchema,
  suggestions: stringArraySchema,
});

const aiResumeReviewSchema = z.object({
  parsedData: parsedDataSchema,
  summary: z.coerce.string().catch('Resume review completed.'),
  strengths: stringArraySchema,
  weaknesses: stringArraySchema,
  missingSections: stringArraySchema,
  missingKeywords: stringArraySchema,
  priorityImprovements: z.array(priorityImprovementSchema).default([]).catch([]),
  projectAnalysis: z.array(projectAnalysisSchema).default([]).catch([]),
  experienceAnalysis: z.array(experienceAnalysisSchema).default([]).catch([]),
});

const jobMatchAdviceSchema = z.object({
  resumeImprovementSuggestions: stringArraySchema,
  missingKeywords: stringArraySchema,
});

type AIResumeReviewPayload = z.infer<typeof aiResumeReviewSchema>;
type JobMatchAdvice = z.infer<typeof jobMatchAdviceSchema>;

class ResumeReviewService {
  async analyzeResume(resumeText: string): Promise<ResumeAnalysisResult> {
    const fallbackParsedData = this.parseResumeLocally(resumeText);
    const aiPayload = await this.getGroqResumeReview(resumeText);
    const generatedBy = aiPayload ? 'groq' : 'local-fallback';
    const parsedData = this.mergeParsedData(
      aiPayload?.parsedData || fallbackParsedData,
      fallbackParsedData
    );
    const skillAnalysis = this.categorizeSkills(parsedData.skills, resumeText);
    parsedData.skills = this.flattenSkillAnalysis(skillAnalysis);

    const scoring = this.calculateATSScore(parsedData, resumeText);
    const missingSections = this.uniqueStrings([
      ...this.getMissingSections(parsedData),
      ...(aiPayload?.missingSections || []),
    ]).slice(0, 8);
    const missingKeywords = this.uniqueStrings([
      ...(aiPayload?.missingKeywords || []),
      ...this.getGeneralMissingKeywords(parsedData, resumeText),
    ]).slice(0, 12);
    const projectAnalysis = this.analyzeProjects(
      parsedData.projects,
      aiPayload?.projectAnalysis
    );
    const experienceAnalysis = this.analyzeExperience(
      parsedData.experience,
      aiPayload?.experienceAnalysis
    );

    const review: ResumeReviewAnalysis = {
      atsScore: scoring.score,
      overallRating: this.ratingForScore(scoring.score),
      summary: aiPayload?.summary || this.localSummary(scoring.score, parsedData),
      strengths: this.uniqueStrings([
        ...(aiPayload?.strengths || []),
        ...this.localStrengths(parsedData, scoring.factors),
      ]).slice(0, 6),
      weaknesses: this.uniqueStrings([
        ...(aiPayload?.weaknesses || []),
        ...scoring.factors
          .filter((factor) => factor.score < 70)
          .map((factor) => `${factor.label}: ${factor.rationale}`),
      ]).slice(0, 6),
      missingSections,
      missingKeywords,
      priorityImprovements: this.buildPriorityImprovements(
        scoring.factors,
        missingSections,
        aiPayload?.priorityImprovements
      ),
      scoreBreakdown: scoring.factors,
      projectAnalysis,
      experienceAnalysis,
      skillAnalysis,
      generatedBy,
      generatedAt: new Date().toISOString(),
    };

    parsedData.review = review;

    return {
      parsedData,
      skills: this.toDetectedSkills(parsedData.skills, resumeText),
      review,
    };
  }

  async matchJobDescription(
    resumeText: string,
    parsedData: ResumeParsedData,
    jobDescription: string
  ): Promise<JobMatchAnalysis> {
    const resumeSkills = this.flattenSkillAnalysis(
      this.categorizeSkills(parsedData.skills || [], resumeText)
    );
    const jobSkills = this.detectKnownSkills(jobDescription);
    const matchingSkills = jobSkills.filter((skill) => this.includesSkill(resumeSkills, skill));
    const missingSkills = jobSkills.filter((skill) => !this.includesSkill(resumeSkills, skill));
    const resumeKeywords = this.extractKeywords(resumeText);
    const jobKeywords = this.extractKeywords(jobDescription);
    const matchingKeywords = jobKeywords.filter((keyword) =>
      resumeKeywords.some((resumeKeyword) => resumeKeyword.toLowerCase() === keyword.toLowerCase())
    );
    const missingKeywords = jobKeywords.filter((keyword) =>
      !matchingKeywords.some((match) => match.toLowerCase() === keyword.toLowerCase())
    );
    const skillCoverage = jobSkills.length ? matchingSkills.length / jobSkills.length : 0.55;
    const keywordCoverage = jobKeywords.length ? matchingKeywords.length / jobKeywords.length : 0.5;
    const roleEvidence = this.calculateRoleEvidence(parsedData, jobDescription);

    const factors: ScoreFactor[] = [
      {
        key: 'skill_alignment',
        label: 'Skill Alignment',
        score: this.toScore(skillCoverage),
        weight: 60,
        rationale: `${matchingSkills.length} of ${jobSkills.length || 'available'} role skills appear in the resume.`,
        evidence: matchingSkills.slice(0, 8),
        suggestions: missingSkills.slice(0, 5).map((skill) => `Add credible evidence for ${skill} if you have used it.`),
      },
      {
        key: 'keyword_coverage',
        label: 'Keyword Coverage',
        score: this.toScore(keywordCoverage),
        weight: 25,
        rationale: `${matchingKeywords.length} of ${jobKeywords.length || 'available'} important JD keywords are represented.`,
        evidence: matchingKeywords.slice(0, 8),
        suggestions: missingKeywords.slice(0, 5).map((keyword) => `Mirror the JD language around "${keyword}" where truthful.`),
      },
      {
        key: 'role_evidence',
        label: 'Role Evidence',
        score: roleEvidence,
        weight: 15,
        rationale: 'Measures whether the resume backs role keywords with experience or project evidence.',
        evidence: this.findRoleEvidence(parsedData, jobDescription).slice(0, 4),
        suggestions: ['Tie the most relevant role requirements to a project, work bullet, or measurable outcome.'],
      },
    ];

    const localSuggestions = this.buildJobMatchSuggestions(missingSkills, missingKeywords, roleEvidence);
    const aiAdvice = await this.getGroqJobMatchAdvice(resumeText, jobDescription, {
      matchingSkills,
      missingSkills,
      matchingKeywords,
      missingKeywords,
    });

    const matchScore = this.weightedScore(factors);

    return {
      matchScore,
      rating: this.ratingForScore(matchScore),
      matchingSkills: matchingSkills.slice(0, 16),
      missingSkills: missingSkills.slice(0, 16),
      matchingKeywords: matchingKeywords.slice(0, 16),
      missingKeywords: this.uniqueStrings([...(aiAdvice?.missingKeywords || []), ...missingKeywords]).slice(0, 16),
      resumeImprovementSuggestions: this.uniqueStrings([
        ...(aiAdvice?.resumeImprovementSuggestions || []),
        ...localSuggestions,
      ]).slice(0, 8),
      scoreBreakdown: factors,
      generatedBy: aiAdvice ? 'groq' : 'local-fallback',
      generatedAt: new Date().toISOString(),
    };
  }

  private async getGroqResumeReview(resumeText: string): Promise<AIResumeReviewPayload | null> {
    if (!this.hasUsableGroqKey()) {
      return null;
    }

    const prompt = `You are an expert ATS resume reviewer for software engineering and technology roles.
Extract the resume into structured JSON and provide actionable critique.

Return ONLY valid JSON with this exact shape:
{
  "parsedData": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "contactInfo": { "email": "string", "phone": "string", "location": "string", "linkedin": "string", "github": "string", "portfolio": "string" },
    "summary": "string",
    "experience": [{ "company": "string", "title": "string", "startDate": "string", "endDate": "string", "description": "string", "bullets": ["string"], "technologies": ["string"] }],
    "education": [{ "institution": "string", "degree": "string", "field": "string", "graduationDate": "string", "details": ["string"] }],
    "projects": [{ "name": "string", "description": "string", "technologies": ["string"], "link": "string", "role": "string", "impact": "string", "bullets": ["string"] }],
    "skills": ["string"],
    "certifications": [{ "name": "string", "issuer": "string", "date": "string" }],
    "achievements": ["string"]
  },
  "summary": "2-3 sentence resume assessment",
  "strengths": ["specific resume strengths"],
  "weaknesses": ["specific resume weaknesses"],
  "missingSections": ["sections missing from the resume"],
  "missingKeywords": ["important ATS keywords missing or weakly represented"],
  "priorityImprovements": [{ "priority": "high|medium|low", "title": "string", "recommendation": "specific action", "impact": "why it matters" }],
  "projectAnalysis": [{ "name": "string", "technologies": ["string"], "qualityScore": 0, "qualityRating": "string", "descriptionQuality": "string", "measurableImpact": false, "strengths": ["string"], "weaknesses": ["string"], "suggestedDescription": "stronger truthful rewrite with placeholders for unknown metrics" }],
  "experienceAnalysis": [{ "company": "string", "title": "string", "weakBullets": ["string"], "actionRewrites": ["stronger truthful rewrite with placeholders for unknown metrics"], "quantificationIdeas": ["string"], "suggestions": ["string"] }]
}

Do not invent employers, degrees, certifications, achievements, links, or metrics. If a metric is missing, suggest a placeholder like [metric] rather than fabricating a value.

Resume text:
${resumeText.slice(0, 28000)}`;

    try {
      const json = await this.callGroqForJson(prompt);
      const parsed = aiResumeReviewSchema.safeParse(json);
      if (!parsed.success) {
        logger.warn('Groq resume review did not match schema', {
          issues: parsed.error.issues.slice(0, 6),
        });
        return null;
      }
      return parsed.data;
    } catch (error) {
      logger.error('Groq resume review failed; using local fallback', { error });
      return null;
    }
  }

  private async getGroqJobMatchAdvice(
    resumeText: string,
    jobDescription: string,
    localSignals: {
      matchingSkills: string[];
      missingSkills: string[];
      matchingKeywords: string[];
      missingKeywords: string[];
    }
  ): Promise<JobMatchAdvice | null> {
    if (!this.hasUsableGroqKey()) {
      return null;
    }

    const prompt = `You are an ATS resume-to-job-description reviewer.
Return ONLY valid JSON in this shape:
{
  "resumeImprovementSuggestions": ["specific, truthful, role-targeted resume edits"],
  "missingKeywords": ["important JD keywords that are absent or weak in the resume"]
}

Do not invent experience. Recommend adding a keyword only when the resume can truthfully support it.

Local matching signals:
${JSON.stringify(localSignals)}

Resume text:
${resumeText.slice(0, 14000)}

Job description:
${jobDescription.slice(0, 12000)}`;

    try {
      const json = await this.callGroqForJson(prompt);
      const parsed = jobMatchAdviceSchema.safeParse(json);
      if (!parsed.success) {
        logger.warn('Groq job match advice did not match schema', {
          issues: parsed.error.issues.slice(0, 6),
        });
        return null;
      }
      return parsed.data;
    } catch (error) {
      logger.error('Groq job match advice failed; using local fallback', { error });
      return null;
    }
  }

  private async callGroqForJson(prompt: string): Promise<unknown> {
    const ai = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    const model = env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    let retries = 3;
    let delay = 2000;

    while (retries > 0) {
      try {
        const response = await ai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
        });

        const text = response.choices[0]?.message?.content;
        if (!text) {
          throw new Error('Empty Groq response.');
        }
        return this.parseJsonFromText(text);
      } catch (error: any) {
        // Check for 503 Unavailable / High Demand
        if (error.status === 503 || error?.error?.code === 503 || String(error).includes('503')) {
          retries--;
          if (retries === 0) {
            logger.error('Groq API exhausted retries on 503 error.', { error });
            throw error;
          }
          logger.warn(`Groq 503 error, retrying in ${delay}ms...`, { model });
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        } else {
          // If it's a 4xx error (like 404 Not Found), throw immediately without retrying
          throw error;
        }
      }
    }
    throw new Error('Groq API exhausted retries.');
  }

  private hasUsableGroqKey(): boolean {
    const key = env.GROQ_API_KEY?.trim();
    return Boolean(key && key.length > 20 && !key.includes('your-groq-api-key'));
  }

  private parseResumeLocally(resumeText: string): ResumeParsedData {
    const lines = this.getLines(resumeText);
    const contactInfo = this.extractContactInfo(resumeText, lines);
    const skills = this.uniqueStrings([
      ...this.extractSkillsFromSkillSection(lines),
      ...this.detectKnownSkills(resumeText),
    ]);

    return {
      name: this.extractName(lines),
      email: contactInfo.email,
      phone: contactInfo.phone,
      contactInfo,
      summary: this.extractSummary(lines) || resumeText.slice(0, 280),
      experience: this.extractExperience(lines),
      education: this.extractEducation(lines),
      projects: this.extractProjects(lines),
      skills,
      certifications: this.extractCertifications(lines),
      achievements: this.extractAchievements(lines),
    };
  }

  private mergeParsedData(candidate: ResumeParsedData, fallback: ResumeParsedData): ResumeParsedData {
    const parsed = parsedDataSchema.parse(candidate);
    const contactInfo = {
      ...fallback.contactInfo,
      ...parsed.contactInfo,
      email: parsed.contactInfo?.email || parsed.email || fallback.email,
      phone: parsed.contactInfo?.phone || parsed.phone || fallback.phone,
    };

    return {
      name: parsed.name || fallback.name,
      email: parsed.email || contactInfo.email,
      phone: parsed.phone || contactInfo.phone,
      contactInfo,
      summary: parsed.summary || fallback.summary,
      experience: parsed.experience.length ? parsed.experience : fallback.experience,
      education: parsed.education.length ? parsed.education : fallback.education,
      projects: parsed.projects.length ? parsed.projects : fallback.projects,
      skills: this.uniqueStrings([...(parsed.skills || []), ...(fallback.skills || [])]),
      certifications: parsed.certifications?.length ? parsed.certifications : fallback.certifications,
      achievements: parsed.achievements?.length ? parsed.achievements : fallback.achievements,
    };
  }

  private calculateATSScore(
    parsedData: ResumeParsedData,
    resumeText: string
  ): { score: number; factors: ScoreFactor[] } {
    const factors = [
      this.scoreStructure(parsedData, resumeText),
      this.scoreSectionCompleteness(parsedData),
      this.scoreKeywordQuality(parsedData, resumeText),
      this.scoreProjectQuality(parsedData.projects),
      this.scoreExperienceQuality(parsedData.experience),
      this.scoreQuantifiedAchievements(parsedData, resumeText),
      this.scoreWritingQuality(resumeText),
    ];

    return {
      score: this.weightedScore(factors),
      factors,
    };
  }

  private scoreStructure(parsedData: ResumeParsedData, resumeText: string): ScoreFactor {
    const sectionCount = this.presentSectionCount(parsedData, resumeText);
    const bulletCount = (resumeText.match(/(^|\n)\s*[-*•]/g) || []).length;
    const hasContact = Boolean(parsedData.email || parsedData.phone || parsedData.contactInfo?.linkedin);
    const hasReadableLength = resumeText.length >= 1400 && resumeText.length <= 9000;
    const score = this.clamp(
      25 +
      (hasContact ? 15 : 0) +
      Math.min(30, sectionCount * 5) +
      Math.min(15, bulletCount * 2) +
      (hasReadableLength ? 15 : 6)
    );

    return {
      key: 'structure',
      label: 'Resume Structure',
      score,
      weight: 15,
      rationale: `${sectionCount} major sections detected with ${bulletCount} bullet-like lines.`,
      evidence: [
        hasContact ? 'Contact information is present' : 'Contact information is incomplete',
        hasReadableLength ? 'Resume length is ATS-friendly' : 'Resume length may be too sparse or too dense',
      ],
      suggestions: hasContact
        ? ['Keep section headings clear and conventional for ATS parsing.']
        : ['Add email, phone, LinkedIn/GitHub, and location near the top.'],
    };
  }

  private scoreSectionCompleteness(parsedData: ResumeParsedData): ScoreFactor {
    const checks = [
      { label: 'Contact', points: 12, ok: Boolean(parsedData.email || parsedData.phone) },
      { label: 'Summary', points: 10, ok: Boolean(parsedData.summary && parsedData.summary.length > 60) },
      { label: 'Experience', points: 20, ok: parsedData.experience.length > 0 },
      { label: 'Projects', points: 16, ok: parsedData.projects.length > 0 },
      { label: 'Education', points: 12, ok: parsedData.education.length > 0 },
      { label: 'Skills', points: 16, ok: parsedData.skills.length >= 6 },
      { label: 'Certifications', points: 6, ok: Boolean(parsedData.certifications?.length) },
      { label: 'Achievements', points: 8, ok: Boolean(parsedData.achievements?.length) },
    ];
    const score = checks.reduce((sum, check) => sum + (check.ok ? check.points : 0), 0);
    const missing = checks.filter((check) => !check.ok).map((check) => check.label);

    return {
      key: 'section_completeness',
      label: 'Section Completeness',
      score,
      weight: 18,
      rationale: missing.length ? `Missing or thin sections: ${missing.join(', ')}.` : 'Core sections are represented.',
      evidence: checks.filter((check) => check.ok).map((check) => check.label),
      suggestions: missing.map((section) => `Strengthen the ${section} section with specific, ATS-readable content.`),
    };
  }

  private scoreKeywordQuality(parsedData: ResumeParsedData, resumeText: string): ScoreFactor {
    const skillAnalysis = this.categorizeSkills(parsedData.skills, resumeText);
    const categoryCount = Object.values(skillAnalysis).filter((skills) => skills.length > 0).length;
    const skillCount = this.flattenSkillAnalysis(skillAnalysis).length;
    const contextualMentions = parsedData.skills.filter((skill) =>
      [...parsedData.projects, ...parsedData.experience].some((entry) =>
        JSON.stringify(entry).toLowerCase().includes(skill.toLowerCase())
      )
    ).length;
    const score = this.clamp(
      Math.min(45, skillCount * 4) +
      Math.min(25, categoryCount * 5) +
      Math.min(30, contextualMentions * 4)
    );

    return {
      key: 'keyword_quality',
      label: 'Keyword Quality',
      score,
      weight: 15,
      rationale: `${skillCount} skills across ${categoryCount} categories, with ${contextualMentions} tied to experience or projects.`,
      evidence: this.flattenSkillAnalysis(skillAnalysis).slice(0, 8),
      suggestions: [
        'Connect important tools to project or experience bullets instead of listing them only in Skills.',
        'Mirror role-specific language from target job descriptions where it is truthful.',
      ],
    };
  }

  private scoreProjectQuality(projects: Project[]): ScoreFactor {
    const projectScores = projects.map((project) => this.projectQualityScore(project).score);
    const score = projectScores.length
      ? Math.round(projectScores.reduce((sum, projectScore) => sum + projectScore, 0) / projectScores.length)
      : 30;

    return {
      key: 'project_quality',
      label: 'Project Quality',
      score,
      weight: 15,
      rationale: projects.length
        ? `${projects.length} project(s) reviewed for technology, scope, and impact.`
        : 'No project section was detected.',
      evidence: projects.map((project) => project.name).slice(0, 4),
      suggestions: [
        'For each project, state the user problem, your technical contribution, stack, and measurable result.',
      ],
    };
  }

  private scoreExperienceQuality(experience: WorkExperience[]): ScoreFactor {
    const scores = experience.map((entry) => this.experienceQualityScore(entry));
    const score = scores.length
      ? Math.round(scores.reduce((sum, entryScore) => sum + entryScore, 0) / scores.length)
      : 35;

    return {
      key: 'experience_quality',
      label: 'Experience Quality',
      score,
      weight: 17,
      rationale: experience.length
        ? `${experience.length} experience entr${experience.length === 1 ? 'y' : 'ies'} checked for action and impact.`
        : 'No experience entries were detected.',
      evidence: experience.map((entry) => `${entry.title} at ${entry.company}`).slice(0, 4),
      suggestions: [
        'Start bullets with action verbs and end with measurable business, product, or technical impact.',
      ],
    };
  }

  private scoreQuantifiedAchievements(parsedData: ResumeParsedData, resumeText: string): ScoreFactor {
    const metricCount = (resumeText.match(new RegExp(metricRegex.source, 'gi')) || []).length;
    const bulletCount = Math.max(1, (resumeText.match(/(^|\n)\s*[-*•]/g) || []).length);
    const achievementCount = parsedData.achievements?.length || 0;
    const score = this.clamp(Math.min(70, (metricCount / bulletCount) * 120) + Math.min(30, achievementCount * 8));

    return {
      key: 'quantified_achievements',
      label: 'Quantified Achievements',
      score,
      weight: 12,
      rationale: `${metricCount} quantified signal(s) found across resume bullets and content.`,
      evidence: (resumeText.match(new RegExp(metricRegex.source, 'gi')) || []).slice(0, 6),
      suggestions: [
        'Add metrics for scale, latency, revenue, adoption, cost, accuracy, or time saved wherever possible.',
      ],
    };
  }

  private scoreWritingQuality(resumeText: string): ScoreFactor {
    const lower = resumeText.toLowerCase();
    const weakCount = weakPhrases.filter((phrase) => lower.includes(phrase)).length;
    const actionCount = actionVerbs.filter((verb) => lower.includes(verb)).length;
    const veryLongLines = this.getLines(resumeText).filter((line) => line.length > 180).length;
    const score = this.clamp(72 + Math.min(20, actionCount * 2) - weakCount * 8 - veryLongLines * 3);

    return {
      key: 'writing_quality',
      label: 'Writing Quality',
      score,
      weight: 8,
      rationale: `${actionCount} action verb families detected; ${weakCount} vague phrase(s) and ${veryLongLines} overly long line(s) found.`,
      evidence: actionVerbs.filter((verb) => lower.includes(verb)).slice(0, 6),
      suggestions: weakCount
        ? ['Replace passive phrases like "responsible for" with ownership and outcome language.']
        : ['Keep bullets concise and outcome-focused.'],
    };
  }

  private analyzeProjects(
    projects: Project[],
    aiProjectAnalysis: ProjectAnalysis[] = []
  ): ProjectAnalysis[] {
    const aiByName = new Map(
      aiProjectAnalysis.map((project) => [this.normalizeKey(project.name), project])
    );

    return projects.map((project) => {
      const local = this.projectQualityScore(project);
      const ai = aiByName.get(this.normalizeKey(project.name));
      const technologies = this.uniqueStrings([
        ...(project.technologies || []),
        ...this.detectKnownSkills(`${project.name} ${project.description || ''} ${project.bullets?.join(' ') || ''}`),
        ...(ai?.technologies || []),
      ]);

      return {
        name: project.name,
        technologies,
        qualityScore: local.score,
        qualityRating: this.ratingForScore(local.score),
        descriptionQuality: ai?.descriptionQuality || local.descriptionQuality,
        measurableImpact: local.measurableImpact || Boolean(ai?.measurableImpact),
        strengths: this.uniqueStrings([...(ai?.strengths || []), ...local.strengths]).slice(0, 4),
        weaknesses: this.uniqueStrings([...(ai?.weaknesses || []), ...local.weaknesses]).slice(0, 4),
        suggestedDescription:
          ai?.suggestedDescription ||
          `Built ${project.name} using ${technologies.slice(0, 3).join(', ') || '[stack]'} to solve [user/problem], adding [technical contribution] and improving [metric/outcome].`,
      };
    });
  }

  private analyzeExperience(
    experience: WorkExperience[],
    aiExperienceAnalysis: ExperienceAnalysis[] = []
  ): ExperienceAnalysis[] {
    const aiByRole = new Map(
      aiExperienceAnalysis.map((entry) => [
        this.normalizeKey(`${entry.company} ${entry.title}`),
        entry,
      ])
    );

    return experience.map((entry) => {
      const bullets = this.extractBullets(entry);
      const weakBullets = bullets.filter((bullet) => this.isWeakBullet(bullet)).slice(0, 5);
      const ai = aiByRole.get(this.normalizeKey(`${entry.company} ${entry.title}`));
      const actionRewrites = weakBullets.map((bullet) =>
        this.rewriteBulletTemplate(bullet, entry)
      );

      return {
        company: entry.company,
        title: entry.title,
        weakBullets: this.uniqueStrings([...(ai?.weakBullets || []), ...weakBullets]).slice(0, 5),
        actionRewrites: this.uniqueStrings([...(ai?.actionRewrites || []), ...actionRewrites]).slice(0, 5),
        quantificationIdeas: this.uniqueStrings([
          ...(ai?.quantificationIdeas || []),
          'Add scale: users, requests, records, revenue, team size, or systems affected.',
          'Add result: latency reduction, conversion lift, cost savings, reliability, or time saved.',
        ]).slice(0, 5),
        suggestions: this.uniqueStrings([
          ...(ai?.suggestions || []),
          'Convert responsibilities into outcomes with action verb + scope + metric.',
        ]).slice(0, 5),
      };
    });
  }

  private projectQualityScore(project: Project): {
    score: number;
    descriptionQuality: string;
    measurableImpact: boolean;
    strengths: string[];
    weaknesses: string[];
  } {
    const description = `${project.description || ''} ${project.bullets?.join(' ') || ''} ${project.impact || ''}`.trim();
    const technologies = project.technologies || [];
    const measurableImpact = metricRegex.test(description);
    const hasAction = this.containsActionVerb(description);
    const score = this.clamp(
      25 +
      (description.length > 80 ? 20 : description.length > 35 ? 10 : 0) +
      Math.min(20, technologies.length * 5) +
      (measurableImpact ? 20 : 0) +
      (hasAction ? 10 : 0) +
      (project.link ? 5 : 0)
    );
    const strengths = [
      technologies.length ? 'Technology stack is visible' : '',
      measurableImpact ? 'Includes measurable impact' : '',
      hasAction ? 'Uses action-oriented language' : '',
    ].filter(Boolean);
    const weaknesses = [
      description.length <= 80 ? 'Description needs more scope and implementation detail' : '',
      technologies.length === 0 ? 'Technologies are not clearly listed' : '',
      !measurableImpact ? 'Impact is not quantified' : '',
    ].filter(Boolean);

    return {
      score,
      descriptionQuality:
        score >= 80
          ? 'Strong: describes stack, ownership, and measurable impact.'
          : score >= 60
            ? 'Moderate: has useful detail but needs clearer result or scope.'
            : 'Weak: needs stack, contribution, and outcome detail.',
      measurableImpact,
      strengths,
      weaknesses,
    };
  }

  private experienceQualityScore(entry: WorkExperience): number {
    const bullets = this.extractBullets(entry);
    if (bullets.length === 0) {
      return 35;
    }

    const actionBullets = bullets.filter((bullet) => this.containsActionVerb(bullet)).length;
    const metricBullets = bullets.filter((bullet) => metricRegex.test(bullet)).length;
    const weakBullets = bullets.filter((bullet) => this.isWeakBullet(bullet)).length;

    return this.clamp(
      35 +
      Math.min(25, actionBullets * 7) +
      Math.min(30, metricBullets * 12) +
      Math.min(10, bullets.length * 2) -
      weakBullets * 5
    );
  }

  private categorizeSkills(skills: string[], resumeText: string): SkillCategoryAnalysis {
    const analysis: SkillCategoryAnalysis = {
      programmingLanguages: [],
      frontend: [],
      backend: [],
      databases: [],
      devOps: [],
      cloud: [],
      aiMl: [],
      other: [],
    };
    const candidates = this.uniqueStrings([...skills, ...this.detectKnownSkills(resumeText)]);

    for (const skill of candidates) {
      const category = this.findSkillCategory(skill);
      analysis[category].push(this.canonicalSkillName(skill));
    }

    for (const key of Object.keys(analysis) as SkillCategoryKey[]) {
      analysis[key] = this.uniqueStrings(analysis[key]).sort((a, b) => a.localeCompare(b));
    }

    return analysis;
  }

  private detectKnownSkills(text: string): string[] {
    return allKnownSkills.filter((skill) => this.textContainsTerm(text, skill));
  }

  private getGeneralMissingKeywords(parsedData: ResumeParsedData, resumeText: string): string[] {
    const text = resumeText.toLowerCase();
    const suggestions = ['testing', 'CI/CD', 'deployment', 'performance', 'scalability', 'monitoring', 'ownership', 'impact'];
    const missing = suggestions.filter((keyword) => !text.includes(keyword.toLowerCase()));

    if (!parsedData.projects.length) {
      missing.unshift('projects');
    }
    if (!parsedData.achievements?.length) {
      missing.unshift('achievements');
    }

    return missing;
  }

  private getMissingSections(parsedData: ResumeParsedData): string[] {
    const missing: string[] = [];
    if (!parsedData.email && !parsedData.phone) missing.push('Contact Information');
    if (!parsedData.summary || parsedData.summary.length < 60) missing.push('Professional Summary');
    if (!parsedData.experience.length) missing.push('Experience');
    if (!parsedData.projects.length) missing.push('Projects');
    if (!parsedData.education.length) missing.push('Education');
    if (parsedData.skills.length < 6) missing.push('Technical Skills');
    if (!parsedData.certifications?.length) missing.push('Certifications');
    if (!parsedData.achievements?.length) missing.push('Achievements');
    return missing;
  }

  private buildPriorityImprovements(
    factors: ScoreFactor[],
    missingSections: string[],
    aiImprovements: PriorityImprovement[] = []
  ): PriorityImprovement[] {
    const localFromScores = factors
      .filter((factor) => factor.score < 75)
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map((factor): PriorityImprovement => ({
        priority: factor.score < 55 ? 'high' : factor.score < 70 ? 'medium' : 'low',
        title: `Improve ${factor.label}`,
        recommendation: factor.suggestions[0] || factor.rationale,
        impact: `Current signal: ${factor.score}/100.`,
      }));
    const localFromSections = missingSections.slice(0, 3).map((section): PriorityImprovement => ({
      priority: section === 'Contact Information' || section === 'Technical Skills' ? 'high' : 'medium',
      title: `Add ${section}`,
      recommendation: `Create a clear ${section} section with concise, ATS-readable details.`,
      impact: 'Missing sections reduce recruiter scan quality and keyword coverage.',
    }));

    const merged = [...aiImprovements, ...localFromScores, ...localFromSections];
    const seen = new Set<string>();
    return merged.filter((item) => {
      const key = this.normalizeKey(item.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }

  private buildJobMatchSuggestions(
    missingSkills: string[],
    missingKeywords: string[],
    roleEvidence: number
  ): string[] {
    const suggestions: string[] = [];
    if (missingSkills.length) {
      suggestions.push(`Add truthful project or experience evidence for: ${missingSkills.slice(0, 5).join(', ')}.`);
    }
    if (missingKeywords.length) {
      suggestions.push(`Use target-role phrasing for relevant terms: ${missingKeywords.slice(0, 5).join(', ')}.`);
    }
    if (roleEvidence < 70) {
      suggestions.push('Move the most relevant project or experience bullet closer to the top of the resume.');
    }
    suggestions.push('Rewrite the top summary to reflect the job title, core stack, and strongest measurable outcome.');
    return suggestions;
  }

  private localStrengths(parsedData: ResumeParsedData, factors: ScoreFactor[]): string[] {
    const strengths = factors
      .filter((factor) => factor.score >= 80)
      .map((factor) => `${factor.label} is strong.`);

    if (parsedData.projects.length) {
      strengths.push(`${parsedData.projects.length} project(s) provide portfolio evidence.`);
    }
    if (parsedData.skills.length >= 8) {
      strengths.push('Technical skill coverage is broad enough for ATS parsing.');
    }
    return strengths;
  }

  private localSummary(score: number, parsedData: ResumeParsedData): string {
    return `Local resume review completed with an ATS score of ${score}/100. The resume has ${parsedData.skills.length} detected skill(s), ${parsedData.projects.length} project(s), and ${parsedData.experience.length} experience entr${parsedData.experience.length === 1 ? 'y' : 'ies'}.`;
  }

  private extractContactInfo(resumeText: string, lines: string[]): ContactInformation {
    const email = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const phone = resumeText.match(/(?:\+?\d[\s().-]?){8,}\d/)?.[0]?.trim();
    const linkedin = resumeText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0];
    const github = resumeText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s]+/i)?.[0];
    const portfolio = resumeText.match(/https?:\/\/(?!.*(?:linkedin|github))[^\s]+/i)?.[0];
    const location = lines
      .slice(0, 8)
      .find((line) => /,\s?[A-Z]{2}\b|india|united states|remote/i.test(line) && !line.includes('@'));

    return { email, phone, linkedin, github, portfolio, location };
  }

  private extractName(lines: string): string | undefined;
  private extractName(lines: string[]): string | undefined;
  private extractName(lines: string[] | string): string | undefined {
    const sourceLines = Array.isArray(lines) ? lines : this.getLines(lines);
    return sourceLines.slice(0, 8).find((line) => {
      const wordCount = line.split(/\s+/).length;
      return (
        wordCount >= 2 &&
        wordCount <= 5 &&
        !/[0-9@:/]/.test(line) &&
        !this.isSectionHeading(line) &&
        !/(resume|curriculum|vitae)/i.test(line)
      );
    });
  }

  private extractSummary(lines: string[]): string | undefined {
    return this.getSectionText(lines, ['summary', 'profile', 'objective']).slice(0, 600) || undefined;
  }

  private extractExperience(lines: string[]): WorkExperience[] {
    const section = this.getSectionText(lines, ['experience', 'work experience', 'professional experience', 'employment']);
    return this.chunkSection(section).slice(0, 8).map((chunk) => {
      const chunkLines = this.getLines(chunk);
      const first = chunkLines[0] || 'Experience';
      const second = chunkLines[1] || 'Company';
      const [title, company] = first.includes(' at ')
        ? first.split(/\s+at\s+/i)
        : [first, second];
      return {
        title: title.trim() || 'Experience',
        company: company.trim() || 'Company',
        description: chunkLines.slice(first.includes(' at ') ? 1 : 2).join('\n'),
        bullets: this.extractBulletLines(chunk),
        technologies: this.detectKnownSkills(chunk),
      };
    });
  }

  private extractEducation(lines: string[]): Education[] {
    const section = this.getSectionText(lines, ['education']);
    return this.chunkSection(section).slice(0, 4).map((chunk) => {
      const chunkLines = this.getLines(chunk);
      return {
        institution: chunkLines[0] || 'Institution',
        degree: chunkLines[1] || 'Degree',
        details: chunkLines.slice(2),
      };
    });
  }

  private extractProjects(lines: string[]): Project[] {
    const section = this.getSectionText(lines, ['projects', 'personal projects']);
    return this.chunkSection(section).slice(0, 8).map((chunk) => {
      const chunkLines = this.getLines(chunk);
      const name = chunkLines[0] || 'Project';
      return {
        name,
        description: chunkLines.slice(1).join('\n'),
        technologies: this.detectKnownSkills(chunk),
        bullets: this.extractBulletLines(chunk),
      };
    });
  }

  private extractCertifications(lines: string[]): Certification[] {
    const section = this.getSectionText(lines, ['certifications', 'certificates']);
    return this.getLines(section).slice(0, 8).map((line) => ({ name: line }));
  }

  private extractAchievements(lines: string[]): string[] {
    const section = this.getSectionText(lines, ['achievements', 'awards', 'honors']);
    return this.getLines(section).slice(0, 10);
  }

  private extractSkillsFromSkillSection(lines: string[]): string[] {
    const section = this.getSectionText(lines, ['skills', 'technical skills']);
    return this.uniqueStrings(
      section
        .split(/[,|•\n;/]+/)
        .map((skill) => skill.replace(/^[-*\s]+/, '').trim())
        .filter((skill) => skill.length >= 2 && skill.length <= 40)
    );
  }

  private getSectionText(lines: string[], headings: string[]): string {
    const start = lines.findIndex((line) =>
      headings.some((heading) => this.normalizeHeading(line) === this.normalizeHeading(heading))
    );
    if (start < 0) return '';

    const collected: string[] = [];
    for (let index = start + 1; index < lines.length; index += 1) {
      if (this.isSectionHeading(lines[index])) break;
      collected.push(lines[index]);
    }
    return collected.join('\n').trim();
  }

  private chunkSection(sectionText: string): string[] {
    if (!sectionText) return [];
    const chunks = sectionText
      .split(/\n\s*\n/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    if (chunks.length > 1) {
      return chunks;
    }

    const lines = this.getLines(sectionText);
    const result: string[] = [];
    let current: string[] = [];

    for (const line of lines) {
      const startsNew = current.length > 2 && !/^[-*•]/.test(line) && !metricRegex.test(line);
      if (startsNew) {
        result.push(current.join('\n'));
        current = [];
      }
      current.push(line);
    }
    if (current.length) result.push(current.join('\n'));

    return result.filter((chunk) => chunk.length > 10);
  }

  private extractBullets(entry: WorkExperience): string[] {
    return this.uniqueStrings([
      ...(entry.bullets || []),
      ...this.extractBulletLines(entry.description || ''),
      ...((entry.description && !entry.description.includes('\n')) ? [entry.description] : []),
    ]).filter((bullet) => bullet.length > 12);
  }

  private extractBulletLines(text: string): string[] {
    return this.getLines(text)
      .filter((line) => /^[-*•]/.test(line.trim()))
      .map((line) => line.replace(/^[-*•]\s*/, '').trim());
  }

  private isWeakBullet(bullet: string): boolean {
    const lower = bullet.toLowerCase();
    return (
      bullet.length < 50 ||
      !this.containsActionVerb(bullet) ||
      !metricRegex.test(bullet) ||
      weakPhrases.some((phrase) => lower.includes(phrase))
    );
  }

  private rewriteBulletTemplate(bullet: string, entry: WorkExperience): string {
    const topic = bullet.replace(/^[-*•]\s*/, '').split(/[,.]/)[0].slice(0, 80) || entry.title;
    return `Led ${topic.toLowerCase()} at ${entry.company}, using [technology/process] to improve [metric/outcome] by [value].`;
  }

  private extractKeywords(text: string): string[] {
    const knownSkills = this.detectKnownSkills(text);
    const words = text
      .toLowerCase()
      .match(/[a-z][a-z0-9.+#-]{2,}/g) || [];
    const counts = new Map<string, number>();

    for (const word of words) {
      if (stopWords.has(word) || word.length < 3) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
    }

    const frequentWords = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([word]) => word);

    return this.uniqueStrings([...knownSkills, ...frequentWords]).slice(0, 32);
  }

  private calculateRoleEvidence(parsedData: ResumeParsedData, jobDescription: string): number {
    const roleKeywords = this.extractKeywords(jobDescription).slice(0, 12);
    const evidenceText = JSON.stringify({
      summary: parsedData.summary,
      experience: parsedData.experience,
      projects: parsedData.projects,
    }).toLowerCase();
    const matches = roleKeywords.filter((keyword) => evidenceText.includes(keyword.toLowerCase())).length;
    return this.clamp(35 + (roleKeywords.length ? (matches / roleKeywords.length) * 65 : 30));
  }

  private findRoleEvidence(parsedData: ResumeParsedData, jobDescription: string): string[] {
    const keywords = this.extractKeywords(jobDescription).slice(0, 10);
    const entries = [
      ...(parsedData.experience || []).map((entry) => `${entry.title} at ${entry.company}`),
      ...(parsedData.projects || []).map((project) => project.name),
    ];
    return entries.filter((entry) =>
      keywords.some((keyword) => entry.toLowerCase().includes(keyword.toLowerCase()))
    );
  }

  private presentSectionCount(parsedData: ResumeParsedData, resumeText: string): number {
    const parsedSections = [
      parsedData.summary,
      parsedData.experience.length,
      parsedData.projects.length,
      parsedData.education.length,
      parsedData.skills.length,
      parsedData.certifications?.length,
      parsedData.achievements?.length,
    ].filter(Boolean).length;
    const headingMatches = sectionHeadings.filter((heading) =>
      new RegExp(`(^|\\n)\\s*${this.escapeRegExp(heading)}\\s*:?\\s*(\\n|$)`, 'i').test(resumeText)
    ).length;

    return Math.max(parsedSections, headingMatches);
  }

  private containsActionVerb(text: string): boolean {
    const lower = text.toLowerCase();
    return actionVerbs.some((verb) => lower.includes(verb));
  }

  private flattenSkillAnalysis(analysis: SkillCategoryAnalysis): string[] {
    return this.uniqueStrings(Object.values(analysis).flat());
  }

  private toDetectedSkills(skills: string[], resumeText: string): DetectedSkill[] {
    return this.uniqueStrings(skills).map((skillName) => ({
      skillName,
      confidenceScore: this.textContainsTerm(resumeText, skillName) ? 0.9 : 0.72,
      yearsExperience: undefined,
      context: this.textContainsTerm(resumeText, skillName)
        ? 'Detected in resume content'
        : 'Inferred from structured skills',
    }));
  }

  private findSkillCategory(skill: string): SkillCategoryKey {
    for (const key of Object.keys(skillCatalog) as SkillCategoryKey[]) {
      if (skillCatalog[key].some((knownSkill) => this.normalizeKey(knownSkill) === this.normalizeKey(skill))) {
        return key;
      }
    }
    return 'other';
  }

  private canonicalSkillName(skill: string): string {
    const known = allKnownSkills.find((knownSkill) => this.normalizeKey(knownSkill) === this.normalizeKey(skill));
    return known || skill.trim();
  }

  private includesSkill(skills: string[], skill: string): boolean {
    return skills.some((resumeSkill) => this.normalizeKey(resumeSkill) === this.normalizeKey(skill));
  }

  private textContainsTerm(text: string, term: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    if (lowerTerm.length <= 2 || /^[a-z+#]+$/i.test(term)) {
      return new RegExp(`(^|[^a-z0-9])${this.escapeRegExp(lowerTerm)}([^a-z0-9]|$)`, 'i').test(lowerText);
    }
    return lowerText.includes(lowerTerm);
  }

  private getLines(text: string): string[] {
    return text
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private isSectionHeading(line: string): boolean {
    if (line.length > 42) return false;
    const normalized = this.normalizeHeading(line);
    return sectionHeadings.some((heading) => normalized === this.normalizeHeading(heading));
  }

  private normalizeHeading(value: string): string {
    return value.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
  }

  private normalizeKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9+#.]/g, '');
  }

  private uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
      const clean = value?.toString().trim();
      if (!clean) continue;
      const key = this.normalizeKey(clean);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(clean);
    }

    return result;
  }

  private weightedScore(factors: ScoreFactor[]): number {
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const weighted = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);
    return Math.round(weighted / totalWeight);
  }

  private toScore(value: number): number {
    return this.clamp(Math.round(value * 100));
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private ratingForScore(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Strong';
    if (score >= 70) return 'Competitive';
    if (score >= 55) return 'Needs Work';
    return 'High Risk';
  }

  private parseJsonFromText(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(text.slice(start, end + 1));
      }
      throw new Error('AI response did not contain valid JSON.');
    }
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const resumeReviewService = new ResumeReviewService();
