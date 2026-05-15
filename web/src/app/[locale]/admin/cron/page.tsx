"use client";

import { useState, useEffect } from "react";
import { Loader2, Play, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

const JOBS = [
  { id: "harvest",  label: "Harvest",  desc: "Discover new products from sitemaps" },
  { id: "scrape",   label: "Scrape",   desc: "Scrape prices for tracked products" },
  { id: "alerts",   label: "Alerts",   desc: "Check alerts and send notifications" },
  { id: "all",      label: "All",      desc: "Run harvest + scrape + alerts in sequence" },
];

type Run = {
  id: number;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string;
  event?: string;
  job: string;
};

const JOB_LABELS: Record<string, string> = {
  harvest: "Harvest", scrape: "Scrape", alerts: "Alerts",
  all: "All", platforms: "Platforms", scheduled: "Scheduled", manual: "Manual",
};

async function adminFetch(path: string, opts?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      ...((opts?.headers as Record<string, string>) ?? {}),
    },
  });
}

export default function AdminCronPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [dispatched, setDispatched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/admin/cron/history");
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const trigger = async (job: string) => {
    setRunning(job);
    try {
      const res = await adminFetch(`/admin/cron/trigger/${job}`, { method: "POST" });
      if (res.ok) {
        setDispatched((prev) => ({ ...prev, [job]: true }));
      }
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cron Jobs</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>Manually trigger any background job via GitHub Actions</p>
        </div>
        <button
          onClick={loadHistory}
          disabled={loading}
          className="rounded-xl px-3 py-2 transition-colors dk-focus"
          style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Job trigger cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {JOBS.map(({ id, label, desc }) => (
          <div key={id} className="dk-card p-5">
            <p className="text-sm font-semibold text-white mb-1">{label}</p>
            <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
            {dispatched[id] && (
              <p className="text-[10px] font-semibold flex items-center gap-1 mb-2" style={{ color: "var(--green)" }}>
                <CheckCircle2 size={10} /> Dispatched
              </p>
            )}
            <button
              onClick={() => trigger(id)}
              disabled={running !== null}
              className="dk-btn-primary w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest disabled:opacity-40"
            >
              {running === id ? (
                <><Loader2 size={11} className="animate-spin" /> Dispatching…</>
              ) : (
                <><Play size={11} /> Run Now</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Run history */}
      <div className="dk-card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-sm)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Recent Runs
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--lav)" }} />
          </div>
        ) : runs.length === 0 ? (
          <p className="text-center py-12 text-sm" style={{ color: "var(--text-faint)" }}>No runs yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest" style={{ borderBottom: "1px solid var(--border-sm)", color: "var(--text-faint)" }}>
                <th className="text-left px-5 py-3 font-semibold">Job</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Result</th>
                <th className="text-right px-5 py-3 font-semibold hidden sm:table-cell">Started</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border-sm)" }}>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium text-white">
                      {JOB_LABELS[r.job] ?? r.job}
                    </span>
                    {r.event === "schedule" && (
                      <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.15)", color: "var(--lav)" }}>cron</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[10px] capitalize" style={{
                      color: r.status === "completed" ? "var(--text-faint)" : r.status === "in_progress" ? "var(--amber)" : "var(--text-faint)"
                    }}>{r.status}</span>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    {r.conclusion === "success" ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--green)" }}>
                        <CheckCircle2 size={10} /> success
                      </span>
                    ) : r.conclusion === "failure" ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--red)" }}>
                        <XCircle size={10} /> failed
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{r.conclusion ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right hidden sm:table-cell">
                    <span className="text-[10px] flex items-center justify-end gap-1" style={{ color: "var(--text-faint)" }}>
                      <Clock size={9} />
                      {new Date(r.started_at).toLocaleString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
