"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell, Mail, Trash2, PauseCircle, PlayCircle,
  Plus, ArrowUpRight, AlertCircle, Loader2, CheckCircle2,
  ShoppingCart, BellOff, User
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
const FREE_LIMIT = 3;

type Alert = {
  id: string;
  product_id: string;
  product_title: string | null;
  product_image: string | null;
  current_price: number | null;
  target_price: number;
  is_active: boolean;
  last_triggered: string | null;
  created_at: string;
};

function fmt(p: number | null) {
  if (!p) return "—";
  return `৳${(p / 100).toLocaleString("en-BD")}`;
}

function savings(current: number | null, target: number) {
  if (!current || current <= target) return null;
  return current - target;
}

// ── Sign-in Gate ──────────────────────────────────────────────

function SignInGate() {
  return (
    <div className="nm-raised rounded-2xl p-8 text-center max-w-sm mx-auto">
      <div className="flex justify-center mb-5 text-indigo-400">
        <User size={48} strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-black font-outfit mb-2">Sign in to view alerts</h2>
      <p className="text-white/40 text-sm mb-7 leading-relaxed">
        Create an account or sign in to manage your price alerts.
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="w-full py-3 nm-btn-primary rounded-xl text-xs uppercase tracking-widest font-black text-center block"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="w-full py-3 rounded-xl text-xs uppercase tracking-widest font-black text-center text-white/40 hover:text-white transition-colors"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}

// ── Alert Card ────────────────────────────────────────────────

function AlertCard({
  alert,
  email,
  onUpdate,
  onDelete,
}: {
  alert: Alert;
  email: string;
  onUpdate: (id: string, patch: Partial<Alert>) => void;
  onDelete: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/alerts/${alert.id}/by-email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, is_active: !alert.is_active }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(alert.id, { is_active: updated.is_active });
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this alert?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `${API}/alerts/${alert.id}/by-email?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      if (res.ok || res.status === 204) onDelete(alert.id);
    } finally {
      setBusy(false);
    }
  };

  const saving = savings(alert.current_price, alert.target_price);

  return (
    <div className={`nm-raised rounded-2xl p-5 flex gap-4 transition-opacity ${!alert.is_active ? "opacity-50" : ""}`}>
      {/* Product image */}
      <div className="w-14 h-14 rounded-xl nm-inset flex-shrink-0 overflow-hidden">
        {alert.product_image
          ? <img src={alert.product_image} alt="" className="w-full h-full object-contain p-1" />
          : <div className="w-full h-full flex items-center justify-center text-white/20"><ShoppingCart size={24} /></div>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/80 line-clamp-2 leading-snug mb-1">
          {alert.product_title ?? "Unknown product"}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-white/40">
            Target: <span className="text-white font-bold">{fmt(alert.target_price)}</span>
          </span>
          {alert.current_price && (
            <span className="text-white/40">
              Now: <span className={alert.current_price <= alert.target_price ? "text-emerald-400 font-bold" : "text-white/60"}>
                {fmt(alert.current_price)}
              </span>
            </span>
          )}
          {saving && saving > 0 && (
            <span className="text-amber-400 font-bold">{fmt(saving)} to go</span>
          )}
          {alert.current_price && alert.current_price <= alert.target_price && (
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 size={12} /> Price hit!
            </span>
          )}
        </div>

        {alert.last_triggered && (
          <p className="text-[10px] text-indigo-400 mt-1">
            Last triggered: {new Date(alert.last_triggered).toLocaleDateString("en-BD")}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 items-center justify-center shrink-0">
        <Link
          href={`/product/${alert.product_id}`}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-indigo-400 transition-colors"
          title="View product"
        >
          <ArrowUpRight size={14} />
        </Link>
        <button
          onClick={toggle}
          disabled={busy}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-amber-400 transition-colors disabled:opacity-40"
          title={alert.is_active ? "Pause alert" : "Resume alert"}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : alert.is_active ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors disabled:opacity-40"
          title="Delete alert"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function AlertsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      if (!session) setAlerts([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAlerts = useCallback(async (e: string) => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch(`${API}/alerts/by-email?email=${encodeURIComponent(e)}`);
      if (!res.ok) throw new Error("Failed to load alerts");
      setAlerts(await res.json());
    } catch {
      setFetchError("Could not load alerts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when email becomes available
  useEffect(() => {
    if (email) fetchAlerts(email);
  }, [email, fetchAlerts]);

  const handleUpdate = (id: string, patch: Partial<Alert>) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const handleDelete = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    setAlerts([]);
  };

  const activeCount = alerts.filter((a) => a.is_active).length;
  const atLimit = activeCount >= FREE_LIMIT;

  return (
    <div className="container mx-auto px-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black font-outfit mb-1 flex items-center gap-3">
            <Bell size={32} className="text-indigo-400" />
            My Alerts
          </h1>
          <p className="text-white/40 text-sm">
            Get an email the instant any tracked product hits your target price.
          </p>
        </div>
        {email && (
          <div className="text-right">
            <p className="text-xs text-white/40 flex items-center gap-1 justify-end">
              <Mail size={11} /> {email}
            </p>
            <button
              onClick={handleSignOut}
              className="text-[10px] text-white/20 hover:text-red-400 transition-colors mt-1"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Auth gate */}
      {!email && <SignInGate />}

      {/* Loading */}
      {email && loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      )}

      {/* Error */}
      {email && fetchError && (
        <div className="nm-raised rounded-2xl p-5 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle size={18} />
          {fetchError}
          <button
            onClick={() => fetchAlerts(email)}
            className="ml-auto text-xs underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loaded */}
      {email && !loading && !fetchError && (
        <>
          {/* Stats bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60">
                <span className="font-bold text-white">{activeCount}</span>
                <span className="text-white/30"> / {FREE_LIMIT} active alerts used</span>
              </span>
              {atLimit && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Limit reached
                </span>
              )}
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105"
            >
              <Plus size={12} /> New alert
            </Link>
          </div>

          {/* Free tier limit banner */}
          {atLimit && (
            <div className="mb-5 nm-raised rounded-2xl p-4 border border-amber-500/20 flex items-center justify-between gap-4">
              <p className="text-sm text-amber-300/80">
                Free tier: {FREE_LIMIT} active alerts maximum.
              </p>
              <Link
                href="/premium"
                className="shrink-0 text-xs font-black text-amber-400 hover:text-amber-300 underline transition-colors"
              >
                Go Premium →
              </Link>
            </div>
          )}

          {/* Alert list */}
          {alerts.length === 0 ? (
            <div className="text-center py-20">
              <div className="flex justify-center mb-5 text-white/20">
                <BellOff size={48} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-black font-outfit mb-3">No alerts yet</h2>
              <p className="text-white/40 text-sm mb-7">
                Go to any product page and set a target price to get started.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  email={email}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* How it works */}
          <div className="mt-8 nm-raised rounded-2xl p-6">
            <h3 className="font-black font-outfit text-xs uppercase tracking-widest text-indigo-400 mb-4">
              How alerts work
            </h3>
            <div className="space-y-2.5">
              {[
                { icon: "01", text: "Set a target price on any product page" },
                { icon: "02", text: "We check prices every 15 minutes" },
                { icon: "03", text: "Email sent the instant price drops below your target" },
                { icon: "04", text: `Free: ${FREE_LIMIT} active alerts · Premium: unlimited` },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-white/50">
                  <span className="w-6 h-6 nm-raised rounded-full flex items-center justify-center text-[10px] font-mono text-white/80 shrink-0">{s.icon}</span>
                  <span>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
