"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PartyPopper, CheckCircle } from 'lucide-react';

export default function PremiumPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // Mock user_id for demonstration (normally fetched from auth state)
      const mockUserId = "00000000-0000-0000-0000-000000000000";
      
      const res = await fetch("http://localhost:8000/v1/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: mockUserId })
      });
      
      const data = await res.json();
      
      // Simulate webhook fulfillment immediately for MVP
      await fetch("http://localhost:8000/v1/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: mockUserId, status: "success", amount: 199 })
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
        <h1 className="text-5xl font-black font-outfit mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          DamKoi Premium
        </h1>
        <p className="text-white/60 text-lg">
          Take your shopping intelligence to the next level.
        </p>
      </div>

      {success ? (
        <div className="nm-raised border border-emerald-500/20 p-12 rounded-2xl text-center">
          <div className="flex justify-center mb-6 text-emerald-400">
            <PartyPopper size={64} strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-bold text-emerald-400 mb-4">You are now Premium!</h2>
          <p className="text-white/60">Enjoy unlimited price alerts and priority queueing.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="nm-raised p-8 rounded-2xl opacity-60">
            <h3 className="text-2xl font-bold mb-2">Free</h3>
            <div className="text-4xl font-black mb-6">৳0<span className="text-lg text-white/40 font-normal">/mo</span></div>
            <ul className="space-y-4 mb-8 text-sm">
              <li className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-400 flex-shrink-0" /> Cross-platform price history</li>
              <li className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-400 flex-shrink-0" /> Alternative Stores Compare</li>
              <li className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-400 flex-shrink-0" /> Auto-apply Coupons (Daraz)</li>
              <li className="flex items-center gap-3"><CheckCircle size={16} className="text-yellow-400 flex-shrink-0" /> Up to 3 Active Price Alerts</li>
            </ul>
            <button disabled className="w-full py-3 nm-inset rounded-xl text-white/50 font-bold cursor-not-allowed">
              Current Plan
            </button>
          </div>

          {/* Premium Tier */}
          <div className="nm-raised border border-indigo-500/30 p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 nm-btn-primary text-[10px] font-black uppercase tracking-widest py-1 px-4 rounded-bl-xl">Most Popular</div>
            <h3 className="text-2xl font-bold mb-2 text-indigo-300">Premium</h3>
            <div className="text-4xl font-black mb-6">৳199<span className="text-lg text-white/40 font-normal">/mo</span></div>
            <ul className="space-y-4 mb-8 text-sm">
              <li className="flex items-center gap-3"><CheckCircle size={16} className="text-indigo-400 flex-shrink-0" /> <strong>Unlimited Price Alerts</strong></li>
              <li className="flex items-center gap-3"><CheckCircle size={16} className="text-indigo-400 flex-shrink-0" /> Priority Scraper Queue (updates 4x faster)</li>
              <li className="flex items-center gap-3"><CheckCircle size={16} className="text-indigo-400 flex-shrink-0" /> Access to Spend Lens (Coming Soon)</li>
              <li className="flex items-center gap-3"><CheckCircle size={16} className="text-indigo-400 flex-shrink-0" /> Product Lens AI Reports (Beta)</li>
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 nm-btn-primary rounded-xl disabled:opacity-50"
            >
              {loading ? "Processing..." : "Upgrade to Premium"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
