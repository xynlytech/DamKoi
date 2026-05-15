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
      <p className="text-center text-[10px] font-medium uppercase tracking-[0.22em] mb-6" style={{ color: "rgba(255,255,255,0.2)" }}>
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
                color:       alive ? p.color          : "rgba(255,255,255,0.2)",
                background:  alive ? `${p.color}12`   : "rgba(255,255,255,0.04)",
                border:      alive ? `1px solid ${p.color}25` : "1px solid rgba(255,255,255,0.06)",
                opacity:     alive ? 1 : 0.45,
              }}
            >
              <Icon size={13} />
              {p.name}
              {!alive && (
                <span className="text-[8px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)" }}>
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
