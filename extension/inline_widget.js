/**
 * DamKoi — Inline Price Widget  (Buyhatke-parity build)
 *
 * Features implemented:
 *   ✅ 3-month price history SVG chart (interactive hover)
 *   ✅ Time range tabs: 1M · 3M · ALL
 *   ✅ "Buy Now" vs "Wait" recommendation card
 *   ✅ Price stats: current · 30d avg · all-time low · highest
 *   ✅ Look-alike / similar products inline (Buyhatke "LookAlike")
 *   ✅ Inline price alert form (no popup needed)
 *   ✅ Verdict badge with deal score arc
 *   ✅ Shadow DOM isolation (Daraz CSS cannot break the widget)
 *   ✅ Auto-injects below price section — zero user interaction
 */

import { API_BASE, safeFetch, formatBDT } from './utils.js';

/* ── Constants ───────────────────────────────────────────── */

const WIDGET_ID  = 'damkoi-inline-root';
const FONT_URL   = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';

const INJECT_AFTER = [
  '[class*="pdp-product-price"]',
  '[class*="product-price"]',
  '[class*="pdp-info-block"]',
  '.pdp-product-main--price',
  '[class*="pdp-block"]',
  '#module_add_to_cart',
  '[class*="add-to-cart"]',
  'form[action*="cart"]',
  '[class*="pdp-product-detail"]',
];

/* ── Colours ─────────────────────────────────────────────── */

const C = {
  bg:      '#FAFAF9',
  raised:  'rgba(255, 255, 255, 0.45)',
  inset:   'rgba(0, 0, 0, 0.04)',
  border:  'rgba(255, 255, 255, 0.5)',
  accent:  '#A16207',
  success: '#059669',
  danger:  '#DC2626',
  warn:    '#D97706',
  text:    '#0C0A09',
  muted:   '#44403C',
  dim:     '#A8A29E',
};

const VERDICT_META = {
  BEST_PRICE:        { icon: '🏆', label: 'Best Price',       color: C.success, bg: 'rgba(16,185,129,0.12)',  rec: 'buy'  },
  GOOD_DEAL:         { icon: '✅', label: 'Good Deal',         color: '#34d399', bg: 'rgba(52,211,153,0.1)',   rec: 'buy'  },
  FAIR_PRICE:        { icon: '🟡', label: 'Fair Price',        color: C.warn,    bg: 'rgba(245,158,11,0.1)',   rec: 'wait' },
  FAKE_DISCOUNT:     { icon: '❌', label: 'Fake Discount',     color: C.danger,  bg: 'rgba(239,68,68,0.1)',    rec: 'wait' },
  INSUFFICIENT_DATA: { icon: '📊', label: 'Not Enough Data',  color: C.muted,   bg: 'rgba(123,123,158,0.1)', rec: null   },
};

function scoreColor(s) {
  if (s >= 9) return C.success;
  if (s >= 7) return '#34d399';
  if (s >= 5) return C.warn;
  return C.danger;
}

/* ── SVG Chart (interactive) ─────────────────────────────── */

/**
 * Builds a fully-interactive SVG price chart.
 * Mouse hover shows a vertical cursor + tooltip with date & price.
 * Returns { svg: string, js: function(shadowRoot) }
 */
