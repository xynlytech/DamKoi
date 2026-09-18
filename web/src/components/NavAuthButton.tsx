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
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
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
        <span className="text-sm hidden lg:block max-w-[160px] truncate" style={{ color: "var(--text-muted)" }}>
          {email}
        </span>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
          title="Sign out"
          aria-label="Sign out"
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors dk-focus"
          style={{ color: "var(--text-muted)", background: "transparent", border: "1px solid var(--border-sm)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
        >
          <LogOut size={15} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <Link href="/login" className="dk-nav-link flex items-center gap-1.5 dk-focus">
      <User size={15} aria-hidden />
      Sign in
    </Link>
  );
}
