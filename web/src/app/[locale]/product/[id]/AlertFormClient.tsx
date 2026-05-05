"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2, CheckCircle2 } from "lucide-react";

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

  useEffect(() => {
    const stored = localStorage.getItem(EMAIL_KEY);
    if (stored) setEmail(stored);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || !price) return;
    setStatus("loading");
    try {
      const res = await fetch(`${API}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          target_price: Math.round(parseFloat(price) * 100),
          email: trimmed,
          notify_via: ["email"],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Status ${res.status}`);
      }
      localStorage.setItem(EMAIL_KEY, trimmed);
      setStatus("ok");
      setMsg("Alert set! We'll email you when the price drops.");
    } catch (e: unknown) {
      setStatus("err");
      setMsg(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
  };

  if (status === "ok") {
    return (
      <div className="glass-card rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5 text-center">
        <div className="flex justify-center mb-2 text-emerald-400">
          <CheckCircle2 size={32} />
        </div>
        <p className="text-sm font-bold text-emerald-400">{msg}</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-3 text-xs text-white/30 hover:text-white transition-colors"
        >
          Set another alert
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
          <Bell size={14} className="text-indigo-400" />
        </div>
        <span className="text-sm font-black font-outfit uppercase tracking-wider text-white/80">
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
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-all"
        />
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-mono text-sm">৳</span>
          <input
            type="number"
            placeholder="Target price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min="1"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm font-mono outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
        {currentPrice && (
          <p className="text-[10px] text-white/20 -mt-2">
            Current price: ৳{(currentPrice / 100).toLocaleString("en-BD")} · Suggested: ৳{((currentPrice / 100) * 0.9).toFixed(0)}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === "loading" ? (
            <><Loader2 size={14} className="animate-spin" /> Setting Alert…</>
          ) : (
            "Notify Me When Price Drops"
          )}
        </button>

        {status === "err" && (
          <p className="text-[11px] text-rose-400 text-center">{msg}</p>
        )}
      </form>
    </div>
  );
}
