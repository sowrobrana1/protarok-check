import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maskPhone, normalizePhone, CHANNELS, SCAM_TYPES } from "@/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/admin — admin panel backend. Password = env ADMIN_PASSWORD.
// Actions: list | approve | reject | dispute_remove | dispute_keep |
//          stats | reports | update | set_status | history | logs
// Statuses: pending | approved | rejected | hidden (অফ — প্রমাণ থেকে যায়) | withdrawn (প্রত্যাহার)
// Every moderation action is written to AdminLog (fail-soft) as permanent proof.

const STATUSES = ["pending", "approved", "rejected", "hidden", "withdrawn"];

async function log(reportId: number | null, phone: string | null, action: string, detail?: string) {
  try {
    await prisma.adminLog.create({ data: { reportId, phone, action, detail: detail || null } });
  } catch { /* audit table may not exist yet — never block moderation */ }
}

const DHAKA_MS = 6 * 3600 * 1000;
const DAY_MS = 86400000;

// Start (UTC instant) of the Dhaka calendar day that is `offsetDays` before today.
function dhakaDayStart(offsetDays: number): Date {
  const nowDhaka = new Date(Date.now() + DHAKA_MS);
  const midnightUtc = Date.UTC(nowDhaka.getUTCFullYear(), nowDhaka.getUTCMonth(), nowDhaka.getUTCDate());
  return new Date(midnightUtc - DHAKA_MS - offsetDays * DAY_MS);
}