function buildChart(history, widthPx = 480, heightPx = 130) {
  if (!history || history.length < 2) {
    return {
      svg: `<div style="text-align:center;color:${C.dim};font-size:12px;padding:28px 0;">
              Not enough price data yet — check back in a few hours as we build your history.
            </div>`,
      initInteractivity: () => {},
    };
  }

  const pts = [...history].sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at));
  const prices = pts.map(p => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const pad   = { top: 12, right: 56, bottom: 26, left: 10 };
  const cw    = widthPx  - pad.left - pad.right;
  const ch    = heightPx - pad.top  - pad.bottom;

  const cx = i  => pad.left + (i / (pts.length - 1)) * cw;
  const cy = pr => pad.top  + ch - ((pr - minP) / range) * ch;

  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(p.price).toFixed(1)}`).join(' ');
  const areaD = `${lineD} L${cx(pts.length - 1).toFixed(1)},${(pad.top + ch).toFixed(1)} L${pad.left},${(pad.top + ch).toFixed(1)} Z`;

  // X-axis date labels (first, mid, last)
  const xLabelIdxs = [0, Math.floor(pts.length / 2), pts.length - 1];
  const xLabels = xLabelIdxs.map(i => {
    const d   = new Date(pts[i].scraped_at);
    const lbl = d.toLocaleDateString('en-BD', { month: 'short', day: 'numeric' });
    return `<text x="${cx(i).toFixed(1)}" y="${heightPx - 5}" text-anchor="middle"
              fill="${C.dim}" font-size="9" font-family="Inter,sans-serif">${lbl}</text>`;
  }).join('');

  // Min/max price gridlines
  const minY  = cy(minP);
  const maxY  = cy(maxP);
  const minIdx = prices.lastIndexOf(minP);
  const gradId = `dkg_${Math.random().toString(36).slice(2, 7)}`;

  const dots = pts.map((p, i) => {
    const isMin = p.price === minP && i === minIdx;
    const isLast = i === pts.length - 1;
    if (!isMin && !isLast) return '';
    const fill = isMin ? C.success : C.accent;
    const r = isLast ? 5 : 4;
    return `<circle cx="${cx(i).toFixed(1)}" cy="${cy(p.price).toFixed(1)}" r="${r}"
      fill="${fill}" stroke="${C.bg}" stroke-width="1.5"
      style="filter:drop-shadow(0 0 4px ${fill});"/>`;
  }).join('');

  const svgId = `dksvg_${Math.random().toString(36).slice(2, 7)}`;

  const svg = `
    <svg id="${svgId}" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}"
         style="display:block;overflow:visible;cursor:crosshair;">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${C.accent}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${C.accent}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      <line x1="${pad.left}" y1="${maxY.toFixed(1)}" x2="${widthPx - pad.right}" y2="${maxY.toFixed(1)}"
            stroke="rgba(0,0,0,0.06)" stroke-dasharray="3 3" stroke-width="1"/>
      <line x1="${pad.left}" y1="${minY.toFixed(1)}" x2="${widthPx - pad.right}" y2="${minY.toFixed(1)}"
            stroke="rgba(16,185,129,0.12)" stroke-dasharray="3 3" stroke-width="1"/>

      <!-- Area + line -->
      <path d="${areaD}" fill="url(#${gradId})"/>
      <path d="${lineD}" fill="none" stroke="${C.accent}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Price labels right side -->
      <text x="${widthPx - pad.right + 4}" y="${(maxY + 4).toFixed(1)}"
            fill="${C.muted}" font-size="9" font-family="Inter,sans-serif">${formatBDT(maxP)}</text>
      <text x="${widthPx - pad.right + 4}" y="${(minY + 4).toFixed(1)}"
            fill="${C.success}" font-size="9" font-family="Inter,sans-serif">${formatBDT(minP)}</text>

      <!-- Key dots -->
      ${dots}

      <!-- Hover crosshair (hidden by default) -->
      <line id="${svgId}_hline" x1="0" y1="0" x2="0" y2="${heightPx - pad.bottom}"
            stroke="${C.accent}" stroke-width="1" stroke-dasharray="3 2" opacity="0"
            style="pointer-events:none;"/>
      <circle id="${svgId}_hdot" cx="0" cy="0" r="5"
              fill="${C.accent}" stroke="${C.bg}" stroke-width="2"
              opacity="0" style="pointer-events:none;"/>

      <!-- X labels -->
      ${xLabels}
    </svg>

    <!-- Hover tooltip -->
    <div id="${svgId}_tip" style="
      display:none;position:absolute;
      background:${C.raised};border:1px solid ${C.border};
      border-radius:8px;padding:6px 10px;font-size:11px;
      color:${C.text};font-family:Inter,sans-serif;
      box-shadow:-2px -2px 6px rgba(255,255,255,0.8),2px 2px 8px rgba(0,0,0,0.1);
      pointer-events:none;white-space:nowrap;z-index:10;
    "></div>`;

  function initInteractivity(shadowRoot) {
    const svgEl  = shadowRoot.getElementById(svgId);
    const hline  = shadowRoot.getElementById(`${svgId}_hline`);
    const hdot   = shadowRoot.getElementById(`${svgId}_hdot`);
    const tipEl  = shadowRoot.getElementById(`${svgId}_tip`);
    if (!svgEl || !hline || !hdot || !tipEl) return;

    const chartContainer = svgEl.parentElement;
    if (chartContainer) chartContainer.style.position = 'relative';

    svgEl.addEventListener('mousemove', (e) => {
      const rect    = svgEl.getBoundingClientRect();
      const mouseX  = e.clientX - rect.left;
      const svgXRaw = (mouseX / rect.width) * widthPx;
      const svgX    = Math.max(pad.left, Math.min(widthPx - pad.right, svgXRaw));

      // Find nearest data point
      const idx   = Math.round((svgX - pad.left) / cw * (pts.length - 1));
      const clamp = Math.max(0, Math.min(pts.length - 1, idx));
      const pt    = pts[clamp];
      const px    = cx(clamp);
      const py    = cy(pt.price);

      // Crosshair
      hline.setAttribute('x1', px.toFixed(1));
      hline.setAttribute('x2', px.toFixed(1));
      hline.setAttribute('opacity', '0.7');
      hdot.setAttribute('cx', px.toFixed(1));
      hdot.setAttribute('cy', py.toFixed(1));
      hdot.setAttribute('opacity', '1');

      // Tooltip
      const d   = new Date(pt.scraped_at);
      const lbl = d.toLocaleDateString('en-BD', { month: 'short', day: 'numeric', year: 'numeric' });
      tipEl.innerHTML = `<span style="color:${C.dim}">${lbl}</span>&nbsp;&nbsp;<strong style="color:${C.accent}">${formatBDT(pt.price)}</strong>`;
      tipEl.style.display = 'block';

      // Position tooltip (flip if near right edge)
      const tipW   = 180;
      const leftPx = (px / widthPx) * rect.width + (px > widthPx * 0.65 ? -(tipW + 8) : 12);
      const topPx  = (py / heightPx) * rect.height - 16;
      tipEl.style.left = `${leftPx}px`;
      tipEl.style.top  = `${topPx}px`;
    });

    svgEl.addEventListener('mouseleave', () => {
      hline.setAttribute('opacity', '0');
      hdot.setAttribute('opacity', '0');
      tipEl.style.display = 'none';
    });
  }

  return { svg, initInteractivity };
}

