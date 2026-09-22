-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('PRE', 'POST');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "ResearchParticipant" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "researchParticipantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialLiteracyAssessment" (
    "id" UUID NOT NULL,
    "researchParticipantId" UUID NOT NULL,
    "assessmentType" "AssessmentType" NOT NULL DEFAULT 'PRE',
    "questionnaireVersion" TEXT NOT NULL DEFAULT 'FINLIT_PRE_V1',
    "status" "AssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalScore" INTEGER,
    "maxScore" INTEGER NOT NULL DEFAULT 12,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT,
    "consentAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialLiteracyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialLiteracyAnswer" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "questionId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialLiteracyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearchParticipant_userId_key" ON "ResearchParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchParticipant_researchParticipantId_key" ON "ResearchParticipant"("researchParticipantId");

-- CreateIndex
CREATE INDEX "ResearchParticipant_researchParticipantId_idx" ON "ResearchParticipant"("researchParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialLiteracyAssessment_researchParticipantId_assessmentType_questionnaireVersion_key" ON "FinancialLiteracyAssessment"("researchParticipantId", "assessmentType", "questionnaireVersion");

-- CreateIndex
CREATE INDEX "FinancialLiteracyAssessment_researchParticipantId_idx" ON "FinancialLiteracyAssessment"("researchParticipantId");

-- CreateIndex
CREATE INDEX "FinancialLiteracyAssessment_status_idx" ON "FinancialLiteracyAssessment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialLiteracyAnswer_assessmentId_questionId_key" ON "FinancialLiteracyAnswer"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "FinancialLiteracyAnswer_assessmentId_idx" ON "FinancialLiteracyAnswer"("assessmentId");

-- CreateIndex
CREATE INDEX "FinancialLiteracyAnswer_questionId_idx" ON "FinancialLiteracyAnswer"("questionId");

-- AddForeignKey
ALTER TABLE "ResearchParticipant" ADD CONSTRAINT "ResearchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLiteracyAssessment" ADD CONSTRAINT "FinancialLiteracyAssessment_researchParticipantId_fkey" FOREIGN KEY ("researchParticipantId") REFERENCES "ResearchParticipant"("researchParticipantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLiteracyAnswer" ADD CONSTRAINT "FinancialLiteracyAnswer_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "FinancialLiteracyAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
