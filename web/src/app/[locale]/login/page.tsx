"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "err">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setStatus("err");
      setMsg(
        error.message === "Invalid login credentials"
          ? "Wrong email or password."
          : error.message === "Email not confirmed"
          ? "Check your inbox and confirm your email first."
          : error.message
      );
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 nm-raised rounded-2xl flex items-center justify-center overflow-hidden">
            <img src="/dk-logo.svg" alt="DamKoi" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="nm-raised rounded-2xl p-8">
          <h1 className="text-2xl font-black font-outfit text-center mb-1">Sign In</h1>
          <p className="text-white/40 text-sm text-center mb-8">
            Welcome back to DamKoi.
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
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

            {status === "err" && (
              <p className="text-xs text-rose-400 -mt-1">{msg}</p>
            )}

            <div className="flex justify-end -mt-1">
              <Link
                href="/forgot-password"
                className="text-[11px] text-white/30 hover:text-indigo-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3.5 nm-btn-primary rounded-xl text-xs uppercase tracking-widest font-black disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {status === "loading" ? (
                <><Loader2 size={14} className="animate-spin" /> Signing in…</>
              ) : (
                <><ArrowRight size={14} /> Sign In</>
              )}
            </button>
          </form>

          <p className="text-center text-[12px] text-white/30 mt-6">
            No account?{" "}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
