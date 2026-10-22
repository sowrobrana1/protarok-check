import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/objection — a number's owner disputes the reports about them.
// While open, the number's public profile is softened until review.
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "তথ্য পাঠানো যায়নি।" }, { status: 400 });
  }
  const phone = normalizePhone(body.phone || "");
  if (!phone) return NextResponse.json({ ok: false, error: "সঠিক নম্বর দিন।" }, { status: 400 });
  const reason = String(body.reason || "").trim();
  if (reason.length < 10) return NextResponse.json({ ok: false, error: "আপত্তির কারণ লিখুন।" }, { status: 400 });
  const contact = String(body.contact || "").trim();
  if (contact.length < 5) return NextResponse.json({ ok: false, error: "যোগাযোগের নম্বর/ইমেইল দিন।" }, { status: 400 });

  const existing = await prisma.dispute.findFirst({ where: { phone, status: "open" } });
  if (existing) {
    return NextResponse.json({ ok: true, message: "এই নম্বরের আপত্তি আগেই জমা আছে এবং পর্যালোচনাধীন। আমরা শীঘ্রই যোগাযোগ করব।" });
  }
  await prisma.dispute.create({ data: { phone, reason, contact, status: "open" } });
  return NextResponse.json({ ok: true, message: "আপত্তি জমা হয়েছে। যাচাই চলাকালীন এই নম্বরের পেজে 'পর্যালোচনাধীন' দেখানো হবে। অভিযোগ ভুল প্রমাণিত হলে তা সরিয়ে দেওয়া হবে।" });
}
