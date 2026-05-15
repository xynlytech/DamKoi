"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

export default function ReportButtonClient({ productId }: { productId: string }) {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");

  const report = async () => {
    setState("sent");
    try {
      await fetch(`${API}/products/${productId}/report-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "wrong_match" }),
      });
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex items-center gap-3 text-white/20 text-xs border-t border-white/5 pt-6 pb-4">
      <Flag size={13} />
      <span>Wrong match?</span>
      {state === "idle" && (
        <button onClick={report} className="text-white/30 hover:text-red-400 transition-colors underline underline-offset-2">
          Report incorrect grouping
        </button>
      )}
      {state === "sent" && <span style={{ color: "var(--green)" }}>Reported — thanks!</span>}
      {state === "error" && <span className="text-white/30">Could not send, try again later.</span>}
    </div>
  );
}
