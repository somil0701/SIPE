# Smart Interview Preparation Engine - Database Design

## 1. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ENTITY RELATIONSHIP DIAGRAM                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │  user_skills    │       │     skills      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ PK id           │◄──────┤ PK id           │──────►│ PK id           │
│    email        │       │ FK user_id      │       │    name         │
│    password_hash│       │ FK skill_id     │       │    category     │
│    full_name    │       │    level        │       │    description  │
│    role         │       │    xp_points    │       │    difficulty   │
│    is_premium   │       │    last_updated │       │    parent_id    │
│    created_at   │       └─────────────────┘       └─────────────────┘
│    updated_at   │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    resumes      │       │  resume_skills  │       │     questions   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ PK id           │◄──────┤ PK id           │       │ PK id           │
│ FK user_id      │       │ FK resume_id    │       │ FK skill_id     │
│    file_url     │       │ FK skill_id     │◄──────┤    title        │
│    parsed_text  │       │    confidence   │       │    description  │
│    file_type    │       └─────────────────┘       │    difficulty   │
│    upload_date  │                                 │    type         │
│    is_active    │                                 │    company_tag  │
└─────────────────┘                                 │    leetcode_id  │
                                                    │    hints        │
                                                    │    test_cases   │
                                                    │    solution     │
                                                    │    time_complexity
                                                    │    space_complexity
                                                    │    acceptance_rate
                                                    │    created_at   │
                                                    └────────┬────────┘
                                                             │
                                                             │ 1:N
                                                             ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  attempt_feedback│      │    attempts     │       │  interview_sessions
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ PK id           │◄──────┤ PK id           │──────►│ PK id           │
│ FK attempt_id   │       │ FK user_id      │       │ FK user_id      │
│    ai_feedback  │       │ FK question_id  │       │    start_time   │
│    code_quality │       │    code         │       │    end_time     │
│    time_complexity│     │    language     │       │    status       │
│    space_complexity│    │    status       │       │    score        │
│    suggestions  │       │    time_spent   │       │    feedback     │
│    strengths    │       │    submitted_at │       │    created_at   │
│    weaknesses   │       │    execution_time│      └─────────────────┘
└─────────────────┘       └─────────────────┘
                                    │
                                    │ N:M
                                    ▼
                          ┌─────────────────┐
                          │ attempt_test_cases
                          ├─────────────────┤
                          │ PK id           │
                          │ FK attempt_id   │
                          │    input        │
                          │    expected     │
                          │    actual       │
                          │    passed       │
                          │    execution_time│
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  learning_paths │       │  path_items     │       │  spaced_repetition
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ PK id           │◄──────┤ PK id           │       │ PK id           │
│ FK user_id      │       │ FK path_id      │       │ FK user_id      │
│    name         │       │ FK question_id  │       │ FK question_id  │
│    description  │       │    order_index  │       │    interval     │
│    target_skill │       │    status       │       │    repetitions  │
│    created_at   │       │    scheduled_at │       │    ease_factor  │
│    completed_at │       └─────────────────┘       │    next_review  │
└─────────────────┘                                 │    last_reviewed│
                                                    └─────────────────┘
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  subscriptions  │       │  company_tags   │       │  question_tags  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ PK id           │       │ PK id           │◄──────┤ PK id           │
│ FK user_id      │       │    name         │       │ FK question_id  │
│    plan_type    │       │    logo_url     │       │ FK tag_id       │
│    status       │       │    description  │       └─────────────────┘
│    start_date   │       │    difficulty   │
│    end_date     │       └─────────────────┘
│    payment_id   │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│  analytics_daily│       │  user_activity  │
├─────────────────┤       ├─────────────────┤
│ PK id           │       │ PK id           │
│ FK user_id      │       │ FK user_id      │
│    date         │       │    date         │
│    questions_attempted│  │    session_count│
│    questions_solved   │  │    total_time   │
│    accuracy_rate│       │    questions_seen│
│    avg_time_per_question│ │   streak_days  │
│    skill_breakdown│     └─────────────────┘
│    created_at   │
└─────────────────┘
```

## 2. Complete SQL Schema

```sql
-- ============================================
-- DATABASE: interview_prep_engine
-- DESCRIPTION: Complete schema for Smart Interview Preparation Engine
-- VERSION: 1.0.0
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'premium', 'admin', 'interviewer')),
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expires_at TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferred_language VARCHAR(10) DEFAULT 'javascript',
    study_goal_minutes INTEGER DEFAULT 60,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Skills/Categories table (hierarchical)
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('data-structures', 'algorithms', 'system-design', 'behavioral', 'language-specific', 'framework')),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10),
    parent_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    icon_url VARCHAR(500),
    color_code VARCHAR(7), -- Hex color
    estimated_hours INTEGER, -- Estimated time to master
    prerequisites UUID[], -- Array of skill IDs
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User-Skill relationship (proficiency tracking)
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER DEFAULT 0 CHECK (proficiency_level BETWEEN 0 AND 100), -- 0-100 scale
    xp_points INTEGER DEFAULT 0,
    questions_attempted INTEGER DEFAULT 0,
    questions_solved INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_time_per_question INTEGER DEFAULT 0, -- in seconds
    streak_days INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_id)
);

