ALTER TABLE "learning_paths"
ADD COLUMN "goal_type" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN "weekly_study_minutes" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN "last_rebalanced_at" TIMESTAMP(3);

ALTER TABLE "learning_path_items"
ADD COLUMN "phase" TEXT,
ADD COLUMN "selection_reason" TEXT,
ADD COLUMN "completion_evidence" JSONB;

CREATE INDEX "learning_path_items_path_id_order_index_idx"
ON "learning_path_items"("path_id", "order_index");

CREATE INDEX "learning_path_items_path_id_status_idx"
ON "learning_path_items"("path_id", "status");
