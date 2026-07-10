"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  // Always initialize as dark to match the server-rendered data-theme="dark".
  // Reading localStorage in useState causes React hydration mismatch (#418).
  const [isDark, setIsDark] = useState(true);

  // Reconcile with stored preference after hydration
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = stored
      ? stored !== "light"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="rounded-xl p-2 transition-colors dk-focus"
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border-sm)",
        color: "var(--text-muted)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--lav)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
