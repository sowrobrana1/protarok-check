import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maskPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/admin — moderation queue. Password = env ADMIN_PASSWORD.
// Actions: list | approve | reject | dispute_remove | dispute_keep
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || body.password !== expected) {
    return NextResponse.json({ ok: false, error: "পাসওয়ার্ড মেলেনি।" }, { status: 401 });
  }

  if (body.action === "list") {
    const [pending, disputes, counts] = await Promise.all([
      prisma.report.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, take: 100 }),
      prisma.dispute.findMany({ where: { status: "open" }, orderBy: { createdAt: "asc" }, take: 100 }),
      prisma.report.groupBy({ by: ["status"], _count: true }),
    ]);
    return NextResponse.json({
      ok: true,
      pending: pending.map((r) => ({ ...r, masked: maskPhone(r.phone) })),
      disputes,
      counts,
    });
  }

  if (body.action === "approve" || body.action === "reject") {
    const id = parseInt(String(body.id), 10);
    if (Number.isNaN(id)) return NextResponse.json({ ok: false, error: "id লাগবে।" }, { status: 400 });
    await prisma.report.update({
      where: { id },
      data: { status: body.action === "approve" ? "approved" : "rejected", reviewedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "dispute_remove" || body.action === "dispute_keep") {
    const id = parseInt(String(body.id), 10);
    if (Number.isNaN(id)) return NextResponse.json({ ok: false, error: "id লাগবে।" }, { status: 400 });
    const dispute = await prisma.dispute.findUnique({ where: { id } });
    if (!dispute) return NextResponse.json({ ok: false, error: "পাওয়া যায়নি।" }, { status: 404 });
    if (body.action === "dispute_remove") {
      // Objection upheld: hide all approved reports for the number.
      await prisma.report.updateMany({
        where: { phone: dispute.phone, status: "approved" },
        data: { status: "rejected", reviewedAt: new Date() },
      });
      await prisma.dispute.update({ where: { id }, data: { status: "removed", resolvedAt: new Date() } });
    } else {
      await prisma.dispute.update({ where: { id }, data: { status: "kept", resolvedAt: new Date() } });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "অজানা action।" }, { status: 400 });
}
