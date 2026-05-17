-- CreateTable
CREATE TABLE "UserFinancialProgress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "budgetComplianceScore" DECIMAL(5,2),
    "savingsRatePct" DECIMAL(5,2),
    "overspendCategoriesCount" INTEGER NOT NULL DEFAULT 0,
    "recommendationsShown" INTEGER NOT NULL DEFAULT 0,
    "recommendationsAccepted" INTEGER NOT NULL DEFAULT 0,
    "quizzesCompleted" INTEGER NOT NULL DEFAULT 0,
    "avgQuizScore" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFinancialProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFinancialProgress_userId_period_key" ON "UserFinancialProgress"("userId", "period");

-- CreateIndex
CREATE INDEX "UserFinancialProgress_userId_period_idx" ON "UserFinancialProgress"("userId", "period");

-- AddForeignKey
ALTER TABLE "UserFinancialProgress" ADD CONSTRAINT "UserFinancialProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
