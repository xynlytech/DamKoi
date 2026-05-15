"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "err">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (params.get("error") === "not_admin") {
      setStatus("err");
      setMsg("Your account does not have admin access.");
    }
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setStatus("err");
      setMsg(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
      return;
    }

    const res = await fetch(`${API}/admin/stats`, {
      headers: { Authorization: `Bearer ${data.session?.access_token}` },
    });

    if (res.status === 403) {
      await supabase.auth.signOut();
      setStatus("err");
      setMsg("This account does not have admin access.");
      return;
    }

    if (!res.ok) {
      setStatus("err");
      setMsg("Could not verify admin access. Try again.");
      return;
    }

    router.push("/admin");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Shield size={28} style={{ color: "var(--red)" }} />
          </div>
        </div>

        <div className="dk-card p-8">
          <h1 className="text-2xl font-bold text-center text-white mb-1">Admin Access</h1>
          <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>
            DamKoi internal panel.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
              <input
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="dk-input pl-10"
              />
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {status === "err" && <p className="text-xs" style={{ color: "var(--red)" }}>{msg}</p>}

            <button
              type="submit"
              disabled={status === "loading"}
              className="dk-btn-primary w-full text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {status === "loading" ? (
                <><Loader2 size={14} className="animate-spin" /> Verifying…</>
              ) : (
                <><Shield size={14} /> Enter Admin Panel</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
