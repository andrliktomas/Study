-- Demo režim: e-maily uložené místo odeslání
CREATE TABLE "DemoMail" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoMail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DemoMail_createdAt_idx" ON "DemoMail"("createdAt");
