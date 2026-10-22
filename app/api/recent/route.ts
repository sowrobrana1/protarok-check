import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maskPhone, CHANNELS, SCAM_TYPES } from "@/lib/phone";

export const dynamic = "force-dynamic";

// GET /api/recent — latest approved reports, numbers MASKED (public list).
export async function GET() {
  const rows = await prisma.report.findMany({
    where: { status: "approved" },
    orderBy: { reviewedAt: "desc" },
    take: 10,
    select: { phone: true, channel: true, scamType: true, amount: true, createdAt: true },
  });
  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      masked: maskPhone(r.phone),
      channel: CHANNELS[r.channel] || r.channel,
      scamType: SCAM_TYPES[r.scamType] || r.scamType,
      amount: r.amount,
      reportedAt: r.createdAt,
    })),
  });
}
