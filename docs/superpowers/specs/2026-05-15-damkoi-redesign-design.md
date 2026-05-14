# DamKoi Full Redesign — Design Specification
**Date:** 2026-05-15  
**Approach:** Big Bang Full Replacement (neumorphic system → dark intelligence stack)  
**Scope:** All public pages + admin panel

---

## 1. Design Philosophy

DamKoi should feel premium, intelligent, and slightly aggressive against fake pricing. It is a data tool, not an e-commerce storefront. Every visual decision reinforces trust and analytical authority.

**Mood:** Trustworthy. Analytical. Premium. Slightly aggressive against fake pricing.  
**Metaphor:** A Bloomberg terminal crossed with a premium SaaS dashboard.  
**Anti-patterns to avoid:** Decorative emojis, gradients without purpose, pastel/playful color use, neumorphic shadows.

---

## 2. Color Tokens

All colors defined as CSS custom properties in `globals.css`:

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#08071a` | Page background (darkest) |
| `--bg1` | `#0e0c24` | Card surface level 1 |
| `--bg2` | `#13112e` | Card surface level 2, input backgrounds |
| `--bg3` | `#1a1740` | Hover states, selected rows, elevated cards |
| `--purple` | `#7c3aed` | Primary brand, CTAs, active states |
| `--lavender` | `#a78bfa` | Secondary accent, links, highlights |
| `--lavender-2` | `#c4b5fd` | Tertiary accent, muted labels on dark bg |
| `--green` | `#22c55e` | Price drops, savings, success states |
| `--red` | `#ef4444` | Price pumps, errors, danger actions |
| `--amber` | `#f59e0b` | Warnings, suspicious price badges |
| `--white` | `#ffffff` | Primary text |
| `--white-70` | `rgba(255,255,255,0.7)` | Secondary text |
| `--white-40` | `rgba(255,255,255,0.4)` | Tertiary text, placeholders |
| `--white-20` | `rgba(255,255,255,0.2)` | Disabled states |
| `--white-10` | `rgba(255,255,255,0.1)` | Borders, dividers |
| `--white-5` | `rgba(255,255,255,0.05)` | Subtle card backgrounds |
| `--border` | `rgba(124,58,237,0.2)` | Purple-tinted borders on interactive elements |
| `--border-sm` | `rgba(255,255,255,0.08)` | Default subtle borders |

---

## 3. Typography

### Primary: Space Grotesk
- **Use:** All UI text — headings, body copy, buttons, labels, navigation, form fields
- **Weights:** 300 (light, decorative), 400 (body), 500 (medium, labels), 600 (semibold, subheadings), 700 (bold, headings)
- **Google Fonts import:** `family=Space+Grotesk:wght@300;400;500;600;700`

### Secondary: IBM Plex Mono
- **Use:** Numbers, prices, metrics, percentages, timestamps, technical annotations, price charts, stat card values
- **Weights:** 400 (data display), 500 (emphasized data), 600 (hero numbers)
- **Google Fonts import:** `family=IBM+Plex+Mono:wght@400;500;600`

### Rules
- Never mix more than these two typefaces in any page
- Hero/stat numbers: IBM Plex Mono 600, large (2rem–4rem)
- Body copy: Space Grotesk 400, 0.9rem–1rem
- Page headings: Space Grotesk 700, 1.5rem–2.5rem
- Section labels / uppercase caps: Space Grotesk 500–600, 0.65rem–0.75rem, `letter-spacing: 0.12em`
- Monospace prices: IBM Plex Mono 500, `--green` or `--red` based on direction

---

## 4. Animation Stack

All animations via **Framer Motion** (React). No CSS keyframe substitutes for interactive animations.

### 4.1 Cursor Radial Glow
- Radial gradient div (400px, `--purple` at 0%, transparent at 70%), `pointer-events: none`, `position: fixed`, `z-index: 0`
- Follows `mousemove` with `useMotionValue` + `useSpring({ stiffness: 200, damping: 30 })`
- Applied on: homepage, product page, dashboard, all public pages
- Not applied on: admin panel (utility UI, performance preference)

### 4.2 Scroll Reveal (Stagger)
- `useInView` trigger: `once: true, margin: "-80px"`
- Parent: `variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}`
- Child: `variants={{ hidden: { y: 24, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.22,1,0.36,1] } } }}`
- Applied to: feature grid, deals grid, how-it-works steps, stats strip, footer links

### 4.3 Number Countup
- `useInView` trigger reveals animation
- `useMotionValue(0)` + `useTransform` to format with `toLocaleString`
- Duration: 1.2s, easing: `easeOut`
- Applied to: hero stats (products tracked, price drops caught, avg savings), dashboard stat cards

### 4.4 Magnetic CTA Buttons
- `onMouseMove`: compute distance from button center, apply fractional offset via `x/y` motion values
- `onMouseLeave`: spring back to `{ x: 0, y: 0 }`
- Spring: `{ stiffness: 400, damping: 30 }`
- Applied to: primary CTA buttons only (hero "Start Tracking", waitlist form submit, product "Set Alert")

