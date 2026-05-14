"use client";

import { useState, useEffect } from "react";
import { X, Mail, Bell, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentPrice: number;
}

export function PriceAlertModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentPrice,
}: PriceAlertModalProps) {
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState<string>(
    Math.floor(currentPrice * 0.9).toString()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          target_price: parseInt(targetPrice) * 100, // Convert to paisa
          email: email,
          notify_via: ["email"],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create alert");
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={cn(
        "relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#121216]/90 p-8 shadow-2xl backdrop-blur-xl transition-all animate-in fade-in zoom-in duration-300",
        isSuccess ? "border-emerald-500/30" : ""
      )}>
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-10 w-10 animate-spring" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-white">Alert Created!</h3>
            <p className="text-white/60">
              We&apos;ll send an email to <span className="text-emerald-400 font-medium">{email}</span> when the price drops below ৳{parseInt(targetPrice).toLocaleString()}.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-white pr-8">{productName}</h3>
              <p className="mt-2 text-white/50">Set your target price and we&apos;ll handle the rest.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-10 pr-4 text-white placeholder:text-white/20 outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Target Price (BDT)</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary font-bold transition-colors">৳</div>
                  <input
                    type="number"
                    required
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-10 pr-4 text-white outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-bold text-lg"
                  />
                </div>
                <p className="text-[10px] text-white/30 italic">
                  Current Price: ৳{currentPrice.toLocaleString()}
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-primary py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(167,139,250,0.3)]"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Create Price Alert"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
