import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maskPhone, CHANNELS, SCAM_TYPES, storyTitle } from "@/lib/phone";

export const dynamic = "force-dynamic";

// GET /api/highlights — homepage discovery sections, all fail-soft:
//  fresh:    latest approved reports (the "সদ্য ধরা পড়া" feed)
//  topWeek:  most-reported numbers of the last 7 days (leaderboard)
//  trending: most-checked numbers of the last 24 hours (CheckLog)
//  stories:  latest approved cases with text, for the story teaser
// Numbers are masked in every list; `phone` is included only as a link
// target to the number's already-public profile page.
export async function GET() {
  const out: any = { ok: true, fresh: [], topWeek: [], trending: [], stories: [] };

  try {
    const rows = await prisma.report.findMany({
      where: { status: "approved" },
      orderBy: { reviewedAt: "desc" },
      take: 6,
      select: { phone: true, channel: true, scamType: true, amount: true, description: true, createdAt: true, reviewedAt: true },
    });
    out.fresh = rows.map((r) => ({
      phone: r.phone,
      masked: maskPhone(r.phone),
      channel: CHANNELS[r.channel] || r.channel,
      scamType: SCAM_TYPES[r.scamType] || r.scamType,
      amount: r.amount,
      at: r.reviewedAt || r.createdAt,
    }));
    out.stories = rows.slice(0, 3).map((r) => ({
      phone: r.phone,
      masked: maskPhone(r.phone),
      title: storyTitle(r),
      excerpt: r.description.length > 150 ? r.description.slice(0, 150) + "…" : r.description,
      at: r.reviewedAt || r.createdAt,
    }));
  } catch { /* section stays empty */ }

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const groups = await prisma.report.groupBy({
      by: ["phone"],
      where: { status: "approved", createdAt: { gte: weekAgo } },
      _count: { _all: true },
      _sum: { amount: true },
    });
    const top = groups.sort((a, b) => b._count._all - a._count._all).slice(0, 5);
    if (top.length) {
      const typeRows = await prisma.report.findMany({
        where: { status: "approved", phone: { in: top.map((g) => g.phone) } },
        select: { phone: true, scamType: true },
      });
      const typeOf = new Map<string, string>();
      for (const g of top) {
        const mine = typeRows.filter((r) => r.phone === g.phone);
        const best = mine.sort((a, b) =>
          mine.filter((x) => x.scamType === b.scamType).length - mine.filter((x) => x.scamType === a.scamType).length
        )[0];
        if (best) typeOf.set(g.phone, SCAM_TYPES[best.scamType] || best.scamType);
      }
      out.topWeek = top.map((g) => ({
        phone: g.phone,
        masked: maskPhone(g.phone),
        count: g._count._all,
        totalLoss: g._sum.amount || 0,
        scamType: typeOf.get(g.phone) || "",
      }));
    }
  } catch { /* section stays empty */ }

  try {
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const groups = await prisma.checkLog.groupBy({
      by: ["phone"],
      where: { createdAt: { gte: dayAgo } },
      _count: { _all: true },
    });
    out.trending = groups
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 5)
      .map((g) => ({ phone: g.phone, masked: maskPhone(g.phone), checks: g._count._all }));
  } catch { /* section stays empty */ }

  return NextResponse.json(out);
}
