"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored ? stored !== "light" : prefersDark;
    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
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
