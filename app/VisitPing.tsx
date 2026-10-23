"use client";
import { useEffect } from "react";

// Counts one visit per browser session for the admin dashboard.
// Sends nothing but the path — no user data, no tracking across sites.
export default function VisitPing() {
  useEffect(() => {
    try {
      const path = window.location.pathname;
      if (path.startsWith("/admin")) return;
      if (sessionStorage.getItem("pc-visit")) return;
      sessionStorage.setItem("pc-visit", "1");
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* ignore */ }
  }, []);
  return null;
}