### 4.5 Price Chart Draw Animation
- SVG `<path>` with `pathLength` motion value
- Animate from `pathLength: 0` to `pathLength: 1` on viewport enter
- Duration: 1.5s, easing: `easeInOut`
- Preceded by fade-in of chart container (0.3s delay)
- Applied to: product page price history chart

### 4.6 Page Transition
- Route changes: `AnimatePresence` wrapping page root
- Enter: `{ opacity: 0, y: 8 }` → `{ opacity: 1, y: 0 }`, duration 0.3s
- Exit: `{ opacity: 0 }`, duration 0.15s

---

## 5. Component System

### Cards
- Background: `--bg1` or `--bg2`
- Border: `1px solid var(--border-sm)`
- Border-radius: `1rem` (16px) standard, `1.5rem` (24px) hero/featured
- No box-shadow on dark mode — depth via background color difference only
- Hover: background shifts to `--bg3`, border to `var(--border)`

### Buttons
| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Primary | `--purple` | white | none |
| Secondary | `--bg2` | `--lavender` | `1px solid var(--border)` |
| Ghost | transparent | `--white-70` | `1px solid var(--border-sm)` |
| Danger | `--red` at 15% opacity | `--red` | `1px solid var(--red)` at 30% |

- Border-radius: `0.75rem` (12px)
- Padding: `0.75rem 1.5rem` standard, `0.5rem 1rem` compact
- Font: Space Grotesk 500–600

### Badges / Pills
- Border-radius: `2rem` (full)
- Font: Space Grotesk 600, 0.7rem, uppercase
- Padding: `0.2rem 0.6rem`
- Colors: green bg at 15% opacity + green text, red bg at 15% opacity + red text, amber bg at 15% opacity + amber text, purple bg at 15% opacity + lavender text

### Form Inputs
- Background: `--bg2`
- Border: `1px solid var(--border-sm)`
- Focus border: `1px solid var(--purple)`
- Border-radius: `0.75rem`
- Font: Space Grotesk 400
- Placeholder: `--white-40`
- No box-shadow on focus — border color change only

### Stat Cards
- Background: `--bg1`, border `var(--border-sm)`
- Label: Space Grotesk 500, 0.7rem, uppercase, `letter-spacing: 0.12em`, `--white-40`
- Value: IBM Plex Mono 600, 2rem, white
- Subtext/delta: IBM Plex Mono 400, 0.8rem, `--green` or `--red`

### Data Tables
- Header: Space Grotesk 500, 0.7rem uppercase, `--white-40`, `letter-spacing: 0.1em`
- Row border: `1px solid var(--border-sm)` (bottom only)
- Row hover: background `--bg3`
- Cell text: Space Grotesk 400, 0.875rem, `--white-70`
- Numeric cells: IBM Plex Mono 400

---

## 6. Icon System

**Library: Lucide React** (or inline SVG using Lucide icon paths)  
**Rule: No emojis anywhere in the UI** — all icons are Lucide SVGs  
**Size convention:**
- Navigation icons: 18px
- Action icons (buttons): 16px
- Status indicators: 14px
- Hero/feature icons: 24–32px

---

## 7. Page Specifications

### 7.1 Homepage (`/`)

**Sections:**
1. **Nav** — logo left, links center (How it Works, Features, Pricing), auth buttons right (Login, Start Free). Transparent on scroll-top, `--bg1` with blur on scroll.
2. **Hero** — full-viewport, cursor glow background. Headline: large Space Grotesk 700, "Stop Getting" normal + "Ripped Off." in `--lavender`. Subhead about market-driven prices. Animated stats strip (3 countup numbers). Two CTAs: "Start Tracking Free" (primary, magnetic) + "See How It Works" (ghost).
3. **Stats Strip** — 3 countup stat cards in a row below hero.
4. **Deals Grid** — "Live Price Drops" section header with pulse dot. 6 deal cards with product image placeholder, platform badge, strikethrough MSRP, green current price, discount badge.
5. **How It Works** — 3-step stagger reveal. Steps: Search & Track → Get Alerts → Save Money.
6. **Features Grid** — 2×3 grid, stagger scroll reveal. Lucide icon per feature.
7. **CTA Banner** — full-width dark card, primary CTA.
8. **Footer** — 3-col links + social + copyright.

### 7.2 Product Page (`/product/[id]`)

**Layout:** 2-column (8/4 split at lg breakpoint)

**Left column:**
- Product header: platform badge, title, image, current price (IBM Plex Mono 600, large, `--green`/`--red`), MSRP strikethrough, savings badge
- Verdict card: color-coded header (green = good deal, red = price inflated, amber = suspicious). Price analysis text.
- Price History Chart: SVG draw animation on viewport enter. X-axis dates, Y-axis price. Color-coded pump zone shading. "Pump Zone" annotation label.
- Review summary (if applicable)

**Right column (sticky):**
- Set Alert form: target price input, email confirm, submit (magnetic CTA)
- Coupon card: code display, copy button
- Compare button

