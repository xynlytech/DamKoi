"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "err">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (password.length < 8) {
      setStatus("err");
      setMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("err");
      setMsg("Passwords do not match.");
      return;
    }

    setStatus("loading");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("err");
      setMsg(
        error.message.includes("already registered")
          ? "Account already exists. Sign in instead."
          : error.message
      );
      return;
    }

    // If email confirmation is disabled in Supabase, session is set immediately
    if (data.session) {
      router.push("/dashboard");
      return;
    }

    // Email confirmation required
    setStatus("done");
  };

  if (status === "done") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="nm-raised rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-5 text-emerald-400">
              <CheckCircle2 size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-black font-outfit mb-3">Check your inbox</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              We sent a confirmation link to{" "}
              <span className="text-white font-bold">{email}</span>.
              Click it to activate your account.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 nm-btn-primary px-6 py-3 rounded-xl text-xs uppercase tracking-widest font-black"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 nm-raised rounded-2xl flex items-center justify-center overflow-hidden">
            <img src="/dk-logo.svg" alt="DamKoi" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="nm-raised rounded-2xl p-8">
          <h1 className="text-2xl font-black font-outfit text-center mb-1">Create Account</h1>
          <p className="text-white/40 text-sm text-center mb-8">
            Free. No credit card required.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full nm-inset rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full nm-inset rounded-xl pl-10 pr-11 py-3.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full nm-inset rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            {status === "err" && (
              <p className="text-xs text-rose-400 -mt-1">{msg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3.5 nm-btn-primary rounded-xl text-xs uppercase tracking-widest font-black disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {status === "loading" ? (
                <><Loader2 size={14} className="animate-spin" /> Creating account…</>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-[12px] text-white/30 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
