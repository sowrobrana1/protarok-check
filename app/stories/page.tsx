import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { maskPhone, storyTitle, timeAgoBn, toBn, CHANNELS } from "@/lib/phone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "প্রতারণার গল্প — আসল মানুষের আসল ঘটনা | প্রতারক চেক",
  description:
    "বাংলাদেশে প্রতারণার শিকার মানুষদের আসল ঘটনা — প্রমাণ যাচাই করে প্রকাশিত। পড়ুন, প্রতারকের কৌশল চিনে রাখুন, নিজে বাঁচুন।",
  openGraph: {
    title: "প্রতারণার গল্প | প্রতারক চেক",
    description: "আসল ভুক্তভোগীদের ঘটনা — প্রতারকের কৌশল চিনে রাখুন।",
    type: "website",
  },
};

// Case stories: every approved report, told as a story. Descriptions are the
// victims' own words; only approved (evidence-checked) cases appear here.
export default async function StoriesPage() {
  let rows: any[] = [];
  try {
    rows = await prisma.report.findMany({
      where: { status: "approved" },
      orderBy: { reviewedAt: "desc" },
      take: 30,
      select: {
        phone: true, channel: true, scamType: true, amount: true,
        incidentDate: true, description: true, createdAt: true, reviewedAt: true,
      },
    });
  } catch { /* render the empty state */ }

  return (
    <main className="wrap">
      <div className="pagehead">
        <h2>📖 প্রতারণার গল্প</h2>
        <p className="small" style={{ maxWidth: 640 }}>
          প্রতিটা গল্পই একজন আসল মানুষের ঘটনা — প্রমাণ যাচাই করে প্রকাশ করা হয়েছে।
          গল্পগুলো পড়লে প্রতারকের কৌশলগুলো চেনা সহজ হবে; হয়তো পরের শিকার হওয়া থেকে
          আপনিই বেঁচে যাবেন।
        </p>
      </div>
      <section style={{ paddingTop: 4 }}>
        {rows.length === 0 && (
          <p className="small">এখনো কোনো গল্প প্রকাশিত হয়নি। প্রথম রিপোর্ট প্রকাশ হলেই এখানে দেখা যাবে।</p>
        )}
        <div className="list">
          {rows.map((r, i) => (
            <article className="item" key={i}>
              <strong style={{ fontSize: 18 }}>{storyTitle(r)}</strong>
              <div className="meta small" style={{ margin: "6px 0" }}>
                নম্বর: {maskPhone(r.phone)} · মাধ্যম: {CHANNELS[r.channel] || r.channel}
                {r.amount ? ` · ক্ষতি: ৳${toBn(r.amount)}` : ""}
                {r.incidentDate ? ` · ঘটনা: ${toBn(r.incidentDate)}` : ""}
                {" · "}প্রকাশিত {timeAgoBn(r.reviewedAt || r.createdAt)}
              </div>
              <p style={{ margin: "8px 0" }}>{r.description}</p>
              <a className="small" href={`/number/${r.phone}`}>নম্বরটির পুরো প্রোফাইল দেখুন →</a>
            </article>
          ))}
        </div>

        <div className="item" style={{ marginTop: 22 }}>
          <strong>আপনার গল্পটাও অন্যদের বাঁচাতে পারে</strong>
          <p className="small">প্রতারণার শিকার হয়ে থাকলে প্রমাণসহ রিপোর্ট করুন — যাচাইয়ের পর আপনার ঘটনাও এখানে গল্প হয়ে উঠবে, আর কারো টাকা বাঁচাবে।</p>
          <a className="btn red" href="/report" style={{ display: "inline-block" }}>রিপোর্ট করুন</a>
        </div>
      </section>
    </main>
  );
}
