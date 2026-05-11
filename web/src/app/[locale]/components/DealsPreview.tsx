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

const PLATFORM_ACCENT: Record<string, { text: string; bg: string }> = {
  daraz:    { text: "text-orange-400",  bg: "bg-orange-500/10"  },
  cartup:   { text: "text-blue-400",    bg: "bg-blue-500/10"    },
  rokomari: { text: "text-green-400",   bg: "bg-green-500/10"   },
  pickaboo: { text: "text-purple-400",  bg: "bg-purple-500/10"  },
  chaldal:  { text: "text-emerald-400", bg: "bg-emerald-500/10" },
};

function scoreColor(score: number) {
  if (score >= 9) return "text-emerald-400";
  if (score >= 7) return "text-indigo-400";
  return "text-amber-400";
}

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
    <section className="py-14 sm:py-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-outfit flex items-center gap-2.5">
            <span className="nm-raised h-8 w-8 rounded-lg flex items-center justify-center text-indigo-400">
              <TrendingDown size={18} />
            </span>
            Today&apos;s Real Deals
          </h2>
          <p className="text-white/30 text-sm mt-1.5">
            Verified genuine price drops — not inflated discounts
          </p>
        </div>
        <Link
          href="/deals"
          className="nm-pill text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors flex-shrink-0 nm-focus"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map((deal) => {
          const save = savings(deal.product.current_price, deal.avg_30d);
          const accent = PLATFORM_ACCENT[deal.product.platform] ?? { text: "text-white/40", bg: "bg-white/5" };
          return (
            <Link
              key={deal.product.id}
              href={`/product/${deal.product.id}`}
              className="nm-raised nm-interactive rounded-2xl p-4 flex gap-4 group"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl nm-inset flex-shrink-0 overflow-hidden flex items-center justify-center">
                {deal.product.image_url ? (
                  <img
                    src={deal.product.image_url}
                    alt={deal.product.title}
                    className="w-full h-full object-contain p-1.5"
                    loading="lazy"
                  />
                ) : (
                  <ShoppingCart size={22} className="text-white/20" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Platform badge */}
                <span
                  className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full nm-pill ${accent.text} ${accent.bg}`}
                >
                  {deal.product.platform}
                </span>
                {/* Title */}
                <p className="text-sm font-semibold text-white/80 mt-1.5 line-clamp-2 leading-snug">
                  {deal.product.title}
                </p>
                {/* Price row */}
                <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                  <span className="font-black text-base font-mono text-white/90">
                    {fmt(deal.product.current_price)}
                  </span>
                  {save && (
                    <span className="text-[10px] font-bold text-emerald-400 nm-pill px-2 py-0.5 rounded-full">
                      Save {save}
                    </span>
                  )}
                </div>
              </div>

              {/* Score badge */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center nm-raised rounded-xl w-12 h-12 self-center">
                <span className={`text-xl font-black font-mono leading-none ${scoreColor(deal.deal_score)}`}>
                  {deal.deal_score}
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20">/10</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 text-center">
        <Link
          href="/deals"
          className="nm-raised nm-interactive inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-indigo-400 nm-focus"
        >
          <Flame size={16} /> Browse all verified deals <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
