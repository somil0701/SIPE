ALTER TABLE "interview_sessions"
ADD COLUMN "learning_path_item_id" TEXT;

CREATE UNIQUE INDEX "interview_sessions_learning_path_item_id_key"
ON "interview_sessions"("learning_path_item_id");

ALTER TABLE "interview_sessions"
ADD CONSTRAINT "interview_sessions_learning_path_item_id_fkey"
FOREIGN KEY ("learning_path_item_id") REFERENCES "learning_path_items"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
