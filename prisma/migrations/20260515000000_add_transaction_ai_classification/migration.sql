-- CreateEnum
CREATE TYPE "CategorySource" AS ENUM ('AI', 'AI_OVERRIDDEN', 'USER');

-- AlterTable
ALTER TABLE "Transaction"
    ADD COLUMN "suggestedCategoryId" UUID,
    ADD COLUMN "aiConfidence"        DECIMAL(3, 2),
    ADD COLUMN "categorySource"      "CategorySource" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "Transaction_userId_categorySource_idx" ON "Transaction"("userId", "categorySource");

-- AddForeignKey
ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_suggestedCategoryId_fkey"
    FOREIGN KEY ("suggestedCategoryId") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
