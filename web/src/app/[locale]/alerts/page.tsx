"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell, Mail, Trash2, PauseCircle, PlayCircle,
  Plus, ArrowUpRight, AlertCircle, Loader2, CheckCircle2,
  ShoppingCart, BellOff, Send, Download,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";
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

function AlertCardSkeleton() {
  return (
    <div className="dk-card p-4 flex gap-4 animate-pulse">
      <div className="rounded-xl flex-shrink-0" style={{ width: 52, height: 52, background: "var(--bg2)" }} />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3 rounded w-3/4" style={{ background: "var(--bg2)" }} />
        <div className="h-2 rounded w-1/2" style={{ background: "var(--bg2)" }} />
        <div className="h-2 rounded w-1/3" style={{ background: "var(--bg2)" }} />
      </div>
      <div className="flex flex-col gap-2 items-center justify-center flex-shrink-0">
        <div className="w-6 h-6 rounded-lg" style={{ background: "var(--bg2)" }} />
        <div className="w-6 h-6 rounded-lg" style={{ background: "var(--bg2)" }} />
        <div className="w-6 h-6 rounded-lg" style={{ background: "var(--bg2)" }} />
      </div>
    </div>
  );
}

function AlertCard({ alert, email, onUpdate, onDelete }: {
  alert: Alert; email: string;
  onUpdate: (id: string, patch: Partial<Alert>) => void;
  onDelete: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const hit = alert.current_price !== null && alert.current_price <= alert.target_price;

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/alerts/${alert.id}/by-email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, is_active: !alert.is_active }),
      });
      if (res.ok) { const u = await res.json(); onUpdate(alert.id, { is_active: u.is_active }); }
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this alert?")) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/alerts/${alert.id}/by-email?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      if (res.ok || res.status === 204) onDelete(alert.id);
    } finally { setBusy(false); }
  };

  return (
    <div className="dk-card p-4 flex gap-4" style={{ opacity: alert.is_active ? 1 : 0.5 }}>
      <div className="flex-shrink-0 overflow-hidden rounded-xl" style={{ width: 52, height: 52, background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
        {alert.product_image
          ? <img src={alert.product_image} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center"><ShoppingCart size={20} style={{ color: "var(--text-faint)" }} /></div>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-2 leading-snug mb-1.5" style={{ color: "var(--text-secondary)" }}>
          {alert.product_title ?? "Unknown product"}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span style={{ color: "var(--text-muted)" }}>
            Target: <span className="text-white font-semibold">{fmt(alert.target_price)}</span>
          </span>
          {alert.current_price && (
            <span style={{ color: "var(--text-muted)" }}>
              Now: <span style={{ color: hit ? "var(--green)" : "var(--text-body)", fontWeight: hit ? 600 : 400 }}>
                {fmt(alert.current_price)}
              </span>
            </span>
          )}
          {hit && (
            <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--green)" }}>
              <CheckCircle2 size={11} /> Price hit!
            </span>
          )}
        </div>
        {alert.last_triggered && (
          <p className="text-[10px] mt-1" style={{ color: "var(--lav)" }}>
            Last triggered: {new Date(alert.last_triggered).toLocaleDateString("en-BD")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 items-center justify-center flex-shrink-0">
        <Link href={`/product/${alert.product_id}`} title="View product"
          className="p-1.5 rounded-lg transition-colors dk-focus"
          style={{ color: "var(--text-faint)" }}
        >
          <ArrowUpRight size={14} />
        </Link>
        <button onClick={toggle} disabled={busy} title={alert.is_active ? "Pause" : "Resume"}
          className="p-1.5 rounded-lg transition-colors dk-focus disabled:opacity-40"
          style={{ color: "var(--text-faint)" }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : alert.is_active ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
        </button>
        <button onClick={remove} disabled={busy} title="Delete alert"
          className="p-1.5 rounded-lg transition-colors dk-focus disabled:opacity-40"
          style={{ color: "var(--text-faint)" }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

const item = { hidden: { y: 14, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function AlertsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const loginHref = `/${locale}/login`;
  const [email, setEmail]           = useState<string | null>(null);
  const [alerts, setAlerts]         = useState<Alert[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [tgLinked, setTgLinked]     = useState(false);
  const [tgChatId, setTgChatId]     = useState<string | null>(null);
  const [tgInput, setTgInput]       = useState("");
  const [tgBusy, setTgBusy]         = useState(false);
  const [tgMsg, setTgMsg]           = useState("");
  const [tgErr, setTgErr]           = useState(false);
  const tokenRef = useRef<string | null>(null);

  const fetchAlerts = useCallback(async (e: string) => {
    setLoading(true); setFetchError("");
    try {
      const res = await fetch(`${API}/alerts/by-email?email=${encodeURIComponent(e)}`);
      if (!res.ok) throw new Error("Failed");
      setAlerts(await res.json());
    } catch { setFetchError("Could not load alerts. Please try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) { router.replace(loginHref); return; }
      const userEmail = data.session.user.email ?? null;
      const token = data.session.access_token;
      tokenRef.current = token;
      setEmail(userEmail);
      if (userEmail) fetchAlerts(userEmail);
      else setLoading(false);
      // Fetch Telegram link status in parallel.
      fetch(`${API}/alerts/telegram/status`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (active && d) { setTgLinked(d.linked); setTgChatId(d.telegram_chat_id); } })
        .catch(() => {});
    }).catch(() => { if (active) router.replace(loginHref); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) router.replace(loginHref);
      else setEmail(s.user.email ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [router, loginHref, fetchAlerts]);

  const handleUpdate = (id: string, patch: Partial<Alert>) => setAlerts((p) => p.map((a) => a.id === id ? { ...a, ...patch } : a));
  const handleDelete = (id: string) => setAlerts((p) => p.filter((a) => a.id !== id));

  const linkTelegram = async () => {
    const token = tokenRef.current;
    if (!tgInput.trim() || !token) return;
    setTgBusy(true); setTgMsg(""); setTgErr(false);
    try {
      const res = await fetch(`${API}/alerts/telegram/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ telegram_chat_id: tgInput.trim() }),
      });
      const d = await res.json();
      if (res.ok) { setTgLinked(true); setTgChatId(d.telegram_chat_id); setTgInput(""); setTgMsg(d.message || "Linked!"); }
      else { setTgErr(true); setTgMsg(d.detail || "Failed to link."); }
    } catch { setTgErr(true); setTgMsg("Network error."); }
    finally { setTgBusy(false); }
  };

  const unlinkTelegram = async () => {
    const token = tokenRef.current;
    if (!token) return;
    setTgBusy(true); setTgMsg(""); setTgErr(false);
    try {
      const res = await fetch(`${API}/alerts/telegram/unlink`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (res.ok) { setTgLinked(false); setTgChatId(null); setTgMsg(d.message || "Unlinked."); }
      else { setTgErr(true); setTgMsg(d.detail || "Failed to unlink."); }
    } catch { setTgErr(true); setTgMsg("Network error."); }
    finally { setTgBusy(false); }
  };

  const activeCount = alerts.filter((a) => a.is_active).length;
  const atLimit = activeCount >= FREE_LIMIT;

  return (
    <div className="mx-auto px-5 max-w-3xl py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-1">
            <Bell size={26} style={{ color: "var(--lav)" }} />
            My Alerts
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Get an email the instant any tracked product hits your target price.
          </p>
        </div>
        {email && (
          <div className="text-right">
            <p className="text-xs flex items-center gap-1 justify-end" style={{ color: "var(--text-muted)" }}>
              <Mail size={11} /> {email}
            </p>
            <button
              onClick={async () => { await supabase.auth.signOut(); setEmail(null); setAlerts([]); }}
              className="text-[10px] mt-1 transition-colors dk-focus"
              style={{ color: "var(--text-faint)" }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <AlertCardSkeleton key={i} />)}
        </div>
      ) : fetchError ? (
        <div className="rounded-xl p-4 flex items-center gap-3 text-sm mb-5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)" }}>
          <AlertCircle size={16} />
          {fetchError}
          <button onClick={() => email && fetchAlerts(email)} className="ml-auto text-xs underline dk-focus">Retry</button>
        </div>
      ) : (
        <>
          {/* Limit bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((activeCount / FREE_LIMIT) * 100, 100)}%`, background: atLimit ? "var(--amber)" : "var(--purple)" }} />
                </div>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  <span className="text-white font-semibold">{activeCount}</span>
                  <span> / {FREE_LIMIT}</span>
                </span>
              </div>
              {atLimit && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "var(--amber)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>Limit reached</span>}
            </div>
            <div className="flex items-center gap-2">
              {email && alerts.length > 0 && (
                <a
                  href={`${API}/alerts/export.csv?email=${encodeURIComponent(email)}`}
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors dk-focus"
                  style={{ color: "var(--text-faint)" }}
                >
                  <Download size={11} /> CSV
                </a>
              )}
              <Link href="/" className="dk-btn-primary text-[10px] uppercase tracking-widest flex items-center gap-1.5 py-2 px-4 dk-focus">
                <Plus size={11} /> New alert
              </Link>
            </div>
          </div>

          {atLimit && (
            <div className="mb-5 rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p className="text-sm" style={{ color: "rgba(245,158,11,0.8)" }}>
                Free tier: {FREE_LIMIT} active alerts maximum.
              </p>
              <Link href="/premium" className="text-xs font-semibold underline flex-shrink-0 dk-focus" style={{ color: "var(--amber)" }}>Go Premium →</Link>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="text-center py-20">
              <BellOff size={44} strokeWidth={1.5} className="mx-auto mb-5" style={{ color: "var(--text-faint)" }} />
              <h2 className="text-xl font-bold text-white mb-3">No alerts yet</h2>
              <p className="text-sm mb-7" style={{ color: "var(--text-muted)" }}>
                Go to any product page and set a target price to get started.
              </p>
              <Link href="/" className="dk-btn-primary inline-flex items-center gap-2 text-xs uppercase tracking-widest dk-focus">Browse products</Link>
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
              {alerts.map((a) => (
                <motion.div key={a.id} variants={item}>
                  <AlertCard alert={a} email={email!} onUpdate={handleUpdate} onDelete={handleDelete} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Telegram linking */}
          <div className="mt-6 rounded-2xl p-6" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: tgLinked ? "var(--green)" : "var(--lav)" }}>
              <Send size={12} />
              Telegram Alerts
              {tgLinked && (
                <span className="text-[9px] px-2 py-0.5 rounded-full ml-1 font-semibold"
                  style={{ color: "var(--green)", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  Linked
                </span>
              )}
            </h3>
            {tgLinked ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Chat ID: <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-body)" }}>{tgChatId}</span>
                  {" · "}Price-drop DMs active on all alerts.
                </p>
                <button onClick={unlinkTelegram} disabled={tgBusy}
                  className="text-[10px] flex-shrink-0 transition-colors dk-focus disabled:opacity-40"
                  style={{ color: "var(--text-faint)" }}>
                  {tgBusy ? <Loader2 size={12} className="animate-spin inline" /> : "Unlink"}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                  Get price-drop DMs on Telegram. Message{" "}
                  <span style={{ color: "var(--lav)", fontFamily: "'IBM Plex Mono', monospace" }}>@DamKoiBot</span>
                  {" "}and send <span style={{ color: "var(--lav)", fontFamily: "'IBM Plex Mono', monospace" }}>/start</span> — the bot replies with your chat ID.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Your chat ID (e.g. 123456789)"
                    value={tgInput}
                    onChange={(e) => setTgInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && linkTelegram()}
                    className="dk-input flex-1 text-xs"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                  <button onClick={linkTelegram} disabled={tgBusy || !tgInput.trim()}
                    className="dk-btn-primary text-xs px-4 flex-shrink-0 disabled:opacity-40 flex items-center gap-1.5">
                    {tgBusy ? <Loader2 size={13} className="animate-spin" /> : <><Send size={12} /> Link</>}
                  </button>
                </div>
              </div>
            )}
            {tgMsg && (
              <p className="text-[11px] mt-3" style={{ color: tgErr ? "var(--red)" : "var(--green)" }}>{tgMsg}</p>
            )}
          </div>

          {/* How it works */}
          <div className="mt-8 rounded-2xl p-6" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--lav)" }}>How alerts work</h3>
            <div className="space-y-2.5">
              {[
                "Set a target price on any product page",
                "We check prices every 15 minutes",
                "Email (and Telegram DM if linked) sent the instant price drops",
                `Free: ${FREE_LIMIT} active alerts · Premium: unlimited`,
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
