-- প্রতারক চেক — "আমার সাথেও হয়েছে" ফিচারের টেবিল (2026-10-23)
-- Supabase Dashboard → SQL Editor-এ পুরোটা পেস্ট করে Run করুন।
-- টেবিল আগেই থাকলে কিছু হবে না (IF NOT EXISTS)।

CREATE TABLE IF NOT EXISTS "MeToo" (
  "id" SERIAL PRIMARY KEY,
  "phone" TEXT NOT NULL,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "MeToo_phone_createdAt_idx" ON "MeToo"("phone", "createdAt");