-- ============================================
-- QUESTION BANK
-- ============================================

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('coding', 'system-design', 'behavioral', 'theoretical', 'quiz')),
    
    -- For coding questions
    starter_code JSONB, -- { "javascript": "...", "python": "..." }
    solution_code JSONB, -- Multiple language solutions
    optimal_time_complexity VARCHAR(50),
    optimal_space_complexity VARCHAR(50),
    
    -- For all question types
    hints TEXT[], -- Array of hints
    test_cases JSONB, -- [{ input: "...", expected: "...", is_example: true }]
    constraints TEXT[],
    follow_up_questions TEXT[],
    
    -- Metadata
    company_tags VARCHAR(100)[], -- ["Google", "Amazon", "Meta"]
    topic_tags VARCHAR(100)[], -- ["array", "two-pointers"]
    leetcode_id VARCHAR(50),
    hackerrank_id VARCHAR(50),
    
    -- Statistics
    acceptance_rate DECIMAL(5,2) DEFAULT 0.00,
    total_attempts INTEGER DEFAULT 0,
    total_solves INTEGER DEFAULT 0,
    avg_time_spent INTEGER DEFAULT 0, -- in seconds
    
    -- Adaptive learning
    base_difficulty_score DECIMAL(5,2) DEFAULT 50.00, -- 0-100
    adaptive_weight DECIMAL(5,2) DEFAULT 1.00,
    
    -- Content
    explanation TEXT, -- Detailed explanation
    video_solution_url VARCHAR(500),
    article_url VARCHAR(500),
    
    -- Status
    is_premium BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    verified_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Question tags (normalized)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE question_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(question_id, tag_id)
);

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    description TEXT,
    website VARCHAR(255),
    difficulty_rating DECIMAL(3,2), -- Average interview difficulty
    interview_process TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE question_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    frequency INTEGER DEFAULT 1, -- How often this question appears
    last_asked_at DATE,
    UNIQUE(question_id, company_id)
);

-- ============================================
-- ATTEMPTS & SUBMISSIONS
-- ============================================

CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    
    -- Submission details
    code TEXT,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'running', 'ACCEPTED', 'wrong_answer', 'time_limit_exceeded', 'RUNTIME_ERROR', 'compilation_error', 'PARTIALLY_ACCEPTED')),
    
    -- Performance metrics
    time_spent INTEGER NOT NULL, -- in seconds
    execution_time INTEGER, -- in milliseconds
    memory_used INTEGER, -- in KB
    
    -- Test case results
    test_cases_passed INTEGER DEFAULT 0,
    test_cases_total INTEGER DEFAULT 0,
    
    -- AI Evaluation
    ai_score INTEGER CHECK (ai_score BETWEEN 0 AND 100),
    ai_feedback JSONB, -- Structured feedback
    
    -- Submission context
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_practice BOOLEAN DEFAULT TRUE, -- vs mock interview
    interview_session_id UUID, -- If part of mock interview
    
    -- For retry tracking
    attempt_number INTEGER DEFAULT 1,
    previous_attempt_id UUID REFERENCES attempts(id)
);

