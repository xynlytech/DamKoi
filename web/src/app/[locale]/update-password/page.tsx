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
        <div className="nm-raised rounded-2xl p-8 text-center max-w-md w-full">
          <div className="flex justify-center mb-4 text-emerald-400">
            <CheckCircle2 size={48} strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-black font-outfit">Password updated!</h2>
          <p className="text-white/40 text-sm mt-2">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="nm-raised rounded-2xl p-8">
          <h1 className="text-2xl font-black font-outfit mb-1">Set New Password</h1>
          <p className="text-white/40 text-sm mb-8">Choose a strong password for your account.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="New password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full nm-inset rounded-xl pl-10 pr-11 py-3.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
              <button type="button" onClick={() => setShowPw((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
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

            {status === "err" && <p className="text-xs text-rose-400">{msg}</p>}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3.5 nm-btn-primary rounded-xl text-xs uppercase tracking-widest font-black disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
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
