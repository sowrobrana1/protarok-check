"use client";
import { useState } from "react";
import { CHANNELS, SCAM_TYPES } from "@/lib/phone";

export default function ReportPage() {
  const [form, setForm] = useState({
    phone: "", channel: "bkash", scamType: "advance", amount: "",
    incidentDate: "", description: "", trxId: "", reporterPhone: "",
  });
  const [evidence, setEvidence] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  // Shrink the screenshot in the browser so uploads stay small.
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const max = 1000;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      setEvidence(c.toDataURL("image/jpeg", 0.78));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) { setMsg({ ok: false, text: "আগে নিচের সম্মতিতে টিক দিন।" }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, evidence }),
      });
      const j = await r.json();
      setMsg({ ok: j.ok, text: j.ok ? j.message : j.error });
      if (j.ok) { setForm({ phone: "", channel: "bkash", scamType: "advance", amount: "", incidentDate: "", description: "", trxId: "", reporterPhone: "" }); setEvidence(null); setAgree(false); }
    } catch { setMsg({ ok: false, text: "সংযোগে সমস্যা হচ্ছে। আবার চেষ্টা করুন।" }); }
    setBusy(false);
  }

  return (
    <main className="wrap">
      <section>
        <h2>প্রতারণার রিপোর্ট করুন</h2>
        <p className="small">
          আপনার রিপোর্ট সরাসরি প্রকাশ হবে না — প্রমাণ যাচাই করে তারপর প্রকাশ করা হবে।
          আপনার নিজের নম্বর শুধু যাচাইয়ের প্রয়োজনে নেওয়া হয়, <strong>কখনো প্রকাশ করা হয় না</strong>।
          প্রমাণ হিসেবে লেনদেনের <strong>TrxID অথবা স্ক্রিনশট</strong> — অন্তত একটি অবশ্যই লাগবে।
        </p>
        <form className="card" onSubmit={submit}>
          <label>প্রতারকের মোবাইল নম্বর *</label>
          <input inputMode="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />

          <label>কোন মাধ্যমে প্রতারণা হয়েছে? *</label>
          <select value={form.channel} onChange={(e) => set("channel", e.target.value)}>
            {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <label>প্রতারণার ধরন *</label>
          <select value={form.scamType} onChange={(e) => set("scamType", e.target.value)}>
            {Object.entries(SCAM_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <label>কত টাকা ক্ষতি হয়েছে? (ঐচ্ছিক)</label>
          <input inputMode="numeric" placeholder="যেমন: 5000" value={form.amount} onChange={(e) => set("amount", e.target.value)} />

          <label>ঘটনার তারিখ (ঐচ্ছিক)</label>
          <input type="date" value={form.incidentDate} onChange={(e) => set("incidentDate", e.target.value)} />

          <label>কী ঘটেছিল? *</label>
          <textarea placeholder="কীভাবে যোগাযোগ হয়েছিল, কী বলেছিল, কীভাবে টাকা পাঠিয়েছিলেন — সংক্ষেপে লিখুন।"
            value={form.description} onChange={(e) => set("description", e.target.value)} required />

          <label>লেনদেনের TrxID (প্রমাণ — TrxID অথবা স্ক্রিনশট যেকোনো একটি আবশ্যক)</label>
          <input placeholder="যেমন: 9HX7K2LMN1" value={form.trxId} onChange={(e) => set("trxId", e.target.value)} />

          <label>প্রমাণের স্ক্রিনশট (ঐচ্ছিক, TrxID দিলে ছাড়াও চলবে)</label>
          <input type="file" accept="image/*" onChange={onFile} />
          {evidence && <p className="small">ছবি যুক্ত হয়েছে ✓</p>}

          <label>আপনার নিজের মোবাইল নম্বর * (গোপন থাকবে)</label>
          <input inputMode="tel" placeholder="01XXXXXXXXX" value={form.reporterPhone} onChange={(e) => set("reporterPhone", e.target.value)} required />

          <label className="checkline">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>আমি নিশ্চিত করছি যে এই তথ্য সত্য। মিথ্যা রিপোর্ট করলে তা আইনি অপরাধ হতে পারে — এটা আমি জানি।</span>
          </label>

          {msg && <div className={"msg " + (msg.ok ? "ok" : "err")}>{msg.text}</div>}
          <p><button className="btn red" type="submit" disabled={busy}>{busy ? "জমা হচ্ছে…" : "রিপোর্ট জমা দিন"}</button></p>
        </form>
      </section>
    </main>
  );
}
