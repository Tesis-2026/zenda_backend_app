-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('SYSTEM', 'CUSTOM');

-- DropIndex
DROP INDEX "Category_userId_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "type" "CategoryType" NOT NULL DEFAULT 'CUSTOM',
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Category_type_userId_deletedAt_idx" ON "Category"("type", "userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");
