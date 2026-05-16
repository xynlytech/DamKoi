(() => {
  // utils.js
  async function safeFetch(type, payload = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, ...payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || "Unknown error"));
        }
      });
    });
  }
  var ALERT_CHANNELS = {
    EMAIL: "email",
    SMS: "sms",
    PUSH: "push"
  };
  var DEFAULT_ALERT_CHANNEL = ALERT_CHANNELS.EMAIL;
  var CACHE_TTL = 60 * 60 * 1e3;
  function getCacheKey(type, identifier) {
    return `damkoi:v2:${type}:${identifier}`;
  }
  function getFromCache(cacheKey) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached)
        return null;
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      if (age > CACHE_TTL) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      return data;
    } catch (e) {
      console.warn("[DamKoi Cache] Failed to read cache:", e);
      return null;
    }
  }
  function saveToCache(cacheKey, data) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn("[DamKoi Cache] Failed to save cache:", e);
    }
  }
  function getScoreColor(score) {
    if (score >= 8)
      return "#10b981";
    if (score >= 6)
      return "#f59e0b";
    if (score >= 4)
      return "#ef4444";
    return "#dc2626";
  }
  function getScoreClass(score) {
    if (score >= 8)
      return "score-green";
    if (score >= 6)
      return "score-amber";
    return "score-red";
  }
  function formatBDT(paisa) {
    if (!paisa)
      return "\u2014";
    const bdt = paisa / 100;
    return `\u09F3${bdt.toLocaleString("en-BD")}`;
  }
  function createAlertPayload(productId, targetPrice, email, channels = [DEFAULT_ALERT_CHANNEL]) {
    return {
      product_id: productId,
      target_price: parseInt(targetPrice) * 100,
      email: email.trim(),
      notify_via: channels
    };
  }
  function setStatusMessage(element, type, message) {
    if (!element)
      return;
    const isSuccess = type === "success";
    const isInfo = type === "info";
    element.textContent = message;
    element.classList.remove("dk-status-success", "dk-status-error", "dk-status-info");
    if (isSuccess) {
      element.classList.add("dk-status-success");
    } else if (isInfo) {
      element.classList.add("dk-status-info");
    } else {
      element.classList.add("dk-status-error");
    }
  }
  function isValidEmail(email) {
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }
  function isValidPrice(price) {
    const parsed = parseInt(price);
    return !isNaN(parsed) && parsed > 0;
  }
  var RECENT_VIEWS_KEY = "damkoi:recent-views";
  var RECENT_VIEWS_ENABLED_KEY = "damkoi:recent-views-enabled";
  var MAX_RECENT_VIEWS = 20;
  async function isRecentViewsEnabled() {
    return new Promise((resolve) => {
      chrome.storage.local.get(RECENT_VIEWS_ENABLED_KEY, (result) => {
        resolve(result[RECENT_VIEWS_ENABLED_KEY] !== false);
      });
    });
  }
  async function setRecentViewsEnabled(enabled) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [RECENT_VIEWS_ENABLED_KEY]: enabled }, resolve);
    });
  }
  async function getRecentViews() {
    return new Promise((resolve) => {
      chrome.storage.local.get(RECENT_VIEWS_KEY, (result) => {
        resolve(result[RECENT_VIEWS_KEY] || []);
      });
    });
  }
  async function saveRecentView(product, verdict) {
    const enabled = await isRecentViewsEnabled();
    if (!enabled)
      return;
    const views = await getRecentViews();
    const entry = {
      id: product.id,
      title: product.title,
      url: product.url,
      image_url: product.image_url || null,
      platform: product.platform,
      price: product.current_price,
      deal_score: verdict?.deal_score ?? null,
      label: verdict?.label ?? null,
      viewed_at: Date.now()
    };
    const filtered = views.filter((v) => v.id !== entry.id);
    const updated = [entry, ...filtered].slice(0, MAX_RECENT_VIEWS);
    return new Promise((resolve) => {
      chrome.storage.local.set({ [RECENT_VIEWS_KEY]: updated }, resolve);
    });
  }
  async function clearRecentViews() {
    return new Promise((resolve) => {
      chrome.storage.local.remove(RECENT_VIEWS_KEY, resolve);
    });
  }
  var COUPON_VOTES_KEY = "damkoi:coupon-votes";
  async function getCouponVotes() {
    return new Promise((resolve) => {
      chrome.storage.local.get(COUPON_VOTES_KEY, (result) => {
        resolve(result[COUPON_VOTES_KEY] || {});
      });
    });
  }
  async function voteCoupon(couponId, helpful) {
    const votes = await getCouponVotes();
    votes[couponId] = helpful;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [COUPON_VOTES_KEY]: votes }, resolve);
    });
  }
  var SAVED_EMAIL_KEY = "damkoi:saved-email";
  async function getSavedEmail() {
    return new Promise((resolve) => {
      chrome.storage.local.get(SAVED_EMAIL_KEY, (result) => {
        resolve(result[SAVED_EMAIL_KEY] || "");
      });
    });
  }
  async function setSavedEmail(email) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [SAVED_EMAIL_KEY]: email }, resolve);
    });
  }
  var AUTO_APPLY_KEY = "damkoi:auto-apply-coupons";
  async function getAutoApply() {
    return new Promise((resolve) => {
      chrome.storage.local.get(AUTO_APPLY_KEY, (result) => {
        resolve(result[AUTO_APPLY_KEY] !== false);
      });
    });
  }
  async function setAutoApply(enabled) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [AUTO_APPLY_KEY]: enabled }, resolve);
    });
  }
  function getHorizonRecommendation(horizon, verdict, product) {
    const score = verdict.deal_score;
    const curr = product.current_price;
    const avg = verdict.avg_30d;
    const atl = verdict.all_time_low;
    if (horizon === "days") {
      if (score >= 8)
        return { action: "buy", text: "Price is at a good point right now. Unlikely to drop further in 2\u20133 days." };
      if (score >= 6)
        return { action: "neutral", text: "Fair price but not exceptional. Small chance of a short-term dip." };
      return { action: "wait", text: "Price is above average. Wait for a deal notification." };
    }
    if (horizon === "week") {
      const pct = avg ? Math.round((avg - curr) / avg * 100) : 0;
      if (pct >= 10)
        return { action: "buy", text: `${pct}% below 30-day average. This week is a good window.` };
      return { action: "wait", text: "Prices on this item can fluctuate. Set an alert for your target price." };
    }
    if (atl && curr <= atl * 1.03)
      return { action: "buy", text: "At or near all-time low. This level rarely lasts a month." };
    if (atl && avg) {
      const room = Math.round((curr - atl) / curr * 100);
      if (room > 15)
        return { action: "wait", text: `All-time low is \u09F3${(atl / 100).toLocaleString("en-BD")} \u2014 ${room}% below current. Worth waiting.` };
    }
    return { action: "neutral", text: "No strong signal for the next month. Set an alert at your target price." };
  }

  // visualizer.js
  var Visualizer = {
    /**
     * Renders a Deal Score Gauge (Speedometer)
     * @param {number} score - Deal score from 0 to 10
     * @param {string} containerId - ID of the container element
     */
    renderDealGauge(score, containerId) {
      const container = document.getElementById(containerId);
      if (!container)
        return;
      const normalizedScore = Math.min(Math.max(score, 0), 10);
      const percentage = normalizedScore / 10;
      const color = getScoreColor(score);
      const radius = 40;
      const circumference = Math.PI * radius;
      const offset = circumference * (1 - percentage);
      container.innerHTML = `
      <div class="damkoi-gauge-container">
        <svg width="100" height="60" viewBox="0 0 100 60">
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="8"
            stroke-linecap="round" />
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="${color}"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            class="damkoi-gauge-fill" />
        </svg>
        <div class="damkoi-gauge-value ${getScoreClass(score)}">${score}</div>
        <div class="damkoi-gauge-label">Deal Score</div>
      </div>
    `;
    },
    /**
     * Renders a Price Trend Sparkline
     * @param {Array} history - Array of price snapshot objects
     * @param {string} containerId - ID of the container element
     */
    renderPriceChart(history, containerId) {
      const container = document.getElementById(containerId);
      if (!container || !history || history.length < 2) {
        container.innerHTML = '<div class="damkoi-no-data">Not enough data for chart</div>';
        return;
      }
      const points = [...history].sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at));
      const prices = points.map((p) => p.price);
      const min = Math.min(...prices) * 0.95;
      const max = Math.max(...prices) * 1.05;
      const range = max - min;
      const width = 280;
      const height = 120;
      const padding = 10;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;
      const coords = points.map((p, i) => {
        const x = padding + i * (chartWidth / (points.length - 1));
        const y = padding + (chartHeight - (p.price - min) / range * chartHeight);
        return { x, y };
      });
      const d = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
      const areaD = `${d} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;
      container.innerHTML = `
      <div class="damkoi-chart-container">
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <defs>
            <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="rgba(167, 139, 250, 0.4)" stop-opacity="1" />
              <stop offset="100%" stop-color="rgba(167, 139, 250, 0)" stop-opacity="1" />
            </linearGradient>
          </defs>
          <path d="${areaD}" fill="url(#chart-grad)" />
          <path d="${d}" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Tooltip dots for each point (hidden by default) -->
          ${coords.map((c, i) => `
            <circle cx="${c.x}" cy="${c.y}" r="3" fill="#fff" class="damkoi-chart-dot" opacity="${i === coords.length - 1 ? 1 : 0}">
              <title>${new Date(points[i].scraped_at).toLocaleDateString()}: ${formatBDT(points[i].price)}</title>
            </circle>
          `).join("")}
        </svg>
      </div>
    `;
    }
  };
  var visualizer_default = Visualizer;

  // icons.js
  var ICONS = {
    summary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    alternatives: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 21v-8"/><path d="m7 16 5 5 5-5"/></svg>',
    alerts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    lookalike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    coupons: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    recentViews: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
    thumbsUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>',
    thumbsDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
  };

  // inline_widget.js
  var WIDGET_ID = "damkoi-inline-root";
  var INJECT_AFTER = [
    '[class*="pdp-product-price"]',
    '[class*="product-price"]',
    '[class*="pdp-info-block"]',
    ".pdp-product-main--price",
    '[class*="pdp-block"]',
    "#module_add_to_cart",
    '[class*="add-to-cart"]',
    'form[action*="cart"]',
    '[class*="pdp-product-detail"]'
  ];
  var C = {
    bg: "#FAFAF9",
    raised: "rgba(255, 255, 255, 0.45)",
    inset: "rgba(0, 0, 0, 0.04)",
    border: "rgba(255, 255, 255, 0.5)",
    accent: "#7c3aed",
    primary: "#7c3aed",
    success: "#059669",
    danger: "#DC2626",
    warn: "#D97706",
    text: "#0C0A09",
    muted: "#44403C",
    dim: "#A8A29E"
  };
  var IC = {
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    xmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    buy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
    wait: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>'
  };
  var VERDICT_META = {
    BEST_PRICE: { icon: IC.trophy, label: "Best Price", color: C.success, bg: "rgba(16,185,129,0.12)", rec: "buy" },
    GOOD_DEAL: { icon: IC.check, label: "Good Deal", color: "#34d399", bg: "rgba(52,211,153,0.1)", rec: "buy" },
    FAIR_PRICE: { icon: IC.clock, label: "Fair Price", color: C.warn, bg: "rgba(245,158,11,0.1)", rec: "wait" },
    FAKE_DISCOUNT: { icon: IC.xmark, label: "Fake Discount", color: C.danger, bg: "rgba(239,68,68,0.1)", rec: "wait" },
    INSUFFICIENT_DATA: { icon: IC.chart, label: "Not Enough Data", color: C.muted, bg: "rgba(123,123,158,0.1)", rec: null }
  };
  function scoreColor(s) {
    if (s >= 9)
      return C.success;
    if (s >= 7)
      return "#34d399";
    if (s >= 5)
      return C.warn;
    return C.danger;
  }
  function buildChart(history, widthPx = 480, heightPx = 130) {
    if (!history || history.length < 2) {
      return {
        svg: `<div style="text-align:center;color:${C.dim};font-size:12px;padding:28px 0;">
              Not enough price data yet \u2014 check back in a few hours as we build your history.
            </div>`,
        initInteractivity: () => {
        }
      };
    }
    const pts = [...history].sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at));
    const prices = pts.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const pad = { top: 12, right: 56, bottom: 26, left: 10 };
    const cw = widthPx - pad.left - pad.right;
    const ch = heightPx - pad.top - pad.bottom;
    const cx = (i) => pad.left + i / (pts.length - 1) * cw;
    const cy = (pr) => pad.top + ch - (pr - minP) / range * ch;
    const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${cy(p.price).toFixed(1)}`).join(" ");
    const areaD = `${lineD} L${cx(pts.length - 1).toFixed(1)},${(pad.top + ch).toFixed(1)} L${pad.left},${(pad.top + ch).toFixed(1)} Z`;
    const xLabelIdxs = [0, Math.floor(pts.length / 2), pts.length - 1];
    const xLabels = xLabelIdxs.map((i) => {
      const d = new Date(pts[i].scraped_at);
      const lbl = d.toLocaleDateString("en-BD", { month: "short", day: "numeric" });
      return `<text x="${cx(i).toFixed(1)}" y="${heightPx - 5}" text-anchor="middle"
              fill="${C.dim}" font-size="9" font-family="Inter,sans-serif">${lbl}</text>`;
    }).join("");
    const minY = cy(minP);
    const maxY = cy(maxP);
    const minIdx = prices.lastIndexOf(minP);
    const gradId = `dkg_${Math.random().toString(36).slice(2, 7)}`;
    const dots = pts.map((p, i) => {
      const isMin = p.price === minP && i === minIdx;
      const isLast = i === pts.length - 1;
      if (!isMin && !isLast)
        return "";
      const fill = isMin ? C.success : C.accent;
      const r = isLast ? 5 : 4;
      return `<circle cx="${cx(i).toFixed(1)}" cy="${cy(p.price).toFixed(1)}" r="${r}"
      fill="${fill}" stroke="${C.bg}" stroke-width="1.5"
      style="filter:drop-shadow(0 0 4px ${fill});"/>`;
    }).join("");
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
      const svgEl = shadowRoot.getElementById(svgId);
      const hline = shadowRoot.getElementById(`${svgId}_hline`);
      const hdot = shadowRoot.getElementById(`${svgId}_hdot`);
      const tipEl = shadowRoot.getElementById(`${svgId}_tip`);
      if (!svgEl || !hline || !hdot || !tipEl)
        return;
      const chartContainer = svgEl.parentElement;
      if (chartContainer)
        chartContainer.style.position = "relative";
      svgEl.addEventListener("mousemove", (e) => {
        const rect = svgEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const svgXRaw = mouseX / rect.width * widthPx;
        const svgX = Math.max(pad.left, Math.min(widthPx - pad.right, svgXRaw));
        const idx = Math.round((svgX - pad.left) / cw * (pts.length - 1));
        const clamp = Math.max(0, Math.min(pts.length - 1, idx));
        const pt = pts[clamp];
        const px = cx(clamp);
        const py = cy(pt.price);
        hline.setAttribute("x1", px.toFixed(1));
        hline.setAttribute("x2", px.toFixed(1));
        hline.setAttribute("opacity", "0.7");
        hdot.setAttribute("cx", px.toFixed(1));
        hdot.setAttribute("cy", py.toFixed(1));
        hdot.setAttribute("opacity", "1");
        const d = new Date(pt.scraped_at);
        const lbl = d.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" });
        tipEl.innerHTML = `<span style="color:${C.dim}">${lbl}</span>&nbsp;&nbsp;<strong style="color:${C.accent}">${formatBDT(pt.price)}</strong>`;
        tipEl.style.display = "block";
        const tipW = 180;
        const leftPx = px / widthPx * rect.width + (px > widthPx * 0.65 ? -(tipW + 8) : 12);
        const topPx = py / heightPx * rect.height - 16;
        tipEl.style.left = `${leftPx}px`;
        tipEl.style.top = `${topPx}px`;
      });
      svgEl.addEventListener("mouseleave", () => {
        hline.setAttribute("opacity", "0");
        hdot.setAttribute("opacity", "0");
        tipEl.style.display = "none";
      });
    }
    return { svg, initInteractivity };
  }
  var WIDGET_CSS = `
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
    background: linear-gradient(90deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.06) 100%);
    background-size: 400px 100%;
    animation: dkwShimmer 1.6s ease-in-out infinite;
    border-radius: 6px;
  }
  @keyframes dkwShimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .dk-skel-footer { display:flex; justify-content:space-between; gap:10px; }
  .dk-skel-foot-l { height:22px; flex:1; border-radius:6px; }
  .dk-skel-btn    { height:30px; width:90px; border-radius:8px; }
`;
  function buildCouponsSection(coupons) {
    if (!coupons || coupons.length === 0)
      return "";
    const cards = coupons.map((c, i) => {
      const meta = c.min_spend ? `Min spend: \u09F3${(c.min_spend / 100).toFixed(0)}` : "No minimum spend";
      const expiry = c.expires_at ? `\xB7 Expires ${new Date(c.expires_at).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}` : "";
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
    }).join("");
    return `
    <div class="dk-divider"></div>
    <div class="dk-coupons">
      <div class="dk-coupon-title" style="display:flex;align-items:center;gap:5px;">${IC.tag} Available Coupons</div>
      <div class="dk-coupon-list">${cards}</div>
    </div>`;
  }
  function wireCoupons(shadowRoot) {
    shadowRoot.querySelectorAll("[data-dk-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const code = btn.dataset.dkCopy;
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = "\u2705 Copied!";
          btn.classList.add("copied");
          setTimeout(() => {
            btn.textContent = "Copy";
            btn.classList.remove("copied");
          }, 2e3);
        } catch {
          btn.textContent = code;
          btn.select?.();
        }
      });
    });
  }
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
  function buildGaugeArc(score) {
    const color = scoreColor(score);
    const r = 24;
    const circ = Math.PI * r;
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
  function buildRecommendation(verdict, savingsPct) {
    const vm = VERDICT_META[verdict.label] || VERDICT_META.INSUFFICIENT_DATA;
    if (!vm.rec)
      return "";
    if (vm.rec === "buy") {
      const savings = savingsPct > 0 ? `You save <strong style="color:${C.success}">${savingsPct}%</strong> vs the 30-day average.` : "This is at or below its typical price.";
      return `
      <div class="dk-rec">
        <div class="dk-rec-icon" style="color:${C.success}">${IC.buy}</div>
        <div>
          <div class="dk-rec-title" style="color:${C.success}">Good Time to Buy</div>
          <div class="dk-rec-sub">${savings} ${verdict.explanation}</div>
        </div>
      </div>`;
    } else {
      return `
      <div class="dk-rec">
        <div class="dk-rec-icon" style="color:${C.warn}">${IC.wait}</div>
        <div>
          <div class="dk-rec-title" style="color:${C.warn}">Consider Waiting</div>
          <div class="dk-rec-sub">${verdict.explanation}</div>
        </div>
      </div>`;
    }
  }
  function buildAltsList(alts) {
    if (!alts || alts.length === 0)
      return "";
    const items = alts.slice(0, 3).map((alt) => {
      const img = alt.image_url ? `<img class="dk-alt-img" src="${alt.image_url}" alt="" loading="lazy"/>` : `<img class="dk-alt-img" src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="background:#fff;object-fit:contain;padding:4px;" />`;
      const savingsText = alt.savings > 0 ? `<span class="dk-alt-save">Save ${formatBDT(alt.savings)}</span>` : "";
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
        <div class="dk-alt-arrow">\u203A</div>
      </div>`;
    }).join("");
    return `
    <div class="dk-divider" style="margin-bottom:12px;"></div>
    <div class="dk-alts">
      <div class="dk-alts-title" style="display:flex;align-items:center;gap:5px;">${IC.chart} Look-alike Deals</div>
      <div class="dk-alt-list" id="dk-alt-list">${items}</div>
    </div>`;
  }
  function buildHTML(data, alts, chartObj, activeRange, coupons = []) {
    const { product, verdict } = data;
    const vm = VERDICT_META[verdict.label] || VERDICT_META.INSUFFICIENT_DATA;
    const color = vm.color;
    const savingsPct = verdict.avg_30d && product.current_price && verdict.avg_30d > product.current_price ? Math.round((verdict.avg_30d - product.current_price) / verdict.avg_30d * 100) : 0;
    const priceHistory = data.price_history || [];
    return `
  <div id="dkw">

    <!-- Top bar -->
    <div class="dk-bar">
      <div class="dk-brand">
        <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="height:20px;filter:drop-shadow(0 0 6px rgba(108,99,255,0.3));" />
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
      ["Current", formatBDT(product.current_price), C.accent],
      ["30-Day Avg", verdict.avg_30d ? formatBDT(verdict.avg_30d) : "\u2014", C.text],
      ["All-Time Low", verdict.all_time_low ? formatBDT(verdict.all_time_low) : "\u2014", C.success],
      ["Highest Ever", verdict.all_time_high ? formatBDT(verdict.all_time_high) : `${priceHistory.length > 0 ? formatBDT(Math.max(...priceHistory.map((p) => p.price))) : "\u2014"}`, C.muted]
    ].map(([label, value, clr]) => `
        <div class="dk-stat">
          <div class="dk-stat-label">${label}</div>
          <div class="dk-stat-value" style="color:${clr};">${value}</div>
          ${label === "30-Day Avg" && savingsPct > 0 ? `<div style="font-size:9px;color:${C.success};margin-top:2px;font-weight:600;">\u2193${savingsPct}% savings</div>` : '<div style="height:12px;"></div>'}
        </div>
      `).join("")}
    </div>

    <!-- Chart -->
    <div class="dk-chart-section">
      <div class="dk-chart-header">
        <span class="dk-chart-title" style="display:flex;align-items:center;gap:5px;">${IC.chart} Price History</span>
        <div class="dk-range-tabs">
          ${["1M", "3M", "6M", "ALL"].map(
      (r) => `<button class="dk-range-tab${r === activeRange ? " active" : ""}" data-range="${r}">${r}</button>`
    ).join("")}
        </div>
      </div>
      <div class="dk-chart-inner" id="dk-chart-inner">
        ${chartObj.svg}
      </div>
      <div class="dk-chart-legend">
        <span><span class="dk-legend-dot" style="background:${C.accent};"></span>Price line</span>
        <span><span class="dk-legend-dot" style="background:${C.success};"></span>All-time low</span>
        <span style="color:${C.dim};font-size:9px;">Based on ${verdict.data_points || priceHistory.length} price recordings</span>
      </div>
    </div>

    <!-- Should you buy now? -->
    ${buildHorizonSection(verdict, product)}

    <!-- Look-alike alternatives -->
    ${alts ? buildAltsList(alts) : `<div class="dk-divider"></div><div class="dk-loading"><span class="dk-spinner"></span>Loading similar products\u2026</div>`}

    <!-- Coupons -->
    ${buildCouponsSection(coupons)}

    <!-- Footer: explanation + alert CTA -->
    <div class="dk-footer">
      <p class="dk-explanation">${verdict.explanation}</p>
      <button class="dk-alert-btn" id="dk-alert-btn" style="display:flex;align-items:center;gap:6px;">${IC.bell} Alert me</button>
    </div>

    <!-- Alert form (hidden) -->
    <div class="dk-alert-form" id="dk-alert-form">
      <div class="dk-alert-row">
        <input class="dk-input" type="email" id="dk-email" placeholder="your@email.com" autocomplete="email"/>
        <input class="dk-input dk-input-narrow" type="number" id="dk-target"
               placeholder="Target \u09F3"
               value="${verdict.avg_30d ? Math.floor(verdict.avg_30d / 100 * 0.92) : ""}"/>
        <button class="dk-submit-btn" id="dk-submit">Set</button>
      </div>
      <div class="dk-status" id="dk-status"></div>
    </div>

  </div>`;
  }
  function filterByRange(history, range) {
    if (!history || history.length === 0)
      return history;
    if (range === "ALL")
      return history;
    const days = range === "1M" ? 30 : range === "3M" ? 90 : 180;
    const cutoff = Date.now() - days * 864e5;
    const filtered = history.filter((p) => new Date(p.scraped_at).getTime() >= cutoff);
    return filtered.length >= 2 ? filtered : history;
  }
  function getHorizonRecommendation2(horizon, verdict, product) {
    const score = verdict.deal_score;
    const curr = product.current_price;
    const avg = verdict.avg_30d;
    const atl = verdict.all_time_low;
    if (horizon === "days") {
      if (score >= 8)
        return { action: "buy", text: "Price is at a good point right now. Unlikely to drop further in 2-3 days." };
      if (score >= 6)
        return { action: "wait", text: "Fair price but not exceptional. Small chance of a short-term dip." };
      return { action: "wait", text: "Price is above average. Wait for a deal notification." };
    }
    if (horizon === "week") {
      const pctBelow = avg && avg > curr ? Math.round((avg - curr) / avg * 100) : 0;
      if (pctBelow >= 10)
        return { action: "buy", text: `${pctBelow}% below 30-day average. This week is a good window.` };
      if (pctBelow >= 5)
        return { action: "buy", text: `Slightly below average. Reasonable to buy this week.` };
      return { action: "wait", text: "Prices on this item can fluctuate. Set an alert for your target price." };
    }
    if (atl && curr <= atl * 1.03)
      return { action: "buy", text: "At or near its all-time low. This level rarely lasts a month." };
    if (atl && curr > atl) {
      const roomToDrop = Math.round((curr - atl) / curr * 100);
      if (roomToDrop > 15)
        return { action: "wait", text: `All-time low is ${formatBDT(atl)} \u2014 ${roomToDrop}% below current. Worth waiting.` };
    }
    return { action: "neutral", text: "No strong signal for the next month. Set an alert at your target price." };
  }
  function buildHorizonSection(verdict, product) {
    return `
    <div class="dk-horizon-section" id="dk-horizon-section">
      <div class="dk-horizon-header">Should you buy now?</div>
      <div class="dk-horizon-tabs">
        <button class="dk-horizon-tab active" data-hz="days">2-3 Days</button>
        <button class="dk-horizon-tab" data-hz="week">1 Week</button>
        <button class="dk-horizon-tab" data-hz="month">1 Month</button>
      </div>
      <div class="dk-horizon-rec" id="dk-horizon-rec">${renderHorizonRec(getHorizonRecommendation2("days", verdict, product))}</div>
    </div>`;
  }
  function renderHorizonRec(rec) {
    const icon = rec.action === "buy" ? IC.buy : rec.action === "wait" ? IC.wait : IC.clock;
    const color = rec.action === "buy" ? "#059669" : rec.action === "wait" ? "#D97706" : "#A8A29E";
    return `<div class="dk-hz-rec-inner" style="color:${color}">${icon}<span>${rec.text}</span></div>`;
  }
  function wireWidget(shadowRoot, data, alts, currentRange, coupons = []) {
    wireCoupons(shadowRoot);
    shadowRoot.querySelectorAll(".dk-range-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const range = tab.dataset.range;
        if (range === currentRange)
          return;
        currentRange = range;
        const filtered = filterByRange(data.price_history || [], range);
        const newChart = buildChart(filtered, 460, 130);
        const inner = shadowRoot.getElementById("dk-chart-inner");
        if (inner) {
          inner.innerHTML = newChart.svg;
          newChart.initInteractivity(shadowRoot);
        }
        shadowRoot.querySelectorAll(".dk-range-tab").forEach((t) => t.classList.toggle("active", t.dataset.range === range));
      });
    });
    shadowRoot.querySelectorAll(".dk-horizon-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const hz = tab.dataset.hz;
        const rec = getHorizonRecommendation2(hz, data.verdict, data.product);
        const recEl = shadowRoot.getElementById("dk-horizon-rec");
        if (recEl)
          recEl.innerHTML = renderHorizonRec(rec);
        shadowRoot.querySelectorAll(".dk-horizon-tab").forEach((t) => t.classList.toggle("active", t.dataset.hz === hz));
      });
    });
    const alertBtn = shadowRoot.getElementById("dk-alert-btn");
    const alertForm = shadowRoot.getElementById("dk-alert-form");
    alertBtn?.addEventListener("click", () => {
      const open = alertForm.style.display !== "none";
      alertForm.style.display = open ? "none" : "block";
      alertBtn.innerHTML = open ? `${IC.bell} Alert me` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancel`;
    });
    shadowRoot.getElementById("dk-submit")?.addEventListener("click", async () => {
      const email = shadowRoot.getElementById("dk-email")?.value?.trim();
      const targetBDT = parseFloat(shadowRoot.getElementById("dk-target")?.value || "0");
      const status = shadowRoot.getElementById("dk-status");
      const btn = shadowRoot.getElementById("dk-submit");
      const setStatus = (msg, color) => {
        status.textContent = msg;
        status.style.color = color;
      };
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return setStatus("Enter a valid email address.", C.danger);
      }
      if (!targetBDT || targetBDT <= 0) {
        return setStatus("Enter a valid target price.", C.danger);
      }
      btn.disabled = true;
      setStatus("Setting alert\u2026", C.muted);
      try {
        await safeFetch("CREATE_ALERT", {
          payload: {
            product_id: data.product.id,
            target_price: Math.round(targetBDT * 100),
            email,
            channel: "email"
          }
        });
        setStatus(`Alert set! We'll email you when price drops to \u09F3${targetBDT.toLocaleString("en-BD")}.`, C.success);
        alertBtn.innerHTML = `${IC.check} Alert set`;
      } catch {
        setStatus("Failed to set alert \u2014 please try again.", C.danger);
      } finally {
        btn.disabled = false;
      }
    });
    const altList = shadowRoot.getElementById("dk-alt-list");
    altList?.addEventListener("click", (e) => {
      const item = e.target.closest("[data-url]");
      if (item?.dataset?.url)
        window.location.href = item.dataset.url;
    });
  }
  function findTarget() {
    for (const sel of INJECT_AFTER) {
      const el = document.querySelector(sel);
      if (el)
        return el;
    }
    return null;
  }
  async function injectWidget(data) {
    document.getElementById(WIDGET_ID)?.remove();
    const target = findTarget();
    if (!target) {
      console.warn("[DamKoi] No injection target found");
      return;
    }
    const host = document.createElement("div");
    host.id = WIDGET_ID;
    const shadow = host.attachShadow({ mode: "open" });
    const styleEl = document.createElement("style");
    styleEl.textContent = WIDGET_CSS;
    shadow.appendChild(styleEl);
    const mount = document.createElement("div");
    shadow.appendChild(mount);
    target.insertAdjacentElement("afterend", host);
    mount.innerHTML = buildSkeleton();
    const activeRange = "3M";
    const filtered = filterByRange(data.price_history || [], activeRange);
    const chartObj = buildChart(filtered, 460, 130);
    await new Promise((r) => requestAnimationFrame(r));
    const productId = data.product.id;
    const [altsResult, couponsResult] = await Promise.allSettled([
      safeFetch("FETCH_ALTERNATIVES", { productId }),
      safeFetch("FETCH_PRODUCT_COUPONS", { productId })
    ]);
    const alts = altsResult.status === "fulfilled" ? altsResult.value?.alternatives || altsResult.value || [] : [];
    const coupons = couponsResult.status === "fulfilled" ? couponsResult.value?.coupons || couponsResult.value || [] : [];
    mount.style.transition = "opacity 0.25s ease";
    mount.style.opacity = "0";
    await new Promise((r) => setTimeout(r, 120));
    const finalChart = buildChart(filtered, 460, 130);
    mount.innerHTML = buildHTML(data, alts, finalChart, activeRange, coupons);
    finalChart.initInteractivity(shadow);
    wireWidget(shadow, data, alts, activeRange, coupons);
    mount.style.opacity = "1";
  }

  // content.js
  function scoreColor2(score) {
    if (score >= 8)
      return "#10b981";
    if (score >= 6)
      return "#f59e0b";
    if (score >= 4)
      return "#ef4444";
    return "#dc2626";
  }
  var DamKoiExtension = class {
    constructor() {
      this.data = null;
      this.sidebar = null;
      this.currentTab = "priceHistory";
      this.alternativesCache = null;
      this.alertFormState = {};
      this._sidebarRange = "1M";
      this._sidebarHorizon = "days";
      this._paymentMethod = null;
    }
    async init() {
      this.platform = this.detectPlatform();
      if (!this.platform)
        return;
      if (this.platform === "daraz-checkout" || this.platform === "pickaboo-checkout") {
        this.initCouponMagic();
        return;
      }
      this.data = await this.fetchData(window.location.href);
      if (this.data && !this.data.notTracked) {
        await this.enrichPriceHistory();
        injectWidget(this.data);
        saveRecentView(this.data.product, this.data.verdict).catch(() => {
        });
      }
      this.renderSidebar();
    }
    async enrichPriceHistory() {
      if (!this.data?.product?.id)
        return;
      try {
        const h = await safeFetch("FETCH_HISTORY", { productId: this.data.product.id, days: 180 });
        this.data.price_history = h.prices || [];
      } catch (e) {
        this.data.price_history = [];
      }
    }
    detectPlatform() {
      const { hostname, href } = window.location;
      if (hostname.includes("daraz.com.bd")) {
        if (href.includes("cart.daraz.com.bd") || href.includes("checkout.daraz.com.bd")) {
          return "daraz-checkout";
        }
        const isProduct = /daraz\.com\.bd\/.*i\d+-s\d+/i.test(href) || href.includes("daraz.com.bd/products/");
        return isProduct ? "daraz" : null;
      }
      if (hostname.includes("cartup.com.bd")) {
        return href.includes("/products/") ? "cartup" : null;
      }
      if (hostname.includes("rokomari.com")) {
        return /\/book\/\d+/.test(href) ? "rokomari" : null;
      }
      if (hostname.includes("pickaboo.com")) {
        if (href.includes("pickaboo.com/checkout/"))
          return "pickaboo-checkout";
        return href.includes("/product/") ? "pickaboo" : null;
      }
      if (hostname.includes("chaldal.com")) {
        return href.includes("/p/") || href.split("/").length > 3 ? "chaldal" : null;
      }
      if (hostname.includes("othoba.com")) {
        return href.includes("/product/") ? "othoba" : null;
      }
      return null;
    }
    async fetchData(url) {
      try {
        const cacheKey = getCacheKey("product", url);
        const cached = getFromCache(cacheKey);
        if (cached?.product && cached?.verdict)
          return cached;
        const data = await safeFetch("FETCH_VERDICT", { url });
        saveToCache(cacheKey, data);
        return data;
      } catch (e) {
        const is404 = e.message?.startsWith("404");
        return { notTracked: true, connectionError: !is404 };
      }
    }
    // ── Sidebar Shell ──────────────────────────────────────────────────────────
    renderSidebar() {
      if (this.sidebar)
        this.sidebar.remove();
      this.sidebar = document.createElement("div");
      this.sidebar.id = "damkoi-sidebar";
      this.sidebar.innerHTML = `
      <nav class="damkoi-nav">
        <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="width:28px;height:28px;margin-bottom:20px;opacity:0.9;" />
        <div class="damkoi-nav-item active" data-tab="priceHistory" title="Price History">${ICONS.history}</div>
        <div class="damkoi-nav-item" data-tab="lookalike" title="LookALike Deals">${ICONS.lookalike}</div>
        <div class="damkoi-nav-item" data-tab="coupons" title="Coupons">${ICONS.coupons}</div>
        <div class="damkoi-nav-item" data-tab="alerts" title="Price Alerts">${ICONS.alerts}</div>
        <div class="damkoi-nav-item" data-tab="recentViews" title="Recent Views">${ICONS.recentViews}</div>
        <div class="damkoi-nav-item" data-tab="settings" title="Settings">${ICONS.settings}</div>
      </nav>
      <main class="damkoi-main">
        <header class="damkoi-header">
          <span class="damkoi-logo">DamKoi</span>
          <div class="damkoi-close" title="Collapse">${ICONS.close}</div>
        </header>
        <div id="damkoi-content">
          <div class="damkoi-section active damkoi-skeleton-wrap">
            <div class="dk-sidebar-skel dk-sidebar-skel-title"></div>
            <div class="dk-sidebar-skel dk-sidebar-skel-badge"></div>
            <div class="dk-sidebar-skel" style="height:12px;width:90%;margin-top:6px;border-radius:6px;"></div>
            <div class="dk-sidebar-skel" style="height:12px;width:70%;margin-top:5px;border-radius:6px;"></div>
            <div class="dk-sidebar-skel-grid">
              <div class="dk-sidebar-skel dk-sidebar-skel-tile"></div>
              <div class="dk-sidebar-skel dk-sidebar-skel-tile"></div>
            </div>
            <div class="dk-sidebar-skel dk-sidebar-skel-chart"></div>
          </div>
        </div>
      </main>
    `;
      document.body.appendChild(this.sidebar);
      this.setupEvents();
      if (this.data)
        this.switchTab("priceHistory");
    }
    setupEvents() {
      this.sidebar.querySelector(".damkoi-close").onclick = () => {
        this.sidebar.classList.toggle("collapsed");
      };
      this.sidebar.querySelectorAll(".damkoi-nav-item").forEach((item) => {
        item.onclick = () => {
          const wasCollapsed = this.sidebar.classList.contains("collapsed");
          if (wasCollapsed)
            this.sidebar.classList.remove("collapsed");
          this.switchTab(item.dataset.tab);
        };
      });
    }
    switchTab(tabId) {
      if (this.currentTab === tabId && !this.sidebar?.classList.contains("collapsed"))
        return;
      this.currentTab = tabId;
      this.sidebar.querySelectorAll(".damkoi-nav-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.tab === tabId);
      });
      const content = this.sidebar.querySelector("#damkoi-content");
      content.innerHTML = "";
      const section = document.createElement("div");
      section.className = "damkoi-section active";
      content.appendChild(section);
      if (tabId === "recentViews") {
        this.renderRecentViews(section);
        return;
      }
      if (tabId === "settings") {
        this.renderSettings(section);
        return;
      }
      if (!this.data || this.data.notTracked) {
        if (tabId === "coupons") {
          this.renderCoupons(section);
          return;
        }
        this.renderNotTracked(section, tabId);
        return;
      }
      switch (tabId) {
        case "priceHistory":
          this.renderPriceHistory(section);
          break;
        case "lookalike":
          this.renderLookAlike(section);
          break;
        case "coupons":
          this.renderCoupons(section);
          break;
        case "alerts":
          this.renderAlerts(section);
          break;
      }
    }
    renderNotTracked(container, tabId) {
      const WEB = "https://damkoi.xynly.com";
      const currentUrl = encodeURIComponent(window.location.href);
      if (!this.data || this.data.connectionError) {
        container.innerHTML = `
        <div class="dk-error-state">
          <div class="dk-es-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 class="dk-es-title">Servers Unreachable</h3>
          <p class="dk-es-desc">DamKoi API is temporarily offline. Your internet is fine \u2014 this is on our end.</p>
          <div class="dk-es-actions">
            <a href="${WEB}" target="_blank" rel="noopener" class="dk-web-cta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open Web App
            </a>
            <button class="dk-retry-btn" onclick="window.location.reload()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              Retry
            </button>
          </div>
        </div>
      `;
        return;
      }
      if (tabId === "priceHistory") {
        container.innerHTML = `
        <div class="dk-not-tracked">
          <div class="dk-nt-anim-wrap">
            <div class="dk-nt-ring"></div>
            <div class="dk-nt-ring dk-nt-ring2"></div>
            <svg class="dk-nt-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div class="dk-nt-badge"><span class="dk-nt-dot"></span>TRACKING STARTED</div>
          <h3 class="dk-nt-title">We're on it.</h3>
          <p class="dk-nt-desc">First price data arrives within <strong>15\u201330 minutes</strong>. Check back or get notified below.</p>
          <div class="dk-nt-steps">
            <div class="dk-nt-step dk-step-done">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Product detected</span>
            </div>
            <div class="dk-nt-step dk-step-active">
              <div class="dk-step-spin"></div>
              <span>Price scan queued</span>
            </div>
            <div class="dk-nt-step">
              <div class="dk-step-empty"></div>
              <span>History building</span>
            </div>
          </div>
          <a href="${WEB}?url=${currentUrl}" target="_blank" rel="noopener" class="dk-web-cta dk-nt-cta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            Set Alert on Web App
          </a>
        </div>
      `;
        return;
      }
      const EMPTY_STATES = {
        lookalike: { icon: ICONS.lookalike, title: "LookALike Deals", desc: "We'll surface similar products once our system indexes this item." },
        coupons: { icon: ICONS.coupons, title: "Coupons", desc: "Platform-wide coupons may still be available once tracking starts." },
        alerts: { icon: ICONS.alerts, title: "Price Alerts", desc: "Set alerts once we collect the first price point. Almost there!" }
      };
      const s = EMPTY_STATES[tabId] || EMPTY_STATES.lookalike;
      container.innerHTML = `
      <div class="dk-tab-empty">
        <span class="dk-te-icon">${s.icon}</span>
        <h3>${s.title}</h3>
        <p class="dk-te-desc">${s.desc}</p>
        <a href="${WEB}?url=${currentUrl}" target="_blank" rel="noopener" class="dk-web-cta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open DamKoi
        </a>
      </div>
    `;
    }
    // ── Tab: Price History ─────────────────────────────────────────────────────
    renderPriceHistory(container) {
      const { verdict, product } = this.data;
      const BADGE_CLASS = {
        FAKE_DISCOUNT: "verdict-fake",
        BEST_PRICE: "verdict-best",
        GOOD_DEAL: "verdict-good",
        FAIR_PRICE: "verdict-fair",
        INSUFFICIENT_DATA: "verdict-pending"
      };
      const badgeClass = BADGE_CLASS[verdict.label] || "verdict-fair";
      const dataPoints = verdict.data_points || this.data.price_history?.length || 0;
      container.innerHTML = `
      ${dataPoints > 0 ? `<div class="dk-social-proof">Based on ${dataPoints} price recordings for this product</div>` : ""}

      <div class="damkoi-card" style="margin-bottom:12px;">
        <div id="damkoi-gauge"></div>
        <span class="verdict-badge ${badgeClass}" style="margin-top:12px;">${verdict.display}</span>
        <p style="font-size:11px;color:var(--dk-dim);line-height:1.6;margin-top:6px;">${verdict.explanation}</p>
      </div>

      <div class="damkoi-price-grid" style="margin-bottom:16px;">
        <div class="damkoi-price-item">
          <div class="damkoi-label">Current</div>
          <div class="damkoi-value accent">\u09F3${(product.current_price / 100).toLocaleString("en-BD")}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">30-Day Avg</div>
          <div class="damkoi-value">\u09F3${verdict.avg_30d ? (verdict.avg_30d / 100).toLocaleString("en-BD") : "\u2014"}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">All-Time Low</div>
          <div class="damkoi-value success">\u09F3${verdict.all_time_low ? (verdict.all_time_low / 100).toLocaleString("en-BD") : "\u2014"}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">Data Points</div>
          <div class="damkoi-value">${dataPoints || "\u2014"}</div>
        </div>
      </div>

      <div class="dk-range-tabs">
        ${["1M", "3M", "6M", "ALL"].map((r) => `<button class="dk-range-tab ${r === this._sidebarRange ? "active" : ""}" data-range="${r}">${r}</button>`).join("")}
      </div>
      <div class="damkoi-chart-container" style="padding:8px;margin-bottom:16px;">
        <div id="damkoi-sparkline"></div>
      </div>

      <div class="dk-divider"></div>

      <div class="dk-horizon-section">
        <div class="dk-section-label">Should you buy now?</div>
        <div class="dk-horizon-tabs">
          <button class="dk-horizon-tab ${this._sidebarHorizon === "days" ? "active" : ""}" data-horizon="days">2-3 Days</button>
          <button class="dk-horizon-tab ${this._sidebarHorizon === "week" ? "active" : ""}" data-horizon="week">1 Week</button>
          <button class="dk-horizon-tab ${this._sidebarHorizon === "month" ? "active" : ""}" data-horizon="month">1 Month</button>
        </div>
        <div id="dk-horizon-rec"></div>
      </div>
    `;
      visualizer_default.renderDealGauge(verdict.deal_score, "damkoi-gauge");
      this._renderSidebarChart(container);
      this._wireChartTabs(container);
      this._wireHorizonTabs(container);
    }
    _filterByRange(range) {
      const prices = this.data.price_history || [];
      if (range === "ALL")
        return prices;
      const days = { "1M": 30, "3M": 90, "6M": 180 }[range] || 30;
      const cutoff = Date.now() - days * 864e5;
      const filtered = prices.filter((p) => {
        const ts = new Date(p.date || p.recorded_at || p.timestamp || 0).getTime();
        return ts >= cutoff;
      });
      return filtered.length >= 3 ? filtered : prices.slice(-Math.min(prices.length, 30));
    }
    _renderSidebarChart(container) {
      const filtered = this._filterByRange(this._sidebarRange);
      visualizer_default.renderPriceChart(filtered, "damkoi-sparkline");
    }
    _wireChartTabs(container) {
      container.querySelectorAll(".dk-range-tab").forEach((tab) => {
        tab.onclick = () => {
          container.querySelectorAll(".dk-range-tab").forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          this._sidebarRange = tab.dataset.range;
          this._renderSidebarChart(container);
        };
      });
    }
    _wireHorizonTabs(container) {
      const recEl = container.querySelector("#dk-horizon-rec");
      if (recEl)
        recEl.innerHTML = this._buildHorizonRecHtml(this._sidebarHorizon);
      container.querySelectorAll(".dk-horizon-tab").forEach((tab) => {
        tab.onclick = () => {
          container.querySelectorAll(".dk-horizon-tab").forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          this._sidebarHorizon = tab.dataset.horizon;
          const rec = container.querySelector("#dk-horizon-rec");
          if (rec)
            rec.innerHTML = this._buildHorizonRecHtml(this._sidebarHorizon);
        };
      });
    }
    _buildHorizonRecHtml(horizon) {
      const { verdict, product } = this.data;
      const rec = getHorizonRecommendation(horizon, verdict, product);
      const colorMap = { buy: "#22c55e", wait: "#f59e0b", neutral: "#a78bfa" };
      const color = colorMap[rec.action] || "#a78bfa";
      const label = { buy: "BUY NOW", wait: "WAIT", neutral: "NEUTRAL" }[rec.action] || rec.action.toUpperCase();
      return `
      <div style="border-left:3px solid ${color};background:${color}18;padding:10px 12px;border-radius:0 8px 8px 0;margin-top:8px;">
        <div style="color:${color};font-size:9px;font-weight:900;letter-spacing:0.1em;margin-bottom:4px;">${label}</div>
        <div style="font-size:11px;color:var(--dk-muted);line-height:1.55;">${rec.text}</div>
      </div>
    `;
    }
    // ── Tab: LookALike ─────────────────────────────────────────────────────────
    async renderLookAlike(container) {
      container.innerHTML = `
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${ICONS.lookalike}</span> LookALike Deals</h3>
      <div id="dk-alts-list"><div class="dk-loading">Loading alternatives...</div></div>
      <div id="dk-compare-section" style="display:none;margin-top:16px;">
        <h4>Same Product, Other Platforms</h4>
        <div id="dk-compare-list"><div class="dk-loading">Loading...</div></div>
      </div>
    `;
      const altsEl = container.querySelector("#dk-alts-list");
      const compareEl = container.querySelector("#dk-compare-section");
      const compareList = container.querySelector("#dk-compare-list");
      try {
        const cacheKey = getCacheKey("alternatives", this.data.product.id);
        let alts = getFromCache(cacheKey);
        if (!alts) {
          const resp = await safeFetch("FETCH_ALTERNATIVES", { productId: this.data.product.id });
          alts = resp.alternatives || [];
          saveToCache(cacheKey, alts);
        }
        this.alternativesCache = alts;
        this._displayAlts(altsEl, alts);
      } catch (e) {
        altsEl.innerHTML = '<div class="dk-empty-state">Could not load alternatives.</div>';
      }
      try {
        const resp = await safeFetch("FETCH_COMPARE", { productId: this.data.product.id });
        const comparisons = resp.comparisons || resp.platforms || (Array.isArray(resp) ? resp : []);
        const filtered = comparisons.filter((c) => c.platform !== this.platform);
        if (filtered.length) {
          compareEl.style.display = "";
          compareList.innerHTML = filtered.map((c) => `
          <div class="damkoi-card" style="margin-bottom:8px;display:flex;align-items:center;gap:10px;">
            <span class="dk-platform-badge">${c.platform}</span>
            <div style="flex:1;font-size:11px;color:var(--dk-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.title || ""}</div>
            <span style="font-size:13px;font-weight:800;">${formatBDT(c.current_price)}</span>
            <a href="${c.url}" target="_blank" rel="noopener" style="color:var(--dk-accent);font-size:10px;white-space:nowrap;text-decoration:none;">View</a>
          </div>
        `).join("");
        }
      } catch (e) {
      }
    }
    _displayAlts(listEl, alts) {
      const otherAlts = alts.filter((a) => !a.is_original_request);
      if (!otherAlts.length) {
        listEl.innerHTML = '<div class="dk-empty-state">No cheaper alternatives in this category yet.</div>';
        return;
      }
      const currentPrice = this.data.product.current_price;
      listEl.innerHTML = otherAlts.map((alt) => {
        const savings = currentPrice && alt.current_price ? currentPrice - alt.current_price : 0;
        return `
        <div class="damkoi-card" style="margin-bottom:10px;display:flex;gap:12px;cursor:pointer;" data-alt-url="${alt.url}">
          ${alt.image_url ? `<img src="${alt.image_url}" style="width:46px;height:46px;border-radius:8px;object-fit:cover;flex-shrink:0;" />` : `<div style="width:46px;height:46px;border-radius:8px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--dk-dim);">${ICONS.lookalike}</div>`}
          <div style="flex:1;min-width:0;">
            <span class="dk-platform-badge">${alt.platform}</span>
            <div style="font-size:11px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--dk-text);margin-bottom:4px;">${alt.title}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;font-weight:800;">${formatBDT(alt.current_price)}</span>
              ${savings > 0 ? `<span class="dk-save-badge">Save ${formatBDT(savings)}</span>` : ""}
            </div>
          </div>
        </div>
      `;
      }).join("");
      listEl.addEventListener("click", (e) => {
        const card = e.target.closest("[data-alt-url]");
        if (card)
          window.open(card.dataset.altUrl, "_blank");
      });
    }
    // ── Tab: Coupons ───────────────────────────────────────────────────────────
    async renderCoupons(container) {
      const platform = this.platform || "daraz";
      const productId = this.data?.product?.id;
      container.innerHTML = `
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${ICONS.coupons}</span> Coupons & Deals</h3>
      <p style="font-size:11px;color:var(--dk-dim);margin:0 0 14px;">Copy & paste at checkout for instant savings.</p>
      <div id="dk-coupon-list"><div class="dk-loading">Loading coupons...</div></div>
    `;
      const listEl = container.querySelector("#dk-coupon-list");
      try {
        const [prodResult, platResult] = await Promise.allSettled([
          productId ? safeFetch("FETCH_PRODUCT_COUPONS", { productId }) : Promise.resolve([]),
          safeFetch("FETCH_COUPONS", { platform })
        ]);
        const prodCoupons = prodResult.status === "fulfilled" ? prodResult.value || [] : [];
        const platCoupons = platResult.status === "fulfilled" ? platResult.value || [] : [];
        const seen = /* @__PURE__ */ new Set();
        const coupons = [...prodCoupons, ...platCoupons].filter((c) => {
          if (seen.has(c.code))
            return false;
          seen.add(c.code);
          return true;
        });
        if (!coupons.length) {
          listEl.innerHTML = '<div class="dk-empty-state">No coupons available right now.</div>';
          return;
        }
        const votes = await getCouponVotes();
        listEl.innerHTML = coupons.map((c) => {
          const id = c.id || c.code;
          const upActive = votes[id] === true ? "active" : "";
          const downActive = votes[id] === false ? "active" : "";
          const discount = c.discount_label || (c.discount_percent ? `-${c.discount_percent}%` : "") || (c.max_discount ? `Up to \u09F3${(c.max_discount / 100).toLocaleString("en-BD")}` : "");
          return `
          <div class="dk-coupon-card" data-coupon-id="${id}">
            <div class="dk-coupon-top">
              <span class="dk-coupon-code">${c.code}</span>
              ${discount ? `<span class="dk-coupon-discount">${discount}</span>` : ""}
              <button class="dk-coupon-copy" data-code="${c.code}" title="Copy code">${ICONS.copy}</button>
            </div>
            ${c.description ? `<p class="dk-coupon-desc">${c.description}</p>` : ""}
            <div class="dk-coupon-footer">
              <div class="dk-coupon-votes">
                <button class="dk-vote-btn dk-vote-up ${upActive}" data-id="${id}" data-val="up">${ICONS.thumbsUp} <span>${c.upvotes || 0}</span></button>
                <button class="dk-vote-btn dk-vote-down ${downActive}" data-id="${id}" data-val="down">${ICONS.thumbsDown} <span>${c.downvotes || 0}</span></button>
              </div>
              ${c.category ? `<span class="dk-coupon-cat">${c.category}</span>` : ""}
            </div>
          </div>
        `;
        }).join("");
        listEl.querySelectorAll(".dk-coupon-copy").forEach((btn) => {
          btn.onclick = () => {
            navigator.clipboard.writeText(btn.dataset.code).then(() => {
              btn.innerHTML = ICONS.check;
              btn.style.color = "#22c55e";
              setTimeout(() => {
                btn.innerHTML = ICONS.copy;
                btn.style.color = "";
              }, 2e3);
            }).catch(() => {
            });
          };
        });
        listEl.querySelectorAll(".dk-vote-btn").forEach((btn) => {
          btn.onclick = async () => {
            const id = btn.dataset.id;
            const helpful = btn.dataset.val === "up";
            await voteCoupon(id, helpful);
            const card = btn.closest(".dk-coupon-card");
            card.querySelectorAll(".dk-vote-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          };
        });
      } catch (e) {
        listEl.innerHTML = '<div class="dk-empty-state" style="color:var(--dk-danger)">Failed to load coupons.</div>';
      }
    }
    // ── Tab: Alerts ────────────────────────────────────────────────────────────
    async renderAlerts(container) {
      const savedEmail = this.alertFormState.email || await getSavedEmail();
      const defaultPrice = this.data?.product?.current_price ? Math.floor(this.data.product.current_price / 100 * 0.9) : "";
      container.innerHTML = `
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${ICONS.alerts}</span> Price Alert</h3>
      <div class="damkoi-card" style="margin-bottom:16px;">
        <p style="font-size:12px;color:var(--dk-dim);margin:0 0 12px;">Get notified the instant this product drops below your target.</p>
        <input type="email" id="alert-email" class="damkoi-input" placeholder="Your email address" value="${savedEmail}" />
        <div style="position:relative;">
          <span style="position:absolute;left:16px;top:12px;font-weight:700;color:var(--dk-accent);">\u09F3</span>
          <input type="number" id="alert-price" class="damkoi-input" style="padding-left:35px;" placeholder="Target price" value="${this.alertFormState.price || defaultPrice}" />
        </div>
        <button class="damkoi-btn" id="save-alert">Set Alert</button>
        <div id="alert-status" class="damkoi-status-pill" style="margin-top:8px;font-size:11px;border-radius:8px;padding:0;"></div>
      </div>
      <div style="height:1px;background:var(--dk-border);margin-bottom:16px;"></div>
      <h4>Your Active Alerts</h4>
      <div id="dk-existing-alerts"><div class="dk-loading">Loading...</div></div>
    `;
      if (savedEmail) {
        this._loadExistingAlerts(container, savedEmail);
      } else {
        container.querySelector("#dk-existing-alerts").innerHTML = '<div class="dk-empty-state">Enter your email above to see your alerts.</div>';
      }
      const emailInput = container.querySelector("#alert-email");
      const priceInput = container.querySelector("#alert-price");
      const btn = container.querySelector("#save-alert");
      const status = container.querySelector("#alert-status");
      btn.onclick = async () => {
        const email = emailInput.value.trim();
        const targetPrice = priceInput.value.trim();
        if (!isValidEmail(email)) {
          setStatusMessage(status, "error", "Enter valid email");
          return;
        }
        if (!isValidPrice(targetPrice)) {
          setStatusMessage(status, "error", "Enter valid price");
          return;
        }
        this.alertFormState = { email, price: targetPrice };
        await setSavedEmail(email);
        setStatusMessage(status, "info", "Saving...");
        try {
          const payload = createAlertPayload(this.data.product.id, targetPrice, email);
          await safeFetch("CREATE_ALERT", { payload });
          setStatusMessage(status, "success", "Alert set!");
          this._loadExistingAlerts(container, email);
        } catch (e) {
          setStatusMessage(status, "error", "Error saving alert");
        }
      };
      emailInput.addEventListener("blur", () => {
        const email = emailInput.value.trim();
        if (isValidEmail(email))
          this._loadExistingAlerts(container, email);
      });
    }
    async _loadExistingAlerts(container, email) {
      const el = container.querySelector("#dk-existing-alerts");
      if (!el)
        return;
      try {
        const alerts = await safeFetch("GET_ALERTS_BY_EMAIL", { email });
        if (!alerts || alerts.length === 0) {
          el.innerHTML = '<div class="dk-empty-state">No active alerts for this email.</div>';
          return;
        }
        el.innerHTML = alerts.map((a) => `
        <div class="damkoi-card" style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="min-width:0;flex:1;">
              <div style="font-size:10px;color:var(--dk-dim);margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.product_title || "Product"}</div>
              <div style="font-size:13px;font-weight:700;">Target: ${formatBDT(a.target_price)}</div>
            </div>
            <span class="dk-alert-badge ${a.is_active ? "active" : "inactive"}">${a.is_active ? "Active" : "Paused"}</span>
          </div>
        </div>
      `).join("");
      } catch (e) {
        el.innerHTML = '<div class="dk-empty-state">Could not load alerts.</div>';
      }
    }
    // ── Tab: Recent Views ──────────────────────────────────────────────────────
    async renderRecentViews(container) {
      const enabled = await isRecentViewsEnabled();
      const views = enabled ? await getRecentViews() : [];
      container.innerHTML = `
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${ICONS.recentViews}</span> Recent Views</h3>
      <div class="dk-privacy-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        History stays on your device. Never shared.
      </div>
      <div class="dk-settings-row" style="margin-bottom:16px;">
        <span style="font-size:12px;color:var(--dk-muted);">Remember recent views</span>
        <label class="dk-toggle">
          <input type="checkbox" id="dk-views-toggle" ${enabled ? "checked" : ""}>
          <span class="dk-toggle-slider"></span>
        </label>
      </div>
      ${views.length ? `
        <div class="dk-rv-grid" id="dk-rv-grid">
          ${views.map((v) => `
            <div class="dk-rv-card" data-url="${v.url}">
              <div class="dk-rv-img-wrap">
                ${v.image_url ? `<img src="${v.image_url}" class="dk-rv-img" />` : `<div class="dk-rv-img-placeholder">${ICONS.history}</div>`}
                ${v.deal_score != null ? `<span class="dk-rv-score" style="background:${scoreColor2(v.deal_score)}">${v.deal_score}</span>` : ""}
              </div>
              <div class="dk-rv-info">
                <div class="dk-rv-title">${v.title}</div>
                <div class="dk-rv-meta">
                  <span class="dk-platform-badge">${v.platform}</span>
                  <span class="dk-rv-price">${formatBDT(v.price)}</span>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
        <button class="dk-ghost-btn" id="dk-clear-views" style="margin-top:12px;width:100%;">Clear History</button>
      ` : `<div class="dk-empty-state">${enabled ? "No products viewed yet." : "Enable above to track viewed products."}</div>`}
    `;
      container.querySelector("#dk-views-toggle").onchange = async (e) => {
        await setRecentViewsEnabled(e.target.checked);
        this.renderRecentViews(container);
      };
      const clearBtn = container.querySelector("#dk-clear-views");
      if (clearBtn)
        clearBtn.onclick = async () => {
          await clearRecentViews();
          this.renderRecentViews(container);
        };
      const grid = container.querySelector("#dk-rv-grid");
      if (grid)
        grid.addEventListener("click", (e) => {
          const card = e.target.closest("[data-url]");
          if (card)
            window.open(card.dataset.url, "_blank");
        });
    }
    // ── Tab: Settings ──────────────────────────────────────────────────────────
    async renderSettings(container) {
      const email = await getSavedEmail();
      const autoApply = await getAutoApply();
      container.innerHTML = `
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${ICONS.settings}</span> Settings</h3>

      <div class="dk-settings-section">
        <h4>Notifications</h4>
        <div class="damkoi-card" style="padding:12px;">
          <label style="font-size:11px;color:var(--dk-dim);display:block;margin-bottom:6px;">Alert email</label>
          <input type="email" id="settings-email" class="damkoi-input" style="margin-bottom:8px;" placeholder="your@email.com" value="${email}" />
          <button class="damkoi-btn" id="settings-save-email" style="padding:9px 14px;font-size:12px;">Save Email</button>
          <div id="settings-email-status" style="margin-top:6px;font-size:11px;min-height:16px;"></div>
        </div>
      </div>

      <div class="dk-settings-section">
        <h4>Auto-Apply Coupons</h4>
        <div class="damkoi-card" style="padding:12px;">
          <div class="dk-settings-row">
            <div>
              <div style="font-size:12px;color:var(--dk-muted);">Auto-test coupons at checkout</div>
              <div style="font-size:10px;color:var(--dk-dim);margin-top:2px;">Finds the best code automatically</div>
            </div>
            <label class="dk-toggle">
              <input type="checkbox" id="settings-auto-apply" ${autoApply ? "checked" : ""}>
              <span class="dk-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="dk-settings-section">
        <h4>Data & Cache</h4>
        <div class="damkoi-card" style="padding:12px;">
          <button class="dk-ghost-btn" id="settings-clear-cache" style="width:100%;font-size:12px;">Clear Cached Data</button>
          <div id="settings-cache-status" style="margin-top:6px;font-size:11px;text-align:center;min-height:16px;"></div>
        </div>
      </div>

      <div style="text-align:center;margin-top:16px;font-size:10px;color:var(--dk-dim);">
        DamKoi v2.1.0 \xB7 Made in Bangladesh
      </div>
    `;
      const emailInput = container.querySelector("#settings-email");
      const emailStatus = container.querySelector("#settings-email-status");
      const cacheStatus = container.querySelector("#settings-cache-status");
      container.querySelector("#settings-save-email").onclick = async () => {
        const val = emailInput.value.trim();
        if (!isValidEmail(val)) {
          emailStatus.textContent = "Invalid email";
          emailStatus.style.color = "#ef4444";
          return;
        }
        await setSavedEmail(val);
        this.alertFormState.email = val;
        emailStatus.textContent = "Saved!";
        emailStatus.style.color = "#22c55e";
        setTimeout(() => emailStatus.textContent = "", 2e3);
      };
      container.querySelector("#settings-auto-apply").onchange = async (e) => {
        await setAutoApply(e.target.checked);
      };
      container.querySelector("#settings-clear-cache").onclick = () => {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith("damkoi:"));
        keys.forEach((k) => localStorage.removeItem(k));
        cacheStatus.textContent = `Cleared ${keys.length} cached item${keys.length !== 1 ? "s" : ""}`;
        cacheStatus.style.color = "#22c55e";
        setTimeout(() => cacheStatus.textContent = "", 3e3);
      };
    }
    // ── Checkout Coupon Magic ──────────────────────────────────────────────────
    detectPaymentMethod() {
      const METHODS = ["bkash", "nagad", "rocket", "upay", "tap", "card", "cod"];
      const scan = () => {
        const candidates = [
          ...document.querySelectorAll('[class*="payment"][class*="active"], [class*="payment"][class*="selected"], [class*="cashier"][class*="active"], [aria-checked="true"][class*="payment"]'),
          ...document.querySelectorAll(".cashier-active, .payment-method-active, .pay-method--active")
        ];
        for (const el of candidates) {
          const text = (el.textContent || "").toLowerCase();
          const imgAlt = [...el.querySelectorAll("img")].map((i) => (i.alt || "").toLowerCase()).join(" ");
          const combined = text + " " + imgAlt;
          for (const m of METHODS) {
            if (combined.includes(m))
              return m;
          }
        }
        return null;
      };
      this._paymentMethod = scan();
      const observer = new MutationObserver(() => {
        const detected = scan();
        if (detected !== this._paymentMethod) {
          this._paymentMethod = detected;
          this._updateCouponWidgetLabel();
        }
      });
      observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class", "aria-checked"] });
      document.addEventListener("click", (e) => {
        const target = e.target.closest('[class*="payment"], [class*="cashier"], [class*="pay-method"]');
        if (!target)
          return;
        setTimeout(() => {
          const detected = scan();
          if (detected !== this._paymentMethod) {
            this._paymentMethod = detected;
            this._updateCouponWidgetLabel();
          }
        }, 300);
      }, true);
    }
    _updateCouponWidgetLabel() {
      const label = document.getElementById("dk-payment-label");
      if (!label)
        return;
      const pm = this._paymentMethod;
      if (pm) {
        const NAME = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket", upay: "Upay", card: "Card", cod: "Cash on Delivery" };
        label.textContent = `Showing ${NAME[pm] || pm} codes`;
        label.style.color = pm === "bkash" ? "#e91e8c" : pm === "nagad" ? "#f97316" : "#a78bfa";
      } else {
        label.textContent = "Showing all codes";
        label.style.color = "rgba(255,255,255,0.4)";
      }
    }
    async initCouponMagic() {
      this._paymentMethod = null;
      this.detectPaymentMethod();
      const widget = document.createElement("div");
      widget.id = "damkoi-coupon-widget";
      widget.innerHTML = `
      <div style="background: rgba(10,10,12,0.95); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 16px; width: 300px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); backdrop-filter: blur(12px); color: white; font-family: system-ui, sans-serif; z-index: 999999; position: fixed; bottom: 20px; right: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${chrome.runtime.getURL("icons/dk_logo.svg")}" style="width: 20px; height: 20px;" />
            <span style="font-weight: 800; font-size: 14px;">DamKoi Magic</span>
          </div>
          <span id="dk-payment-label" style="font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4);">Showing all codes</span>
        </div>
        <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin: 8px 0 16px 0; line-height: 1.4;">
          Found active coupons. Auto-test all to find best discount.
        </p>
        <button id="dk-apply-btn" style="width: 100%; background: #6366f1; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s;">
          Auto-Apply Coupons
        </button>
      </div>
    `;
      document.body.appendChild(widget);
      this._updateCouponWidgetLabel();
      document.getElementById("dk-apply-btn").onclick = async () => {
        const btn = document.getElementById("dk-apply-btn");
        btn.innerText = "Testing Coupons...";
        btn.style.background = "#4f46e5";
        btn.style.opacity = "0.7";
        btn.disabled = true;
        try {
          const isDaraz = window.location.hostname.includes("daraz");
          const coupons = await safeFetch("FETCH_COUPONS", {
            platform: isDaraz ? "daraz" : "pickaboo",
            paymentMethod: this._paymentMethod || void 0
          });
          if (!coupons || coupons.length === 0) {
            btn.innerText = "No valid coupons found";
            btn.disabled = false;
            return;
          }
          const inputSelector = isDaraz ? 'input[placeholder*="oupon" i], input[name*="coupon" i], .next-input.next-medium input' : 'input[placeholder*="oupon" i], input[name*="coupon" i], .coupon-input input, #coupon-code';
          const applyBtnSelector = isDaraz ? 'button[data-spm*="coupon"], .next-btn.next-btn-primary.next-btn-medium, button[class*="couponApply"]' : 'button[class*="coupon"], .apply-coupon-btn, button[id*="couponApply"]';
          const discountSelector = isDaraz ? '.checkout-order-total-discount, [class*="discount"][class*="total"], [class*="coupon"][class*="discount"]' : '.order-summary .discount-amount, [class*="discount-amount"]';
          let bestDiscount = 0;
          let bestCode = null;
          for (let i = 0; i < coupons.length; i++) {
            const c = coupons[i];
            btn.innerText = `Testing ${c.code} (${i + 1}/${coupons.length})`;
            const input = document.querySelector(inputSelector);
            const applyBtn = document.querySelector(applyBtnSelector);
            if (input && applyBtn) {
              input.value = c.code;
              input.dispatchEvent(new Event("input", { bubbles: true }));
              input.dispatchEvent(new Event("change", { bubbles: true }));
              applyBtn.click();
              await new Promise((r) => setTimeout(r, 2e3));
              const discountLine = document.querySelector(discountSelector);
              if (discountLine) {
                const match = discountLine.innerText.match(/[\d,]+/);
                if (match) {
                  const val = parseInt(match[0].replace(/,/g, ""));
                  if (val > bestDiscount) {
                    bestDiscount = val;
                    bestCode = c.code;
                  }
                }
              }
            }
          }
          if (bestCode) {
            btn.innerText = `Applying best: ${bestCode}`;
            const input = document.querySelector(inputSelector);
            const applyBtn = document.querySelector(applyBtnSelector);
            if (input && applyBtn) {
              input.value = bestCode;
              input.dispatchEvent(new Event("input", { bubbles: true }));
              applyBtn.click();
              await new Promise((r) => setTimeout(r, 1e3));
            }
            btn.innerText = `Saved \u09F3${bestDiscount.toLocaleString("en-BD")}!`;
            btn.style.background = "#10b981";
            btn.disabled = false;
          } else {
            btn.innerText = "No coupons worked";
            btn.style.background = "#3f3f46";
            btn.disabled = false;
          }
        } catch (e) {
          console.error("[DamKoi]", e);
          btn.innerText = "Error trying coupons";
          btn.disabled = false;
        }
      };
    }
  };
  var damkoi = new DamKoiExtension();
  if (document.readyState === "complete") {
    damkoi.init();
  } else {
    window.addEventListener("load", () => damkoi.init());
  }
})();
