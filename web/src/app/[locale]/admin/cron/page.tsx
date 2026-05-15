"use client";

import { useState, useEffect } from "react";
import { Loader2, Play, CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

type JobInfo = {
  description: string;
  last_run: string | null;
};

type RunResult = {
  status: string;
  ran_at: string;
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

const JOB_COLOR: Record<string, string> = {
  alerts:   "var(--amber)",
  coupons:  "var(--green)",
  digest:   "var(--lav)",
  matching: "#7c3aed",
  backfill: "#3b82f6",
  cleanup:  "var(--red)",
};

export default function AdminCronPage() {
  const [history, setHistory] = useState<Record<string, JobInfo>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; ran_at: string }>>({});
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/admin/cron/history");
      if (res.ok) setHistory(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const trigger = async (job: string) => {
    setRunning(job);
    try {
      const res = await adminFetch(`/admin/cron/trigger/${job}`, { method: "POST" });
      const data: RunResult = res.ok ? await res.json() : { status: "error", ran_at: new Date().toISOString() };
      setResults((prev) => ({ ...prev, [job]: { ok: res.ok, ran_at: data.ran_at } }));
      if (res.ok) {
        setHistory((prev) => ({ ...prev, [job]: { ...prev[job], last_run: data.ran_at } }));
      }
    } finally {
      setRunning(null);
    }
  };

  const jobs = Object.keys(history);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cron Jobs</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>Manually trigger any background job</p>
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

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--lav)" }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const info = history[job];
            const result = results[job];
            const isRunning = running === job;
            const color = JOB_COLOR[job] ?? "var(--text-muted)";

            return (
              <div key={job} className="dk-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold capitalize" style={{ color }}>{job}</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{info.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] mb-4" style={{ color: "var(--text-faint)" }}>
                  <Clock size={10} />
                  {info.last_run
                    ? `Last run: ${new Date(info.last_run).toLocaleTimeString()}`
                    : "Never run this session"}
                </div>

                {result && (
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold mb-3" style={{ color: result.ok ? "var(--green)" : "var(--red)" }}>
                    {result.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                    {result.ok ? `Ran OK at ${new Date(result.ran_at).toLocaleTimeString()}` : "Run failed"}
                  </div>
                )}

                <button
                  onClick={() => trigger(job)}
                  disabled={isRunning || running !== null}
                  className="dk-btn-primary w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest disabled:opacity-40"
                >
                  {isRunning ? (
                    <><Loader2 size={11} className="animate-spin" /> Running…</>
                  ) : (
                    <><Play size={11} /> Run Now</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
