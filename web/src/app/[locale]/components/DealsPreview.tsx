import Link from "next/link";
import { ArrowRight, TrendingDown, Flame, ShoppingCart } from "lucide-react";

type DealItem = {
  product: {
    id: string;
    title: string;
    platform: string;
    current_price: number | null;
    image_url: string | null;
    url: string;
  };
  deal_score: number;
  label: string;
  avg_30d: number | null;
};

const PLATFORM_BADGE: Record<string, string> = {
  daraz:    "bg-orange-500/10 text-orange-400",
  cartup:   "bg-blue-500/10 text-blue-400",
  rokomari: "bg-green-500/10 text-green-400",
  pickaboo: "bg-purple-500/10 text-purple-400",
  chaldal:  "bg-emerald-500/10 text-emerald-400",
};

const SCORE_COLOR = (score: number) =>
  score >= 9 ? "text-emerald-400" : score >= 7 ? "text-indigo-400" : "text-amber-400";

function fmt(paisa: number | null): string {
  if (!paisa) return "—";
  return `৳${(paisa / 100).toLocaleString("en-BD")}`;
}

function savings(current: number | null, avg: number | null): string | null {
  if (!current || !avg || avg <= current) return null;
  return fmt(avg - current);
}

export default function DealsPreview({ deals }: { deals: DealItem[] }) {
  if (!deals.length) return null;

  return (
    <section className="py-16 border-t border-white/5">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black font-outfit flex items-center gap-2">
            <Flame className="text-indigo-500" size={24} /> Today&apos;s Real Deals
          </h2>
          <p className="text-white/30 text-sm mt-1">Verified genuine price drops — not inflated discounts</p>
        </div>
        <Link
          href="/deals"
          className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map((deal) => {
          const save = savings(deal.product.current_price, deal.avg_30d);
          return (
            <Link
              key={deal.product.id}
              href={`/product/${deal.product.id}`}
              className="glass-card rounded-2xl p-4 flex gap-4 hover:-translate-y-1 transition-transform duration-300 group"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl bg-white/5 flex-shrink-0 overflow-hidden">
                {deal.product.image_url ? (
                  <img
                    src={deal.product.image_url}
                    alt={deal.product.title}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <ShoppingCart size={24} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Platform */}
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${PLATFORM_BADGE[deal.product.platform] ?? "bg-white/5 text-white/40"}`}>
                  {deal.product.platform}
                </span>
                {/* Title */}
                <p className="text-sm font-semibold text-white/80 mt-1 line-clamp-2 leading-snug">
                  {deal.product.title}
                </p>
                {/* Price row */}
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-black text-base font-mono text-white">
                    {fmt(deal.product.current_price)}
                  </span>
                  {save && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Save {save}
                    </span>
                  )}
                </div>
              </div>

              {/* Score badge */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black font-mono ${SCORE_COLOR(deal.deal_score)}`}>
                  {deal.deal_score}
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20">/10</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