### 7.3 Dashboard (`/dashboard`)

**Auth:** Hard redirect to `/login` if no session.

**Sections:**
- 4 stat cards: Tracked Products, Active Alerts, Price Drops (7d), Avg Savings
- Alert Hits strip: horizontal scroll, latest triggered alerts
- Tracked Products grid: card per product, current price, alert status badge

### 7.4 Alerts (`/alerts`)

**Auth:** Hard redirect to `/login` if no session.

**Layout:**
- Alert limit bar (used/max, progress bar in `--purple`)
- Filter chips: All / Active / Hit / Paused
- Alert rows: product image thumbnail, product title, platform badge, target price, current price (color-coded), status badge, pause/delete actions

### 7.5 Admin Panel (`/admin/*`)

**Auth:** Supabase JWT + `is_admin` DB flag. Redirect to `/admin/login` if unauthorized.

**Layout:** Fixed left sidebar (220px wide)
- DamKoi logo + "Admin" badge
- Nav items with Lucide icons: Overview, Products, Users, Alerts, Coupons, Scrapers, Match Groups, Cron Jobs
- Active item: `--bg3` background + `--lavender` text + `--purple` left border
- Bottom: admin email + sign out button
- Mobile: sidebar collapses

**Pages:**
- **Overview** (`/admin`): 4 stat cards (total products, users, active alerts, push subs). Scraper health strip. Recent triggered alerts table.
- **Products** (`/admin/products`): Search input, platform filter dropdown, paginated table. Columns: title, platform badge, current price (IBM Plex Mono), last scraped, in-stock badge.
- **Users** (`/admin/users`): Table with email, auth provider, premium toggle switch, alert count, created date. Filter: premium only.
- **Alerts** (`/admin/alerts`): Table with product, user email, target price, current price, status badge, last triggered. Actions: pause (PATCH), delete (DELETE).
- **Coupons** (`/admin/coupons`): Table with code, platform, discount, expires. "Add Coupon" inline form. Edit/delete per row.
- **Cron** (`/admin/cron`): 6 job cards (alerts, coupons, digest, matching, backfill, cleanup). Each: description, last run timestamp, result status, "Run Now" button.
- **Scrapers** (`/admin/scrapers`): Existing page, adopts new layout.
- **Match Groups** (`/admin/compare`): Existing page, adopts new layout.

---

## 8. Globals CSS — What to Remove / Replace

Current `globals.css` uses **Tailwind v4** (`@import "tailwindcss"` + `@theme {}` block). Preserve this structure.

Remove all neumorphic tokens and classes:
```css
/* DELETE ALL of these: */
--nm-bg, --nm-dark, --nm-light
.nm-raised { box-shadow: ... }
.nm-inset { box-shadow: ... }
.nm-pill { box-shadow: ... }
.nm-flat { box-shadow: ... }
```

Replace `@theme` block with new color tokens (Section 2) using Tailwind v4 format:
```css
@theme {
  --color-bg: #08071a;
  --color-bg-1: #0e0c24;
  --color-bg-2: #13112e;
  --color-bg-3: #1a1740;
  --color-purple: #7c3aed;
  --color-lavender: #a78bfa;
  --color-lavender-2: #c4b5fd;
  --color-green: #22c55e;
  --color-red: #ef4444;
  --color-amber: #f59e0b;
}
```

CSS custom properties (used directly in components, not via Tailwind utilities) go in `@layer base :root {}`:
```css
:root {
  --bg: #08071a;
  --bg1: #0e0c24;
  /* ... etc from Section 2 */
}
```

Both are needed: Tailwind `@theme` for utility class generation (`bg-purple`, `text-lavender`), CSS vars for raw usage in `style={}` props and Framer Motion.

---

## 9. Implementation Order

1. `globals.css` — replace token system entirely
2. `layout.tsx` — font imports (Space Grotesk + IBM Plex Mono via next/font or link tag)
3. Homepage (`/`) — biggest user-facing page, most animation work
4. Product page (`/product/[id]`)
5. Dashboard + Alerts (auth already wired)
6. Admin layout + login
7. Admin pages (overview → users → alerts → coupons → cron → scrapers → compare)

---

## 10. Dependencies to Add

```bash
npm install framer-motion
```

`lucide-react` already installed (`^1.8.0`). Only `framer-motion` needs adding.

---

## 11. Supabase Manual Steps (required, not code-based)

1. Set **Site URL** to `https://damkoi.xynly.com` in Supabase dashboard → Authentication → URL Configuration
2. Add **Redirect URL** `https://damkoi.xynly.com/**` to allowed list
3. Set `is_admin = true` on admin user row via Supabase table editor
4. Change admin password from first-login default after testing

---

## 12. Non-Goals (out of scope for this redesign)

- i18n/locale changes (keep existing `[locale]` routing)
- Backend API changes (separate plan exists)
- Mobile app / PWA manifest changes
- SEO metadata changes beyond what new layout naturally provides
