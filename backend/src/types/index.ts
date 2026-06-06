/**
 * Type Definitions
 * 
 * Centralized type definitions for the application
 */

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: 'user' | 'premium' | 'admin' | 'interviewer';
  isPremium: boolean;
  preferredLanguage: string;
  studyGoalMinutes: number;
  onboardingCompleted: boolean;
  createdAt: Date;
}

export interface UserProfile extends User {
  userSkills: UserSkill[];
  stats: UserStats;
}

export interface UserSkill {
  id: string;
  skillId: string;
  skillName: string;
  proficiencyLevel: number;
  xpPoints: number;
  questionsAttempted: number;
  questionsSolved: number;
  accuracyRate: number;
  lastPracticedAt?: Date;
}

export interface UserStats {
  totalAttempts: number;
  totalSolved: number;
  uniqueQuestionsAttempted: number;
  uniqueQuestionsSolved: number;
  overallAccuracy: number;
  totalTimeSpent: number;
  currentStreak: number;
  longestStreak: number;
}

// ============================================
// AUTH TYPES
// ============================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

// ============================================
// QUESTION TYPES
// ============================================

export interface Question {
  id: string;
  skillId: string;
  title: string;
  slug: string;
  description: string;
  problemStatement: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  type: 'coding' | 'system-design' | 'behavioral' | 'theoretical' | 'quiz';
  starterCode?: Record<string, string>;
  hints: string[];
  testCases: TestCase[];
  constraints: string[];
  companyTags: string[];
  topicTags: string[];
  acceptanceRate: number;
  explanation?: string;
  isPremium: boolean;
}

export interface TestCase {
  input: string;
  expected?: string;
  expectedOutput?: string;
  isExample: boolean;
  explanation?: string;
}

export interface QuestionFilter {
  difficulty?: string;
  skillId?: string;
  type?: string;
  company?: string;
  search?: string;
  isPremium?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// ATTEMPT TYPES
// ============================================

export interface Attempt {
  id: string;
  userId: string;
  questionId: string;
  code?: string;
  language: string;
  status: AttemptStatus;
  timeSpent: number;
  executionTime?: number;
  memoryUsed?: number;
  testCasesPassed: number;
  testCasesTotal: number;
  aiScore?: number;
  submittedAt: Date;
  isPractice: boolean;
}

export type AttemptStatus =
  | 'QUEUED'
  | 'PENDING'
  | 'RUNNING'
  | 'running'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'wrong_answer'
  | 'TIME_LIMIT_EXCEEDED'
  | 'time_limit_exceeded'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR'
  | 'compilation_error'
  | 'PARTIALLY_ACCEPTED';

export interface AttemptInput {
  questionId: string;
  code: string;
  language: string;
  timeSpent: number;
}

export interface RunCodeInput {
  questionId: string;
  code: string;
  language: string;
  input?: string;
}

export interface AttemptFeedback {
  id: string;
  attemptId: string;
  overallScore?: number;
  summary?: string;
  codeQualityScore?: number;
  codeQualityFeedback?: string;
  timeComplexityActual?: string;
  timeComplexityCorrect?: boolean;
  spaceComplexityActual?: string;
  spaceComplexityCorrect?: boolean;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  recommendedResources?: Resource[];
  relatedQuestions?: string[];
}

export interface Resource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'documentation' | 'practice';
}

// ============================================
// INTERVIEW TYPES
// ============================================

export interface InterviewSession {
  id: string;
  userId: string;
  title?: string;
  interviewType: 'technical' | 'behavioral' | 'mixed' | 'system-design';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'abandoned';
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  durationMinutes: number;
  overallScore?: number;
  technicalScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  transcript?: string;
  summaryFeedback?: string;
  strengths: string[];
  areasToImprove: string[];
}

export interface InterviewQuestion {
  id: string;
  interviewSessionId: string;
  questionText: string;
  questionType?: string;
  expectedTopics: string[];
  userAnswer?: string;
  aiEvaluation?: string;
  score?: number;
  questionOrder: number;
}

export interface CreateInterviewInput {
  title?: string;
  interviewType: string;
  difficulty?: string;
  targetCompanyId?: string;
  scheduledAt?: Date;
  durationMinutes?: number;
}

// ============================================
// RESUME TYPES
// ============================================

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  parsedText?: string;
  parsedData?: ResumeParsedData;
  skillsDetected?: DetectedSkill[];
  experienceYears?: number;
  parsingStatus: 'PENDING' | 'processing' | 'completed' | 'failed';
  parsingError?: string;
  uploadedAt: Date;
}

export interface ResumeParsedData {
  name?: string;
  email?: string;
  phone?: string;
  contactInfo?: ContactInformation;
  summary?: string;
  experience: WorkExperience[];
  education: Education[];
  projects: Project[];
  skills: string[];
  certifications?: Certification[];
  achievements?: string[];
  review?: ResumeReviewAnalysis;
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  bullets?: string[];
  technologies?: string[];
  location?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  graduationDate?: string;
  location?: string;
  details?: string[];
}

export interface Project {
  name: string;
  description?: string;
  technologies?: string[];
  link?: string;
  role?: string;
  impact?: string;
  bullets?: string[];
}

export interface DetectedSkill {
  skillName: string;
  skillId?: string;
  confidenceScore?: number;
  yearsExperience?: number;
  context?: string;
}

export interface ContactInformation {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  date?: string;
}

export type SkillCategoryKey =
  | 'programmingLanguages'
  | 'frontend'
  | 'backend'
  | 'databases'
  | 'devOps'
  | 'cloud'
  | 'aiMl'
  | 'other';

export type SkillCategoryAnalysis = Record<SkillCategoryKey, string[]>;

export interface ScoreFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  rationale: string;
  evidence: string[];
  suggestions: string[];
}

