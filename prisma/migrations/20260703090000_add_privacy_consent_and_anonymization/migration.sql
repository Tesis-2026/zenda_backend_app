-- Privacy/compliance metadata for Ley 29733 evidence.
-- Existing users keep their current consent state; new registrations persist
-- policy/terms version plus request metadata.
ALTER TABLE "User"
ADD COLUMN "privacyPolicyVersion" TEXT,
ADD COLUMN "termsVersion" TEXT,
ADD COLUMN "consentIp" TEXT,
ADD COLUMN "consentUserAgent" TEXT,
ADD COLUMN "dataAnonymizedAt" TIMESTAMP(3),
ADD COLUMN "anonymizationReason" TEXT;
