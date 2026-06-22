-- Dedicated objective DSA assessment domain. Existing interview rows and their
-- legacy learning_path_item_id values are intentionally preserved.
CREATE TYPE "AssessmentStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'needs_practice', 'abandoned');
CREATE TYPE "AssessmentQuestionStatus" AS ENUM ('PENDING', 'in_progress', 'SUBMITTED', 'SKIPPED', 'UNANSWERED');

ALTER TABLE "interview_sessions"
  DROP CONSTRAINT IF EXISTS "interview_sessions_learning_path_item_id_fkey";

CREATE TABLE "assessment_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "learning_path_item_id" TEXT,
  "target_skill_id" TEXT,
  "target_company_id" TEXT,
  "question_count" INTEGER NOT NULL DEFAULT 3,
  "duration_minutes" INTEGER NOT NULL DEFAULT 60,
  "passing_threshold" INTEGER NOT NULL DEFAULT 70,
  "status" "AssessmentStatus" NOT NULL DEFAULT 'scheduled',
  "started_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "overall_score" INTEGER,
  "result" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_questions" (
  "id" TEXT NOT NULL,
  "assessment_session_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL,
  "status" "AssessmentQuestionStatus" NOT NULL DEFAULT 'PENDING',
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "submitted_code" TEXT,
  "language" TEXT,
  "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
  "test_cases_passed" INTEGER NOT NULL DEFAULT 0,
  "test_cases_total" INTEGER NOT NULL DEFAULT 0,
  "verdict" "AttemptStatus",
  "correctness_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "time_efficiency_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "weighted_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "attempts"
  ADD COLUMN "assessment_session_id" TEXT,
  ADD COLUMN "assessment_question_id" TEXT,
  ADD COLUMN "submission_key" TEXT;

CREATE INDEX "assessment_sessions_user_id_status_idx" ON "assessment_sessions"("user_id", "status");
CREATE INDEX "assessment_sessions_learning_path_item_id_status_idx" ON "assessment_sessions"("learning_path_item_id", "status");
CREATE INDEX "assessment_questions_assessment_session_id_status_idx" ON "assessment_questions"("assessment_session_id", "status");
CREATE UNIQUE INDEX "assessment_questions_assessment_session_id_question_id_key" ON "assessment_questions"("assessment_session_id", "question_id");
CREATE UNIQUE INDEX "assessment_questions_assessment_session_id_order_index_key" ON "assessment_questions"("assessment_session_id", "order_index");
CREATE INDEX "attempts_assessment_session_id_idx" ON "attempts"("assessment_session_id");
CREATE INDEX "attempts_assessment_question_id_idx" ON "attempts"("assessment_question_id");
CREATE UNIQUE INDEX "attempts_assessment_question_id_submission_key_key" ON "attempts"("assessment_question_id", "submission_key");

ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_learning_path_item_id_fkey" FOREIGN KEY ("learning_path_item_id") REFERENCES "learning_path_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_target_skill_id_fkey" FOREIGN KEY ("target_skill_id") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_target_company_id_fkey" FOREIGN KEY ("target_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_session_id_fkey" FOREIGN KEY ("assessment_session_id") REFERENCES "assessment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assessment_session_id_fkey" FOREIGN KEY ("assessment_session_id") REFERENCES "assessment_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assessment_question_id_fkey" FOREIGN KEY ("assessment_question_id") REFERENCES "assessment_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rewrite only unfinished checkpoint copy. Completed evidence and historical
-- interview rows remain untouched.
UPDATE "learning_path_items"
SET
  "title" = 'DSA assessment checkpoint',
  "description" = 'Complete a timed DSA assessment using objective judge results.',
  "phase" = 'DSA Readiness',
  "selection_reason" = 'A timed checkpoint validates whether practice is transferring to independent DSA performance.',
  "estimated_minutes" = 60
WHERE "item_type" = 'MILESTONE'
  AND "status" IN ('PENDING', 'in_progress')
  AND (
    LOWER(COALESCE("title", '')) LIKE '%mock interview%'
    OR LOWER(COALESCE("description", '')) LIKE '%mock interview%'
  );
