"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const code = params.get("code");

    if (code) {
      // PKCE flow
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        router.replace(error ? "/login?error=auth_failed" : "/dashboard");
      });
    } else if (hash.includes("access_token")) {
      // Implicit flow — Supabase client auto-processes hash on init
      // Listen for the session to be set
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          router.replace("/dashboard");
        }
      });
      // Fallback: check if session already exists
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          subscription.unsubscribe();
          router.replace("/dashboard");
        }
      });
    } else {
      router.replace("/login?error=auth_failed");
    }
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Loader2 size={28} className="animate-spin" style={{ color: "var(--lav)" }} />
    </div>
  );
}
