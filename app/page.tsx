"use client";
import { useEffect, useRef, useState } from "react";
import { toBn } from "@/lib/phone";

type CheckResult = {
  ok: boolean; error?: string; phone?: string; masked?: string;
  level?: "none" | "caution" | "high" | "disputed"; levelLabel?: string;
  reportCount?: number; note?: string;
  reports?: { channel: string; scamType: string; amount: number | null; incidentDate: string | null; description: string; reportedAt: string }[];
};
type Stats = { flaggedNumbers: number; approvedReports: number; totalChecks: number };
type Recent = { masked: string; channel: string; scamType: string; amount: number | null; reportedAt: string };

function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!target || started.current) return;
    started.current = true;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return v;
}

function StatNum({ n, label }: { n: number; label: string }) {
  const v = useCountUp(n);
  return (
    <div className="stat">
      <div className="num">{toBn(v)}</div>
      <div className="lab">{label}</div>
    </div>
  );
}

const LEVEL_ICON: Record<string, string> = { none: "✓", caution: "!", high: "!!", disputed: "?" };

export default function Home() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CheckResult | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((j) => j.ok && setStats(j)).catch(() => {});
    fetch("/api/recent").then((r) => r.json()).then((j) => j.ok && setRecent(j.items)).catch(() => {});
  }, []);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setRes(null); setCopied(false);
    try {
      const r = await fetch("/api/check?phone=" + encodeURIComponent(phone));
      setRes(await r.json());
    } catch {
      setRes({ ok: false, error: "সংযোগে সমস্যা হচ্ছে। আবার চেষ্টা করুন।" });
    }
    setBusy(false);
  }

  async function share() {
    if (!res?.ok) return;
    const text = `প্রতারক চেক: ${res.masked} নম্বরে — ${res.levelLabel} (যাচাইকৃত অভিযোগ: ${res.reportCount ?? 0}টি)। টাকা পাঠানোর আগে আপনিও যাচাই করুন!`;
    const url = typeof window !== "undefined" ? window.location.origin + (res.phone ? `/number/${res.phone}` : "/") : "/";
    try {
      if (navigator.share) { await navigator.share({ title: "প্রতারক চেক", text, url }); return; }
      throw new Error("no share");
    } catch {
      try { await navigator.clipboard.writeText(text + " " + url); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch {}
    }
  }

  return (
    <main>
      <div className="hero">
        <div className="wrap">
          <span className="eyebrow"><span className="dot" /> বাংলাদেশের প্রতারণা-বিরোধী যাচাই প্ল্যাটফর্ম</span>
          <h1>টাকা পাঠানোর আগে<br />নম্বরটি <span className="hl">যাচাই করুন</span></h1>
          <p className="lead">বিকাশ, নগদ, রকেট কিংবা P2P — অপরিচিত নম্বরে টাকা পাঠানোর আগে এক নজরে দেখে নিন, এই নম্বরে কোনো প্রতারণার অভিযোগ আছে কিনা।</p>

          <div className="checkbox-card">
            <form onSubmit={check}>
              <label htmlFor="phone">📱 যে নম্বরে টাকা পাঠাবেন</label>
              <div className="checkrow">
                <input id="phone" inputMode="tel" placeholder="01XXXXXXXXX" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
                <button className="btn" type="submit" disabled={busy}>{busy ? "যাচাই হচ্ছে…" : "যাচাই করুন"}</button>
              </div>
              <div className="trustchips">
                <span className="chip">✓ সম্পূর্ণ ফ্রি</span>
                <span className="chip">✓ সাইনআপ লাগবে না</span>
                <span className="chip">✓ প্রমাণ-যাচাই করা তথ্য</span>
                <span className="chip">✓ আপনার তথ্য গোপন থাকে</span>
              </div>
            </form>

            {res && !res.ok && <div className="msg err">{res.error}</div>}
            {res && res.ok && (
              <div className={"result " + res.level}>
                <div className="lvl"><span className="lvl-ico">{LEVEL_ICON[res.level || "none"]}</span>{res.levelLabel}</div>
                <div className="meta" style={{ marginTop: 6 }}>
                  নম্বর: <strong>{res.masked}</strong>
                  {res.reportCount !== undefined && res.level !== "disputed" && <> · যাচাইকৃত অভিযোগ: <strong>{toBn(res.reportCount)}টি</strong></>}
                </div>
                {res.reports && res.reports.map((r, i) => (
                  <div className="rep" key={i}>
                    <div><span className="tag">{r.scamType}</span> <span className="meta">{r.channel}{r.amount ? ` · ক্ষতি: ৳${toBn(r.amount)}` : ""}{r.incidentDate ? ` · ঘটনা: ${toBn(r.incidentDate)}` : ""}</span></div>
                    <div>{r.description}</div>
                  </div>
                ))}
                <p className="small" style={{ marginBottom: 0 }}>{res.note}</p>
                <div className="shareline">
                  <button className="btn" type="button" onClick={share}>{copied ? "✓ কপি হয়েছে!" : "📤 ফলাফল শেয়ার করুন"}</button>
                  {res.phone && res.level !== "disputed" && (
                    <a className="btn ghost" href={`/number/${res.phone}`}>পুরো পেজ দেখুন →</a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="wrap">
        {stats && (
          <section>
            <div className="stats">
              <StatNum n={stats.flaggedNumbers} label="অভিযোগযুক্ত নম্বর" />
              <StatNum n={stats.approvedReports} label="যাচাইকৃত অভিযোগ" />
              <StatNum n={stats.totalChecks} label="মোট যাচাই হয়েছে" />
            </div>
          </section>
        )}

        <section>
          <div className="sec-head"><span className="bar-ico">⚙️</span><h2>কীভাবে কাজ করে</h2></div>
          <p className="sec-sub">তিনটি সহজ ধাপ — যাচাই, রিপোর্ট, যাচাই-করে-প্রকাশ।</p>
          <div className="steps">
            <div className="step"><div className="n">১</div><strong>নম্বর যাচাই করুন</strong><br /><span className="small">টাকা পাঠানোর আগে নম্বরটি লিখলেই জানতে পারবেন, আগে কোনো অভিযোগ আছে কিনা।</span></div>
            <div className="step"><div className="n">২</div><strong>ঠকলে রিপোর্ট করুন</strong><br /><span className="small">প্রতারণার শিকার হলে প্রমাণসহ (TrxID / স্ক্রিনশট) রিপোর্ট করুন — ২ মিনিটের কাজ।</span></div>
            <div className="step"><div className="n">৩</div><strong>যাচাই করে প্রকাশ</strong><br /><span className="small">প্রতিটি রিপোর্ট প্রমাণ দেখে যাচাই করা হয় — গুজব বা মিথ্যা রিপোর্ট প্রকাশ হয় না।</span></div>
          </div>
        </section>

        <section>
          <div className="sec-head"><span className="bar-ico">🎯</span><h2>যেসব প্রতারণা সবচেয়ে বেশি হয়</h2></div>
          <p className="sec-sub">এই ধরনগুলোর কোনোটির শিকার হলে অবশ্যই রিপোর্ট করুন।</p>
          <div className="cats">
            <div className="cat"><span className="ico">🛍️</span><strong>অগ্রিম ধোঁকা</strong><span className="small">অনলাইনে পণ্যের অগ্রিম টাকা নিয়ে পেজ/নম্বর বন্ধ করে দেয়।</span></div>
            <div className="cat"><span className="ico">🎁</span><strong>ভুয়া অফার ও লটারি</strong><span className="small">"আপনি লটারি জিতেছেন" বলে ফি চেয়ে টাকা হাতিয়ে নেয়।</span></div>
            <div className="cat"><span className="ico">🔐</span><strong>OTP / পিন জালিয়াতি</strong><span className="small">অফিস সেজে কল করে কোড জেনে অ্যাকাউন্ট খালি করে দেয়।</span></div>
            <div className="cat"><span className="ico">🏦</span><strong>ভুয়া অফিসার</strong><span className="small">বিকাশ/ব্যাংকের কর্মকর্তা সেজে "অ্যাকাউন্ট বন্ধ হবে" ভয় দেখায়।</span></div>
            <div className="cat"><span className="ico">💱</span><strong>P2P প্রতারণা</strong><span className="small">ডলার কেনাবেচায় টাকা নিয়ে ক্রিপ্টো না পাঠিয়ে ব্লক করে।</span></div>
            <div className="cat"><span className="ico">💼</span><strong>ভুয়া চাকরি</strong><span className="small">চাকরি/ভিসার নামে রেজিস্ট্রেশন ফি নিয়ে উধাও হয়ে যায়।</span></div>
          </div>
        </section>

        {recent.length > 0 && (
          <section>
            <div className="sec-head"><span className="bar-ico">🕒</span><h2>সাম্প্রতিক যাচাইকৃত অভিযোগ</h2></div>
            <p className="sec-sub">গোপনীয়তার জন্য নম্বর আংশিক ঢেকে দেখানো হয় — পুরো তথ্য পেতে নম্বরটি লিখে যাচাই করুন।</p>
            <div className="list">
              {recent.map((r, i) => (
                <div className="item" key={i}>
                  <div className="top">
                    <span className="num">{r.masked}</span>
                    <span className="tag">{r.scamType}</span>
                  </div>
                  <div className="meta">{r.channel}{r.amount ? ` · ক্ষতি: ৳${toBn(r.amount)}` : ""} · {toBn(new Date(r.reportedAt).toLocaleDateString("bn-BD"))}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="tips">
            <h2>🛡️ টাকা পাঠানোর আগে ৫টি যাচাই</h2>
            <ul>
              <li>প্রতারক চেকে নম্বরটি যাচাই করুন — অভিযোগ থাকলে লেনদেন থামান।</li>
              <li>অপরিচিত বিক্রেতাকে পুরো টাকা অগ্রিম পাঠাবেন না — ছোট অঙ্কে শুরু করুন।</li>
              <li>কেউ OTP, পিন বা পাসওয়ার্ড চাইলে সঙ্গে সঙ্গে লেনদেন বন্ধ করুন — আসল অফিস কখনো এসব চায় না।</li>
              <li>"আজই পাঠান, অফার শেষ" — তাড়াহুড়োর চাপ মানেই সন্দেহের সংকেত।</li>
              <li>লেনদেনের স্ক্রিনশট ও TrxID সবসময় সংরক্ষণ করুন — এটাই আপনার প্রমাণ।</li>
            </ul>
          </div>
        </section>

        <section>
          <div className="sec-head"><span className="bar-ico">❓</span><h2>সাধারণ জিজ্ঞাসা</h2></div>
          <details className="faq"><summary>নম্বরে "কোনো অভিযোগ নেই" মানেই কি নিরাপদ?</summary><p>না। অভিযোগ না থাকা মানে শুধু এখনো কেউ রিপোর্ট করেনি। নতুন নম্বর দিয়ে প্রতারণা হতেই পারে — বড় অঙ্কের লেনদেনে সবসময় নিজে যাচাই করুন।</p></details>
          <details className="faq"><summary>রিপোর্ট করলে কি আমার পরিচয় প্রকাশ পাবে?</summary><p>কখনোই না। আপনার নাম, নম্বর ও প্রমাণ শুধু যাচাইয়ের কাজে ব্যবহৃত হয় — পাবলিক পেজে শুধু ঘটনার বিবরণ প্রকাশ হয়।</p></details>
          <details className="faq"><summary>আমার নম্বরে ভুল অভিযোগ এসেছে, কী করব?</summary><p><a href="/objection">আপত্তি পেজ</a> থেকে জানালেই নম্বরটি "পর্যালোচনাধীন" হয়ে যাবে। অভিযোগ ভুল প্রমাণিত হলে সম্পূর্ণ সরিয়ে দেওয়া হবে।</p></details>
          <details className="faq"><summary>প্রমাণ ছাড়া রিপোর্ট করা যাবে?</summary><p>না। মিথ্যা রিপোর্ট ঠেকাতে TrxID অথবা লেনদেনের স্ক্রিনশট — অন্তত একটি প্রমাণ আবশ্যক। এ কারণেই এখানকার তথ্য বিশ্বাসযোগ্য।</p></details>
          <details className="faq"><summary>সেবাটি কি সত্যিই ফ্রি?</summary><p>হ্যাঁ, যাচাই ও রিপোর্ট — দুটোই সম্পূর্ণ ফ্রি এবং সাইনআপ ছাড়াই ব্যবহার করা যায়।</p></details>
        </section>

        <section style={{ paddingBottom: 34 }}>
          <div className="cta-band">
            <h2>আপনি কি প্রতারণার শিকার হয়েছেন?</h2>
            <p>আপনার একটা রিপোর্ট হয়তো আজই আরেকজনের কষ্টের টাকা বাঁচিয়ে দেবে।</p>
            <a className="btn gold" href="/report">প্রমাণসহ রিপোর্ট করুন</a>
          </div>
        </section>
      </div>
    </main>
  );
}
