"use client";

import { useState, useEffect } from "react";
import { Loader2, Play, CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

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
  alerts: "text-amber-400",
  coupons: "text-emerald-400",
  digest: "text-indigo-400",
  matching: "text-purple-400",
  backfill: "text-blue-400",
  cleanup: "text-rose-400",
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
        setHistory((prev) => ({
          ...prev,
          [job]: { ...prev[job], last_run: data.ran_at },
        }));
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
          <h1 className="text-2xl font-black font-outfit">Cron Jobs</h1>
          <p className="text-white/30 text-xs mt-0.5">Manually trigger any background job</p>
        </div>
        <button
          onClick={loadHistory}
          disabled={loading}
          className="nm-raised rounded-xl px-3 py-2 text-white/40 hover:text-white transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const info = history[job];
            const result = results[job];
            const isRunning = running === job;
            const color = JOB_COLOR[job] ?? "text-white/60";

            return (
              <div key={job} className="nm-raised rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className={`text-sm font-black capitalize font-outfit ${color}`}>{job}</p>
                    <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{info.description}</p>
                  </div>
                </div>

                {/* Last run */}
                <div className="flex items-center gap-1.5 text-[10px] text-white/25 mb-4">
                  <Clock size={10} />
                  {info.last_run
                    ? `Last run: ${new Date(info.last_run).toLocaleTimeString()}`
                    : "Never run this session"}
                </div>

                {/* Result badge */}
                {result && (
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold mb-3 ${result.ok ? "text-emerald-400" : "text-rose-400"}`}>
                    {result.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                    {result.ok ? `Ran OK at ${new Date(result.ran_at).toLocaleTimeString()}` : "Run failed"}
                  </div>
                )}

                <button
                  onClick={() => trigger(job)}
                  disabled={isRunning || running !== null}
                  className="w-full flex items-center justify-center gap-2 py-2.5 nm-btn-primary rounded-xl text-[10px] uppercase tracking-widest font-black disabled:opacity-40"
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