-- Test case results for each attempt
CREATE TABLE attempt_test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    test_case_index INTEGER NOT NULL,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    actual_output TEXT,
    passed BOOLEAN NOT NULL,
    execution_time INTEGER, -- milliseconds
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI-generated feedback
CREATE TABLE attempt_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL UNIQUE REFERENCES attempts(id) ON DELETE CASCADE,
    
    -- Overall assessment
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    summary TEXT,
    
    -- Code quality
    code_quality_score INTEGER CHECK (code_quality_score BETWEEN 0 AND 100),
    code_quality_feedback TEXT,
    readability_score INTEGER,
    best_practices_followed BOOLEAN,
    
    -- Algorithm analysis
    time_complexity_actual VARCHAR(50),
    time_complexity_correct BOOLEAN,
    space_complexity_actual VARCHAR(50),
    space_complexity_correct BOOLEAN,
    
    -- Specific feedback
    strengths TEXT[],
    weaknesses TEXT[],
    improvement_suggestions TEXT[],
    
    -- Learning resources
    recommended_resources JSONB, -- [{ title, url, type }]
    related_questions UUID[], -- Question IDs to practice next
    
    -- Generated by AI
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(50)
);

-- ============================================
-- MOCK INTERVIEWS
-- ============================================

CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session configuration
    title VARCHAR(255),
    interview_type VARCHAR(50) NOT NULL CHECK (interview_type IN ('technical', 'behavioral', 'mixed', 'system-design')),
    difficulty VARCHAR(20) DEFAULT 'medium',
    target_company_id UUID REFERENCES companies(id),
    
    -- Timing
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'abandoned')),
    
    -- Results
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    technical_score INTEGER,
    communication_score INTEGER,
    problem_solving_score INTEGER,
    
    -- AI Interviewer
    ai_interviewer_config JSONB, -- Personality, style, etc.
    
    -- Feedback
    transcript TEXT, -- Full conversation
    summary_feedback TEXT,
    strengths TEXT[],
    areas_to_improve TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id), -- May be null for AI-generated
    
    -- Question details
    question_text TEXT NOT NULL,
    question_type VARCHAR(50),
    expected_topics TEXT[], -- What the answer should cover
    
    -- User's response
    user_answer TEXT,
    answer_submitted_at TIMESTAMP WITH TIME ZONE,
    
    -- AI Evaluation
    ai_evaluation TEXT,
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    follow_up_needed BOOLEAN DEFAULT FALSE,
    
    -- Ordering
    question_order INTEGER NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RESUME ANALYSIS
-- ============================================

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- File info
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL, -- in bytes
    
    -- Parsed content
    parsed_text TEXT,
    parsed_data JSONB, -- Structured resume data
    
    -- Analysis
    skills_detected JSONB, -- [{ skill, confidence, years_experience }]
    experience_years DECIMAL(4,1),
    education JSONB,
    projects JSONB,
    
    -- Status
    parsing_status VARCHAR(50) DEFAULT 'PENDING' CHECK (parsing_status IN ('PENDING', 'processing', 'completed', 'failed')),
    parsing_error TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    parsed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE resume_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id),
    skill_name VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(5,2), -- AI confidence
    years_experience DECIMAL(4,1),
    context TEXT, -- Where in resume it was found
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ADAPTIVE LEARNING & SPACED REPETITION
-- ============================================

