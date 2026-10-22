"use client";
import { useState } from "react";

export default function ObjectionPage() {
  const [form, setForm] = useState({ phone: "", reason: "", contact: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/objection", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      setMsg({ ok: j.ok, text: j.ok ? j.message : j.error });
      if (j.ok) setForm({ phone: "", reason: "", contact: "" });
    } catch { setMsg({ ok: false, text: "সংযোগে সমস্যা হচ্ছে। আবার চেষ্টা করুন।" }); }
    setBusy(false);
  }

  return (
    <main className="wrap">
      <div className="pagehead">
        <h2>✋ আপত্তি জানান</h2>
      </div>
      <section style={{ paddingTop: 6 }}>
        <p className="small">
          আপনার নম্বরে ভুল বা মিথ্যা অভিযোগ এসেছে মনে হলে এখানে আপত্তি জানান।
          আপত্তি জমা পড়লেই ওই নম্বরের পেজে "পর্যালোচনাধীন" দেখানো হবে, আর অভিযোগ
          ভুল প্রমাণিত হলে তা সম্পূর্ণ সরিয়ে দেওয়া হবে।
        </p>
        <form className="card" onSubmit={submit}>
          <label>আপনার মোবাইল নম্বর *</label>
          <input inputMode="tel" placeholder="01XXXXXXXXX" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <label>কেন এই অভিযোগ ভুল? *</label>
          <textarea placeholder="সংক্ষেপে লিখুন — যেমন: এই নম্বরটি আমার দোকানের, অভিযোগের ঘটনাটি সত্য নয় কারণ…"
            value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          <label>যোগাযোগের নম্বর বা ইমেইল *</label>
          <input placeholder="যাচাইয়ের জন্য আমরা যোগাযোগ করব"
            value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} required />
          {msg && <div className={"msg " + (msg.ok ? "ok" : "err")}>{msg.text}</div>}
          <p><button className="btn" type="submit" disabled={busy}>{busy ? "জমা হচ্ছে…" : "আপত্তি জমা দিন"}</button></p>
        </form>
      </section>
    </main>
  );
}
