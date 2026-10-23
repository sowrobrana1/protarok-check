"use client";
import { useState } from "react";
import { CHANNELS, SCAM_TYPES, maskPhone, toBn } from "@/lib/phone";

type Report = {
  id: number; phone: string; masked: string; channel: string; scamType: string;
  amount: number | null; incidentDate: string | null; description: string;
  trxId: string | null; evidence: string | null; reporterMasked?: string;
  reporterPhone?: string; status: string; createdAt: string; reviewedAt: string | null;
};
type Dispute = { id: number; phone: string; reason: string; contact: string; createdAt: string };
type LogRow = { id: number; reportId: number | null; phone: string | null; action: string; detail: string | null; createdAt: string };
type Stats = {
  totals: Record<string, number>;
  today: { date: string; visits: number; checks: number; reports: number };
  daily: { date: string; visits: number; checks: number; reports: number }[];
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "অপেক্ষমাণ", cls: "" },
  approved: { label: "প্রকাশিত", cls: "green" },
  rejected: { label: "বাতিল", cls: "red" },
  hidden: { label: "অফ (লুকানো)", cls: "gray" },
  withdrawn: { label: "প্রত্যাহার", cls: "gray" },
};
const ACTION_LABEL: Record<string, string> = {
  approve: "প্রকাশ", reject: "বাতিল", hide: "অফ রাখা", withdraw: "প্রত্যাহার",
  restore: "পুনরায় সক্রিয়", edit: "সম্পাদনা",
  dispute_remove: "আপত্তিতে সরানো", dispute_keep: "আপত্তি বাতিল",
};
const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "সব" },
  { key: "pending", label: "অপেক্ষমাণ" },
  { key: "approved", label: "প্রকাশিত" },
  { key: "rejected", label: "বাতিল" },
  { key: "hidden", label: "অফ" },
  { key: "withdrawn", label: "প্রত্যাহার" },
];