-- Learning paths (personalized study plans)
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_skill_id UUID REFERENCES skills(id),
    target_company_id UUID REFERENCES companies(id),
    
    -- Progress
    total_items INTEGER DEFAULT 0,
    completed_items INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Schedule
    estimated_hours INTEGER,
    start_date DATE,
    target_completion_date DATE,
    actual_completion_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_path_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    skill_id UUID REFERENCES skills(id),
    
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('question', 'lesson', 'review', 'milestone')),
    title VARCHAR(255),
    description TEXT,
    
    -- Ordering and scheduling
    order_index INTEGER NOT NULL,
    scheduled_date DATE,
    estimated_minutes INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'in_progress', 'completed', 'skipped')),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- For questions
    attempt_id UUID REFERENCES attempts(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spaced repetition system
CREATE TABLE spaced_repetition (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    
    -- SM-2 Algorithm parameters
    interval INTEGER DEFAULT 1, -- Days until next review
    repetitions INTEGER DEFAULT 0, -- Number of successful reviews
    ease_factor DECIMAL(4,2) DEFAULT 2.50, -- EF in SM-2
    
    -- Scheduling
    next_review_date DATE NOT NULL,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- History
    review_count INTEGER DEFAULT 0,
    successful_reviews INTEGER DEFAULT 0,
    failed_reviews INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'mastered', 'paused')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- Review history
CREATE TABLE spaced_repetition_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sr_id UUID NOT NULL REFERENCES spaced_repetition(id) ON DELETE CASCADE,
    attempt_id UUID REFERENCES attempts(id),
    
    quality_rating INTEGER NOT NULL CHECK (quality_rating BETWEEN 0 AND 5), -- SM-2 quality
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Algorithm state at time of review
    previous_interval INTEGER,
    new_interval INTEGER,
    previous_ef DECIMAL(4,2),
    new_ef DECIMAL(4,2)
);

-- ============================================
-- ANALYTICS & TRACKING
-- ============================================

-- Daily user analytics
CREATE TABLE analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Activity metrics
    session_count INTEGER DEFAULT 0,
    total_time_minutes INTEGER DEFAULT 0,
    questions_attempted INTEGER DEFAULT 0,
    questions_solved INTEGER DEFAULT 0,
    
    -- Performance metrics
    accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_time_per_question INTEGER DEFAULT 0,
    
    -- Skill breakdown
    skill_breakdown JSONB, -- { skill_id: { attempted, solved, accuracy } }
    
    -- Difficulty breakdown
    easy_attempted INTEGER DEFAULT 0,
    easy_solved INTEGER DEFAULT 0,
    medium_attempted INTEGER DEFAULT 0,
    medium_solved INTEGER DEFAULT 0,
    hard_attempted INTEGER DEFAULT 0,
    hard_solved INTEGER DEFAULT 0,
    
    -- Streaks
    streak_day INTEGER DEFAULT 0, -- Current streak
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- User activity log (for detailed tracking)
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('login', 'question_start', 'question_submit', 'interview_start', 'interview_complete', 'resume_upload', 'skill_update')),
    
    metadata JSONB, -- Additional context
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    leaderboard_type VARCHAR(50) NOT NULL CHECK (leaderboard_type IN ('global', 'weekly', 'skill', 'company')),
    skill_id UUID REFERENCES skills(id),
    
    period_start DATE,
    period_end DATE,
    
    rankings JSONB, -- [{ user_id, rank, score, questions_solved }]
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- SUBSCRIPTIONS & PAYMENTS
-- ============================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('free', 'basic', 'premium', 'enterprise')),
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly')),
    
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
    
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Payment info
    payment_provider VARCHAR(50),
    payment_provider_subscription_id VARCHAR(255),
    
    -- Pricing
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment history
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'completed', 'failed', 'refunded')),
    
    payment_provider VARCHAR(50),
    payment_provider_charge_id VARCHAR(255),
    
    invoice_url VARCHAR(500),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_premium ON users(is_premium) WHERE is_premium = TRUE;

-- User Skills
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_skills_proficiency ON user_skills(proficiency_level DESC);

