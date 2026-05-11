"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const dark = stored !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("light", !dark);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("light", !next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="nm-raised nm-interactive rounded-xl p-2.5 text-white/40 hover:text-indigo-400 transition-colors nm-focus"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
