import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/visit — one anonymous row per browser session for daily visitor
// counts in the admin dashboard. Fail-soft: never errors at the visitor.
export async function POST(req: NextRequest) {
  try {
    let path = "/";
    try {
      const b = await req.json();
      if (b && typeof b.path === "string") path = b.path.slice(0, 200);
    } catch { /* keep default */ }
    await prisma.visitLog.create({ data: { path } });
  } catch { /* table may not exist yet — ignore */ }
  return NextResponse.json({ ok: true });
}