-- Questions
CREATE INDEX idx_questions_skill_id ON questions(skill_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_company_tags ON questions USING GIN(company_tags);
CREATE INDEX idx_questions_topic_tags ON questions USING GIN(topic_tags);
CREATE INDEX idx_questions_difficulty_score ON questions(base_difficulty_score);
CREATE INDEX idx_questions_search ON questions USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Attempts
CREATE INDEX idx_attempts_user_id ON attempts(user_id);
CREATE INDEX idx_attempts_question_id ON attempts(question_id);
CREATE INDEX idx_attempts_status ON attempts(status);
CREATE INDEX idx_attempts_submitted_at ON attempts(submitted_at DESC);
CREATE INDEX idx_attempts_user_question ON attempts(user_id, question_id);

-- Interview Sessions
CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX idx_interview_sessions_scheduled ON interview_sessions(scheduled_at);

-- Spaced Repetition
CREATE INDEX idx_spaced_repetition_user_id ON spaced_repetition(user_id);
CREATE INDEX idx_spaced_repetition_next_review ON spaced_repetition(next_review_date);
CREATE INDEX idx_spaced_repetition_user_review ON spaced_repetition(user_id, next_review_date);

-- Analytics
CREATE INDEX idx_analytics_daily_user_date ON analytics_daily(user_id, date DESC);
CREATE INDEX idx_analytics_daily_date ON analytics_daily(date);

-- Activities
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_created ON user_activities(created_at DESC);

-- Full-text search
CREATE INDEX idx_questions_fts ON questions USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(problem_statement, '')));

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at BEFORE UPDATE ON user_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at BEFORE UPDATE ON interview_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON learning_paths
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaced_repetition_updated_at BEFORE UPDATE ON spaced_repetition
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_daily_updated_at BEFORE UPDATE ON analytics_daily
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update user skill stats after attempt
CREATE OR REPLACE FUNCTION update_user_skill_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user_skills based on attempt
    UPDATE user_skills
    SET 
        questions_attempted = questions_attempted + 1,
        questions_solved = questions_solved + CASE WHEN NEW.status = 'ACCEPTED' THEN 1 ELSE 0 END,
        last_practiced_at = CURRENT_TIMESTAMP,
        last_updated = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id 
    AND skill_id = (SELECT skill_id FROM questions WHERE id = NEW.question_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_attempt_insert AFTER INSERT ON attempts
    FOR EACH ROW EXECUTE FUNCTION update_user_skill_stats();

-- ============================================
-- VIEWS
-- ============================================

-- User progress summary
CREATE VIEW user_progress_summary AS
SELECT 
    u.id as user_id,
    u.full_name,
    COUNT(DISTINCT a.id) as total_attempts,
    COUNT(DISTINCT CASE WHEN a.status = 'ACCEPTED' THEN a.id END) as total_solved,
    COUNT(DISTINCT a.question_id) as unique_questions_attempted,
    COUNT(DISTINCT CASE WHEN a.status = 'ACCEPTED' THEN a.question_id END) as unique_questions_solved,
    ROUND(
        COUNT(DISTINCT CASE WHEN a.status = 'ACCEPTED' THEN a.id END) * 100.0 / NULLIF(COUNT(DISTINCT a.id), 0), 
        2
    ) as overall_accuracy,
    COALESCE(SUM(a.time_spent), 0) as total_time_spent_seconds
FROM users u
LEFT JOIN attempts a ON u.id = a.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.full_name;

-- Skill difficulty distribution
CREATE VIEW skill_difficulty_distribution AS
SELECT 
    s.id as skill_id,
    s.name as skill_name,
    COUNT(CASE WHEN q.difficulty = 'easy' THEN 1 END) as easy_count,
    COUNT(CASE WHEN q.difficulty = 'medium' THEN 1 END) as medium_count,
    COUNT(CASE WHEN q.difficulty = 'hard' THEN 1 END) as hard_count,
    COUNT(CASE WHEN q.difficulty = 'expert' THEN 1 END) as expert_count,
    COUNT(*) as total_questions
FROM skills s
LEFT JOIN questions q ON s.id = q.skill_id AND q.is_active = TRUE
GROUP BY s.id, s.name;

-- Daily active users (for admin dashboard)
CREATE VIEW daily_active_users AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as dau
FROM user_activities
WHERE activity_type = 'login'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert sample skills
INSERT INTO skills (name, slug, description, category, difficulty_level, display_order) VALUES
('Arrays', 'arrays', 'Fixed-size collection of elements stored in contiguous memory', 'data-structures', 1, 1),
('Linked Lists', 'linked-lists', 'Linear collection of nodes where each node points to the next', 'data-structures', 2, 2),
('Stacks', 'stacks', 'LIFO (Last In First Out) data structure', 'data-structures', 2, 3),
('Queues', 'queues', 'FIFO (First In First Out) data structure', 'data-structures', 2, 4),
('Trees', 'trees', 'Hierarchical data structure with root and children nodes', 'data-structures', 4, 5),
('Binary Search Trees', 'binary-search-trees', 'Binary tree with ordering property', 'data-structures', 5, 6),
('Heaps', 'heaps', 'Complete binary tree with heap property', 'data-structures', 5, 7),
('Graphs', 'graphs', 'Collection of vertices and edges', 'data-structures', 6, 8),
('Hash Tables', 'hash-tables', 'Key-value storage using hash function', 'data-structures', 4, 9),
('Two Pointers', 'two-pointers', 'Technique using two pointers to traverse data', 'algorithms', 2, 10),
('Sliding Window', 'sliding-window', 'Technique for subarray/substring problems', 'algorithms', 3, 11),
('Binary Search', 'binary-search', 'Efficient search in sorted data', 'algorithms', 3, 12),
('BFS', 'bfs', 'Breadth-First Search traversal', 'algorithms', 4, 13),
('DFS', 'dfs', 'Depth-First Search traversal', 'algorithms', 4, 14),
('Dynamic Programming', 'dynamic-programming', 'Optimization by breaking into subproblems', 'algorithms', 7, 15),
('Greedy Algorithms', 'greedy', 'Making locally optimal choices', 'algorithms', 5, 16),
('Sorting', 'sorting', 'Arranging data in specific order', 'algorithms', 3, 17),
('Recursion', 'recursion', 'Functions calling themselves', 'algorithms', 4, 18),
('System Design', 'system-design', 'Designing scalable distributed systems', 'system-design', 8, 19),
('Object-Oriented Design', 'ood', 'Design using OOP principles', 'system-design', 6, 20);

-- Insert sample companies
INSERT INTO companies (name, slug, description, difficulty_rating) VALUES
('Google', 'google', 'Technology company focusing on search, ads, and cloud', 4.2),
('Amazon', 'amazon', 'E-commerce and cloud computing giant', 3.8),
('Meta', 'meta', 'Social media and metaverse company', 4.0),
('Microsoft', 'microsoft', 'Software and cloud services company', 3.9),
('Apple', 'apple', 'Consumer electronics and software', 4.1),
('Netflix', 'netflix', 'Streaming entertainment service', 4.3),
('Uber', 'uber', 'Ride-sharing and delivery platform', 3.7),
('Airbnb', 'airbnb', 'Vacation rental marketplace', 3.9);

-- Insert sample tags
INSERT INTO tags (name, category) VALUES
('array', 'data-structure'),
('string', 'data-structure'),
('hash-map', 'data-structure'),
('two-pointers', 'technique'),
('sliding-window', 'technique'),
('binary-search', 'technique'),
('dp', 'technique'),
('bfs', 'traversal'),
('dfs', 'traversal'),
('tree', 'data-structure'),
('graph', 'data-structure'),
('heap', 'data-structure'),
('sorting', 'technique'),
('math', 'topic'),
('bit-manipulation', 'topic');

-- Insert sample question
INSERT INTO questions (
    skill_id, 
    title, 
    slug, 
    description, 
    problem_statement, 
    difficulty, 
    type,
    starter_code,
    hints,
    test_cases,
    constraints,
    company_tags,
    topic_tags,
    explanation
) VALUES (
    (SELECT id FROM skills WHERE slug = 'arrays'),
    'Two Sum',
    'two-sum',
    'Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.',
    E'Given an array of integers `nums` and an integer `target`, return **indices** of the two numbers such that they add up to `target`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.',
    'easy',
    'coding',
    '{"javascript": "function twoSum(nums, target) {\n    // Write your code here\n}", "python": "def twoSum(nums, target):\n    # Write your code here\n    pass"}'::jsonb,
    ARRAY['Try using a hash map to store values', 'For each number, check if target - num exists in the map'],
    '[
        {"input": "nums = [2,7,11,15], target = 9", "expected": "[0,1]", "is_example": true, "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."},
        {"input": "nums = [3,2,4], target = 6", "expected": "[1,2]", "is_example": true},
        {"input": "nums = [3,3], target = 6", "expected": "[0,1]", "is_example": true}
    ]'::jsonb,
    ARRAY['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9', 'Only one valid answer exists.'],
    ARRAY['Amazon', 'Google', 'Meta'],
    ARRAY['array', 'hash-map'],
    E'## Approach 1: Brute Force

The brute force approach is simple. Loop through each element `x` and find if there is another value that equals to `target - x`.

**Time Complexity:** O(n²)  
**Space Complexity:** O(1)

## Approach 2: Hash Map (Optimal)

We can reduce the lookup time from O(n) to O(1) by trading space for speed. A hash map is built to store values and their indices.

**Algorithm:**
1. Create an empty hash map
2. Iterate through the array
3. For each element, calculate `complement = target - nums[i]`
4. If complement exists in the map, return current index and map[complement]
5. Otherwise, store nums[i] and its index in the map

**Time Complexity:** O(n)  
**Space Complexity:** O(n)'
);

