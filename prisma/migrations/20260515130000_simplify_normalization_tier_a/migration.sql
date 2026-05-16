-- ─────────────────────────────────────────────────────────────────
-- Migration: simplify normalization (Tier A)
-- Addresses observación de arquitectura #8 (Esquema de Datos):
-- "Existe posible sobre-normalización para un MVP académico".
--
--   A.1  Inline RecommendationFeedback (1:1 split) into Recommendation.
--   A.2  Merge PasswordResetToken + PasswordResetOtp → AuthChallenge.
--   A.3  Replace NotificationPreference table with notificationPrefs JSON on User.
-- ─────────────────────────────────────────────────────────────────

-- ╔═════════════════════════════════════════════════════════════════╗
-- ║ A.1 — Inline RecommendationFeedback into Recommendation         ║
-- ╚═════════════════════════════════════════════════════════════════╝

ALTER TABLE "Recommendation"
  ADD COLUMN "feedbackAccepted" BOOLEAN,
  ADD COLUMN "feedbackAt"       TIMESTAMP(3);

-- Backfill from the soon-to-be-dropped child table
UPDATE "Recommendation" r
SET "feedbackAccepted" = f."accepted",
    "feedbackAt"       = f."createdAt"
FROM "RecommendationFeedback" f
WHERE f."recommendationId" = r."id";

DROP TABLE "RecommendationFeedback";

-- ╔═════════════════════════════════════════════════════════════════╗
-- ║ A.2 — Merge PasswordResetToken + Otp → AuthChallenge            ║
-- ╚═════════════════════════════════════════════════════════════════╝

-- CreateEnum
CREATE TYPE "AuthChallengeKind" AS ENUM ('RESET_TOKEN', 'OTP');

-- CreateTable
CREATE TABLE "AuthChallenge" (
    "id"        UUID                NOT NULL,
    "userId"    UUID                NOT NULL,
    "kind"      "AuthChallengeKind" NOT NULL,
    "secret"    TEXT                NOT NULL,
    "email"     TEXT,
    "expiresAt" TIMESTAMP(3)        NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthChallenge_kind_secret_key" ON "AuthChallenge"("kind", "secret");
CREATE INDEX        "AuthChallenge_userId_kind_idx" ON "AuthChallenge"("userId", "kind");
CREATE INDEX        "AuthChallenge_email_kind_idx"  ON "AuthChallenge"("email", "kind");

-- AddForeignKey
ALTER TABLE "AuthChallenge" ADD CONSTRAINT "AuthChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from the two old tables
INSERT INTO "AuthChallenge" ("id", "userId", "kind", "secret", "expiresAt", "usedAt", "createdAt")
SELECT "id", "userId", 'RESET_TOKEN'::"AuthChallengeKind", "token", "expiresAt", "usedAt", "createdAt"
FROM "PasswordResetToken";

INSERT INTO "AuthChallenge" ("id", "userId", "kind", "secret", "email", "expiresAt", "usedAt", "createdAt")
SELECT "id", "userId", 'OTP'::"AuthChallengeKind", "code", "email", "expiresAt", "usedAt", "createdAt"
FROM "PasswordResetOtp";

DROP TABLE "PasswordResetToken";
DROP TABLE "PasswordResetOtp";

-- ╔═════════════════════════════════════════════════════════════════╗
-- ║ A.3 — NotificationPreference → notificationPrefs JSON on User    ║
-- ╚═════════════════════════════════════════════════════════════════╝

ALTER TABLE "User" ADD COLUMN "notificationPrefs" JSONB NOT NULL DEFAULT '{}';

-- Aggregate per-user prefs into a single JSON object
UPDATE "User" u
SET "notificationPrefs" = COALESCE((
    SELECT json_object_agg(np."type", np."enabled")::jsonb
    FROM "NotificationPreference" np
    WHERE np."userId" = u."id"
), '{}'::jsonb);

DROP TABLE "NotificationPreference";
