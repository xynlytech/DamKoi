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
        <span className="text-[10px] text-white/30 font-mono hidden lg:block max-w-[120px] truncate">
          {email}
        </span>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          title="Sign out"
          className="nm-raised rounded-lg p-2 text-white/30 hover:text-rose-400 transition-colors"
        >
          <LogOut size={13} />
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40 hover:text-indigo-400 transition-colors nm-focus"
    >
      <User size={13} />
      Sign In
    </Link>
  );
}
