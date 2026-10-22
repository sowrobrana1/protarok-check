"use client";
import { useEffect, useState } from "react";
import { toBn } from "@/lib/phone";

type CheckResult = {
  ok: boolean; error?: string; phone?: string; masked?: string;
  level?: "none" | "caution" | "high" | "disputed"; levelLabel?: string;
  reportCount?: number; note?: string;
  reports?: { channel: string; scamType: string; amount: number | null; incidentDate: string | null; description: string; reportedAt: string }[];
};
type Stats = { flaggedNumbers: number; approvedReports: number; totalChecks: number };
type Recent = { masked: string; channel: string; scamType: string; amount: number | null; reportedAt: string };

export default function Home() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CheckResult | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((j) => j.ok && setStats(j)).catch(() => {});
    fetch("/api/recent").then((r) => r.json()).then((j) => j.ok && setRecent(j.items)).catch(() => {});
  }, []);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/check?phone=" + encodeURIComponent(phone));
      setRes(await r.json());
    } catch {
      setRes({ ok: false, error: "সংযোগে সমস্যা হচ্ছে। আবার চেষ্টা করুন।" });
    }
    setBusy(false);
  }

  return (
    <main>
      <div className="hero">
        <div className="wrap">
          <h1>টাকা পাঠানোর আগে<br />নম্বরটি যাচাই করুন</h1>
          <p>বিকাশ, নগদ, রকেট কিংবা P2P — অপরিচিত নম্বরে টাকা পাঠানোর আগে দেখে নিন, এই নম্বরে কোনো প্রতারণার অভিযোগ আছে কিনা।</p>
          <div className="checkbox-card">
            <form onSubmit={check}>
              <label htmlFor="phone">যে নম্বরে টাকা পাঠাবেন</label>
              <div className="checkrow">
                <input id="phone" inputMode="tel" placeholder="01XXXXXXXXX" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
                <button className="btn" type="submit" disabled={busy}>{busy ? "যাচাই হচ্ছে…" : "যাচাই করুন"}</button>
              </div>
              <div className="hint">সম্পূর্ণ ফ্রি · কোনো সাইনআপ লাগবে না · আপনার নম্বর কোথাও সংরক্ষণ করা হয় না</div>
            </form>

            {res && !res.ok && <div className="msg err">{res.error}</div>}
            {res && res.ok && (
              <div className={"result " + res.level}>
                <div className="lvl">
                  {res.level === "none" ? "🟢 " : res.level === "caution" ? "🟡 " : res.level === "high" ? "🔴 " : "⚪ "}
                  {res.levelLabel}
                </div>
                <div className="meta">
                  নম্বর: {res.masked}
                  {res.reportCount !== undefined && res.level !== "disputed" && <> · যাচাইকৃত অভিযোগ: {toBn(res.reportCount)}টি</>}
                </div>
                {res.reports && res.reports.map((r, i) => (
                  <div className="rep" key={i}>
                    <div><span className="tag warn">{r.scamType}</span> <span className="meta">{r.channel}{r.amount ? ` · ক্ষতি: ৳${toBn(r.amount)}` : ""}{r.incidentDate ? ` · ঘটনা: ${toBn(r.incidentDate)}` : ""}</span></div>
                    <div>{r.description}</div>
                  </div>
                ))}
                <p className="small" style={{ marginBottom: 0 }}>{res.note}</p>
                {res.phone && res.level !== "disputed" && (
                  <p className="small"><a href={`/number/${res.phone}`}>এই নম্বরের পুরো পেজ দেখুন →</a></p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="wrap">
        {stats && (
          <section>
            <div className="stats">
              <div className="stat"><div className="num">{toBn(stats.flaggedNumbers)}</div><div className="lab">অভিযোগযুক্ত নম্বর</div></div>
              <div className="stat"><div className="num">{toBn(stats.approvedReports)}</div><div className="lab">যাচাইকৃত অভিযোগ</div></div>
              <div className="stat"><div className="num">{toBn(stats.totalChecks)}</div><div className="lab">মোট যাচাই হয়েছে</div></div>
            </div>
          </section>
        )}

        <section>
          <h2>কীভাবে কাজ করে</h2>
          <div className="steps">
            <div className="step"><div className="n">১</div><strong>নম্বর যাচাই করুন</strong><br /><span className="small">টাকা পাঠানোর আগে নম্বরটি লিখে দেখুন, আগে কোনো অভিযোগ আছে কিনা।</span></div>
            <div className="step"><div className="n">২</div><strong>ঠকলে রিপোর্ট করুন</strong><br /><span className="small">প্রতারণার শিকার হলে প্রমাণসহ (TrxID/স্ক্রিনশট) রিপোর্ট করুন।</span></div>
            <div className="step"><div className="n">৩</div><strong>যাচাই করে প্রকাশ</strong><br /><span className="small">প্রতিটি রিপোর্ট প্রমাণ দেখে যাচাই করা হয় — গুজব বা মিথ্যা রিপোর্ট প্রকাশ হয় না।</span></div>
          </div>
        </section>

        {recent.length > 0 && (
          <section>
            <h2>সাম্প্রতিক যাচাইকৃত অভিযোগ</h2>
            <div className="list">
              {recent.map((r, i) => (
                <div className="item" key={i}>
                  <div className="top">
                    <span className="num">{r.masked}</span>
                    <span className="tag warn">{r.scamType}</span>
                  </div>
                  <div className="meta small">{r.channel}{r.amount ? ` · ক্ষতি: ৳${toBn(r.amount)}` : ""} · {toBn(new Date(r.reportedAt).toLocaleDateString("bn-BD"))}</div>
                </div>
              ))}
            </div>
            <p className="small">গোপনীয়তার জন্য তালিকায় নম্বর আংশিক ঢেকে দেখানো হয়। পুরো তথ্য পেতে নম্বরটি লিখে যাচাই করুন।</p>
          </section>
        )}

        <section style={{ paddingBottom: 30 }}>
          <div className="item" style={{ textAlign: "center", padding: 22 }}>
            <h2 style={{ marginTop: 0 }}>আপনি কি প্রতারণার শিকার হয়েছেন?</h2>
            <p className="small">আপনার একটা রিপোর্ট অন্য অনেককে টাকা হারানো থেকে বাঁচাতে পারে।</p>
            <a className="btn red" href="/report" style={{ display: "inline-block" }}>প্রমাণসহ রিপোর্ট করুন</a>
          </div>
        </section>
      </div>
    </main>
  );
}
