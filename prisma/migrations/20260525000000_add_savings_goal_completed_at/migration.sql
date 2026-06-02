-- US-045 / ARCH-05: explicit completion timestamp for SavingsGoal.
ALTER TABLE "SavingsGoal" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill: rows whose currentAmount has already reached targetAmount
-- are treated as completed at their last update timestamp, so historical
-- "auto-completed" goals keep their semantics under the new field.
UPDATE "SavingsGoal"
SET "completedAt" = "updatedAt"
WHERE "currentAmount" >= "targetAmount"
  AND "deletedAt" IS NULL
  AND "completedAt" IS NULL;
