"use client";
import { useEffect, useState } from "react";
import { toBn } from "@/lib/phone";

// One-tap "আমার সাথেও হয়েছে" — other victims of the same number can add
// themselves anonymously. Remembered per-browser via localStorage.
export default function MeTooButton({ phone, initialCount }: { phone: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = "metoo_" + phone;

  useEffect(() => {
    try { if (localStorage.getItem(key)) setDone(true); } catch { /* private mode */ }
  }, [key]);

  async function tap() {
    if (done || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/metoo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const j = await r.json();
      if (j.ok) {
        setCount(j.count);
        setDone(true);
        try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
      }
    } catch { /* network hiccup — leave the button active */ }
    setBusy(false);
  }

  return (
    <div className="item" style={{ marginTop: 20, textAlign: "center" }}>
      <p style={{ margin: "0 0 4px" }}>
        <strong>{toBn(count)} জন</strong> জানিয়েছেন — এই নম্বরে তাদের সাথেও এমন হয়েছে
      </p>
      <p className="small" style={{ marginTop: 0 }}>আপনার সাথেও হয়ে থাকলে এক চাপে জানিয়ে দিন — নাম-পরিচয় লাগবে না।</p>
      <button className="btn" type="button" onClick={tap} disabled={done || busy}
        style={done ? { opacity: 0.65, cursor: "default" } : undefined}>
        {done ? "✓ আপনি জানিয়েছেন — ধন্যবাদ" : busy ? "জমা হচ্ছে…" : "🤚 আমার সাথেও হয়েছে"}
      </button>
    </div>
  );
}
