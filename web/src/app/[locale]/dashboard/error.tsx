"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-sm font-mono" style={{ color: "var(--red)" }}>
        {error?.message || "Unknown error"}
      </p>
      {error?.digest && (
        <p className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>
          digest: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="dk-btn-primary text-xs uppercase tracking-widest"
      >
        Retry
      </button>
    </div>
  );
}
