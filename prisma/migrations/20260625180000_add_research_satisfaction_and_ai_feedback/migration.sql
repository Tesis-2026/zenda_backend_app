-- Add final satisfaction survey type for the thesis pilot.
ALTER TYPE "SurveyType" ADD VALUE 'SATISFACTION';

-- Persist lightweight user evaluation for assistant answers.
ALTER TABLE "AiMessage" ADD COLUMN "feedbackRating" INTEGER;
ALTER TABLE "AiMessage" ADD COLUMN "feedbackHelpful" BOOLEAN;
ALTER TABLE "AiMessage" ADD COLUMN "feedbackClear" BOOLEAN;
ALTER TABLE "AiMessage" ADD COLUMN "feedbackPersonalized" BOOLEAN;
ALTER TABLE "AiMessage" ADD COLUMN "feedbackComment" TEXT;
ALTER TABLE "AiMessage" ADD COLUMN "feedbackAt" TIMESTAMP(3);

CREATE INDEX "AiMessage_feedbackAt_idx" ON "AiMessage"("feedbackAt");
