"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Users, Bell, Tag,
  Activity, GitMerge, Clock, LogOut, Shield, Menu, BarChart2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

const NAV = [
  { href: "/admin",          label: "Overview",     icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products",     icon: Package },
  { href: "/admin/users",    label: "Users",        icon: Users },
  { href: "/admin/alerts",   label: "Alerts",       icon: Bell },
  { href: "/admin/coupons",  label: "Coupons",      icon: Tag },
  { href: "/admin/scrapers",   label: "Scrapers",     icon: Activity },
  { href: "/admin/analytics", label: "Analytics",    icon: BarChart2 },
  { href: "/admin/compare",  label: "Match Groups", icon: GitMerge },
  { href: "/admin/cron",     label: "Cron Jobs",    icon: Clock },
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
      if (!session) { router.replace("/admin/login"); return; }

      const res = await fetch(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 401 || res.status === 403) {
        router.replace("/admin/login?error=not_admin"); return;
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid rgba(124,58,237,0.2)", borderTopColor: "var(--lav)" }} />
      </div>
    );
  }

  const isActive = (href: string, exact?: boolean) => {
    const base = pathname.replace(/^\/[a-z]{2}/, "");
    return exact ? base === href : base.startsWith(href);
  };

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 z-40 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:z-auto`}
        style={{ background: "var(--bg1)", borderRight: "1px solid var(--border-sm)" }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border-sm)" }}>
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
            <img src="/dk-logo.svg" alt="DamKoi" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">DamKoi</p>
            <p className="text-[9px] font-semibold uppercase tracking-widest flex items-center gap-1" style={{ color: "var(--red)" }}>
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all dk-focus"
                style={active
                  ? { background: "var(--bg3)", color: "var(--lav)" }
                  : { color: "var(--text-muted)" }
                }
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--border-sm)" }}>
          <p className="text-[10px] truncate mb-2" style={{ color: "var(--text-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>{email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-[10px] font-medium transition-colors dk-focus"
            style={{ color: "var(--text-faint)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14" style={{ borderBottom: "1px solid var(--border-sm)", background: "var(--bg1)" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 transition-colors dk-focus"
            style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
          >
            <Menu size={16} />
          </button>
          <span className="text-sm font-semibold" style={{ color: "var(--text-body)" }}>Admin Panel</span>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
