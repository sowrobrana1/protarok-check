"use client";
import { useEffect, useRef, useState } from "react";
import { toBn } from "@/lib/phone";

type CheckResult = {
  ok: boolean; error?: string; phone?: string; masked?: string;
  level?: "none" | "caution" | "high" | "disputed"; levelLabel?: string;
  reportCount?: number; meToo?: number; note?: string;
  reports?: { channel: string; scamType: string; amount: number | null; incidentDate: string | null; description: string; reportedAt: string }[];
};
type Stats = { flaggedNumbers: number; approvedReports: number; totalChecks: number };
type Fresh = { phone: string; masked: string; channel: string; scamType: string; amount: number | null; at: string };
type TopWeek = { phone: string; masked: string; count: number; totalLoss: number; scamType: string };
type Trending = { phone: string; masked: string; checks: number };
type Story = { phone: string; masked: string; title: string; excerpt: string; at: string };
type Highlights = { fresh: Fresh[]; topWeek: TopWeek[]; trending: Trending[]; stories: Story[] };

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
const RISK_METER: Record<string, { pct: number; color: string; label: string }> = {
  none: { pct: 8, color: "#1f9d63", label: "কম" },
  caution: { pct: 48, color: "#d9930d", label: "মাঝারি" },
  high: { pct: 94, color: "#c62828", label: "অত্যন্ত উচ্চ" },
  disputed: { pct: 50, color: "#7a8794", label: "অনির্ধারিত" },
};
const SCAN_STEPS = ["🔍 ডাটাবেজে খোঁজা হচ্ছে…", "📂 অভিযোগের রেকর্ড মিলানো হচ্ছে…", "⚖️ ঝুঁকি হিসাব করা হচ্ছে…"];

