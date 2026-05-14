"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Users, Bell, Tag,
  Activity, GitMerge, Clock, LogOut, Shield, Menu, X
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/alerts", label: "Alerts", icon: Bell },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/scrapers", label: "Scrapers", icon: Activity },
  { href: "/admin/compare", label: "Match Groups", icon: GitMerge },
  { href: "/admin/cron", label: "Cron Jobs", icon: Clock },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/admin/login");
        return;
      }

      // Verify is_admin via stats endpoint
      const res = await fetch(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 401 || res.status === 403) {
        router.replace("/admin/login?error=not_admin");
        return;
      }

      setEmail(session.user.email ?? null);
      setChecking(false);
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/admin/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  const isActive = (href: string, exact?: boolean) => {
    const base = pathname.replace(/^\/[a-z]{2}/, "");
    return exact ? base === href : base.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-60 z-40 flex flex-col
        nm-raised border-r border-white/5
        transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:z-auto
      `}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-xl nm-raised overflow-hidden">
            <img src="/dk-logo.svg" alt="DamKoi" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-black font-outfit text-white">DamKoi</p>
            <p className="text-[9px] text-rose-400 font-bold uppercase tracking-widest flex items-center gap-1">
              <Shield size={8} /> Admin
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "nm-inset text-indigo-400"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/5">
          <p className="text-[10px] text-white/30 font-mono truncate mb-2">{email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-[10px] text-white/30 hover:text-rose-400 transition-colors font-bold"
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-white/5 nm-raised">
          <button
            onClick={() => setSidebarOpen(true)}
            className="nm-raised rounded-lg p-2 text-white/40"
          >
            <Menu size={16} />
          </button>
          <span className="text-sm font-black font-outfit text-white/60">Admin Panel</span>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
