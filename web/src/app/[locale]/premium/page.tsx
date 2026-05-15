"use client";

import { useState } from "react";
import { PartyPopper, CheckCircle, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

export default function PremiumPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const mockUserId = "00000000-0000-0000-0000-000000000000";
      await fetch(`${API}/payments/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: mockUserId }),
      });
      await fetch(`${API}/payments/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: mockUserId, status: "success", amount: 199 }),
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4" style={{ background: "linear-gradient(to right, #a78bfa, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          DamKoi Premium
        </h1>
        <p className="text-lg" style={{ color: "var(--text-body)" }}>
          Take your shopping intelligence to the next level.
        </p>
      </div>

      {success ? (
        <div className="dk-card p-12 text-center" style={{ border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="flex justify-center mb-6">
            <PartyPopper size={64} strokeWidth={1.5} style={{ color: "var(--green)" }} />
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--green)" }}>You are now Premium!</h2>
          <p style={{ color: "var(--text-body)" }}>Enjoy unlimited price alerts and priority queueing.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="dk-card p-8" style={{ opacity: 0.6 }}>
            <h3 className="text-2xl font-bold mb-2 text-white">Free</h3>
            <div className="text-4xl font-bold mb-6 text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              ৳0<span className="text-lg font-normal" style={{ color: "var(--text-muted)" }}>/mo</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm">
              {[
                "Cross-platform price history",
                "Alternative Stores Compare",
                "Auto-apply Coupons (Daraz)",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3" style={{ color: "var(--text-body)" }}>
                  <CheckCircle size={16} className="flex-shrink-0" style={{ color: "var(--green)" }} /> {item}
                </li>
              ))}
              <li className="flex items-center gap-3" style={{ color: "var(--text-body)" }}>
                <CheckCircle size={16} className="flex-shrink-0" style={{ color: "var(--amber)" }} /> Up to 3 Active Price Alerts
              </li>
            </ul>
            <button disabled className="w-full py-3 rounded-xl text-sm font-semibold cursor-not-allowed" style={{ background: "var(--bg3)", color: "var(--text-faint)" }}>
              Current Plan
            </button>
          </div>

          {/* Premium Tier */}
          <div className="dk-card p-8 relative overflow-hidden" style={{ border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="absolute top-0 right-0 dk-btn-primary text-[10px] font-semibold uppercase tracking-widest py-1 px-4 rounded-bl-xl">Most Popular</div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: "var(--lav2)" }}>Premium</h3>
            <div className="text-4xl font-bold mb-6 text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              ৳199<span className="text-lg font-normal" style={{ color: "var(--text-muted)" }}>/mo</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm">
              {[
                { text: "Unlimited Price Alerts", bold: true },
                { text: "Priority Scraper Queue (updates 4x faster)", bold: false },
                { text: "Access to Spend Lens (Coming Soon)", bold: false },
                { text: "Product Lens AI Reports (Beta)", bold: false },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-3" style={{ color: "var(--text-body)" }}>
                  <CheckCircle size={16} className="flex-shrink-0" style={{ color: "var(--lav)" }} />
                  {item.bold ? <strong>{item.text}</strong> : item.text}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="dk-btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : "Upgrade to Premium"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