/* ── Widget CSS ──────────────────────────────────────────── */

const WIDGET_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&family=Rubik:wght@500;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :host { 
    display: block; 
    margin: 20px 0 24px; 
    font-family: 'Nunito Sans', sans-serif; 
    --dk-glass: blur(14px) saturate(190%);
  }

  #dkw {
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: var(--dk-glass);
    -webkit-backdrop-filter: var(--dk-glass);
    border: 1px solid ${C.border};
    border-radius: 20px;
    box-shadow: 0 8px 32px 0 rgba(28, 25, 23, 0.12);
    overflow: hidden;
    line-height: 1.4;
    font-size: 13px;
    color: ${C.text};
    position: relative;
  }

  .dk-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 18px;
    border-bottom: 1px solid ${C.border};
  }

  .dk-brand { display: flex; align-items: center; gap: 10px; }

  .dk-brand-name {
    font-family: 'Rubik', sans-serif;
    font-size: 16px;
    font-weight: 800;
    background: linear-gradient(135deg, ${C.text}, ${C.accent});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }

  .dk-brand-tag { 
    font-family: 'Rubik', sans-serif;
    font-size: 9px; 
    color: ${C.dim}; 
    font-weight: 700; 
    text-transform: uppercase; 
    letter-spacing: 1.5px; 
  }

  .dk-verdict-pill {
    font-family: 'Rubik', sans-serif;
    font-size: 11px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  }

  .dk-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: ${C.border};
  }

  .dk-stat {
    background: rgba(255, 255, 255, 0.2);
    padding: 12px 10px;
    text-align: center;
  }

  .dk-stat-label {
    font-family: 'Rubik', sans-serif;
    font-size: 9px;
    color: ${C.dim};
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .dk-stat-value {
    font-family: 'Rubik', sans-serif;
    font-size: 14px;
    font-weight: 800;
    color: ${C.text};
  }

  .dk-rec {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 18px;
    border-bottom: 1px solid ${C.border};
  }

  .dk-rec-title {
    font-family: 'Rubik', sans-serif;
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .dk-chart-section { padding: 16px 18px; }

  .dk-range-tab {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 700;
    font-family: 'Rubik', sans-serif;
    transition: all var(--dk-transition);
  }

  .dk-range-tab.active {
    background: ${C.accent};
    color: white;
    box-shadow: 0 4px 12px rgba(161, 98, 7, 0.3);
  }

  .dk-chart-inner {
    background: ${C.inset};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 12px;
  }

  .dk-alt-item {
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 12px;
    transition: var(--dk-transition);
  }

  .dk-alt-item:hover {
    background: rgba(255, 255, 255, 0.6);
    transform: translateX(4px);
    border-color: ${C.accent};
  }

  .dk-coupon-card {
    background: rgba(255, 255, 255, 0.2);
    border: 1px dashed ${C.accent};
    border-radius: 12px;
    padding: 12px;
  }

  .dk-coupon-code {
    font-family: 'Inter', monospace;
    font-weight: 800;
    color: ${C.accent};
    font-size: 14px;
    background: rgba(161, 98, 7, 0.08);
    padding: 4px 8px;
    border-radius: 6px;
  }

  .dk-alert-btn, .dk-submit-btn, .dk-coupon-copy {
    background: ${C.primary};
    color: white;
    border: none;
    border-radius: 10px;
    font-family: 'Rubik', sans-serif;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .dk-skel {
  .dk-skel-footer { display:flex; justify-content:space-between; gap:10px; }
  .dk-skel-foot-l { height:22px; flex:1; border-radius:6px; }
  .dk-skel-btn    { height:30px; width:90px; border-radius:8px; }
`;


/* ── Skeleton ────────────────────────────────────────────── */

/* ── Coupons Section ─────────────────────────────────────── */

/**
 * Renders the coupon section HTML for the inline widget.
 * @param {Array} coupons - Array of coupon objects from API
 */
function buildCouponsSection(coupons) {
  if (!coupons || coupons.length === 0) return '';

  const cards = coupons.map((c, i) => {
    const meta = c.min_spend
      ? `Min spend: ৳${(c.min_spend / 100).toFixed(0)}`
      : 'No minimum spend';
    const expiry = c.expires_at
      ? `· Expires ${new Date(c.expires_at).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}`
      : '';
    return `
      <div class="dk-coupon-card">
        <div class="dk-coupon-left">
          <div class="dk-coupon-code">${c.code}</div>
          <div class="dk-coupon-meta">${meta}${expiry}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="dk-coupon-badge">${c.display_discount}</div>
          <button class="dk-coupon-copy" data-dk-copy="${c.code}" id="dkcp_${i}">Copy</button>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="dk-divider"></div>
    <div class="dk-coupons">
      <div class="dk-coupon-title">🏷️ Available Coupons</div>
      <div class="dk-coupon-list">${cards}</div>
    </div>`;
}

/**
 * Wires click handlers for coupon copy buttons inside the Shadow DOM.
 */
function wireCoupons(shadowRoot) {
  shadowRoot.querySelectorAll('[data-dk-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = btn.dataset.dkCopy;
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = '✅ Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      } catch {
        // Fallback for non-secure contexts
        btn.textContent = code;
        btn.select?.();
      }
    });
  });
}

/**
 * Renders an instant placeholder that matches the full widget shape.
 * Shown immediately on injection; replaced by real HTML once data arrives.
 */
function buildSkeleton() {
  return `
    <div id="dkw-skeleton">
      <!-- Brand bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 4px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="dk-skel" style="width:20px;height:20px;border-radius:50%;"></div>
          <div class="dk-skel dk-skel-bar" style="width:80px;height:14px;"></div>
        </div>
        <div class="dk-skel" style="width:90px;height:22px;border-radius:20px;"></div>
      </div>

      <!-- Hero: gauge + badge -->
      <div class="dk-skel-hero">
        <div class="dk-skel dk-skel-disc"></div>
        <div class="dk-skel-lines">
          <div class="dk-skel dk-skel-line" style="width:55%;"></div>
          <div class="dk-skel dk-skel-line" style="width:80%;"></div>
          <div class="dk-skel dk-skel-line" style="width:65%;"></div>
        </div>
      </div>

      <!-- 4 stat tiles -->
      <div class="dk-skel-tiles">
        <div class="dk-skel dk-skel-tile"></div>
        <div class="dk-skel dk-skel-tile"></div>
        <div class="dk-skel dk-skel-tile"></div>
        <div class="dk-skel dk-skel-tile"></div>
      </div>

      <!-- Chart area -->
      <div class="dk-skel dk-skel-chart"></div>

      <!-- Footer -->
      <div class="dk-skel-footer">
        <div class="dk-skel dk-skel-foot-l"></div>
        <div class="dk-skel dk-skel-btn"></div>
      </div>
    </div>`;
}

/* ── Gauge Arc ───────────────────────────────────────────── */

function buildGaugeArc(score) {
  const color  = scoreColor(score);
  const r      = 24;
  const circ   = Math.PI * r;
  const offset = circ * (1 - score / 10);
  return `
    <svg width="58" height="36" viewBox="0 0 58 36" style="overflow:visible;">
      <path d="M5 30 A24 24 0 0 1 53 30" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M5 30 A24 24 0 0 1 53 30" fill="none" stroke="${color}"
            stroke-width="4.5" stroke-linecap="round"
            stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
            style="filter:drop-shadow(0 0 4px ${color});transition:stroke-dashoffset 0.9s cubic-bezier(.34,1.56,.64,1);"/>
      <text x="29" y="29" text-anchor="middle" fill="${color}"
            font-size="13" font-weight="900" font-family="Inter,sans-serif">${score}</text>
      <text x="29" y="35" text-anchor="middle" fill="${C.dim}"
            font-size="6.5" font-family="Inter,sans-serif">/10</text>
    </svg>`;
}

/* ── "Buy Now / Wait" recommendation ─────────────────────── */

function buildRecommendation(verdict, savingsPct) {
  const vm  = VERDICT_META[verdict.label] || VERDICT_META.INSUFFICIENT_DATA;
  if (!vm.rec) return '';

  if (vm.rec === 'buy') {
    const savings = savingsPct > 0 ? `You save <strong style="color:${C.success}">${savingsPct}%</strong> vs the 30-day average.` : 'This is at or below its typical price.';
    return `
      <div class="dk-rec">
        <div class="dk-rec-icon">🟢</div>
        <div>
          <div class="dk-rec-title" style="color:${C.success}">Good Time to Buy</div>
          <div class="dk-rec-sub">${savings} ${verdict.explanation}</div>
        </div>
      </div>`;
  } else {
    return `
      <div class="dk-rec">
        <div class="dk-rec-icon">⏳</div>
        <div>
          <div class="dk-rec-title" style="color:${C.warn}">Consider Waiting</div>
          <div class="dk-rec-sub">${verdict.explanation}</div>
        </div>
      </div>`;
  }
}

/* ── Look-alike / Alternatives ────────────────────────────── */

function buildAltsList(alts) {
  if (!alts || alts.length === 0) return '';
  const items = alts.slice(0, 3).map(alt => {
    const img = alt.image_url
      ? `<img class="dk-alt-img" src="${alt.image_url}" alt="" loading="lazy"/>`
      : `<img class="dk-alt-img" src="${chrome.runtime.getURL('icons/dk_logo.svg')}" style="background:#fff;object-fit:contain;padding:4px;" />`;
    const savingsText = alt.savings > 0
      ? `<span class="dk-alt-save">Save ${formatBDT(alt.savings)}</span>` : '';
    return `
      <div class="dk-alt-item" data-url="${alt.url}">
        ${img}
        <div class="dk-alt-info">
          <div class="dk-alt-name">${alt.title}</div>
          <div>
            <span class="dk-alt-price">${formatBDT(alt.current_price)}</span>
            ${savingsText}
          </div>
        </div>
        <div class="dk-alt-arrow">›</div>
      </div>`;
  }).join('');

  return `
    <div class="dk-divider" style="margin-bottom:12px;"></div>
    <div class="dk-alts">
      <div class="dk-alts-title">🔍 Look-alike Deals</div>
      <div class="dk-alt-list" id="dk-alt-list">${items}</div>
    </div>`;
}

/* ── Full widget HTML ─────────────────────────────────────── */

function buildHTML(data, alts, chartObj, activeRange, coupons = []) {
  const { product, verdict } = data;
  const vm     = VERDICT_META[verdict.label] || VERDICT_META.INSUFFICIENT_DATA;
  const color  = vm.color;

  const savingsPct = verdict.avg_30d && product.current_price && verdict.avg_30d > product.current_price
    ? Math.round((verdict.avg_30d - product.current_price) / verdict.avg_30d * 100) : 0;

  const priceHistory = data.price_history || [];

  return `
  <div id="dkw">

    <!-- Top bar -->
    <div class="dk-bar">
      <div class="dk-brand">
        <img src="${chrome.runtime.getURL('icons/dk_logo.svg')}" style="height:20px;filter:drop-shadow(0 0 6px rgba(108,99,255,0.3));" />
        <span class="dk-brand-name">DamKoi</span>
        <span class="dk-brand-tag">Price Intel</span>
      </div>
      <div class="dk-bar-right">
        <span class="dk-verdict-pill" style="color:${color};background:${vm.bg};">
          ${vm.icon} ${vm.label}
        </span>
        ${buildGaugeArc(verdict.deal_score)}
      </div>
    </div>

    <!-- Recommendation card -->
    ${buildRecommendation(verdict, savingsPct)}

    <!-- Price stats (4 tiles) -->
    <div class="dk-stats">
      ${[
        ['Current',      formatBDT(product.current_price),   C.accent],
        ['30-Day Avg',   verdict.avg_30d ? formatBDT(verdict.avg_30d) : '—',         C.text],
        ['All-Time Low', verdict.all_time_low ? formatBDT(verdict.all_time_low) : '—', C.success],
        ['Highest Ever', verdict.all_time_high ? formatBDT(verdict.all_time_high) : `${priceHistory.length > 0 ? formatBDT(Math.max(...priceHistory.map(p=>p.price))) : '—'}`, C.muted],
      ].map(([label, value, clr]) => `
        <div class="dk-stat">
          <div class="dk-stat-label">${label}</div>
          <div class="dk-stat-value" style="color:${clr};">${value}</div>
          ${label === '30-Day Avg' && savingsPct > 0
            ? `<div style="font-size:9px;color:${C.success};margin-top:2px;font-weight:600;">↓${savingsPct}% savings</div>`
            : '<div style="height:12px;"></div>'}
        </div>
      `).join('')}
    </div>

    <!-- Chart -->
    <div class="dk-chart-section">
      <div class="dk-chart-header">
        <span class="dk-chart-title">📈 Price History</span>
        <div class="dk-range-tabs">
          ${['1M','3M','ALL'].map(r =>
            `<button class="dk-range-tab${r === activeRange ? ' active' : ''}" data-range="${r}">${r}</button>`
          ).join('')}
        </div>
      </div>
      <div class="dk-chart-inner" id="dk-chart-inner">
        ${chartObj.svg}
      </div>
      <div class="dk-chart-legend">
        <span><span class="dk-legend-dot" style="background:${C.accent};"></span>Price line</span>
        <span><span class="dk-legend-dot" style="background:${C.success};"></span>All-time low</span>
        <span><span class="dk-legend-dot" style="background:${C.accent};filter:drop-shadow(0 0 3px ${C.accent});"></span>Now &nbsp; ${priceHistory.length} data points</span>
      </div>
    </div>

    <!-- Look-alike alternatives -->
    ${alts ? buildAltsList(alts) : `<div class="dk-divider"></div><div class="dk-loading"><span class="dk-spinner"></span>Loading similar products…</div>`}

    <!-- Coupons -->
    ${buildCouponsSection(coupons)}

    <!-- Footer: explanation + alert CTA -->
    <div class="dk-footer">
      <p class="dk-explanation">${verdict.explanation}</p>
      <button class="dk-alert-btn" id="dk-alert-btn">🔔 Alert me</button>
    </div>

    <!-- Alert form (hidden) -->
    <div class="dk-alert-form" id="dk-alert-form">
      <div class="dk-alert-row">
        <input class="dk-input" type="email" id="dk-email" placeholder="your@email.com" autocomplete="email"/>
        <input class="dk-input dk-input-narrow" type="number" id="dk-target"
               placeholder="Target ৳"
               value="${verdict.avg_30d ? Math.floor(verdict.avg_30d / 100 * 0.92) : ''}"/>
        <button class="dk-submit-btn" id="dk-submit">Set</button>
      </div>
      <div class="dk-status" id="dk-status"></div>
    </div>

  </div>`;
}

/* ── Filter history by range ─────────────────────────────── */

function filterByRange(history, range) {
  if (!history || history.length === 0) return history;
  if (range === 'ALL') return history;
  const days = range === '1M' ? 30 : 90;
  const cutoff = Date.now() - days * 86_400_000;
  const filtered = history.filter(p => new Date(p.scraped_at).getTime() >= cutoff);
  return filtered.length >= 2 ? filtered : history; // fall back if too sparse
}

/* ── Wire interactivity ──────────────────────────────────── */

function wireWidget(shadowRoot, data, alts, currentRange, coupons = []) {
  // Wire coupon copy buttons
  wireCoupons(shadowRoot);

  // Time range tabs
  shadowRoot.querySelectorAll('.dk-range-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const range = tab.dataset.range;
      if (range === currentRange) return;
      currentRange = range;

      // Re-run chart
      const filtered   = filterByRange(data.price_history || [], range);
      const newChart   = buildChart(filtered, 460, 130);
      const inner      = shadowRoot.getElementById('dk-chart-inner');
      if (inner) {
        inner.innerHTML = newChart.svg;
        newChart.initInteractivity(shadowRoot);
      }

      shadowRoot.querySelectorAll('.dk-range-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.range === range));
    });
  });

  // Alert CTA toggle
  const alertBtn  = shadowRoot.getElementById('dk-alert-btn');
  const alertForm = shadowRoot.getElementById('dk-alert-form');
  alertBtn?.addEventListener('click', () => {
    const open = alertForm.style.display !== 'none';
    alertForm.style.display = open ? 'none' : 'block';
    alertBtn.textContent = open ? '🔔 Alert me' : '✕ Cancel';
  });

  // Alert submit
  shadowRoot.getElementById('dk-submit')?.addEventListener('click', async () => {
    const email     = shadowRoot.getElementById('dk-email')?.value?.trim();
    const targetBDT = parseFloat(shadowRoot.getElementById('dk-target')?.value || '0');
    const status    = shadowRoot.getElementById('dk-status');
    const btn       = shadowRoot.getElementById('dk-submit');

    const setStatus = (msg, color) => {
      status.textContent = msg;
      status.style.color = color;
    };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setStatus('Enter a valid email address.', C.danger);
    }
    if (!targetBDT || targetBDT <= 0) {
      return setStatus('Enter a valid target price.', C.danger);
    }

    btn.disabled = true;
    setStatus('Setting alert…', C.muted);

    try {
      await safeFetch('CREATE_ALERT', {
        payload: {
          product_id:   data.product.id,
          target_price: Math.round(targetBDT * 100),
          email,
          channel:      'email',
        }
      });
      setStatus(`✅ Alert set! We'll email you when price drops to ৳${targetBDT.toLocaleString('en-BD')}.`, C.success);
      alertBtn.textContent = '✅ Alert set';
    } catch {
      setStatus('Failed to set alert — please try again.', C.danger);
    } finally {
      btn.disabled = false;
    }
  });

  // Alternatives click
  const altList = shadowRoot.getElementById('dk-alt-list');
  altList?.addEventListener('click', e => {
    const item = e.target.closest('[data-url]');
    if (item?.dataset?.url) window.location.href = item.dataset.url;
  });
}

