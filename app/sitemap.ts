import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE = "https://protarok-check.vercel.app";

// Sitemap: static pages + one profile URL per number that has at least one
// approved report, so people searching a suspicious number on Google find it.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/report`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/objection`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/disclaimer`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const groups = await prisma.report.groupBy({
      by: ["phone"],
      where: { status: "approved" },
      _max: { createdAt: true },
    });
    for (const g of groups) {
      entries.push({
        url: `${BASE}/number/${g.phone}`,
        lastModified: g._max.createdAt || now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // DB unreachable — serve the static part only, never fail the sitemap.
  }

  return entries;
}
