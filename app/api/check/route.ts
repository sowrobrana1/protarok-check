import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePhone, maskPhone, riskLevel, RISK_LABEL, CHANNELS, SCAM_TYPES } from "@/lib/phone";

export const dynamic = "force-dynamic";

// GET /api/check?phone=01XXXXXXXXX
// Public, no login. Returns risk level + approved report summaries.
// Never returns reporterPhone, trxId or evidence.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("phone") || "";
  const phone = normalizePhone(raw);
  if (!phone) {
    return NextResponse.json(
      { ok: false, error: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01 দিয়ে শুরু)।" },
      { status: 400 }
    );
  }

  const [reports, openDispute] = await Promise.all([
    prisma.report.findMany({
      where: { phone, status: "approved" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        channel: true, scamType: true, amount: true,
        incidentDate: true, description: true, createdAt: true,
      },
    }),
    prisma.dispute.findFirst({ where: { phone, status: "open" } }),
  ]);

  // Fire-and-forget usage counter (never blocks the answer).
  prisma.checkLog.create({ data: { phone } }).catch(() => {});

  const level = riskLevel(reports.length, !!openDispute);
  return NextResponse.json({
    ok: true,
    phone,
    masked: maskPhone(phone),
    level,
    levelLabel: RISK_LABEL[level],
    reportCount: reports.length,
    disputed: !!openDispute,
    reports: level === "disputed" ? [] : reports.map((r) => ({
      channel: CHANNELS[r.channel] || r.channel,
      scamType: SCAM_TYPES[r.scamType] || r.scamType,
      amount: r.amount,
      incidentDate: r.incidentDate,
      description: r.description,
      reportedAt: r.createdAt,
    })),
    note:
      level === "none"
        ? "কোনো অভিযোগ না থাকা মানেই নম্বরটি নিরাপদ — এমন নিশ্চয়তা দেওয়া যায় না। অপরিচিত নম্বরে বড় অঙ্কের টাকা পাঠানোর আগে সবসময় যাচাই করুন।"
        : level === "disputed"
        ? "এই নম্বরের বিষয়ে আপত্তি জমা পড়েছে এবং তা পর্যালোচনা চলছে। পর্যালোচনা শেষ না হওয়া পর্যন্ত বিস্তারিত দেখানো হচ্ছে না।"
        : "এসব অভিযোগ প্রমাণ যাচাই করে প্রকাশ করা হয়েছে। তবুও লেনদেনের আগে নিজে সতর্ক থাকুন।",
  });
}
