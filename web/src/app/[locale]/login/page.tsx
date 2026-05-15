"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]   = useState("");
  const [pw, setPw]         = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "err">("idle");
  const [msg, setMsg]       = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading"); setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
    if (error) {
      setStatus("err");
      setMsg(
        error.message === "Invalid login credentials" ? "Wrong email or password."
        : error.message === "Email not confirmed"     ? "Check your inbox and confirm your email first."
        : error.message
      );
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-2xl overflow-hidden" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
            <img src="/dk-logo.svg" alt="DamKoi" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
          <h1 className="text-2xl font-bold text-center text-white mb-1">Sign In</h1>
          <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>Welcome back to DamKoi.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required autoFocus
                className="dk-input pl-10"
              />
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                className="dk-input pl-10 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors dk-focus"
                style={{ color: "var(--text-faint)" }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {status === "err" && <p className="text-xs -mt-1" style={{ color: "var(--red)" }}>{msg}</p>}

            <div className="flex justify-end -mt-1">
              <Link href="/forgot-password" className="text-[11px] transition-colors dk-focus" style={{ color: "var(--text-faint)" }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="dk-btn-primary w-full text-xs uppercase tracking-widest mt-1 disabled:opacity-50"
            >
              {status === "loading"
                ? <><Loader2 size={14} className="animate-spin" /> Signing in…</>
                : <><ArrowRight size={14} /> Sign In</>
              }
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: "var(--text-faint)" }}>
            No account?{" "}
            <Link href="/register" className="font-semibold transition-colors dk-focus" style={{ color: "var(--lav)" }}>Create one</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
