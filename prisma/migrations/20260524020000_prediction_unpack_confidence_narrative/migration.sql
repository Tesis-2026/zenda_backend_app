-- B17 — unpack `confidenceLevel` and `narrative` from the previously-overloaded
-- `modelVersion` string (ARCH-04). New writes will populate these columns
-- directly; legacy reads still parse the packed string for backward compat.

-- AlterTable: add the two new columns (nullable so existing rows stay valid).
ALTER TABLE "Prediction" ADD COLUMN "confidenceLevel" TEXT;
ALTER TABLE "Prediction" ADD COLUMN "narrative" TEXT;

-- Backfill: extract values from the legacy `modelVersion` format
--   "<version>|confidence:<level>|narrative:<text>"
-- so existing rows have data in the new columns. After backfill, trim
-- `modelVersion` back to just the version segment.
UPDATE "Prediction"
SET
  "confidenceLevel" = CASE
    WHEN "modelVersion" LIKE '%|confidence:%'
      THEN SPLIT_PART(SPLIT_PART("modelVersion", '|confidence:', 2), '|', 1)
    ELSE NULL
  END,
  "narrative" = CASE
    WHEN "modelVersion" LIKE '%|narrative:%'
      THEN SPLIT_PART("modelVersion", '|narrative:', 2)
    ELSE NULL
  END,
  "modelVersion" = SPLIT_PART("modelVersion", '|', 1)
WHERE "modelVersion" IS NOT NULL AND "modelVersion" LIKE '%|%';
