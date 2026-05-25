-- ─────────────────────────────────────────────────────────────────
-- Migration: audit + quiz attempts + recommendation history
-- Addresses observaciones de arquitectura #3, #4, #10.
--   #3  Enrich AuditLog with actor context, request correlation, before/after state.
--   #4  Add QuizAttempt (per-attempt history) + score/attemptsCount on UserTopicProgress.
--   #10 Enrich Recommendation with model traceability and lifecycle history.
-- ─────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- ─────────────────────────────────────────────────────────────────
-- AuditLog enrichment (#3)
-- ─────────────────────────────────────────────────────────────────

-- AlterTable
ALTER TABLE "AuditLog"
  ADD COLUMN "resourceId" UUID,
  ADD COLUMN "status"     "AuditStatus" NOT NULL DEFAULT 'SUCCESS',
  ADD COLUMN "requestId"  TEXT,
  ADD COLUMN "httpMethod" TEXT,
  ADD COLUMN "httpPath"   TEXT,
  ADD COLUMN "userAgent"  TEXT,
  ADD COLUMN "beforeJson" JSONB,
  ADD COLUMN "afterJson"  JSONB;

-- Replace (userId) index with composite (userId, createdAt)
DROP INDEX IF EXISTS "AuditLog_userId_idx";
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- New supporting indexes
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");
CREATE INDEX "AuditLog_requestId_idx"           ON "AuditLog"("requestId");

-- ─────────────────────────────────────────────────────────────────
-- UserTopicProgress enrichment (#4)
-- ─────────────────────────────────────────────────────────────────

-- AlterTable
ALTER TABLE "UserTopicProgress"
  ADD COLUMN "score"         DECIMAL(5,2),
  ADD COLUMN "attemptsCount" INTEGER NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────
-- QuizAttempt — per-attempt history (#4)
-- ─────────────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id"             UUID NOT NULL,
    "userId"         UUID NOT NULL,
    "questionId"     UUID NOT NULL,
    "topicId"        UUID,
    "selectedAnswer" TEXT NOT NULL,
    "isCorrect"      BOOLEAN NOT NULL,
    "attemptedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_topicId_attemptedAt_idx" ON "QuizAttempt"("userId", "topicId", "attemptedAt");
CREATE INDEX "QuizAttempt_userId_attemptedAt_idx"         ON "QuizAttempt"("userId", "attemptedAt");
CREATE INDEX "QuizAttempt_questionId_idx"                 ON "QuizAttempt"("questionId");

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey"
  FOREIGN KEY ("userId")     REFERENCES "User"("id")             ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id")     ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_topicId_fkey"
  FOREIGN KEY ("topicId")    REFERENCES "EducationalTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- Recommendation history & traceability (#10)
-- ─────────────────────────────────────────────────────────────────

-- AlterTable
ALTER TABLE "Recommendation"
  ADD COLUMN "modelVersion"     TEXT,
  ADD COLUMN "source"           TEXT,
  ADD COLUMN "inputContextJson" JSONB,
  ADD COLUMN "viewedAt"         TIMESTAMP(3),
  ADD COLUMN "dismissedAt"      TIMESTAMP(3),
  ADD COLUMN "expiresAt"        TIMESTAMP(3);

-- New supporting indexes
CREATE INDEX "Recommendation_userId_createdAt_idx"   ON "Recommendation"("userId", "createdAt");
CREATE INDEX "Recommendation_userId_dismissedAt_idx" ON "Recommendation"("userId", "dismissedAt");
