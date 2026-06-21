UPDATE "learning_path_items" AS item
SET
  "phase" = COALESCE(
    item."phase",
    CASE
      WHEN item."item_type" = 'REVIEW' THEN 'Review & Retention'
      WHEN item."item_type" = 'MILESTONE' THEN 'Interview Readiness'
      WHEN (SELECT question."difficulty" FROM "questions" AS question WHERE question."id" = item."question_id") = 'easy' THEN 'Foundation'
      WHEN (SELECT question."difficulty" FROM "questions" AS question WHERE question."id" = item."question_id") = 'medium' THEN 'Guided Practice'
      ELSE 'Timed Practice'
    END
  ),
  "selection_reason" = COALESCE(
    item."selection_reason",
    CASE
      WHEN item."item_type" = 'REVIEW' THEN 'Retained from an earlier path and scheduled for reinforcement.'
      WHEN item."item_type" = 'MILESTONE' THEN 'A checkpoint validates whether practice transfers to interview performance.'
      ELSE 'Retained from your existing learning path.'
    END
  ),
  "scheduled_date" = COALESCE(
    item."scheduled_date",
    COALESCE(path."start_date", path."created_at") + ((GREATEST(item."order_index", 1) - 1) * INTERVAL '2 days')
  ),
  "estimated_minutes" = COALESCE(
    item."estimated_minutes",
    CASE
      WHEN item."item_type" = 'REVIEW' THEN 20
      WHEN item."item_type" = 'MILESTONE' THEN 45
      WHEN (SELECT question."difficulty" FROM "questions" AS question WHERE question."id" = item."question_id") = 'easy' THEN 25
      WHEN (SELECT question."difficulty" FROM "questions" AS question WHERE question."id" = item."question_id") = 'medium' THEN 35
      ELSE 45
    END
  )
FROM "learning_paths" AS path
WHERE item."path_id" = path."id"
  AND (
    item."phase" IS NULL
    OR item."selection_reason" IS NULL
    OR item."scheduled_date" IS NULL
    OR item."estimated_minutes" IS NULL
  );

UPDATE "learning_paths" AS path
SET
  "total_items" = counts.total_items,
  "completed_items" = counts.completed_items,
  "progress_percentage" = CASE
    WHEN counts.required_items > 0 THEN ROUND((counts.completed_items::numeric / counts.required_items::numeric) * 100)
    ELSE 0
  END
FROM (
  SELECT
    "path_id",
    COUNT(*)::integer AS total_items,
    COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::integer AS completed_items,
    COUNT(*) FILTER (WHERE "status" <> 'SKIPPED')::integer AS required_items
  FROM "learning_path_items"
  GROUP BY "path_id"
) AS counts
WHERE path."id" = counts."path_id";
