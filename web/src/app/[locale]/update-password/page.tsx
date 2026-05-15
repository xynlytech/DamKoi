"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "err">("idle");
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setStatus("err"); setMsg("Min 8 characters."); return; }
    if (password !== confirm) { setStatus("err"); setMsg("Passwords do not match."); return; }
    setStatus("loading");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setStatus("err"); setMsg(error.message); return; }
    setStatus("done");
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  if (status === "done") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="dk-card p-8 text-center max-w-md w-full">
          <div className="flex justify-center mb-4">
            <CheckCircle2 size={48} strokeWidth={1.5} style={{ color: "var(--green)" }} />
          </div>
          <h2 className="text-xl font-bold text-white">Password updated!</h2>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="dk-card p-8">
          <h1 className="text-2xl font-bold mb-1 text-white">Set New Password</h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>Choose a strong password for your account.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
              <input
                type={showPw ? "text" : "password"}
                placeholder="New password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="dk-input pl-10 pr-11 w-full"
              />
              <button type="button" onClick={() => setShowPw((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors dk-focus"
                style={{ color: "var(--text-faint)" }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="dk-input pl-10 w-full"
              />
            </div>

            {status === "err" && <p className="text-xs" style={{ color: "var(--red)" }}>{msg}</p>}

            <button
              type="submit"
              disabled={status === "loading"}
              className="dk-btn-primary w-full text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {status === "loading" ? (
                <><Loader2 size={14} className="animate-spin" /> Updating…</>
              ) : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