-- Insert more sample questions
INSERT INTO questions (skill_id, title, slug, description, problem_statement, difficulty, type, company_tags, topic_tags) VALUES
(
    (SELECT id FROM skills WHERE slug = 'binary-search'),
    'Binary Search',
    'binary-search',
    'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums.',
    'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.',
    'easy',
    'coding',
    ARRAY['Microsoft', 'Amazon'],
    ARRAY['array', 'binary-search']
),
(
    (SELECT id FROM skills WHERE slug = 'dynamic-programming'),
    'Climbing Stairs',
    'climbing-stairs',
    'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps.',
    'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    'easy',
    'coding',
    ARRAY['Google', 'Meta', 'Apple'],
    ARRAY['dp', 'math']
),
(
    (SELECT id FROM skills WHERE slug = 'two-pointers'),
    '3Sum',
    '3sum',
    'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k.',
    'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.',
    'medium',
    'coding',
    ARRAY['Meta', 'Amazon', 'Apple'],
    ARRAY['array', 'two-pointers', 'sorting']
);

-- ============================================
-- ROW LEVEL SECURITY (Optional - for multi-tenant)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY users_own_data ON users
    FOR ALL
    USING (id = current_setting('app.current_user_id')::UUID OR 
           current_setting('app.current_user_role')::TEXT = 'admin');

