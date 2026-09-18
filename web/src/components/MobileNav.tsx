"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, User, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/",          label: "Home",      exact: true },
  { href: "/deals",      label: "Deals",      exact: false },
  { href: "/categories", label: "Categories", exact: false },
  { href: "/dashboard",  label: "Dashboard",  exact: false },
  { href: "/alerts",    label: "Alerts",    exact: false },
];

export default function MobileNav({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setEmail(s?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]); // eslint-disable-line react-hooks/set-state-in-effect -- close drawer on route change

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      <div className="md:hidden flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="w-9 h-9 rounded-lg flex items-center justify-center dk-focus"
          style={{ border: "1px solid var(--border-sm)", background: "transparent", color: "var(--text-muted)" }}
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 z-50 md:hidden flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "var(--bg1)", borderLeft: "1px solid var(--border-sm)" }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-sm)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
              <img src="/dk-logo.svg" alt="DamKoi" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>DamKoi</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="p-2 rounded-lg dk-focus"
            style={{ color: "var(--text-muted)", background: "var(--bg2)", border: "1px solid var(--border-sm)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-5 space-y-1">
          {LINKS.map(({ href, label, exact }) => {
            const full = `/${locale}${href === "/" ? "" : href}`;
            const active = exact
              ? pathname === full || pathname === `/${locale}/`
              : pathname.startsWith(`/${locale}${href}`);
            return (
              <Link
                key={href}
                href={`/${locale}${href}`}
                className="flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all dk-focus"
                style={active
                  ? { background: "var(--bg3)", color: "var(--lav)" }
                  : { color: "var(--text-muted)" }
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: auth + install */}
        <div className="px-4 py-5 space-y-3" style={{ borderTop: "1px solid var(--border-sm)" }}>
          <Link
            href={`/${locale}/install`}
            className="dk-btn-primary w-full dk-focus"
          >
            Get the extension
          </Link>

          {email ? (
            <div className="flex items-center justify-between gap-3 px-1">
              <span className="text-sm truncate" style={{ color: "var(--text-muted)" }}>
                {email}
              </span>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-sm font-medium flex-shrink-0 dk-focus"
                style={{ color: "var(--text-muted)" }}
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl dk-focus"
              style={{ color: "var(--text-muted)", background: "var(--bg2)", border: "1px solid var(--border-sm)" }}
            >
              <User size={15} aria-hidden /> Sign in
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
