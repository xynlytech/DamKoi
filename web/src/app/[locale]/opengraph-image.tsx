import { ImageResponse } from "next/og";

// Site-wide OG/social + AI link-preview image. Next auto-injects this for every
// page under [locale] that doesn't define its own (product pages override with
// their per-product card). Fixes the previously-missing homepage OG image.
export const runtime = "edge";
export const alt = "DamKoi — Real price history & fake-discount detection for Bangladesh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const chips: { label: string; color: string }[] = [
    { label: "✓ Best Price", color: "#10b981" },
    { label: "★ Good Deal", color: "#6366f1" },
    { label: "✕ Fake Discount", color: "#ef4444" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0a12 0%, #14101f 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "70px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.4)",
              borderRadius: 12,
              padding: "8px 20px",
              color: "#818cf8",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            DamKoi
          </div>
          <div style={{ color: "#64748b", fontSize: 18, fontWeight: 600 }}>
            🇧🇩 Bangladesh Price Intelligence
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              color: "#f1f5f9",
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: 980,
            }}
          >
            Stop paying for <span style={{ color: "#a78bfa" }}>fake discounts.</span>
          </div>
          <div style={{ color: "#94a3b8", fontSize: 30, fontWeight: 500, maxWidth: 920, lineHeight: 1.3 }}>
            Real price history & honest deal verdicts for Daraz and more — so you
            know if that sale price is actually a deal.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {chips.map((c) => (
            <div
              key={c.label}
              style={{
                display: "flex",
                alignItems: "center",
                background: `${c.color}18`,
                border: `1.5px solid ${c.color}44`,
                borderRadius: 14,
                padding: "12px 22px",
                color: c.color,
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {c.label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
