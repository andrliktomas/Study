-- Platby jen převodem: bankovní účty lektorů po měnách, předplatné na fakturu (bez Stripe).

-- CreateTable
CREATE TABLE "TutorBankAccount" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "iban" TEXT,
    "accountNumber" TEXT,
    "bic" TEXT,
    "bankName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "tutorId" TEXT,
    "kind" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "previousPlan" TEXT,
    "currency" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "vatRate" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "paidAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "supplier" TEXT NOT NULL,
    "customer" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("year")
);

CREATE UNIQUE INDEX "TutorBankAccount_tutorId_currency_key" ON "TutorBankAccount"("tutorId", "currency");
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_tutorId_status_idx" ON "Invoice"("tutorId", "status");
ALTER TABLE "TutorBankAccount" ADD CONSTRAINT "TutorBankAccount_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Nová pole předplatného
ALTER TABLE "TutorProfile"
ADD COLUMN "billingCurrency" TEXT NOT NULL DEFAULT 'czk',
ADD COLUMN "nextPlan" TEXT,
ADD COLUMN "paidUntil" TIMESTAMP(3),
ADD COLUMN "planActiveUntil" TIMESTAMP(3);

-- Převod dat: běžící předplatné ze Stripe → zaplaceno do konce období, zrušené ke konci období → nextPlan = FREE
UPDATE "TutorProfile"
SET "paidUntil" = "currentPeriodEnd",
    "planActiveUntil" = "currentPeriodEnd",
    "nextPlan" = CASE WHEN "cancelAtPeriodEnd" THEN 'FREE' ELSE NULL END
WHERE "plan" <> 'FREE' AND "subscriptionStatus" IN ('active', 'trialing', 'past_due') AND "currentPeriodEnd" IS NOT NULL;
UPDATE "TutorProfile" SET "plan" = 'FREE' WHERE "plan" <> 'FREE' AND "planActiveUntil" IS NULL;

-- Převod dat: účet pro QR platby → bankovní účet lektora v CZK
INSERT INTO "TutorBankAccount" ("id", "tutorId", "currency", "holderName", "iban", "createdAt", "updatedAt")
SELECT 'mig_' || t."id", t."id", 'czk', COALESCE(t."legalName", u."name", u."email"), t."bankIban", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "TutorProfile" t JOIN "User" u ON u."id" = t."userId"
WHERE t."bankIban" IS NOT NULL;

-- Simulované platby z vývoje evidujeme jako ruční připsání
UPDATE "Purchase" SET "source" = 'MANUAL' WHERE "source" = 'DEV';

-- Odstranění Stripe
DROP INDEX "Purchase_stripeSessionId_key";
DROP INDEX "TutorProfile_stripeCustomerId_key";
DROP INDEX "TutorProfile_stripeSubscriptionId_key";
ALTER TABLE "Purchase" DROP COLUMN "stripePaymentIntentId",
DROP COLUMN "stripeSessionId",
ALTER COLUMN "source" SET DEFAULT 'TRANSFER';
ALTER TABLE "TutorProfile" DROP COLUMN "bankIban",
DROP COLUMN "cancelAtPeriodEnd",
DROP COLUMN "currentPeriodEnd",
DROP COLUMN "stripeAccountId",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeOnboarded",
DROP COLUMN "stripeSubscriptionId",
DROP COLUMN "subscriptionStatus";
