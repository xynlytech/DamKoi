const PLATFORMS = [
  { name: "Daraz",    color: "#f97316", live: true  },
  { name: "Cartup",   color: "#3b82f6", live: true  },
  { name: "Rokomari", color: "#ef4444", live: true  },
  { name: "Pickaboo", color: "#8b5cf6", live: true  },
  { name: "Chaldal",  color: "#22c55e", live: false },
  { name: "Othoba",   color: "#ec4899", live: false },
];

export default function PlatformBadges() {
  return (
    <section className="py-8 sm:py-10" aria-label="Supported stores">
      <p className="text-center text-sm font-medium mb-4" style={{ color: "var(--text-muted)" }}>
        Works with the stores you already use
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-2.5">
        {PLATFORMS.map((p) => (
          <li
            key={p.name}
            className="inline-flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full text-sm font-semibold"
            style={{
              background: "var(--bg1)",
              border: "1px solid var(--border-sm)",
              color: p.live ? "var(--text-primary)" : "var(--text-faint)",
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full" aria-hidden style={{ background: p.color, opacity: p.live ? 1 : 0.45 }} />
            {p.name}
            {!p.live && (
              <span className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>· coming soon</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
