-- ─────────────────────────────────────────────────────────────────
-- Migration: simplify normalization (Tier B)
-- Addresses observación de arquitectura #8 (continuación).
--
--   B.1  Embed SurveyQuestion[] as JSON in Survey.questionsJson; drop SurveyQuestion.
--        Question UUIDs are preserved so SurveyResponse.answersJson keys remain valid.
--   B.2  Drop UserChallenge.status column + UserChallengeStatus enum; status is
--        derived from (acceptedAt, completedAt) in the domain layer.
-- ─────────────────────────────────────────────────────────────────

-- ╔═════════════════════════════════════════════════════════════════╗
-- ║ B.1 — Embed SurveyQuestion[] into Survey.questionsJson          ║
-- ╚═════════════════════════════════════════════════════════════════╝

ALTER TABLE "Survey" ADD COLUMN "questionsJson" JSONB NOT NULL DEFAULT '[]';

-- Backfill: aggregate questions per survey, preserving each question's UUID as `id`.
UPDATE "Survey" s
SET "questionsJson" = COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
        'id',            sq."id",
        'order',         sq."order",
        'text',          sq."text",
        'options',       sq."options",
        'correctAnswer', sq."correctAnswer"
    ) ORDER BY sq."order")
    FROM "SurveyQuestion" sq
    WHERE sq."surveyId" = s."id"
), '[]'::jsonb);

DROP TABLE "SurveyQuestion";

-- ╔═════════════════════════════════════════════════════════════════╗
-- ║ B.2 — UserChallenge.status derived from timestamps               ║
-- ╚═════════════════════════════════════════════════════════════════╝

-- Drop the old composite index that referenced the status column
DROP INDEX IF EXISTS "UserChallenge_userId_status_idx";

-- Drop the now-redundant status column
ALTER TABLE "UserChallenge" DROP COLUMN "status";

-- Add new indexes that match the derived-state query patterns
CREATE INDEX "UserChallenge_userId_completedAt_idx" ON "UserChallenge"("userId", "completedAt");
CREATE INDEX "UserChallenge_userId_acceptedAt_idx"  ON "UserChallenge"("userId", "acceptedAt");

-- Drop the orphaned enum
DROP TYPE "UserChallengeStatus";