export interface PriorityImprovement {
  priority: 'high' | 'medium' | 'low';
  title: string;
  recommendation: string;
  impact?: string;
}

export interface ProjectAnalysis {
  name: string;
  technologies: string[];
  qualityScore: number;
  qualityRating: string;
  descriptionQuality: string;
  measurableImpact: boolean;
  strengths: string[];
  weaknesses: string[];
  suggestedDescription: string;
}

export interface ExperienceAnalysis {
  company: string;
  title: string;
  weakBullets: string[];
  actionRewrites: string[];
  quantificationIdeas: string[];
  suggestions: string[];
}

export interface ResumeReviewAnalysis {
  atsScore: number;
  overallRating: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  missingKeywords: string[];
  priorityImprovements: PriorityImprovement[];
  scoreBreakdown: ScoreFactor[];
  projectAnalysis: ProjectAnalysis[];
  experienceAnalysis: ExperienceAnalysis[];
  skillAnalysis: SkillCategoryAnalysis;
  generatedBy: 'groq' | 'local-fallback';
  generatedAt: string;
}

export interface ResumeAnalysisResult {
  parsedData: ResumeParsedData;
  skills: DetectedSkill[];
  review: ResumeReviewAnalysis;
}

export interface JobMatchAnalysis {
  matchScore: number;
  rating: string;
  matchingSkills: string[];
  missingSkills: string[];
  matchingKeywords: string[];
  missingKeywords: string[];
  resumeImprovementSuggestions: string[];
  scoreBreakdown: ScoreFactor[];
  generatedBy: 'groq' | 'local-fallback';
  generatedAt: string;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface UserAnalytics {
  userId: string;
  totalAttempts: number;
  totalSolved: number;
  uniqueQuestionsAttempted: number;
  uniqueQuestionsSolved: number;
  overallAccuracy: number;
  totalTimeSpent: number;
  currentStreak: number;
  longestStreak: number;
  skillBreakdown: SkillBreakdown[];
  weeklyProgress: WeeklyProgress[];
  difficultyBreakdown: DifficultyBreakdown;
}

export interface SkillBreakdown {
  skillId: string;
  skillName: string;
  attempted: number;
  solved: number;
  accuracy: number;
  proficiencyLevel: number;
}

export interface WeeklyProgress {
  week: string;
  questionsAttempted: number;
  questionsSolved: number;
  accuracy: number;
  timeSpent: number;
}

export interface DifficultyBreakdown {
  easy: { attempted: number; solved: number };
  medium: { attempted: number; solved: number };
  hard: { attempted: number; solved: number };
  expert: { attempted: number; solved: number };
}

export interface DailyAnalytics {
  date: string;
  sessionCount: number;
  totalTimeMinutes: number;
  questionsAttempted: number;
  questionsSolved: number;
  accuracyRate: number;
}

// ============================================
// LEARNING PATH TYPES
// ============================================

export interface LearningPath {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetSkillId?: string;
  targetCompanyId?: string;
  totalItems: number;
  completedItems: number;
  progressPercentage: number;
  estimatedHours?: number;
  startDate?: Date;
  targetCompletionDate?: Date;
  actualCompletionDate?: Date;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  items: LearningPathItem[];
}

export interface LearningPathItem {
  id: string;
  pathId: string;
  itemType: 'question' | 'lesson' | 'review' | 'milestone';
  title?: string;
  description?: string;
  questionId?: string;
  skillId?: string;
  orderIndex: number;
  scheduledDate?: Date;
  estimatedMinutes?: number;
  status: 'PENDING' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
}

// ============================================
// SPACED REPETITION TYPES
// ============================================

export interface SpacedRepetition {
  id: string;
  userId: string;
  questionId: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: Date;
  lastReviewedAt?: Date;
  reviewCount: number;
  successfulReviews: number;
  failedReviews: number;
  status: 'active' | 'mastered' | 'paused';
  question?: Question;
}

export interface SpacedRepetitionReview {
  id: string;
  srId: string;
  attemptId?: string;
  qualityRating: number; // 0-5 SM-2 rating
  reviewedAt: Date;
  previousInterval: number;
  newInterval: number;
  previousEf: number;
  newEf: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// ============================================
// SOCKET.IO TYPES
// ============================================

export interface ServerToClientEvents {
  'interview:question': (data: { question: InterviewQuestion; order: number }) => void;
  'interview:feedback': (data: { feedback: string; score?: number }) => void;
  'interview:complete': (data: { summary: InterviewSession }) => void;
  'interview:error': (data: { message: string }) => void;
  'notification': (data: { type: string; message: string; data?: unknown }) => void;
}

export interface ClientToServerEvents {
  'interview:join': (interviewId: string) => void;
  'interview:leave': (interviewId: string) => void;
  'interview:answer': (data: { interviewId: string; answer: string }) => void;
  'interview:skip': (interviewId: string) => void;
  'authenticate': (userId: string) => void;
}

// ============================================
// AI SERVICE TYPES
// ============================================

export interface AIQuestionGenerationInput {
  skillId: string;
  difficulty: string;
  type: string;
  companyTags?: string[];
}

export interface AIAnswerEvaluationInput {
  questionId: string;
  code: string;
  language: string;
  userExplanation?: string;
}

export interface AIMockInterviewInput {
  interviewType: string;
  difficulty: string;
  previousQuestions?: string[];
  userSkills?: string[];
  resumeData?: ResumeParsedData;
}

export interface AIResumeAnalysisInput {
  resumeText: string;
}

export interface AIFeedbackOutput {
  overallScore: number;
  summary: string;
  codeQualityScore: number;
  codeQualityFeedback: string;
  timeComplexity: string;
  spaceComplexity: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  resources: Resource[];
}
