"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NavAuthButton() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!mounted) return null;

  if (email) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] hidden lg:block max-w-[120px] truncate" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
          {email}
        </span>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
          title="Sign out"
          className="rounded-lg p-2 transition-colors dk-focus"
          style={{ color: "rgba(255,255,255,0.3)", background: "var(--bg2)", border: "1px solid var(--border-sm)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}
        >
          <LogOut size={13} />
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest transition-colors dk-focus"
      style={{ color: "rgba(255,255,255,0.4)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#a78bfa"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
    >
      <User size={13} />
      Sign In
    </Link>
  );
}
