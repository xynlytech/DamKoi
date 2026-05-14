"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "err">("idle");
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/update-password` }
    );

    if (error) {
      setStatus("err");
      setMsg(error.message);
      return;
    }

    setStatus("done");
  };

  if (status === "done") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="nm-raised rounded-2xl p-8 text-center max-w-md w-full">
          <div className="flex justify-center mb-5 text-emerald-400">
            <CheckCircle2 size={48} strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-black font-outfit mb-3">Check your inbox</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Password reset link sent to{" "}
            <span className="text-white font-bold">{email}</span>.
          </p>
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm font-bold transition-colors">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="nm-raised rounded-2xl p-8">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-indigo-400 mb-6 transition-colors"
          >
            <ArrowLeft size={12} /> Back to Sign In
          </Link>

          <h1 className="text-2xl font-black font-outfit mb-1">Reset Password</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Enter your email and we&apos;ll send a reset link.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full nm-inset rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            {status === "err" && (
              <p className="text-xs text-rose-400">{msg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3.5 nm-btn-primary rounded-xl text-xs uppercase tracking-widest font-black disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <><Loader2 size={14} className="animate-spin" /> Sending…</>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
