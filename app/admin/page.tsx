"use client";
import { useState } from "react";
import { CHANNELS, SCAM_TYPES, maskPhone, toBn } from "@/lib/phone";

type Pending = {
  id: number; phone: string; masked: string; channel: string; scamType: string;
  amount: number | null; incidentDate: string | null; description: string;
  trxId: string | null; evidence: string | null; reporterPhone: string; createdAt: string;
};
type Dispute = { id: number; phone: string; reason: string; contact: string; createdAt: string };

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [msg, setMsg] = useState("");

  async function call(action: string, extra: any = {}) {
    const r = await fetch("/api/admin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action, ...extra }),
    });
    return r.json();
  }

  async function load() {
    const j = await call("list");
    if (!j.ok) { setMsg(j.error || "লোড হয়নি"); setAuthed(false); return; }
    setAuthed(true); setPending(j.pending); setDisputes(j.disputes); setMsg("");
  }

  async function act(action: string, id: number) {
    const j = await call(action, { id });
    if (j.ok) load(); else setMsg(j.error || "হয়নি");
  }

  if (!authed) {
    return (
      <main className="wrap">
        <section>
          <h2>অ্যাডমিন — মডারেশন</h2>
          <form className="card" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <label>অ্যাডমিন পাসওয়ার্ড</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {msg && <div className="msg err">{msg}</div>}
            <p><button className="btn" type="submit">ঢুকুন</button></p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="wrap">
      <section>
        <h2>মডারেশন কিউ</h2>
        {msg && <div className="msg err">{msg}</div>}

        <h3>অপেক্ষমাণ রিপোর্ট ({toBn(pending.length)})</h3>
        <div className="list">
          {pending.length === 0 && <p className="small">কোনো অপেক্ষমাণ রিপোর্ট নেই।</p>}
          {pending.map((r) => (
            <div className="item" key={r.id}>
              <div className="top"><span className="num">{r.phone}</span><span className="tag warn">{SCAM_TYPES[r.scamType] || r.scamType}</span></div>
              <div className="small">
                {CHANNELS[r.channel] || r.channel}{r.amount ? ` · ক্ষতি ৳${toBn(r.amount)}` : ""}{r.incidentDate ? ` · ঘটনা ${toBn(r.incidentDate)}` : ""}<br />
                TrxID: {r.trxId || "—"} · রিপোর্টার: {maskPhone(r.reporterPhone)} (গোপন) · {toBn(new Date(r.createdAt).toLocaleString("bn-BD"))}
              </div>
              <p style={{ margin: "8px 0" }}>{r.description}</p>
              {r.evidence && <img className="evidence" src={r.evidence} alt="প্রমাণের স্ক্রিনশট" />}
              <div className="adminbar">
                <button className="btn" onClick={() => act("approve", r.id)}>✓ যাচাই হয়েছে — প্রকাশ করুন</button>
                <button className="btn red" onClick={() => act("reject", r.id)}>✗ বাতিল</button>
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: 28 }}>খোলা আপত্তি ({toBn(disputes.length)})</h3>
        <div className="list">
          {disputes.length === 0 && <p className="small">কোনো খোলা আপত্তি নেই।</p>}
          {disputes.map((d) => (
            <div className="item" key={d.id}>
              <div className="top"><span className="num">{d.phone}</span><span className="meta small">{toBn(new Date(d.createdAt).toLocaleDateString("bn-BD"))}</span></div>
              <p style={{ margin: "8px 0" }}>{d.reason}</p>
              <div className="small">যোগাযোগ: {d.contact}</div>
              <div className="adminbar">
                <button className="btn red" onClick={() => act("dispute_remove", d.id)}>আপত্তি সঠিক — অভিযোগ সরান</button>
                <button className="btn ghost" onClick={() => act("dispute_keep", d.id)}>আপত্তি বাতিল — অভিযোগ থাকুক</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
