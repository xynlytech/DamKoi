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

    // Verify is_admin via backend
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
          <div className="w-14 h-14 nm-raised rounded-2xl flex items-center justify-center text-rose-400">
            <Shield size={28} />
          </div>
        </div>

        <div className="nm-raised rounded-2xl p-8">
          <h1 className="text-2xl font-black font-outfit text-center mb-1">Admin Access</h1>
          <p className="text-white/40 text-sm text-center mb-8">
            DamKoi internal panel.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              <input
                type="email"
                placeholder="Admin email"
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

            {status === "err" && <p className="text-xs text-rose-400">{msg}</p>}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3.5 nm-btn-primary rounded-xl text-xs uppercase tracking-widest font-black disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
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
