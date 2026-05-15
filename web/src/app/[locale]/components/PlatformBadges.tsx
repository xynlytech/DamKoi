import { ShoppingCart, ShoppingBag, BookOpen, Smartphone, Store } from "lucide-react";

const PLATFORMS = [
  { name: "Daraz",    icon: ShoppingCart, color: "#f97316", live: true  },
  { name: "Cartup",   icon: ShoppingBag,  color: "#3b82f6", live: true  },
  { name: "Rokomari", icon: BookOpen,     color: "#ef4444", live: true  },
  { name: "Pickaboo", icon: Smartphone,   color: "#8b5cf6", live: true  },
  { name: "Chaldal",  icon: ShoppingCart, color: "#22c55e", live: false },
  { name: "Othoba",   icon: Store,        color: "#ec4899", live: false },
];

export default function PlatformBadges() {
  return (
    <section className="py-10">
      <p className="text-center text-[10px] font-medium uppercase tracking-[0.22em] mb-6" style={{ color: "var(--text-faint)" }}>
        Tracking prices across
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          const alive = p.live;
          return (
            <span
              key={p.name}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium transition-all"
              style={{
                color:       alive ? p.color          : "var(--text-faint)",
                background:  alive ? `${p.color}12`   : "var(--surface-ghost)",
                border:      alive ? `1px solid ${p.color}25` : "1px solid var(--border-sm)",
                opacity:     alive ? 1 : 0.45,
              }}
            >
              <Icon size={13} />
              {p.name}
              {!alive && (
                <span className="text-[8px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ color: "var(--text-faint)", background: "var(--surface-ghost)" }}>
                  soon
                </span>
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}
