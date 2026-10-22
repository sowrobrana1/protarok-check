import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { meTooCount } from "@/lib/metoo";

export const dynamic = "force-dynamic";

// "আমার সাথেও হয়েছে" — anonymous one-tap solidarity count for a number.
// Duplicate guard: same phone + same hashed IP within 24h counts once.
// Only the SHA-256 of the IP is stored, never the raw IP.

function ipHash(req: NextRequest): string {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  return createHash("sha256").update("protarok:" + ip).digest("hex");
}

export async function GET(req: NextRequest) {
  const phone = normalizePhone(req.nextUrl.searchParams.get("phone") || "");
  if (!phone) return NextResponse.json({ ok: false, error: "সঠিক নম্বর দিন।" }, { status: 400 });
  return NextResponse.json({ ok: true, phone, count: await meTooCount(phone) });
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "তথ্য পাঠানো যায়নি।" }, { status: 400 });
  }
  const phone = normalizePhone(body.phone || "");
  if (!phone) return NextResponse.json({ ok: false, error: "সঠিক নম্বর দিন।" }, { status: 400 });

  try {
    const hash = ipHash(req);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.meToo.findFirst({
      where: { phone, ipHash: hash, createdAt: { gte: since } },
      select: { id: true },
    });
    if (!recent) {
      await prisma.meToo.create({ data: { phone, ipHash: hash } });
    }
    return NextResponse.json({ ok: true, phone, count: await meTooCount(phone), already: !!recent });
  } catch {
    return NextResponse.json({ ok: false, error: "এখন জমা নেওয়া যাচ্ছে না — পরে আবার চেষ্টা করুন।" }, { status: 503 });
  }
}
