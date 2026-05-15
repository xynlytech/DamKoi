"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2, CheckCircle2, Smartphone } from "lucide-react";
import { isPushSupported, subscribeToPush, getPushState } from "@/lib/push";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
const EMAIL_KEY = "damkoi_alert_email";

export default function AlertFormClient({
  productId,
  currentPrice,
}: {
  productId: string;
  currentPrice: number | null;
}) {
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState(currentPrice ? String((currentPrice / 100) * 0.9 | 0) : "");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushState, setPushState] = useState<"unsupported" | "denied" | "subscribed" | "idle">("idle");

  useEffect(() => {
    const stored = localStorage.getItem(EMAIL_KEY);
    if (stored) setEmail(stored);
    if (isPushSupported()) {
      getPushState().then(setPushState);
    } else {
      setPushState("unsupported");
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || !price) return;
    setStatus("loading");
    try {
      const notifyVia: string[] = ["email"];
      if (pushEnabled && pushState !== "subscribed") {
        const ok = await subscribeToPush(trimmed);
        if (ok) notifyVia.push("push");
      } else if (pushState === "subscribed") {
        notifyVia.push("push");
      }

      const res = await fetch(`${API}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          target_price: Math.round(parseFloat(price) * 100),
          email: trimmed,
          notify_via: notifyVia,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Status ${res.status}`);
      }
      localStorage.setItem(EMAIL_KEY, trimmed);
      setStatus("ok");
      const pushMsg = notifyVia.includes("push") ? " + browser push" : "";
      setMsg(`Alert set! We'll notify you via email${pushMsg} when the price drops.`);
    } catch (e: unknown) {
      setStatus("err");
      setMsg(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
  };

  if (status === "ok") {
    return (
      <div className="dk-card p-6 text-center" style={{ border: "1px solid rgba(34,197,94,0.2)" }}>
        <div className="flex justify-center mb-3">
          <CheckCircle2 size={32} style={{ color: "var(--green)" }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>{msg}</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-3 text-xs transition-colors dk-focus"
          style={{ color: "var(--text-faint)" }}
        >
          Set another alert
        </button>
      </div>
    );
  }

  return (
    <div className="dk-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <Bell size={14} style={{ color: "var(--lav)" }} />
        </div>
        <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Set Price Alert
        </span>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="dk-input"
        />
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "var(--text-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>৳</span>
          <input
            type="number"
            placeholder="Target price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min="1"
            className="dk-input pl-9"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>
        {currentPrice && (
          <p className="text-[10px] -mt-2" style={{ color: "var(--text-faint)" }}>
            Current: ৳{(currentPrice / 100).toLocaleString("en-BD")} · Suggested: ৳{((currentPrice / 100) * 0.9).toFixed(0)}
          </p>
        )}

        {pushState !== "unsupported" && pushState !== "denied" && (
          <label className="flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={pushEnabled || pushState === "subscribed"}
                disabled={pushState === "subscribed"}
                onChange={(e) => setPushEnabled(e.target.checked)}
              />
              <div
                className="w-10 h-5 rounded-full transition-colors"
                style={{ background: (pushEnabled || pushState === "subscribed") ? "var(--purple)" : "var(--text-ghost)" }}
              />
              <div
                className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                style={{ transform: (pushEnabled || pushState === "subscribed") ? "translateX(20px)" : "translateX(0)" }}
              />
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <Smartphone size={12} />
              {pushState === "subscribed" ? "Browser push enabled" : "Also notify via browser"}
            </div>
          </label>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="dk-btn-primary w-full text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === "loading" ? (
            <><Loader2 size={14} className="animate-spin" /> Setting Alert…</>
          ) : (
            "Notify Me When Price Drops"
          )}
        </button>

        {status === "err" && (
          <p className="text-[11px] text-center" style={{ color: "var(--red)" }}>{msg}</p>
        )}
      </form>
    </div>
  );
}