/* ── Injection ───────────────────────────────────────────── */

function findTarget() {
  for (const sel of INJECT_AFTER) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

async function injectWidget(data) {
  // Remove any stale widget
  document.getElementById(WIDGET_ID)?.remove();

  const target = findTarget();
  if (!target) {
    console.warn('[DamKoi] No injection target found');
    return;
  }

  // Create host + Shadow DOM
  const host = document.createElement('div');
  host.id = WIDGET_ID;
  const shadow = host.attachShadow({ mode: 'open' });

  // Inject CSS into shadow
  const styleEl = document.createElement('style');
  styleEl.textContent = WIDGET_CSS;
  shadow.appendChild(styleEl);

  // Mount container
  const mount = document.createElement('div');
  shadow.appendChild(mount);
  target.insertAdjacentElement('afterend', host);

  // ── Step 1: Show skeleton IMMEDIATELY (zero-delay) ───────────────────
  mount.innerHTML = buildSkeleton();

  // ── Step 2: Build chart + real HTML in the background ────────────────
  const activeRange = '3M';
  const filtered    = filterByRange(data.price_history || [], activeRange);
  const chartObj    = buildChart(filtered, 460, 130);

  // Small rAF to let the skeleton paint before doing heavy work
  await new Promise(r => requestAnimationFrame(r));

  // Fetch alternatives + coupons concurrently
  const productId = data.product.id;
  const [altsResult, couponsResult] = await Promise.allSettled([
    fetch(`${API_BASE}/v1/products/${productId}/alternatives`).then(r => r.ok ? r.json() : []),
    fetch(`${API_BASE}/v1/products/${productId}/coupons`).then(r => r.ok ? r.json() : []),
  ]);
  const alts    = altsResult.status    === 'fulfilled' ? (altsResult.value || [])    : [];
  const coupons = couponsResult.status === 'fulfilled' ? (couponsResult.value || []) : [];

  // ── Step 3: Swap skeleton → real widget (smooth fade) ────────────────
  mount.style.transition = 'opacity 0.25s ease';
  mount.style.opacity = '0';

  await new Promise(r => setTimeout(r, 120)); // brief fade-out

  mount.innerHTML = buildHTML(data, alts, buildChart(filtered, 460, 130), activeRange, coupons);
  buildChart(filtered, 460, 130).initInteractivity(shadow);
  wireWidget(shadow, data, alts, activeRange, coupons);

  mount.style.opacity = '1'; // fade-in with real content
}



export { injectWidget };
