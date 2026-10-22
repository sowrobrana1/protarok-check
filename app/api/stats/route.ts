import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/stats — public counters for the homepage.
export async function GET() {
  const [flaggedNumbers, approvedReports, totalReports, totalChecks] = await Promise.all([
    prisma.report.groupBy({ by: ["phone"], where: { status: "approved" } }),
    prisma.report.count({ where: { status: "approved" } }),
    prisma.report.count(),
    prisma.checkLog.count(),
  ]);
  return NextResponse.json({
    ok: true,
    flaggedNumbers: flaggedNumbers.length,
    approvedReports,
    totalReports,
    totalChecks,
  });
}
