import { ShoppingCart, ShoppingBag, BookOpen, Smartphone, Store, Lock } from "lucide-react";

const PLATFORMS = [
  { name: "Daraz",    icon: ShoppingCart, accent: "text-orange-400",  live: true  },
  { name: "Cartup",   icon: ShoppingBag,  accent: "text-blue-400",    live: true  },
  { name: "Rokomari", icon: BookOpen,     accent: "text-green-400",   live: true  },
  { name: "Pickaboo", icon: Smartphone,   accent: "text-purple-400",  live: true  },
  { name: "Chaldal",  icon: ShoppingCart, accent: "text-emerald-400", live: false },
  { name: "Othoba",   icon: Store,        accent: "text-pink-400",    live: false },
];

export default function PlatformBadges() {
  return (
    <section className="py-10">
      <p className="text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/20 mb-6">
        Tracking prices across
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          return (
            <span
              key={p.name}
              className={`nm-pill inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
                p.live ? p.accent : "text-white/20 opacity-40"
              }`}
            >
              <Icon size={13} />
              {p.name}
              {!p.live && (
                <span className="nm-inset inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full text-white/30">
                  <Lock size={8} /> soon
                </span>
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}