function agoBn(iso: string): string {
  const min = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "এইমাত্র";
  if (min < 60) return `${toBn(min)} মিনিট আগে`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${toBn(hr)} ঘণ্টা আগে`;
  return `${toBn(Math.floor(hr / 24))} দিন আগে`;
}

export default function Home() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [res, setRes] = useState<CheckResult | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [hl, setHl] = useState<Highlights | null>(null);
  const [copied, setCopied] = useState(false);
  const [cardMsg, setCardMsg] = useState(false);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((j) => j.ok && setStats(j)).catch(() => {});
    fetch("/api/highlights").then((r) => r.json()).then((j) => j.ok && setHl(j)).catch(() => {});
  }, []);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setRes(null); setCopied(false); setCardMsg(false); setScanStep(0);
    const stepper = setInterval(() => setScanStep((s) => Math.min(s + 1, SCAN_STEPS.length - 1)), 650);
    const minWait = new Promise((r) => setTimeout(r, 1500));
    try {
      const [r] = await Promise.all([
        fetch("/api/check?phone=" + encodeURIComponent(phone)),
        minWait,
      ]);
      setRes(await r.json());
    } catch {
      await minWait;
      setRes({ ok: false, error: "সংযোগে সমস্যা হচ্ছে। আবার চেষ্টা করুন।" });
    }
    clearInterval(stepper);
    setBusy(false);
  }

  // Draw a shareable warning card (PNG) from the check result — for
  // WhatsApp/Facebook posts that warn others about the number.
  async function shareCard() {
    if (!res?.ok || !res.masked) return;
    const m = RISK_METER[res.level || "none"];
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 630;
    const x = c.getContext("2d");
    if (!x) return;
    const grad = x.createLinearGradient(0, 0, 1200, 630);
    grad.addColorStop(0, "#063f2e"); grad.addColorStop(1, "#0b6e4f");
    x.fillStyle = grad; x.fillRect(0, 0, 1200, 630);
    x.fillStyle = "#d4a017"; x.fillRect(0, 0, 1200, 10);
    x.fillStyle = "#ffffff";
    x.font = "700 44px 'Hind Siliguri', sans-serif";
    x.fillText("🛡️ প্রতারক চেক", 64, 96);
    x.font = "500 30px 'Hind Siliguri', sans-serif";
    x.fillStyle = "#cfe8dc";
    x.fillText("টাকা পাঠানোর আগে যাচাই করা হয়েছে", 64, 146);
    x.font = "700 110px 'Hind Siliguri', sans-serif";
    x.fillStyle = "#ffffff";
    x.fillText(res.masked, 64, 290);
    // risk pill
    const label = res.levelLabel || "";
    x.font = "700 40px 'Hind Siliguri', sans-serif";
    const w = Math.min(1080, x.measureText(label).width + 64);
    x.fillStyle = m.color;
    x.beginPath(); x.roundRect(64, 340, w, 76, 38); x.fill();
    x.fillStyle = "#ffffff";
    x.fillText(label, 96, 392);
    x.font = "500 34px 'Hind Siliguri', sans-serif";
    x.fillStyle = "#e8f3ee";
    x.fillText(`যাচাইকৃত অভিযোগ: ${toBn(res.reportCount ?? 0)}টি`, 64, 492);
    x.font = "500 28px 'Hind Siliguri', sans-serif";
    x.fillStyle = "#9fc9b8";
    x.fillText("আপনিও যাচাই করুন — protarok-check.vercel.app", 64, 566);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], "protarok-check-card.png", { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "প্রতারক চেক — সতর্কতা" });
        return;
      }
      throw new Error("no file share");
    } catch {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "protarok-check-card.png";
      a.click();
      URL.revokeObjectURL(a.href);
      setCardMsg(true); setTimeout(() => setCardMsg(false), 2600);
    }
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

            {busy && (
              <div className="scanbox">
                {SCAN_STEPS.map((s, i) => (
                  <div key={i} className={"scanstep" + (i < scanStep ? " done" : i === scanStep ? " active" : "")}>
                    {i < scanStep ? "✓ " : ""}{s}
                  </div>
                ))}
              </div>
            )}
            {res && !res.ok && <div className="msg err">{res.error}</div>}
            {res && res.ok && (
              <div className={"result " + res.level}>
                <div className="lvl"><span className="lvl-ico">{LEVEL_ICON[res.level || "none"]}</span>{res.levelLabel}</div>
                <div className="meta" style={{ marginTop: 6 }}>
                  নম্বর: <strong>{res.masked}</strong>
                  {res.reportCount !== undefined && res.level !== "disputed" && <> · যাচাইকৃত অভিযোগ: <strong>{toBn(res.reportCount)}টি</strong></>}
                  {!!res.meToo && res.level !== "disputed" && <> · <strong>{toBn(res.meToo)} জন</strong> বলেছেন, তাদের সাথেও হয়েছে</>}
                </div>
                {res.level && RISK_METER[res.level] && (
                  <div className="meter-row">
                    <span className="small">ঝুঁকির মাত্রা: <strong>{RISK_METER[res.level].label}</strong></span>
                    <div className="meter"><div className="meter-fill" style={{ width: RISK_METER[res.level].pct + "%", background: RISK_METER[res.level].color }} /></div>
                  </div>
                )}
                {res.reports && res.reports.map((r, i) => (
                  <div className="rep" key={i}>
                    <div><span className="tag">{r.scamType}</span> <span className="meta">{r.channel}{r.amount ? ` · ক্ষতি: ৳${toBn(r.amount)}` : ""}{r.incidentDate ? ` · ঘটনা: ${toBn(r.incidentDate)}` : ""}</span></div>
                    <div>{r.description}</div>
                  </div>
                ))}
                <p className="small" style={{ marginBottom: 0 }}>{res.note}</p>
                <div className="shareline">
                  <button className="btn" type="button" onClick={share}>{copied ? "✓ কপি হয়েছে!" : "📤 ফলাফল শেয়ার করুন"}</button>
                  <button className="btn gold" type="button" onClick={shareCard}>{cardMsg ? "✓ কার্ড ডাউনলোড হয়েছে!" : "🖼️ সতর্কতা কার্ড"}</button>
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

        {hl && hl.fresh.length > 0 && (
          <section>
            <div className="sec-head"><span className="bar-ico">🔴</span><h2>সদ্য ধরা পড়া</h2></div>
            <p className="sec-sub">প্রমাণ যাচাই করে সদ্য তালিকায় যুক্ত হওয়া প্রতারক নম্বর — গোপনীয়তার জন্য আংশিক ঢাকা।</p>
            <div className="list">
              {hl.fresh.map((r, i) => (
                <div className="item" key={i}>
                  <div className="top">
                    <span className="num"><span className="pulse" />{r.masked}</span>
                    <span className="tag">{r.scamType}</span>
                  </div>
                  <div className="meta">{r.channel}{r.amount ? ` · ক্ষতি: ৳${toBn(r.amount)}` : ""} · যুক্ত হয়েছে {agoBn(r.at)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {hl && (hl.topWeek.length > 0 || hl.trending.length > 0) && (
          <section>
            <div className="cols2">
              {hl.topWeek.length > 0 && (
                <div>
                  <div className="sec-head"><span className="bar-ico">🏆</span><h2>এই সপ্তাহের টপ প্রতারক</h2></div>
                  <div className="list">
                    {hl.topWeek.map((r, i) => (
                      <a className="item linkitem" key={i} href={`/number/${r.phone}`}>
                        <div className="top">
                          <span className="num"><span className="rank">{toBn(i + 1)}</span>{r.masked}</span>
                          <span className="tag warn">{toBn(r.count)}টি অভিযোগ</span>
                        </div>
                        <div className="meta">{r.scamType}{r.totalLoss ? ` · মোট ক্ষতি: ৳${toBn(r.totalLoss)}` : ""}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {hl.trending.length > 0 && (
                <div>
                  <div className="sec-head"><span className="bar-ico">📈</span><h2>এখন সবচেয়ে বেশি যাচাই হচ্ছে</h2></div>
                  <div className="list">
                    {hl.trending.map((r, i) => (
                      <a className="item linkitem" key={i} href={`/number/${r.phone}`}>
                        <div className="top">
                          <span className="num">{r.masked}</span>
                          <span className="tag">{toBn(r.checks)} বার যাচাই</span>
                        </div>
                        <div className="meta">গত ২৪ ঘণ্টায় মানুষ এই নম্বর নিয়ে সবচেয়ে বেশি সন্দেহ করেছে</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {hl && hl.stories.length > 0 && (
          <section>
            <div className="sec-head"><span className="bar-ico">📖</span><h2>প্রতারণার গল্প</h2></div>
            <p className="sec-sub">আসল মানুষের আসল ঘটনা — পড়ুন, চিনে রাখুন, বাঁচুন।</p>
            <div className="list">
              {hl.stories.map((s, i) => (
                <a className="item linkitem" key={i} href="/stories">
                  <strong>{s.title}</strong>
                  <p className="small" style={{ margin: "6px 0" }}>{s.excerpt}</p>
                  <div className="meta">{s.masked} · {agoBn(s.at)}</div>
                </a>
              ))}
            </div>
            <p style={{ marginTop: 12 }}><a className="btn ghost" href="/stories">সব গল্প পড়ুন →</a></p>
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
