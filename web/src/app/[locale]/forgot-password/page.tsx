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
    if (error) { setStatus("err"); setMsg(error.message); return; }
    setStatus("done");
  };

  if (status === "done") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="dk-card p-8 text-center max-w-md w-full">
          <div className="flex justify-center mb-5">
            <CheckCircle2 size={48} strokeWidth={1.5} style={{ color: "var(--green)" }} />
          </div>
          <h2 className="text-xl font-bold mb-3 text-white">Check your inbox</h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
            Password reset link sent to <span className="text-white font-semibold">{email}</span>.
          </p>
          <Link href="/login" className="text-sm font-semibold transition-colors dk-focus" style={{ color: "var(--lav)" }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="dk-card p-8">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-[11px] mb-6 transition-colors dk-focus"
            style={{ color: "var(--text-faint)" }}
          >
            <ArrowLeft size={12} /> Back to Sign In
          </Link>

          <h1 className="text-2xl font-bold mb-1 text-white">Reset Password</h1>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Enter your email and we&apos;ll send a reset link.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="dk-input pl-10 w-full"
              />
            </div>

            {status === "err" && <p className="text-xs" style={{ color: "var(--red)" }}>{msg}</p>}

            <button
              type="submit"
              disabled={status === "loading"}
              className="dk-btn-primary w-full text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
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
