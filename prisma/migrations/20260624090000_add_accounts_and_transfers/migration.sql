-- Accounts MVP: cash, bank, digital wallet and credit card.
-- Transfers are modeled as first-class transactions with source/destination accounts.

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER';

CREATE TYPE "AccountType" AS ENUM (
  'CASH',
  'BANK_ACCOUNT',
  'DIGITAL_WALLET',
  'CREDIT_CARD'
);

CREATE TABLE "Account" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "type" "AccountType" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PEN',
  "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "creditLimit" DECIMAL(12,2),
  "institution" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Account"
  ADD CONSTRAINT "Account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction"
  ADD COLUMN "accountId" UUID,
  ADD COLUMN "toAccountId" UUID;

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_toAccountId_fkey"
  FOREIGN KEY ("toAccountId") REFERENCES "Account"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Account_userId_type_deletedAt_idx" ON "Account"("userId", "type", "deletedAt");
CREATE INDEX "Account_userId_isDefault_idx" ON "Account"("userId", "isDefault");
CREATE INDEX "Transaction_userId_accountId_occurredAt_idx" ON "Transaction"("userId", "accountId", "occurredAt");
CREATE INDEX "Transaction_userId_toAccountId_occurredAt_idx" ON "Transaction"("userId", "toAccountId", "occurredAt");

INSERT INTO "Account" ("userId", "name", "type", "currency", "isDefault")
SELECT u."id", 'Efectivo', 'CASH'::"AccountType", COALESCE(u."currency", 'PEN'), true
FROM "User" u
WHERE u."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Account" a
    WHERE a."userId" = u."id" AND a."type" = 'CASH'::"AccountType" AND a."deletedAt" IS NULL
  );

INSERT INTO "Account" ("userId", "name", "type", "currency", "isDefault")
SELECT u."id", 'Yape / Plin', 'DIGITAL_WALLET'::"AccountType", COALESCE(u."currency", 'PEN'), false
FROM "User" u
WHERE u."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Account" a
    WHERE a."userId" = u."id" AND a."type" = 'DIGITAL_WALLET'::"AccountType" AND a."deletedAt" IS NULL
  );

INSERT INTO "Account" ("userId", "name", "type", "currency", "isDefault")
SELECT u."id", 'Cuenta bancaria', 'BANK_ACCOUNT'::"AccountType", COALESCE(u."currency", 'PEN'), false
FROM "User" u
WHERE u."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Account" a
    WHERE a."userId" = u."id" AND a."type" = 'BANK_ACCOUNT'::"AccountType" AND a."deletedAt" IS NULL
  );

INSERT INTO "Account" ("userId", "name", "type", "currency", "isDefault")
SELECT u."id", 'Tarjeta de credito', 'CREDIT_CARD'::"AccountType", COALESCE(u."currency", 'PEN'), false
FROM "User" u
WHERE u."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Account" a
    WHERE a."userId" = u."id" AND a."type" = 'CREDIT_CARD'::"AccountType" AND a."deletedAt" IS NULL
  );
