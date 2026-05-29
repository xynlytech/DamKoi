import { ImageResponse } from "next/og";

export const alt = "Price history & deal verdict — DamKoi Bangladesh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

type Product = {
  title: string;
  platform: string;
  current_price: number | null;
};

type Verdict = {
  label: "FAKE_DISCOUNT" | "BEST_PRICE" | "GOOD_DEAL" | "FAIR_PRICE" | "INSUFFICIENT_DATA";
  deal_score: number;
  avg_30d: number | null;
  all_time_low: number | null;
};

const VERDICT_META: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  FAKE_DISCOUNT:     { emoji: "✕", label: "Fake Discount", color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  BEST_PRICE:        { emoji: "✓", label: "Best Price",    color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  GOOD_DEAL:         { emoji: "★", label: "Good Deal",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  FAIR_PRICE:        { emoji: "●", label: "Fair Price",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  INSUFFICIENT_DATA: { emoji: "◷", label: "Tracking…",    color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

const PLATFORM_COLOR: Record<string, string> = {
  daraz: "#f97316", cartup: "#3b82f6", rokomari: "#ef4444",
  pickaboo: "#8b5cf6", chaldal: "#22c55e", othoba: "#ec4899",
};

function fmt(paisa: number | null | undefined): string {
  if (!paisa) return "—";
  return "৳" + (paisa / 100).toLocaleString("en-BD");
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product: Product | null = null;
  let verdict: Verdict | null = null;

  try {
    [product, verdict] = await Promise.all([
      fetch(`${API}/products/${id}`, { next: { revalidate: 3600 } }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`${API}/products/${id}/verdict`, { next: { revalidate: 3600 } }).then((r) =>
        r.ok ? r.json() : null
      ),
    ]);
  } catch {
    // fall through to generic card
  }

  const vm = VERDICT_META[verdict?.label ?? "INSUFFICIENT_DATA"];
  const platformColor = PLATFORM_COLOR[product?.platform ?? ""] ?? "#64748b";
  const score = verdict?.deal_score ?? null;
  const rawTitle = product?.title ?? "Bangladesh Price Intelligence";
  const title = rawTitle.length > 72 ? rawTitle.slice(0, 69) + "…" : rawTitle;
  const titleSize = title.length > 48 ? 36 : 44;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0a12 0%, #14101f 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "52px 64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar — DamKoi logo + platform badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.4)",
              borderRadius: 10,
              padding: "8px 20px",
              color: "#818cf8",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            DamKoi
          </div>
          {product && (
            <div
              style={{
                background: `${platformColor}1a`,
                border: `1px solid ${platformColor}55`,
                borderRadius: 10,
                padding: "8px 22px",
                color: platformColor,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {product.platform}
            </div>
          )}
        </div>

        {/* Verdict chip + deal score */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: vm.bg,
              border: `1.5px solid ${vm.color}55`,
              borderRadius: 14,
              padding: "10px 24px",
            }}
          >
            <span style={{ fontSize: 24, color: vm.color, fontWeight: 900 }}>{vm.emoji}</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: vm.color, letterSpacing: "-0.01em" }}>
              {vm.label}
            </span>
          </div>
          {score !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 3,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: "10px 22px",
              }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: score >= 7 ? "#22c55e" : score >= 4 ? "#f59e0b" : "#ef4444",
                }}
              >
                {score}
              </span>
              <span style={{ fontSize: 18, color: "#475569", fontWeight: 600 }}>/10</span>
            </div>
          )}
        </div>

        {/* Product title */}
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 900,
            color: "#f1f5f9",
            lineHeight: 1.2,
            letterSpacing: "-0.025em",
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {title}
        </div>

        {/* Price metrics */}
        <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
          {[
            { label: "Current Price", value: fmt(product?.current_price) },
            { label: "30-Day Avg",    value: fmt(verdict?.avg_30d) },
            { label: "All-Time Low",  value: fmt(verdict?.all_time_low) },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: "16px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#475569",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {m.label}
              </span>
              <span style={{ fontSize: 26, color: "#f1f5f9", fontWeight: 800 }}>{m.value}</span>
            </div>
          ))}
        </div>

        {/* Footer URL */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <span style={{ fontSize: 15, color: "#334155", fontWeight: 600 }}>
            damkoi.xynly.com
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
