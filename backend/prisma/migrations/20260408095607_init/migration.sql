-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'premium', 'admin', 'interviewer');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('data-structures', 'algorithms', 'system-design', 'behavioral', 'language-specific', 'framework');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard', 'expert');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('CODING', 'system-design', 'BEHAVIORAL', 'THEORETICAL', 'QUIZ');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('pending', 'running', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compilation_error', 'partially_accepted');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('technical', 'behavioral', 'mixed', 'system-design');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'abandoned');

-- CreateEnum
CREATE TYPE "PathStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PathItemType" AS ENUM ('QUESTION', 'LESSON', 'REVIEW', 'MILESTONE');

-- CreateEnum
CREATE TYPE "PathItemStatus" AS ENUM ('PENDING', 'in_progress', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SpacedRepetitionStatus" AS ENUM ('ACTIVE', 'MASTERED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "premium_expires_at" TIMESTAMP(3),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "preferred_language" TEXT NOT NULL DEFAULT 'javascript',
    "study_goal_minutes" INTEGER NOT NULL DEFAULT 60,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "SkillCategory" NOT NULL,
    "difficulty_level" INTEGER,
    "parent_id" TEXT,
    "icon_url" TEXT,
    "color_code" TEXT,
    "estimated_hours" INTEGER,
    "prerequisites" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "proficiency_level" INTEGER NOT NULL DEFAULT 0,
    "xp_points" INTEGER NOT NULL DEFAULT 0,
    "questions_attempted" INTEGER NOT NULL DEFAULT 0,
    "questions_solved" INTEGER NOT NULL DEFAULT 0,
    "accuracy_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_time_per_question" INTEGER NOT NULL DEFAULT 0,
    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "last_practiced_at" TIMESTAMP(3),
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "problem_statement" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "type" "QuestionType" NOT NULL,
    "starter_code" JSONB,
    "solution_code" JSONB,
    "optimal_time_complexity" TEXT,
    "optimal_space_complexity" TEXT,
    "hints" TEXT[],
    "test_cases" JSONB NOT NULL,
    "constraints" TEXT[],
    "follow_up_questions" TEXT[],
    "company_tags" TEXT[],
    "topic_tags" TEXT[],
    "leetcode_id" TEXT,
    "hackerrank_id" TEXT,
    "acceptance_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "total_solves" INTEGER NOT NULL DEFAULT 0,
    "avg_time_spent" INTEGER NOT NULL DEFAULT 0,
    "base_difficulty_score" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "adaptive_weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "explanation" TEXT,
    "video_solution_url" TEXT,
    "article_url" TEXT,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_tags" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "question_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "website" TEXT,
    "difficulty_rating" DOUBLE PRECISION,
    "interview_process" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_companies" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "last_asked_at" TIMESTAMP(3),

    CONSTRAINT "question_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "code" TEXT,
    "language" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'pending',
    "time_spent" INTEGER NOT NULL,
    "execution_time" INTEGER,
    "memory_used" INTEGER,
    "test_cases_passed" INTEGER NOT NULL DEFAULT 0,
    "test_cases_total" INTEGER NOT NULL DEFAULT 0,
    "ai_score" INTEGER,
    "ai_feedback" JSONB,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_practice" BOOLEAN NOT NULL DEFAULT true,
    "interview_session_id" TEXT,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "previous_attempt_id" TEXT,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_test_cases" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "test_case_index" INTEGER NOT NULL,
    "input" TEXT NOT NULL,
    "expected_output" TEXT NOT NULL,
    "actual_output" TEXT,
    "passed" BOOLEAN NOT NULL,
    "execution_time" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempt_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_feedback" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "overall_score" INTEGER,
    "summary" TEXT,
    "code_quality_score" INTEGER,
    "code_quality_feedback" TEXT,
    "readability_score" INTEGER,
    "best_practices_followed" BOOLEAN,
    "time_complexity_actual" TEXT,
    "time_complexity_correct" BOOLEAN,
    "space_complexity_actual" TEXT,
    "space_complexity_correct" BOOLEAN,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "improvement_suggestions" TEXT[],
    "recommended_resources" JSONB,
    "related_questions" TEXT[],
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model_version" TEXT,

    CONSTRAINT "attempt_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "interview_type" "InterviewType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'medium',
    "target_company_id" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "status" "InterviewStatus" NOT NULL DEFAULT 'scheduled',
    "overall_score" INTEGER,
    "technical_score" INTEGER,
    "communication_score" INTEGER,
    "problem_solving_score" INTEGER,
    "ai_interviewer_config" JSONB,
    "transcript" TEXT,
    "summary_feedback" TEXT,
    "strengths" TEXT[],
    "areas_to_improve" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" TEXT NOT NULL,
    "interview_session_id" TEXT NOT NULL,
    "question_id" TEXT,
    "question_text" TEXT NOT NULL,
    "question_type" TEXT,
    "expected_topics" TEXT[],
    "user_answer" TEXT,
    "answer_submitted_at" TIMESTAMP(3),
    "ai_evaluation" TEXT,
    "score" INTEGER,
    "follow_up_needed" BOOLEAN NOT NULL DEFAULT false,
    "question_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "parsed_text" TEXT,
    "parsed_data" JSONB,
    "skills_detected" JSONB,
    "experience_years" DOUBLE PRECISION,
    "education" JSONB,
    "projects" JSONB,
    "parsing_status" TEXT NOT NULL DEFAULT 'PENDING',
    "parsing_error" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsed_at" TIMESTAMP(3),

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_skills" (
    "id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "skill_id" TEXT,
    "skill_name" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION,
    "years_experience" DOUBLE PRECISION,
    "context" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target_skill_id" TEXT,
    "target_company_id" TEXT,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "completed_items" INTEGER NOT NULL DEFAULT 0,
    "progress_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimated_hours" INTEGER,
    "start_date" TIMESTAMP(3),
    "target_completion_date" TIMESTAMP(3),
    "actual_completion_date" TIMESTAMP(3),
    "status" "PathStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_items" (
    "id" TEXT NOT NULL,
    "path_id" TEXT NOT NULL,
    "question_id" TEXT,
    "skill_id" TEXT,
    "item_type" "PathItemType" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "order_index" INTEGER NOT NULL,
    "scheduled_date" TIMESTAMP(3),
    "estimated_minutes" INTEGER,
    "status" "PathItemStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "attempt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_path_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaced_repetition" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.50,
    "next_review_date" TIMESTAMP(3) NOT NULL,
    "last_reviewed_at" TIMESTAMP(3),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "successful_reviews" INTEGER NOT NULL DEFAULT 0,
    "failed_reviews" INTEGER NOT NULL DEFAULT 0,
    "status" "SpacedRepetitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spaced_repetition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaced_repetition_reviews" (
    "id" TEXT NOT NULL,
    "sr_id" TEXT NOT NULL,
    "attempt_id" TEXT,
    "quality_rating" INTEGER NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_interval" INTEGER NOT NULL,
    "new_interval" INTEGER NOT NULL,
    "previous_ef" DOUBLE PRECISION NOT NULL,
    "new_ef" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "spaced_repetition_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_daily" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "session_count" INTEGER NOT NULL DEFAULT 0,
    "total_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "questions_attempted" INTEGER NOT NULL DEFAULT 0,
    "questions_solved" INTEGER NOT NULL DEFAULT 0,
    "accuracy_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_time_per_question" INTEGER NOT NULL DEFAULT 0,
    "skill_breakdown" JSONB,
    "easy_attempted" INTEGER NOT NULL DEFAULT 0,
    "easy_solved" INTEGER NOT NULL DEFAULT 0,
    "medium_attempted" INTEGER NOT NULL DEFAULT 0,
    "medium_solved" INTEGER NOT NULL DEFAULT 0,
    "hard_attempted" INTEGER NOT NULL DEFAULT 0,
    "hard_solved" INTEGER NOT NULL DEFAULT 0,
    "streak_day" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_type" "PlanType" NOT NULL,
    "billing_cycle" "BillingCycle",
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "payment_provider" TEXT,
    "payment_provider_subscription_id" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL,
    "payment_provider" TEXT,
    "payment_provider_charge_id" TEXT,
    "invoice_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_premium_idx" ON "users"("is_premium");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE INDEX "skills_slug_idx" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "user_skills_user_id_idx" ON "user_skills"("user_id");

-- CreateIndex
CREATE INDEX "user_skills_skill_id_idx" ON "user_skills"("skill_id");

-- CreateIndex
CREATE INDEX "user_skills_proficiency_level_idx" ON "user_skills"("proficiency_level");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_user_id_skill_id_key" ON "user_skills"("user_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "questions_slug_key" ON "questions"("slug");

-- CreateIndex
CREATE INDEX "questions_skill_id_idx" ON "questions"("skill_id");

-- CreateIndex
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");

-- CreateIndex
CREATE INDEX "questions_type_idx" ON "questions"("type");

-- CreateIndex
CREATE INDEX "questions_company_tags_idx" ON "questions"("company_tags");

-- CreateIndex
CREATE INDEX "questions_topic_tags_idx" ON "questions"("topic_tags");

-- CreateIndex
CREATE INDEX "questions_base_difficulty_score_idx" ON "questions"("base_difficulty_score");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "question_tags_question_id_tag_id_key" ON "question_tags"("question_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "question_companies_question_id_company_id_key" ON "question_companies"("question_id", "company_id");

-- CreateIndex
CREATE INDEX "attempts_user_id_idx" ON "attempts"("user_id");

-- CreateIndex
CREATE INDEX "attempts_question_id_idx" ON "attempts"("question_id");

-- CreateIndex
CREATE INDEX "attempts_status_idx" ON "attempts"("status");

-- CreateIndex
CREATE INDEX "attempts_submitted_at_idx" ON "attempts"("submitted_at");

-- CreateIndex
CREATE INDEX "attempts_user_id_question_id_idx" ON "attempts"("user_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_feedback_attempt_id_key" ON "attempt_feedback"("attempt_id");

-- CreateIndex
CREATE INDEX "interview_sessions_user_id_idx" ON "interview_sessions"("user_id");

-- CreateIndex
CREATE INDEX "interview_sessions_status_idx" ON "interview_sessions"("status");

-- CreateIndex
CREATE INDEX "interview_sessions_scheduled_at_idx" ON "interview_sessions"("scheduled_at");

-- CreateIndex
CREATE INDEX "resumes_user_id_idx" ON "resumes"("user_id");

-- CreateIndex
CREATE INDEX "learning_paths_user_id_idx" ON "learning_paths"("user_id");

-- CreateIndex
CREATE INDEX "learning_paths_status_idx" ON "learning_paths"("status");

-- CreateIndex
CREATE INDEX "spaced_repetition_user_id_idx" ON "spaced_repetition"("user_id");

-- CreateIndex
CREATE INDEX "spaced_repetition_next_review_date_idx" ON "spaced_repetition"("next_review_date");

-- CreateIndex
CREATE INDEX "spaced_repetition_user_id_next_review_date_idx" ON "spaced_repetition"("user_id", "next_review_date");

-- CreateIndex
CREATE UNIQUE INDEX "spaced_repetition_user_id_question_id_key" ON "spaced_repetition"("user_id", "question_id");

-- CreateIndex
CREATE INDEX "analytics_daily_user_id_date_idx" ON "analytics_daily"("user_id", "date");

-- CreateIndex
CREATE INDEX "analytics_daily_date_idx" ON "analytics_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_daily_user_id_date_key" ON "analytics_daily"("user_id", "date");

-- CreateIndex
CREATE INDEX "user_activities_user_id_idx" ON "user_activities"("user_id");

-- CreateIndex
CREATE INDEX "user_activities_activity_type_idx" ON "user_activities"("activity_type");

-- CreateIndex
CREATE INDEX "user_activities_created_at_idx" ON "user_activities"("created_at");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_companies" ADD CONSTRAINT "question_companies_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_companies" ADD CONSTRAINT "question_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_test_cases" ADD CONSTRAINT "attempt_test_cases_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_feedback" ADD CONSTRAINT "attempt_feedback_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_feedback" ADD CONSTRAINT "attempt_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_target_company_id_fkey" FOREIGN KEY ("target_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_skills" ADD CONSTRAINT "resume_skills_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_target_skill_id_fkey" FOREIGN KEY ("target_skill_id") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_target_company_id_fkey" FOREIGN KEY ("target_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_items" ADD CONSTRAINT "learning_path_items_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_items" ADD CONSTRAINT "learning_path_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_items" ADD CONSTRAINT "learning_path_items_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaced_repetition" ADD CONSTRAINT "spaced_repetition_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaced_repetition" ADD CONSTRAINT "spaced_repetition_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaced_repetition_reviews" ADD CONSTRAINT "spaced_repetition_reviews_sr_id_fkey" FOREIGN KEY ("sr_id") REFERENCES "spaced_repetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaced_repetition_reviews" ADD CONSTRAINT "spaced_repetition_reviews_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_daily" ADD CONSTRAINT "analytics_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
