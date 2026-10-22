-- প্রতারক চেক — Supabase (PostgreSQL) টেবিল তৈরির SQL
-- Supabase Dashboard → SQL Editor-এ পুরোটা পেস্ট করে Run করুন।
-- (Prisma schema-র সঙ্গে মিলিয়ে তৈরি; টেবিল আগেই থাকলে নতুন করে তৈরি হবে না।)

CREATE TABLE IF NOT EXISTS "Report" (
  "id" SERIAL PRIMARY KEY,
  "phone" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "scamType" TEXT NOT NULL,
  "amount" INTEGER,
  "incidentDate" TEXT,
  "description" TEXT NOT NULL,
  "trxId" TEXT,
  "evidence" TEXT,
  "reporterPhone" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "Dispute" (
  "id" SERIAL PRIMARY KEY,
  "phone" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "CheckLog" (
  "id" SERIAL PRIMARY KEY,
  "phone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Report_phone_status_idx" ON "Report"("phone", "status");
CREATE INDEX IF NOT EXISTS "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Dispute_phone_status_idx" ON "Dispute"("phone", "status");
CREATE INDEX IF NOT EXISTS "CheckLog_createdAt_idx" ON "CheckLog"("createdAt");
