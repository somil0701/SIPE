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
  expected: string;
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
  feedback?: AttemptFeedback;
}

export type AttemptStatus = 
  | 'PENDING'
  | 'running'
  | 'ACCEPTED'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'RUNTIME_ERROR'
  | 'compilation_error'
  | 'PARTIALLY_ACCEPTED';

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
  parsingStatus: 'PENDING' | 'processing' | 'completed' | 'failed';
  parsedData?: ResumeParsedData;
  skillsDetected?: DetectedSkill[];
  uploadedAt: string;
}

export interface ResumeParsedData {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  experience: WorkExperience[];
  education: Education[];
  projects: Project[];
  skills: string[];
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  graduationDate?: string;
}

export interface Project {
  name: string;
  description?: string;
  technologies?: string[];
  link?: string;
}

export interface DetectedSkill {
  skillName: string;
  confidenceScore?: number;
  yearsExperience?: number;
  context?: string;
}

// Learning Path Types
export interface LearningPath {
  id: string;
  name: string;
  description?: string;
  targetSkillId?: string;
  targetCompanyId?: string;
  totalItems: number;
  completedItems: number;
  progressPercentage: number;
  estimatedHours?: number;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  items: LearningPathItem[];
}

export interface LearningPathItem {
  id: string;
  itemType: 'question' | 'lesson' | 'review' | 'milestone';
  title?: string;
  description?: string;
  questionId?: string;
  skillId?: string;
  orderIndex: number;
  scheduledDate?: string;
  estimatedMinutes?: number;
  status: 'PENDING' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: string;
  question?: {
    id: string;
    title: string;
    difficulty: string;
    slug: string;
  };
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