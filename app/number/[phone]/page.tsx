import { prisma } from "@/lib/db";
import { normalizePhone, maskPhone, riskLevel, RISK_LABEL, CHANNELS, SCAM_TYPES, toBn } from "@/lib/phone";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

// Full public profile of one number — reached by exact-number search.
export default async function NumberPage({ params }: { params: { phone: string } }) {
  const phone = normalizePhone(params.phone);
  if (!phone) notFound();

  const [reports, openDispute] = await Promise.all([
    prisma.report.findMany({
      where: { phone: phone!, status: "approved" },
      orderBy: { createdAt: "desc" },
      select: { channel: true, scamType: true, amount: true, incidentDate: true, description: true, createdAt: true },
    }),
    prisma.dispute.findFirst({ where: { phone: phone!, status: "open" } }),
  ]);

  const level = riskLevel(reports.length, !!openDispute);
  const totalLoss = reports.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <main className="wrap">
      <section>
        <div className={"result " + level} style={{ marginTop: 20 }}>
          <div className="lvl">
            {level === "none" ? "🟢 " : level === "caution" ? "🟡 " : level === "high" ? "🔴 " : "⚪ "}
            {RISK_LABEL[level]}
          </div>
          <div className="meta">
            নম্বর: <strong>{maskPhone(phone!)}</strong> (গোপনীয়তার জন্য আংশিক ঢাকা)
            {level !== "disputed" && <> · যাচাইকৃত অভিযোগ: {toBn(reports.length)}টি{totalLoss > 0 ? ` · মোট দাবিকৃত ক্ষতি: ৳${toBn(totalLoss)}` : ""}</>}
          </div>
          {level === "none" && <p className="small" style={{ marginBottom: 0 }}>কোনো অভিযোগ না থাকা মানেই নম্বরটি নিরাপদ — এমন নিশ্চয়তা দেওয়া যায় না। অপরিচিত নম্বরে বড় অঙ্কের টাকা পাঠানোর আগে নিজে যাচাই করুন।</p>}
          {level === "disputed" && <p className="small" style={{ marginBottom: 0 }}>এই নম্বরের বিষয়ে আপত্তি জমা পড়েছে, পর্যালোচনা চলছে। শেষ না হওয়া পর্যন্ত বিস্তারিত দেখানো হচ্ছে না।</p>}
        </div>

        {level !== "disputed" && reports.length > 0 && (
          <>
            <h2 style={{ marginTop: 24 }}>যাচাইকৃত অভিযোগসমূহ</h2>
            <div className="list">
              {reports.map((r, i) => (
                <div className="item" key={i}>
                  <div className="top">
                    <span className="tag warn">{SCAM_TYPES[r.scamType] || r.scamType}</span>
                    <span className="meta small">{CHANNELS[r.channel] || r.channel}</span>
                  </div>
                  <p style={{ margin: "8px 0" }}>{r.description}</p>
                  <div className="meta small">
                    {r.amount ? `ক্ষতি: ৳${toBn(r.amount)} · ` : ""}{r.incidentDate ? `ঘটনা: ${toBn(r.incidentDate)} · ` : ""}রিপোর্ট: {toBn(new Date(r.createdAt).toLocaleDateString("bn-BD"))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="item" style={{ marginTop: 20 }}>
          <strong>এই নম্বর দিয়ে আপনিও ঠকেছেন?</strong>
          <p className="small">প্রমাণসহ রিপোর্ট করুন — যাচাই করে এখানে যুক্ত করা হবে।</p>
          <a className="btn red" href="/report" style={{ display: "inline-block" }}>রিপোর্ট করুন</a>{" "}
          <a className="btn ghost" href="/objection" style={{ display: "inline-block" }}>নম্বরটি আপনার? আপত্তি জানান</a>
        </div>

        <p className="small" style={{ marginTop: 16 }}>
          মনে রাখুন: এখানে প্রকাশিত তথ্য ব্যবহারকারীদের অভিযোগ, যা জমা দেওয়া প্রমাণ যাচাই করে প্রকাশ করা হয়েছে।
          অভিযোগ থাকা মানেই আদালতে অপরাধ প্রমাণিত হওয়া নয়। <a href="/disclaimer">নীতিমালা পড়ুন</a>
        </p>
      </section>
    </main>
  );
}
