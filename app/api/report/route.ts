import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePhone, CHANNELS, SCAM_TYPES } from "@/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/report — submit a fraud report. Lands in the moderation queue
// (status "pending"); nothing becomes public before evidence review.
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "তথ্য পাঠানো যায়নি। আবার চেষ্টা করুন।" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone || "");
  if (!phone) return NextResponse.json({ ok: false, error: "প্রতারকের সঠিক ১১ ডিজিটের নম্বর দিন।" }, { status: 400 });

  const reporterPhone = normalizePhone(body.reporterPhone || "");
  if (!reporterPhone) return NextResponse.json({ ok: false, error: "আপনার নিজের সঠিক নম্বর দিন (এটি কখনো প্রকাশ করা হবে না)।" }, { status: 400 });
  if (reporterPhone === phone) return NextResponse.json({ ok: false, error: "নিজের নম্বরের বিরুদ্ধে রিপোর্ট করা যাবে না।" }, { status: 400 });

  if (!CHANNELS[body.channel]) return NextResponse.json({ ok: false, error: "লেনদেনের মাধ্যম নির্বাচন করুন।" }, { status: 400 });
  if (!SCAM_TYPES[body.scamType]) return NextResponse.json({ ok: false, error: "প্রতারণার ধরন নির্বাচন করুন।" }, { status: 400 });

  const description = String(body.description || "").trim();
  if (description.length < 20) return NextResponse.json({ ok: false, error: "কী ঘটেছিল তা অন্তত কয়েক লাইনে লিখুন (কমপক্ষে ২০ অক্ষর)।" }, { status: 400 });
  if (description.length > 2000) return NextResponse.json({ ok: false, error: "বিবরণ খুব বড় হয়ে গেছে।" }, { status: 400 });

  const trxId = String(body.trxId || "").trim();
  const evidence = typeof body.evidence === "string" ? body.evidence : null;
  if (evidence && (!evidence.startsWith("data:image/") || evidence.length > 2_000_000)) {
    return NextResponse.json({ ok: false, error: "প্রমাণের ছবিটি খুব বড় বা সঠিক ফরম্যাটে নেই।" }, { status: 400 });
  }
  if (!trxId && !evidence) {
    return NextResponse.json({ ok: false, error: "প্রমাণ ছাড়া রিপোর্ট প্রকাশ করা হয় না — লেনদেনের TrxID অথবা স্ক্রিনশট দিন।" }, { status: 400 });
  }

  let amount: number | null = null;
  if (body.amount !== undefined && body.amount !== "" && body.amount !== null) {
    amount = parseInt(String(body.amount), 10);
    if (Number.isNaN(amount) || amount < 0 || amount > 100_000_000) amount = null;
  }
  const incidentDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.incidentDate || "")) ? String(body.incidentDate) : null;

  await prisma.report.create({
    data: {
      phone, channel: body.channel, scamType: body.scamType, amount,
      incidentDate, description, trxId: trxId || null,
      evidence, reporterPhone, status: "pending",
    },
  });

  return NextResponse.json({
    ok: true,
    message: "আপনার রিপোর্ট জমা হয়েছে। প্রমাণ যাচাই করে তারপরই এটি প্রকাশ করা হবে। ধন্যবাদ — আপনার সতর্কতায় অন্যরা বাঁচবে।",
  });
}
