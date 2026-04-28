/*
  Warnings:

  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('SCHOLARSHIP', 'PART_TIME', 'FAMILY', 'MIXED');

-- CreateEnum
CREATE TYPE "FinancialLiteracyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TopicDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "UserChallengeStatus" AS ENUM ('AVAILABLE', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('SAVINGS', 'BUDGET', 'GOAL');

-- CreateEnum
CREATE TYPE "SurveyType" AS ENUM ('PRE', 'POST', 'SUS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BUDGET_ALERT', 'ANOMALY_ALERT', 'PREDICTION_READY', 'CHALLENGE_REMINDER', 'DAILY_REMINDER', 'BADGE_EARNED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'SUGGESTION', 'GENERAL');

-- DropIndex
DROP INDEX "Transaction_categoryId_idx";

-- DropIndex
DROP INDEX "Transaction_occurredAt_idx";

-- DropIndex
DROP INDEX "Transaction_userId_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "transactionType" "TransactionType";

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "type",
ADD COLUMN     "type" "TransactionType" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "averageMonthlyIncome" DECIMAL(12,2),
ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentGiven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PEN',
ADD COLUMN     "financialLiteracyLevel" "FinancialLiteracyLevel",
ADD COLUMN     "incomeType" "IncomeType",
ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "university" TEXT;

-- CreateTable
CREATE TABLE "Budget" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID,
    "amountLimit" DECIMAL(12,2) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationalTopic" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "difficulty" "TopicDifficulty" NOT NULL DEFAULT 'BEGINNER',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationalTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTopicProgress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTopicProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "criteriaJson" JSONB NOT NULL,
    "reward" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "status" "UserChallengeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "badgeId" UUID NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "predictedTotal" DECIMAL(12,2) NOT NULL,
    "predictedByCategory" JSONB,
    "confidenceInterval" JSONB,
    "modelVersion" TEXT,
    "actualTotal" DECIMAL(12,2),
    "accuracy" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "message" TEXT NOT NULL,
    "suggestedAction" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationFeedback" (
    "id" UUID NOT NULL,
    "recommendationId" UUID NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" UUID NOT NULL,
    "type" "SurveyType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "answersJson" JSONB NOT NULL,
    "score" DECIMAL(5,2),
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "FeedbackType" NOT NULL DEFAULT 'GENERAL',
    "message" TEXT NOT NULL,
    "screenName" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Budget_userId_month_year_idx" ON "Budget"("userId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_month_year_key" ON "Budget"("userId", "categoryId", "month", "year");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_type_key" ON "NotificationPreference"("userId", "type");

-- CreateIndex
CREATE INDEX "UserTopicProgress_userId_idx" ON "UserTopicProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTopicProgress_userId_topicId_key" ON "UserTopicProgress"("userId", "topicId");

-- CreateIndex
CREATE INDEX "UserChallenge_userId_status_idx" ON "UserChallenge"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserChallenge_userId_challengeId_key" ON "UserChallenge"("userId", "challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "Prediction_userId_period_idx" ON "Prediction"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_period_type_key" ON "Prediction"("userId", "period", "type");

-- CreateIndex
CREATE INDEX "Recommendation_userId_isActive_idx" ON "Recommendation"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationFeedback_recommendationId_key" ON "RecommendationFeedback"("recommendationId");

-- CreateIndex
CREATE INDEX "SurveyQuestion_surveyId_order_idx" ON "SurveyQuestion"("surveyId", "order");

-- CreateIndex
CREATE INDEX "SurveyResponse_userId_idx" ON "SurveyResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_userId_surveyId_key" ON "SurveyResponse"("userId", "surveyId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_eventType_idx" ON "AnalyticsEvent"("userId", "eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_resource_idx" ON "AuditLog"("action", "resource");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "Feedback_type_idx" ON "Feedback"("type");

-- CreateIndex
CREATE INDEX "Transaction_userId_occurredAt_idx" ON "Transaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_occurredAt_idx" ON "Transaction"("userId", "type", "occurredAt");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicProgress" ADD CONSTRAINT "UserTopicProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicProgress" ADD CONSTRAINT "UserTopicProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "EducationalTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChallenge" ADD CONSTRAINT "UserChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChallenge" ADD CONSTRAINT "UserChallenge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
