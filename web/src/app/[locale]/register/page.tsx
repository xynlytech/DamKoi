"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail]   = useState("");
  const [pw, setPw]         = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "err">("idle");
  const [msg, setMsg]       = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    if (pw.length < 8)   { setStatus("err"); setMsg("Password must be at least 8 characters."); return; }
    if (pw !== confirm)  { setStatus("err"); setMsg("Passwords do not match."); return; }
    setStatus("loading");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: pw,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("err");
      setMsg(error.message.includes("already registered") ? "Account already exists. Sign in instead." : error.message);
      return;
    }
    if (data.session) { router.push("/dashboard"); return; }
    setStatus("done");
  };

  if (status === "done") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="rounded-2xl p-8 text-center" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
            <CheckCircle2 size={44} strokeWidth={1.5} className="mx-auto mb-5" style={{ color: "var(--green)" }} />
            <h2 className="text-xl font-bold text-white mb-3">Check your inbox</h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
              We sent a confirmation link to <span className="text-white font-semibold">{email}</span>. Click it to activate your account.
            </p>
            <Link href="/login" className="dk-btn-primary inline-flex items-center gap-2 text-xs uppercase tracking-widest dk-focus">
              Back to Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-center text-white mb-1">Create Account</h1>
          <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>Free. No credit card required.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className="dk-input pl-10" />
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
              <input type={showPw ? "text" : "password"} placeholder="Password (min 8 chars)" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} className="dk-input pl-10 pr-11" />
              <button type="button" onClick={() => setShowPw((p) => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors dk-focus" style={{ color: "var(--text-faint)" }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
              <input type={showPw ? "text" : "password"} placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="dk-input pl-10" />
            </div>

            {status === "err" && <p className="text-xs -mt-1" style={{ color: "var(--red)" }}>{msg}</p>}

            <button type="submit" disabled={status === "loading"} className="dk-btn-primary w-full text-xs uppercase tracking-widest mt-1 disabled:opacity-50">
              {status === "loading" ? <><Loader2 size={14} className="animate-spin" /> Creating account…</> : "Create Account"}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: "var(--text-faint)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold transition-colors dk-focus" style={{ color: "var(--lav)" }}>Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
