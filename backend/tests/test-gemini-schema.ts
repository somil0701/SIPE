import 'dotenv/config';
import { env } from './src/config/env';
import axios from 'axios';
import { z } from 'zod';

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

const dummyResume = `
John Doe
Software Engineer
john.doe@example.com
123-456-7890

Experience:
Google - Software Engineer (Jan 2020 - Present)
- Developed some features using React.
- Fixed bugs.

Education:
B.S. in Computer Science
University of Example, 2019
`;

async function testFull() {
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
${dummyResume}`;

  const model = encodeURIComponent(env.GEMINI_MODEL || 'gemini-2.5-flash');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  
  try {
    const start = Date.now();
    const response = await axios.post(
      url,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      },
      { timeout: 30000 }
    );
    console.log('Time taken:', Date.now() - start, 'ms');
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      const s = text.indexOf('{');
      const e = text.lastIndexOf('}');
      if (s >= 0 && e > s) {
        json = JSON.parse(text.slice(s, e + 1));
      } else {
        throw new Error('Not JSON');
      }
    }
    
    const parsed = aiResumeReviewSchema.safeParse(json);
    if (!parsed.success) {
      console.error('Schema validation failed:', JSON.stringify(parsed.error.issues, null, 2));
    } else {
      console.log('Schema validation succeeded!');
    }
  } catch (error: any) {
    console.error('API Error:', error?.response?.data || error.message);
  }
}

testFull();
