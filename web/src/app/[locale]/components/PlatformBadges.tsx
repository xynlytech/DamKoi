import Link from "next/link";
import { ShoppingCart, ShoppingBag, BookOpen, Smartphone, Store } from "lucide-react";

const PLATFORMS = [
  { name: "Daraz", icon: ShoppingCart, color: "text-orange-400 border-orange-500/20 bg-orange-500/5" },
  { name: "Cartup", icon: ShoppingBag, color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
  { name: "Rokomari", icon: BookOpen, color: "text-green-400 border-green-500/20 bg-green-500/5" },
  { name: "Pickaboo", icon: Smartphone, color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
  { name: "Chaldal", icon: ShoppingCart, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", soon: true },
  { name: "Othoba", icon: Store, color: "text-pink-400 border-pink-500/20 bg-pink-500/5", soon: true },
];

export default function PlatformBadges() {
  return (
    <section className="py-10 border-t border-white/5">
      <p className="text-center text-[10px] font-black uppercase tracking-widest text-white/20 mb-6">
        Tracking prices across
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          return (
            <span
              key={p.name}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold ${p.color} ${
                p.soon ? "opacity-40" : ""
              }`}
            >
              <Icon size={14} /> {p.name}
              {p.soon && (
                <span className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">
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

