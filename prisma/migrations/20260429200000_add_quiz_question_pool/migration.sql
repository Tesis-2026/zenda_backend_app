-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" UUID NOT NULL,
    "topicId" UUID,
    "questionGroupKey" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" "TopicDifficulty" NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizQuestion_topicId_difficulty_language_idx" ON "QuizQuestion"("topicId", "difficulty", "language");

-- CreateIndex
CREATE INDEX "QuizQuestion_questionGroupKey_idx" ON "QuizQuestion"("questionGroupKey");

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "EducationalTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