async function setReportStatus(id: number, to: string) {
  const rep = await prisma.report.findUnique({ where: { id } });
  if (!rep) return null;
  const from = rep.status;
  await prisma.report.update({
    where: { id },
    data: { status: to, reviewedAt: to === "pending" ? rep.reviewedAt : new Date() },
  });
  const action =
    to === "approved" ? (from === "hidden" || from === "withdrawn" ? "restore" : "approve")
    : to === "pending" ? "restore"
    : to === "rejected" ? "reject"
    : to === "hidden" ? "hide"
    : "withdraw";
  await log(id, rep.phone, action, `${from} → ${to}`);
  return rep;
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || body.password !== expected) {
    return NextResponse.json({ ok: false, error: "পাসওয়ার্ড মেলেনি।" }, { status: 401 });
  }

  // ---- moderation queue (existing) ----
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
    const rep = await setReportStatus(id, body.action === "approve" ? "approved" : "rejected");
    if (!rep) return NextResponse.json({ ok: false, error: "পাওয়া যায়নি।" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  // ---- dashboard stats: totals + today + last 14 days (Dhaka days) ----
  if (body.action === "stats") {
    const since = dhakaDayStart(13);
    const [byStatus, disputesOpen, checks, reports, visits] = await Promise.all([
      prisma.report.groupBy({ by: ["status"], _count: true }),
      prisma.dispute.count({ where: { status: "open" } }),
      prisma.checkLog.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.report.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.visitLog.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }).catch(() => [] as { createdAt: Date }[]),
    ]);
    const totals: Record<string, number> = { total: 0, pending: 0, approved: 0, rejected: 0, hidden: 0, withdrawn: 0 };
    for (const g of byStatus) {
      totals.total += g._count;
      if (g.status in totals) totals[g.status] = g._count;
    }
    const bucket = (rows: { createdAt: Date }[], startMs: number) =>
      rows.filter((r) => { const t = r.createdAt.getTime(); return t >= startMs && t < startMs + DAY_MS; }).length;
    const daily = [] as { date: string; visits: number; checks: number; reports: number }[];
    for (let i = 13; i >= 0; i--) {
      const start = dhakaDayStart(i);
      const label = new Date(start.getTime() + DHAKA_MS).toLocaleDateString("bn-BD", { timeZone: "UTC", day: "numeric", month: "short" });
      daily.push({ date: label, visits: bucket(visits, start.getTime()), checks: bucket(checks, start.getTime()), reports: bucket(reports, start.getTime()) });
    }
    const today = daily[daily.length - 1];
    return NextResponse.json({ ok: true, totals: { ...totals, disputesOpen }, today, daily });
  }

  // ---- all reports: filter + search + pagination (serial = id) ----
  if (body.action === "reports") {
    const status = typeof body.status === "string" ? body.status : "all";
    let q = typeof body.q === "string" ? body.q : "";
    q = q.replace(/[০-৯]/g, (c: string) => String("০১২৩৪৫৬৭৮৯".indexOf(c))).replace(/[\s-]/g, "");
    const page = Math.max(1, parseInt(String(body.page || 1), 10) || 1);
    const per = 30;
    const where: any = {};
    if (status !== "all" && STATUSES.includes(status)) where.status = status;
    if (q) where.phone = { contains: q };
    const [total, rows] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({ where, orderBy: { id: "desc" }, skip: (page - 1) * per, take: per }),
    ]);
    return NextResponse.json({
      ok: true,
      reports: rows.map((r) => ({ ...r, masked: maskPhone(r.phone), reporterMasked: maskPhone(r.reporterPhone), reporterPhone: undefined })),
      total, page, pages: Math.max(1, Math.ceil(total / per)),
    });
  }

  // ---- edit a report (any status) ----
  if (body.action === "update") {
    const id = parseInt(String(body.id), 10);
    const f = body.fields || {};
    if (Number.isNaN(id)) return NextResponse.json({ ok: false, error: "id লাগবে।" }, { status: 400 });
    const rep = await prisma.report.findUnique({ where: { id } });
    if (!rep) return NextResponse.json({ ok: false, error: "পাওয়া যায়নি।" }, { status: 404 });
    const data: any = {};
    const changed: string[] = [];
    if (typeof f.phone === "string" && f.phone !== rep.phone) {
      const p = normalizePhone(f.phone);
      if (!p) return NextResponse.json({ ok: false, error: "সঠিক ১১ ডিজিটের নম্বর দিন।" }, { status: 400 });
      data.phone = p; changed.push("নম্বর");
    }
    if (typeof f.channel === "string" && f.channel !== rep.channel) {
      if (!(f.channel in CHANNELS)) return NextResponse.json({ ok: false, error: "মাধ্যম ঠিক নেই।" }, { status: 400 });
      data.channel = f.channel; changed.push("মাধ্যম");
    }
    if (typeof f.scamType === "string" && f.scamType !== rep.scamType) {
      if (!(f.scamType in SCAM_TYPES)) return NextResponse.json({ ok: false, error: "ধরন ঠিক নেই।" }, { status: 400 });
      data.scamType = f.scamType; changed.push("ধরন");
    }
    if (f.amount !== undefined && f.amount !== rep.amount) {
      const a = f.amount === null || f.amount === "" ? null : parseInt(String(f.amount), 10);
      if (a !== null && (Number.isNaN(a) || a < 0)) return NextResponse.json({ ok: false, error: "টাকার অঙ্ক ঠিক নেই।" }, { status: 400 });
      data.amount = a; changed.push("টাকার অঙ্ক");
    }
    if (typeof f.incidentDate === "string" && f.incidentDate !== (rep.incidentDate || "")) {
      data.incidentDate = f.incidentDate || null; changed.push("ঘটনার তারিখ");
    }
    if (typeof f.description === "string" && f.description.trim() && f.description !== rep.description) {
      data.description = f.description.trim(); changed.push("বিবরণ");
    }
    if (typeof f.trxId === "string" && f.trxId !== (rep.trxId || "")) {
      data.trxId = f.trxId || null; changed.push("TrxID");
    }
    if (changed.length === 0) return NextResponse.json({ ok: true, note: "পরিবর্তন হয়নি।" });
    await prisma.report.update({ where: { id }, data });
    await log(id, data.phone || rep.phone, "edit", "সম্পাদনা: " + changed.join(", "));
    return NextResponse.json({ ok: true });
  }

  // ---- status change: approve / reject / hide (অফ) / withdraw (প্রত্যাহার) / restore ----
  if (body.action === "set_status") {
    const id = parseInt(String(body.id), 10);
    const to = String(body.to || "");
    if (Number.isNaN(id) || !STATUSES.includes(to)) {
      return NextResponse.json({ ok: false, error: "id/status ঠিক নেই।" }, { status: 400 });
    }
    const rep = await setReportStatus(id, to);
    if (!rep) return NextResponse.json({ ok: false, error: "পাওয়া যায়নি।" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  // ---- per-report history (proof trail) ----
  if (body.action === "history") {
    const id = parseInt(String(body.id), 10);
    if (Number.isNaN(id)) return NextResponse.json({ ok: false, error: "id লাগবে।" }, { status: 400 });
    const rows = await prisma.adminLog.findMany({ where: { reportId: id }, orderBy: { id: "desc" }, take: 100 }).catch(() => []);
    return NextResponse.json({ ok: true, history: rows });
  }

  // ---- recent admin activity ----
  if (body.action === "logs") {
    const rows = await prisma.adminLog.findMany({ orderBy: { id: "desc" }, take: 100 }).catch(() => []);
    return NextResponse.json({ ok: true, logs: rows });
  }

  if (body.action === "dispute_remove" || body.action === "dispute_keep") {
    const id = parseInt(String(body.id), 10);
    if (Number.isNaN(id)) return NextResponse.json({ ok: false, error: "id লাগবে।" }, { status: 400 });
    const dispute = await prisma.dispute.findUnique({ where: { id } });
    if (!dispute) return NextResponse.json({ ok: false, error: "পাওয়া যায়নি।" }, { status: 404 });
    if (body.action === "dispute_remove") {
      // Objection upheld: take the number's approved reports OFFLINE (hidden) —
      // not deleted, so the evidence and the audit trail remain.
      const affected = await prisma.report.findMany({ where: { phone: dispute.phone, status: "approved" }, select: { id: true } });
      await prisma.report.updateMany({
        where: { phone: dispute.phone, status: "approved" },
        data: { status: "hidden", reviewedAt: new Date() },
      });
      for (const a of affected) await log(a.id, dispute.phone, "dispute_remove", `আপত্তি #${id} গৃহীত — রিপোর্ট অফ করা হয়েছে`);
      await prisma.dispute.update({ where: { id }, data: { status: "removed", resolvedAt: new Date() } });
    } else {
      await prisma.dispute.update({ where: { id }, data: { status: "kept", resolvedAt: new Date() } });
      await log(null, dispute.phone, "dispute_keep", `আপত্তি #${id} বাতিল — অভিযোগ বহাল`);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "অজানা action।" }, { status: 400 });
}