CREATE POLICY attempts_own_data ON attempts
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY interview_own_data ON interview_sessions
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY resumes_own_data ON resumes
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);
```

## 3. Database Design Decisions

### 3.1 Why PostgreSQL?

1. **ACID Compliance**: Critical for financial transactions and data integrity
2. **JSONB Support**: Flexible schema for AI-generated content and metadata
3. **Full-Text Search**: Built-in search capabilities for questions
4. **Extensions**: UUID, trigram search, PostGIS (future)
5. **Mature Ecosystem**: Excellent tooling and ORM support

### 3.2 Normalization Strategy

- **3NF for core entities**: Users, Questions, Skills
- **Strategic denormalization**: Analytics tables, leaderboards (read-heavy)
- **JSONB for flexible data**: AI feedback, resume parsing, test cases

### 3.3 Partitioning Strategy

```sql
-- Partition attempts table by month for performance
CREATE TABLE attempts_partitioned (
    LIKE attempts INCLUDING ALL
) PARTITION BY RANGE (submitted_at);

CREATE TABLE attempts_y2024m01 PARTITION OF attempts_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Auto-create partitions with cron job
```

### 3.4 Connection Pooling

```yaml
# PgBouncer configuration
[databases]
interview_prep = host=localhost port=5432 dbname=interview_prep

[pgbouncer]
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 25
reserve_pool_size = 5
```

## 4. Backup Strategy

```bash
# Daily full backup
pg_dump -Fc interview_prep > backup_$(date +%Y%m%d).dump

# Continuous WAL archiving
# Point-in-time recovery capability

# Weekly verification
pg_restore --list backup_$(date +%Y%m%d).dump > /dev/null && echo "Backup valid"
```

---

## Summary

This schema provides:
- **Complete data model** for all features
- **Optimized indexes** for common queries
- **Triggers** for automatic updates
- **Views** for analytics
- **RLS** for security (optional)
- **Partitioning-ready** for scale
