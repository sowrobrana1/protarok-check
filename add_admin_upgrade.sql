-- প্রতারক চেক — অ্যাডমিন আপগ্রেড SQL
-- Supabase Dashboard → SQL Editor-এ পুরোটা পেস্ট করে Run করুন।
-- নতুন: AdminLog (প্রতিটি অ্যাডমিন কাজের স্থায়ী প্রমাণ/ইতিহাস) + VisitLog (দৈনিক ভিজিট গণনা)।
-- Report.status-এ নতুন মান: hidden (অফ/লুকানো — ডিলিট নয়, প্রমাণ থেকে যায়), withdrawn (প্রত্যাহার)।
-- টেবিল আগেই থাকলে নতুন করে তৈরি হবে না, ডেটা নষ্ট হবে না।

CREATE TABLE IF NOT EXISTS "AdminLog" (
  "id" SERIAL PRIMARY KEY,
  "reportId" INTEGER,
  "phone" TEXT,
  "action" TEXT NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AdminLog_reportId_idx" ON "AdminLog"("reportId");
CREATE INDEX IF NOT EXISTS "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");

CREATE TABLE IF NOT EXISTS "VisitLog" (
  "id" SERIAL PRIMARY KEY,
  "path" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "VisitLog_createdAt_idx" ON "VisitLog"("createdAt");
