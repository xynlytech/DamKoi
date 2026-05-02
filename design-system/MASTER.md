# DamKoi Design System: MASTER

**Style**: Liquid Glass + Bento Grid (Premium Shopping Intelligence)

## 🎨 Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | #6366F1 | Indigo - Branding, Main CTAs |
| Success | #10B981 | Mint - Deals, Best Price, In Stock |
| Warning | #F59E0B | Amber - Price Drops, Watchlist |
| Danger | #EF4444 | Red - Price Hikes, Out of Stock |
| BG (Dark) | #0F172A | Deep Slate - Main background |
| Surface | rgba(255, 255, 255, 0.03) | Glass background |
| Border | rgba(255, 255, 255, 0.08) | Glass borders |

## Typography
- **Heading**: `Outfit`, Sans-serif (Bold, 700)
- **Body**: `Inter`, Sans-serif (Regular, 400)
- **Data**: `JetBrains Mono` (Numeric price data)

## 🍱 Bento Patterns
- **Layout**: 12-column grid, 16px-24px gaps.
- **Tiles**: 
  - `sm`: 1x1 (Stats, Gauges)
  - `md`: 2x1 or 1x2 (Quick charts, Mini-lists)
  - `lg`: 2x2 (Main price history chart)
  - `full`: Full width (Alternatives carousel)

## 🌊 Liquid Glass Effects
- **Backdrop Blur**: `blur(12px)`
- **Border**: `1px solid rgba(255, 255, 255, 0.08)`
- **Shadow**: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`
- **Transition**: `250ms cubic-bezier(0.4, 0, 0.2, 1)`

## 🧩 Component Checklist
- [ ] Hover: Scale 102%, Border opacity +10%
- [ ] Active: Scale 98%
- [ ] Skeleton: Pulse animation (rgba white 0.05)
