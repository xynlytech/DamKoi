import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DamKoi Price Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

const VERDICT_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  FAKE_DISCOUNT:     { icon: "❌", label: "Fake Discount",  color: "#ef4444", bg: "#1a0a0a" },
  BEST_PRICE:        { icon: "✅", label: "Best Price",      color: "#10b981", bg: "#0a1a12" },
  GOOD_DEAL:         { icon: "🔥", label: "Good Deal",       color: "#6366f1", bg: "#0d0d1a" },
  FAIR_PRICE:        { icon: "🟡", label: "Fair Price",      color: "#f59e0b", bg: "#1a1500" },
  INSUFFICIENT_DATA: { icon: "⏳", label: "Collecting Data", color: "#94a3b8", bg: "#111116" },
};

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let title = "Product Price History";
  let platform = "";
  let price = "";
  let verdictLabel = "INSUFFICIENT_DATA";
  let score: number | null = null;

  try {
    const [prodRes, verdRes] = await Promise.all([
      fetch(`${API}/products/${id}`, { next: { revalidate: 3600 } }),
      fetch(`${API}/products/${id}/verdict`, { next: { revalidate: 3600 } }),
    ]);
    if (prodRes.ok) {
      const p = await prodRes.json();
      title = p.title ?? title;
      platform = p.platform ?? "";
      price = p.current_price ? `৳${(p.current_price / 100).toLocaleString("en-BD")}` : "";
    }
    if (verdRes.ok) {
      const v = await verdRes.json();
      verdictLabel = v.label ?? verdictLabel;
      score = v.deal_score ?? null;
    }
  } catch { /* fallback to defaults */ }

  const vc = VERDICT_CONFIG[verdictLabel] ?? VERDICT_CONFIG.INSUFFICIENT_DATA;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, #0a0a12 0%, ${vc.bg} 100%)`,
          display: "flex",
          flexDirection: "column",
          padding: "60px 70px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.4)",
              borderRadius: 10,
              padding: "6px 16px",
              color: "#818cf8",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}>
              DamKoi
            </div>
            {platform && (
              <div style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 10,
                padding: "6px 14px",
                color: "rgba(255,255,255,0.4)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}>
                {platform}
              </div>
            )}
          </div>
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 600 }}>
            Bangladesh Price Intelligence
          </div>
        </div>

        {/* Title */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
        }}>
          <div style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: title.length > 80 ? 32 : title.length > 50 ? 40 : 46,
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            maxWidth: 900,
          }}>
            {title.length > 100 ? title.slice(0, 97) + "…" : title}
          </div>
        </div>

        {/* Bottom row: verdict + price + score */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Verdict badge */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: `${vc.color}18`,
              border: `1.5px solid ${vc.color}44`,
              borderRadius: 16,
              padding: "12px 22px",
            }}>
              <span style={{ fontSize: 24 }}>{vc.icon}</span>
              <span style={{ color: vc.color, fontSize: 18, fontWeight: 900, letterSpacing: "0.04em" }}>
                {vc.label}
              </span>
            </div>

            {/* Price */}
            {price && (
              <div style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 28,
                fontWeight: 900,
                fontFamily: "monospace",
                letterSpacing: "-0.02em",
              }}>
                {price}
              </div>
            )}
          </div>

          {/* Deal score */}
          {score !== null && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              width: 90,
              height: 90,
            }}>
              <span style={{
                color: score >= 8 ? "#10b981" : score >= 5 ? "#f59e0b" : "#ef4444",
                fontSize: 34,
                fontWeight: 900,
                lineHeight: 1,
              }}>
                {score}
              </span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 4 }}>
                /10
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
