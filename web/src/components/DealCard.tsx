import Link from "next/link";
import { ShoppingCart } from "lucide-react";

export type DealItem = {
  product: {
    id: string;
    title: string;
    platform: string;
    current_price: number | null;
    image_url: string | null;
  };
  deal_score: number;
  label?: string;
  avg_30d: number | null;
};

const PLATFORM_COLOR: Record<string, string> = {
  daraz: "#f97316", cartup: "#3b82f6", rokomari: "#ef4444",
  pickaboo: "#8b5cf6", chaldal: "#22c55e", othoba: "#ec4899",
};

const LABEL_TEXT: Record<string, string> = {
  BEST_PRICE: "Lowest price yet",
  GOOD_DEAL: "Good deal",
  FAIR_PRICE: "Fair price",
  FAKE_DISCOUNT: "Fake discount",
};

// `color` follows the theme (card body); `pill` is fixed because the score pill
// always sits on the white image tile and needs AA contrast there.
function scoreTone(s: number): { color: string; pill: string } {
  if (s >= 9) return { color: "var(--green)", pill: "#15803d" };
  if (s >= 7) return { color: "var(--lav)",   pill: "#6d28d9" };
  return { color: "var(--amber)", pill: "#b45309" };
}

export function formatTaka(paisa: number | null | undefined): string {
  if (!paisa) return "—";
  return `৳${(paisa / 100).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}

export default function DealCard({ deal }: { deal: DealItem }) {
  const { product } = deal;
  const tone = scoreTone(deal.deal_score);
  const pColor = PLATFORM_COLOR[product.platform] ?? "var(--text-muted)";
  const saving =
    product.current_price && deal.avg_30d && deal.avg_30d > product.current_price
      ? deal.avg_30d - product.current_price
      : null;
  const label = deal.label ? LABEL_TEXT[deal.label] : undefined;

  return (
    <Link
      href={`/product/${product.id}`}
      className="dk-card group flex flex-col overflow-hidden dk-focus"
    >
      {/* Product photos are shot on white; a white tile keeps them clean in both themes. */}
      <div className="relative aspect-[4/3] overflow-hidden flex items-center justify-center" style={{ background: "#ffffff", borderBottom: "1px solid var(--border-sm)" }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <ShoppingCart size={32} aria-hidden style={{ color: "rgba(19,16,43,0.25)" }} />
        )}
        <span
          className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums"
          style={{ color: tone.pill, background: "#ffffff", border: "1px solid rgba(19,16,43,0.08)", boxShadow: "0 1px 3px rgba(19,16,43,0.12)" }}
          title="Deal score out of 10"
        >
          {deal.deal_score}/10
        </span>
      </div>

      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="capitalize" style={{ color: pColor }}>{product.platform}</span>
          {label && (
            <>
              <span aria-hidden style={{ color: "var(--text-ghost)" }}>•</span>
              <span style={{ color: tone.color }}>{label}</span>
            </>
          )}
        </div>

        <h3 className="text-[0.9375rem] font-medium leading-snug line-clamp-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)", letterSpacing: 0 }}>
          {product.title}
        </h3>

        <div className="mt-auto pt-1 flex items-end justify-between gap-2 flex-wrap">
          <span className="text-xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {formatTaka(product.current_price)}
          </span>
          {saving && (
            <span
              className="text-xs font-semibold px-2 py-1 rounded-md tabular-nums"
              style={{ color: "var(--green)", background: "rgba(34,197,94,0.12)" }}
              title={`30-day average: ${formatTaka(deal.avg_30d)}`}
            >
              {formatTaka(saving)} below 30-day avg
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