function evidenceList(ev: string | null): string[] {
  if (!ev) return [];
  if (ev.startsWith("[")) {
    try { const a = JSON.parse(ev); return Array.isArray(a) ? a.filter((x) => typeof x === "string") : []; } catch { return []; }
  }
  return [ev];
}
function dt(s: string) { return toBn(new Date(s).toLocaleString("bn-BD")); }

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"dash" | "queue" | "all" | "disputes" | "logs">("dash");
  const [pending, setPending] = useState<Report[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [repTotal, setRepTotal] = useState(0);
  const [repPage, setRepPage] = useState(1);
  const [repPages, setRepPages] = useState(1);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [history, setHistory] = useState<Record<number, LogRow[]>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(action: string, extra: any = {}) {
    const r = await fetch("/api/admin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action, ...extra }),
    });
    return r.json();
  }

  async function loadReports(status = filter, query = q, page = repPage) {
    const j = await call("reports", { status, q: query, page });
    if (j.ok) { setReports(j.reports); setRepTotal(j.total); setRepPage(j.page); setRepPages(j.pages); }
  }

  async function loadAll(page = 1) {
    const [a, b, c] = await Promise.all([call("list"), call("stats"), call("logs")]);
    if (!a.ok) { setMsg(a.error || "লোড হয়নি"); setAuthed(false); return; }
    setAuthed(true);
    setPending(a.pending); setDisputes(a.disputes);
    if (b.ok) setStats(b);
    if (c.ok) setLogs(c.logs);
    setMsg("");
    await loadReports(filter, q, page);
  }

  async function login() {
    setBusy(true);
    await loadAll(1);
    setBusy(false);
  }

  async function setStatus(id: number, to: string, label: string) {
    if ((to === "hidden" || to === "withdrawn" || to === "rejected") && !window.confirm(`রিপোর্ট #${toBn(id)} — ${label}: নিশ্চিত তো?`)) return;
    const j = await call("set_status", { id, to });
    if (j.ok) { setMsg(`✓ রিপোর্ট #${toBn(id)}: ${label} হয়েছে।`); loadAll(repPage); }
    else setMsg(j.error || "হয়নি");
  }

  async function act(action: string, id: number) {
    const j = await call(action, { id });
    if (j.ok) { setMsg("✓ হয়ে গেছে।"); loadAll(repPage); } else setMsg(j.error || "হয়নি");
  }

  async function toggleHistory(id: number) {
    if (history[id]) { const h = { ...history }; delete h[id]; setHistory(h); return; }
    const j = await call("history", { id });
    if (j.ok) setHistory({ ...history, [id]: j.history });
  }

  function startEdit(r: Report) {
    setEditing(r.id);
    setForm({
      phone: r.phone, channel: r.channel, scamType: r.scamType,
      amount: r.amount === null ? "" : String(r.amount),
      incidentDate: r.incidentDate || "", description: r.description, trxId: r.trxId || "",
    });
  }

  async function saveEdit(id: number) {
    const fields = { ...form, amount: form.amount === "" ? null : parseInt(form.amount, 10) };
    const j = await call("update", { id, fields });
    if (j.ok) { setEditing(null); setMsg(j.note ? `রিপোর্ট #${toBn(id)}: ${j.note}` : `✓ রিপোর্ট #${toBn(id)} সম্পাদনা সংরক্ষিত।`); loadAll(repPage); }
    else setMsg(j.error || "সংরক্ষণ হয়নি");
  }

  if (!authed) {
    return (
      <main className="wrap">
        <section>
          <h2>অ্যাডমিন প্যানেল</h2>
          <form className="card" onSubmit={(e) => { e.preventDefault(); login(); }}>
            <label>অ্যাডমিন পাসওয়ার্ড</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {msg && <div className="msg err">{msg}</div>}
            <p><button className="btn" type="submit" disabled={busy}>{busy ? "লোড হচ্ছে…" : "ঢুকুন"}</button></p>
          </form>
        </section>
      </main>
    );
  }

  const t = stats?.totals || {};
  const statusBtns = (r: Report) => {
    const b: { to: string; label: string; cls: string }[] = [];
    if (r.status !== "approved") b.push({ to: "approved", label: r.status === "hidden" || r.status === "withdrawn" ? "আবার প্রকাশ করুন" : "✓ প্রকাশ করুন", cls: "btn" });
    if (r.status === "rejected" || r.status === "withdrawn") b.push({ to: "pending", label: "পুনরায় অপেক্ষমাণ", cls: "btn ghost" });
    if (r.status !== "hidden" && r.status !== "withdrawn") b.push({ to: "hidden", label: "অফ রাখুন", cls: "btn ghost" });
    if (r.status !== "withdrawn") b.push({ to: "withdrawn", label: "প্রত্যাহার", cls: "btn ghost" });
    if (r.status !== "rejected") b.push({ to: "rejected", label: "✗ বাতিল", cls: "btn red" });
    return b;
  };

  const reportCard = (r: Report, queueMode: boolean) => (
    <div className="item" key={r.id}>
      <div className="top">
        <span className="num">#{toBn(r.id)} · {r.phone}</span>
        <span>
          <span className={"tag " + (STATUS_META[r.status]?.cls || "")}>{STATUS_META[r.status]?.label || r.status}</span>{" "}
          <span className="tag">{SCAM_TYPES[r.scamType] || r.scamType}</span>
        </span>
      </div>
      <div className="small">
        {CHANNELS[r.channel] || r.channel}{r.amount ? ` · ক্ষতি ৳${toBn(r.amount)}` : ""}{r.incidentDate ? ` · ঘটনা ${toBn(r.incidentDate)}` : ""}<br />
        TrxID: {r.trxId || "—"} · রিপোর্টার: {maskPhone(r.reporterMasked || r.reporterPhone || "")} (গোপন) · জমা: {dt(r.createdAt)}
        {r.reviewedAt ? ` · পর্যালোচনা: ${dt(r.reviewedAt)}` : ""}
      </div>
      <p style={{ margin: "8px 0" }}>{r.description}</p>
      {evidenceList(r.evidence).map((src, i) => (
        <img key={i} className="evidence" src={src} alt={"প্রমাণের স্ক্রিনশট " + (i + 1)} />
      ))}

      {editing === r.id ? (
        <div className="editbox">
          <label>নম্বর</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label>মাধ্যম</label>
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
            {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label>প্রতারণার ধরন</label>
          <select value={form.scamType} onChange={(e) => setForm({ ...form, scamType: e.target.value })}>
            {Object.entries(SCAM_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label>ক্ষতির টাকা (খালি = নেই)</label>
          <input inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <label>ঘটনার তারিখ</label>
          <input type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} />
          <label>TrxID</label>
          <input value={form.trxId} onChange={(e) => setForm({ ...form, trxId: e.target.value })} />
          <label>বিবরণ</label>
          <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="adminbar">
            <button className="btn" onClick={() => saveEdit(r.id)}>সংরক্ষণ করুন</button>
            <button className="btn ghost" onClick={() => setEditing(null)}>বন্ধ করুন</button>
          </div>
        </div>
      ) : (
        <div className="adminbar">
          {queueMode ? (
            <>
              <button className="btn" onClick={() => act("approve", r.id)}>✓ যাচাই হয়েছে — প্রকাশ করুন</button>
              <button className="btn red" onClick={() => act("reject", r.id)}>✗ বাতিল</button>
            </>
          ) : (
            statusBtns(r).map((b) => (
              <button key={b.to} className={b.cls} onClick={() => setStatus(r.id, b.to, STATUS_META[b.to]?.label || b.to)}>{b.label}</button>
            ))
          )}
          <button className="btn ghost" onClick={() => startEdit(r)}>✎ সম্পাদনা</button>
          <button className="btn ghost" onClick={() => toggleHistory(r.id)}>ইতিহাস</button>
        </div>
      )}

      {history[r.id] && (
        <div className="histbox">
          {history[r.id].length === 0 && <p className="small">এই রিপোর্টে এখনো কোনো অ্যাডমিন কাজের রেকর্ড নেই।</p>}
          {history[r.id].map((h) => (
            <div className="histrow" key={h.id}>
              <span className="tag">{ACTION_LABEL[h.action] || h.action}</span>
              <span className="small">{dt(h.createdAt)}{h.detail ? ` · ${h.detail}` : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <main className="wrap">
      <section>
        <h2>অ্যাডমিন প্যানেল</h2>
        {msg && <div className="msg ok">{msg}</div>}

        <div className="tabbar">
          <button className={tab === "dash" ? "tabbtn on" : "tabbtn"} onClick={() => setTab("dash")}>ড্যাশবোর্ড</button>
          <button className={tab === "queue" ? "tabbtn on" : "tabbtn"} onClick={() => setTab("queue")}>মডারেশন কিউ ({toBn(pending.length)})</button>
          <button className={tab === "all" ? "tabbtn on" : "tabbtn"} onClick={() => setTab("all")}>সব রিপোর্ট ({toBn(repTotal)})</button>
          <button className={tab === "disputes" ? "tabbtn on" : "tabbtn"} onClick={() => setTab("disputes")}>আপত্তি ({toBn(disputes.length)})</button>
          <button className={tab === "logs" ? "tabbtn on" : "tabbtn"} onClick={() => setTab("logs")}>কার্যকলাপ</button>
        </div>

        {tab === "dash" && stats && (
          <>
            <div className="statgrid">
              <div className="statcard"><div className="statnum">{toBn(stats.today.visits)}</div><div className="statlabel">আজকের ভিজিট</div></div>
              <div className="statcard"><div className="statnum">{toBn(stats.today.checks)}</div><div className="statlabel">আজকের যাচাই</div></div>
              <div className="statcard"><div className="statnum">{toBn(stats.today.reports)}</div><div className="statlabel">আজকের রিপোর্ট</div></div>
              <div className="statcard"><div className="statnum">{toBn(t.total || 0)}</div><div className="statlabel">মোট রিপোর্ট</div></div>
              <div className="statcard warn"><div className="statnum">{toBn(t.pending || 0)}</div><div className="statlabel">অপেক্ষমাণ</div></div>
              <div className="statcard"><div className="statnum">{toBn(t.approved || 0)}</div><div className="statlabel">প্রকাশিত</div></div>
              <div className="statcard"><div className="statnum">{toBn(t.hidden || 0)}</div><div className="statlabel">অফ (লুকানো)</div></div>
              <div className="statcard"><div className="statnum">{toBn(t.withdrawn || 0)}</div><div className="statlabel">প্রত্যাহার</div></div>
              <div className="statcard"><div className="statnum">{toBn(t.rejected || 0)}</div><div className="statlabel">বাতিল</div></div>
              <div className="statcard warn"><div className="statnum">{toBn(t.disputesOpen || 0)}</div><div className="statlabel">খোলা আপত্তি</div></div>
            </div>
            <h3>গত ১৪ দিন</h3>
            <div className="daytable">
              <div className="dayrow head"><span>তারিখ</span><span>ভিজিট</span><span>যাচাই</span><span>রিপোর্ট</span></div>
              {[...stats.daily].reverse().map((d, i) => (
                <div className="dayrow" key={i}><span>{d.date}</span><span>{toBn(d.visits)}</span><span>{toBn(d.checks)}</span><span>{toBn(d.reports)}</span></div>
              ))}
            </div>
            <p className="small">ভিজিট = প্রতিদিন কতজন (ব্রাউজার সেশন ধরে) ওয়েবসাইটে এসেছেন। যাচাই = কতগুলো নম্বর চেক করা হয়েছে।</p>
          </>
        )}

        {tab === "queue" && (
          <>
            <h3>অপেক্ষমাণ রিপোর্ট ({toBn(pending.length)})</h3>
            <div className="list">
              {pending.length === 0 && <p className="small">কোনো অপেক্ষমাণ রিপোর্ট নেই।</p>}
              {pending.map((r) => reportCard(r, true))}
            </div>
          </>
        )}

        {tab === "all" && (
          <>
            <div className="chips">
              {FILTERS.map((f) => (
                <button key={f.key} className={filter === f.key ? "chip on" : "chip"}
                  onClick={() => { setFilter(f.key); setRepPage(1); loadReports(f.key, q, 1); }}>{f.label}</button>
              ))}
            </div>
            <form className="searchrow" onSubmit={(e) => { e.preventDefault(); setRepPage(1); loadReports(filter, q, 1); }}>
              <input placeholder="নম্বর দিয়ে খুঁজুন (যেমন 017…)" value={q} onChange={(e) => setQ(e.target.value)} inputMode="tel" />
              <button className="btn" type="submit">খুঁজুন</button>
            </form>
            <p className="small">মোট {toBn(repTotal)}টি রিপোর্ট · পৃষ্ঠা {toBn(repPage)}/{toBn(repPages)} · সিরিয়াল = #নম্বর</p>
            <div className="list">
              {reports.length === 0 && <p className="small">কোনো রিপোর্ট পাওয়া যায়নি।</p>}
              {reports.map((r) => reportCard(r, false))}
            </div>
            <div className="adminbar">
              <button className="btn ghost" disabled={repPage <= 1} onClick={() => loadReports(filter, q, repPage - 1)}>← আগের পৃষ্ঠা</button>
              <button className="btn ghost" disabled={repPage >= repPages} onClick={() => loadReports(filter, q, repPage + 1)}>পরের পৃষ্ঠা →</button>
            </div>
          </>
        )}

        {tab === "disputes" && (
          <>
            <h3>খোলা আপত্তি ({toBn(disputes.length)})</h3>
            <div className="list">
              {disputes.length === 0 && <p className="small">কোনো খোলা আপত্তি নেই।</p>}
              {disputes.map((d) => (
                <div className="item" key={d.id}>
                  <div className="top"><span className="num">{d.phone}</span><span className="meta small">{dt(d.createdAt)}</span></div>
                  <p style={{ margin: "8px 0" }}>{d.reason}</p>
                  <div className="small">যোগাযোগ: {d.contact}</div>
                  <div className="adminbar">
                    <button className="btn red" onClick={() => act("dispute_remove", d.id)}>আপত্তি সঠিক — অভিযোগ অফ করুন</button>
                    <button className="btn ghost" onClick={() => act("dispute_keep", d.id)}>আপত্তি বাতিল — অভিযোগ থাকুক</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "logs" && (
          <>
            <h3>সাম্প্রতিক কার্যকলাপ (স্থায়ী রেকর্ড)</h3>
            <div className="list">
              {logs.length === 0 && <p className="small">এখনো কোনো রেকর্ড নেই। (AdminLog টেবিলের SQL না চালালে রেকর্ড জমবে না।)</p>}
              {logs.map((h) => (
                <div className="histrow" key={h.id}>
                  <span className="tag">{ACTION_LABEL[h.action] || h.action}</span>
                  <span className="small">
                    {h.reportId ? `রিপোর্ট #${toBn(h.reportId)}` : ""}{h.phone ? ` · ${h.phone}` : ""} · {dt(h.createdAt)}{h.detail ? ` · ${h.detail}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
