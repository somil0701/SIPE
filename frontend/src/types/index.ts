// User Types
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
  createdAt: string;
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
  lastPracticedAt?: string;
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

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
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

// Question Types
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
  solutionCode?: Record<string, string>;
  hints: string[];
  testCases: TestCase[];
  constraints: string[];
  companyTags: string[];
  topicTags: string[];
  acceptanceRate: number;
  explanation?: string;
  isPremium: boolean;
  attemptStatus?: string | null;
}

export interface TestCase {
  input: string;
  expected?: string;
  expectedOutput?: string;
  isExample: boolean;
  explanation?: string;
}

// Attempt Types
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
  submittedAt: string;
  isPractice: boolean;
  question?: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
  };
  attemptTestCases?: AttemptTestCaseResult[];
  feedback?: AttemptFeedback;
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
  | 'runtime_error'
  | 'COMPILATION_ERROR'
  | 'compilation_error'
  | 'PARTIALLY_ACCEPTED';

export interface AttemptTestCaseResult {
  id: string;
  testCaseIndex: number;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  passed: boolean;
  executionTime?: number;
  errorMessage?: string;
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

// Interview Types
export interface InterviewSession {
  id: string;
  userId: string;
  title?: string;
  interviewType: 'technical' | 'behavioral' | 'mixed' | 'system-design';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'abandoned';
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  durationMinutes: number;
  overallScore?: number;
  technicalScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  transcript?: string;
  summaryFeedback?: string;
  strengths: string[];
  areasToImprove: string[];
  interviewQuestions?: InterviewQuestion[];
  targetCompany?: {
    name: string;
    logoUrl?: string;
  };
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

// Analytics Types
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

// Resume Types
export interface Resume {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  parsingStatus: 'PENDING' | 'processing' | 'completed' | 'failed';
  parsingError?: string;
  parsedData?: ResumeParsedData;
  skillsDetected?: DetectedSkill[];
  uploadedAt: string;
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

// Learning Path Types
export interface LearningPath {
  id: string;
  name: string;
  description?: string;
  goalType: 'general' | 'skill' | 'company' | 'interview';
  targetSkillId?: string;
  targetCompanyId?: string;
  targetSkill?: { id: string; name: string };
  targetCompany?: { id: string; name: string; slug?: string };
  totalItems: number;
  completedItems: number;
  progressPercentage: number;
  estimatedHours?: number;
  weeklyStudyMinutes: number;
  startDate?: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;
  lastRebalancedAt?: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  pathItems: LearningPathItem[];
}

export interface LearningPathItem {
  id: string;
  itemType: 'question' | 'lesson' | 'review' | 'milestone';
  title?: string;
  description?: string;
  phase?: string;
  selectionReason?: string;
  completionEvidence?: Record<string, unknown>;
  questionId?: string;
  skillId?: string;
  orderIndex: number;
  scheduledDate?: string;
  estimatedMinutes?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: string;
  attemptId?: string;
  attempt?: {
    id: string;
    status: string;
    submittedAt: string;
    aiScore?: number;
  };
  question?: {
    id: string;
    title: string;
    difficulty: string;
    slug: string;
  };
}

export interface LearningPathInput {
  name: string;
  description?: string;
  goalType: 'general' | 'skill' | 'company' | 'interview';
  targetSkillId?: string;
  targetCompanyId?: string;
  weeklyStudyMinutes: number;
  targetCompletionDate?: string;
}

export interface LearningPathOptions {
  skills: Array<{ id: string; name: string; category: string; estimatedHours?: number }>;
  companies: Array<{ id: string; name: string; slug: string }>;
}

export interface LearningPathPreview {
  summary: string;
  estimatedHours: number;
  targetCompletionDate: string;
  items: Array<Omit<LearningPathItem, 'id' | 'pathId' | 'status'>>;
}

// Spaced Repetition Types
export interface SpacedRepetition {
  id: string;
  questionId: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: string;
  lastReviewedAt?: string;
  reviewCount: number;
  successfulReviews: number;
  failedReviews: number;
  status: 'active' | 'mastered' | 'paused';
  question?: Question;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}
