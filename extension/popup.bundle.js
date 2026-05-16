(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

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
  function getRecentVerdicts() {
    try {
      const data = localStorage.getItem(RECENT_VERDICTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("[DamKoi] Failed to read recent verdicts:", e);
      return [];
    }
  }
  function addToRecentVerdicts(verdict) {
    try {
      const recent = getRecentVerdicts();
      const filtered = recent.filter((v) => v.product_id !== verdict.product_id);
      const updated = [verdict, ...filtered].slice(0, MAX_VERDICT_CACHE_SIZE);
      localStorage.setItem(RECENT_VERDICTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("[DamKoi] Failed to add recent verdict:", e);
    }
  }
  function recordPerformanceMetric(metricName, duration) {
    try {
      const metrics = JSON.parse(localStorage.getItem(PERF_KEY) || "{}");
      metrics[metricName] = {
        duration,
        timestamp: Date.now()
      };
      localStorage.setItem(PERF_KEY, JSON.stringify(metrics));
    } catch (e) {
      console.warn("[DamKoi Perf] Failed to record metric:", e);
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
  var API_BASE, DASHBOARD_BASE, ALERT_CHANNELS, DEFAULT_ALERT_CHANNEL, CACHE_TTL, MAX_VERDICT_CACHE_SIZE, RECENT_VERDICTS_KEY, PERF_KEY;
  var init_utils = __esm({
    "utils.js"() {
      API_BASE = true ? "http://127.0.0.1:8000" : "http://127.0.0.1:8000";
      DASHBOARD_BASE = true ? "http://127.0.0.1:3000" : "http://127.0.0.1:3000";
      ALERT_CHANNELS = {
        EMAIL: "email",
        SMS: "sms",
        PUSH: "push"
      };
      DEFAULT_ALERT_CHANNEL = ALERT_CHANNELS.EMAIL;
      CACHE_TTL = 60 * 60 * 1e3;
      MAX_VERDICT_CACHE_SIZE = 10;
      RECENT_VERDICTS_KEY = "damkoi:recent-verdicts";
      PERF_KEY = "damkoi:perf-metrics";
    }
  });

  // visualizer.js
  var visualizer_exports = {};
  __export(visualizer_exports, {
    default: () => visualizer_default
  });
  var Visualizer, visualizer_default;
  var init_visualizer = __esm({
    "visualizer.js"() {
      init_utils();
      Visualizer = {
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
      visualizer_default = Visualizer;
    }
  });

  // popup.js
  init_utils();

  // storage.js
  function saveToStorage(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  // coupon_injector.js
  init_utils();
  var COUPON_INPUT_SELECTORS = [
    'input[placeholder*="oupon" i]',
    'input[name*="coupon" i]',
    'input[id*="coupon" i]',
    '[data-spm*="coupon"] input',
    ".coupon-input input",
    "#coupon-code"
  ];
  var APPLY_BTN_SELECTORS = [
    'button[data-spm*="coupon"]',
    'button[class*="coupon"]',
    ".coupon-apply button",
    'button[id*="couponApply"]'
  ];
  var SUCCESS_INDICATORS = [
    '[class*="couponSuccess"]',
    '[class*="discount-applied"]',
    ".coupon-success",
    '[data-spm*="couponSuccess"]'
  ];
  var FAILURE_INDICATORS = [
    '[class*="couponError"]',
    '[class*="coupon-invalid"]',
    ".coupon-error"
  ];
  var MAX_RETRIES = 3;
  var RETRY_DELAY_MS = 1500;
  function findElement(selectors) {
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el)
        return el;
    }
    return null;
  }
  function waitForSuccess(timeoutMs = 3e3) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      const interval = setInterval(() => {
        if (findElement(SUCCESS_INDICATORS)) {
          clearInterval(interval);
          resolve(true);
          return;
        }
        if (findElement(FAILURE_INDICATORS) || Date.now() > deadline) {
          clearInterval(interval);
          resolve(false);
        }
      }, 200);
    });
  }
  function showToast(message, type = "success") {
    const existing = document.getElementById("damkoi-coupon-toast");
    if (existing)
      existing.remove();
    const toast = document.createElement("div");
    toast.id = "damkoi-coupon-toast";
    toast.style.cssText = `
    position: fixed; bottom: 80px; right: 20px; z-index: 999999;
    background: ${type === "success" ? "#10b981" : "#6366f1"};
    color: white; padding: 12px 18px; border-radius: 12px;
    font-family: sans-serif; font-size: 13px; font-weight: 700;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: damkoi-slide-in 0.3s ease;
  `;
    toast.textContent = message;
    const style = document.createElement("style");
    style.textContent = `
    @keyframes damkoi-slide-in {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5e3);
  }
  function showCopyFallback(code) {
    const existing = document.getElementById("damkoi-copy-toast");
    if (existing)
      existing.remove();
    const el = document.createElement("div");
    el.id = "damkoi-copy-toast";
    el.style.cssText = `
    position: fixed; bottom: 80px; right: 20px; z-index: 999999;
    background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
    color: white; padding: 12px 18px; border-radius: 12px;
    font-family: sans-serif; font-size: 13px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
    el.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;">DamKoi found a coupon!</div>
    <div style="font-family:monospace;font-size:15px;letter-spacing:0.1em;">${code}</div>
    <button id="damkoi-copy-btn" style="
      margin-top:8px; background:#6366f1; color:white; border:none;
      padding:6px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700;
    ">Copy code</button>
  `;
    document.body.appendChild(el);
    document.getElementById("damkoi-copy-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(code).catch(() => {
      });
      el.remove();
    });
    setTimeout(() => el.remove(), 1e4);
  }
  async function tryCoupon(input, applyBtn, code) {
    input.focus();
    input.value = code;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    applyBtn.click();
    return waitForSuccess(3e3);
  }
  async function runCouponInjector(platform, cartTotal) {
    const input = findElement(COUPON_INPUT_SELECTORS);
    const applyBtn = findElement(APPLY_BTN_SELECTORS);
    if (!input || !applyBtn) {
      console.log("[DamKoi] Coupon input/button not found on this page.");
      return;
    }
    let coupons;
    try {
      coupons = await safeFetch("FETCH_COUPONS", { platform, cartTotal });
    } catch {
      return;
    }
    if (!coupons || coupons.length === 0)
      return;
    let applied = false;
    let savedAmount = 0;
    let usedCode = "";
    for (let i = 0; i < Math.min(MAX_RETRIES, coupons.length); i++) {
      const code = coupons[i]?.code;
      if (!code)
        continue;
      const success = await tryCoupon(input, applyBtn, code);
      chrome.runtime.sendMessage({
        type: "LOG_COUPON",
        payload: {
          platform,
          coupon_code: code,
          cart_total: cartTotal,
          savings: success ? coupons[i]?.discount_amount ?? 0 : 0,
          success
        }
      });
      if (success) {
        applied = true;
        savedAmount = coupons[i]?.discount_amount ?? 0;
        usedCode = code;
        break;
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
    if (applied && savedAmount > 0) {
      showToast(`\u2713 DamKoi saved you \u09F3${(savedAmount / 100).toLocaleString("en-BD")} with ${usedCode}`);
    } else if (!applied && coupons[0]?.code) {
      showCopyFallback(coupons[0].code);
    }
  }

  // popup.js
  var loadingState = document.getElementById("loading-state");
  var notDarazState = document.getElementById("not-daraz-state");
  var verdictState = document.getElementById("verdict-state");
  var errorState = document.getElementById("error-state");
  var optinModal = document.getElementById("optin-modal");
  var PERF_START = Date.now();
  function recordTiming(name) {
    const duration = Date.now() - PERF_START;
    recordPerformanceMetric(`popup_${name}`, duration);
    console.log(`[DamKoi] ${name}: ${duration}ms`);
  }
  function showState(state) {
    [loadingState, notDarazState, verdictState, errorState, optinModal].forEach(
      (s) => s?.classList.add("hidden")
    );
    state?.classList.remove("hidden");
  }
  async function init() {
    try {
      const [tab2] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      const isSupportedProduct = tab2?.url && // Daraz
      (tab2.url.includes("daraz.com.bd/products/") || /daraz\.com\.bd\/.*i\d+-s\d+/i.test(tab2.url) || // Cartup
      tab2.url.includes("cartup.com.bd/products/") || // Rokomari
      tab2.url.includes("rokomari.com/book/") || // Pickaboo
      tab2.url.includes("pickaboo.com/product/") || // Chaldal
      /chaldal\.com\/.+\/.+/.test(tab2.url) || // Othoba
      tab2.url.includes("othoba.com/product/"));
      if (!isSupportedProduct) {
        showState(notDarazState);
        setupUrlInput();
        recordTiming("not-daraz");
        return;
      }
      showState(loadingState);
      const cacheKey = getCacheKey("product", tab2.url);
      let data = getFromCache(cacheKey);
      let fromCache = false;
      if (data) {
        fromCache = true;
        console.log("[DamKoi Popup] Loaded from cache (< 50ms expected)");
      } else {
        const fetchStart = Date.now();
        const resp = await fetch(
          `${API_BASE}/v1/products/lookup?url=${encodeURIComponent(tab2.url)}`
        );
        console.log(`[DamKoi] API fetch: ${Date.now() - fetchStart}ms, status: ${resp.status}`);
        if (resp.status === 404) {
          showState(verdictState);
          document.getElementById("product-title").textContent = "Product not yet tracked";
          const badge = document.getElementById("verdict-badge");
          badge.textContent = "TRACKING STARTING";
          badge.classList.add("text-orange");
          document.getElementById("deal-score").textContent = "";
          document.getElementById("verdict-explanation").textContent = "This product will be picked up in our next scrape cycle. Check back in an hour!";
          document.querySelector(".price-grid").classList.add("hidden");
          recordTiming("fetch-not-found");
          return;
        }
        if (!resp.ok) {
          throw new Error(`API error ${resp.status}`);
        }
        data = await resp.json();
        saveToCache(cacheKey, data);
      }
      renderVerdict(data, fromCache);
      recordTiming(fromCache ? "render-cached" : "render-fresh");
    } catch (error) {
      console.error("[DamKoi Popup]", error);
      showState(errorState);
      document.getElementById("error-message").textContent = "Could not connect to DamKoi servers. Please try again.";
      const webLink = document.getElementById("error-web-link");
      if (webLink) {
        const productUrl = tab?.url ? `?url=${encodeURIComponent(tab.url)}` : "";
        webLink.href = `${DASHBOARD_BASE}${productUrl}`;
      }
      recordTiming("error");
    }
  }
  function renderVerdict(data, fromCache = false) {
    showState(verdictState);
    const { product, verdict } = data;
    document.getElementById("product-title").textContent = product.title;
    const BADGE_CLASS = {
      FAKE_DISCOUNT: "fake",
      BEST_PRICE: "best",
      GOOD_DEAL: "good",
      FAIR_PRICE: "fair",
      INSUFFICIENT_DATA: "pending"
    };
    const badge = document.getElementById("verdict-badge");
    badge.textContent = verdict.display;
    badge.className = `verdict-badge ${BADGE_CLASS[verdict.label] || "fair"}`;
    document.getElementById("current-price").textContent = formatBDT(product.current_price);
    document.getElementById("avg-price").textContent = formatBDT(verdict.avg_30d);
    document.getElementById("lowest-price").textContent = formatBDT(verdict.all_time_low);
    document.getElementById("verdict-explanation").textContent = verdict.explanation;
    document.getElementById("history-link").href = `${DASHBOARD_BASE}/product/${product.id}`;
    Promise.resolve().then(() => (init_visualizer(), visualizer_exports)).then(({ default: Visualizer2 }) => {
      Visualizer2.renderDealGauge(verdict.deal_score, "deal-gauge");
    }).catch(() => {
      const gauge = document.getElementById("deal-gauge");
      gauge.innerHTML = `<div class="gauge-plain">${verdict.deal_score}<span class="gauge-plain-sub">/10</span></div>`;
      gauge.querySelector(".gauge-plain").classList.add(getScoreClass(verdict.deal_score));
    });
    addToRecentVerdicts({
      product_id: product.id,
      title: product.title,
      url: window.location.href,
      verdict_label: verdict.label,
      deal_score: verdict.deal_score,
      timestamp: Date.now()
    });
    setupAlertButton(product);
    setupHorizonSection(verdict, product);
    chrome.runtime.sendMessage({ type: "UPDATE_BADGE", score: verdict.deal_score });
    if (fromCache) {
      const pt = document.getElementById("product-title");
      const badge2 = document.createElement("span");
      badge2.className = "cache-badge";
      badge2.textContent = "cached";
      pt.appendChild(badge2);
    }
    loadPriceChart(product.id);
    loadAlternatives(product.id);
    loadCompare(product.id);
  }
  async function loadPriceChart(productId) {
    try {
      const data = await safeFetch("FETCH_HISTORY", { productId, days: 30 });
      if (!data.prices || data.prices.length < 2)
        return;
      const { default: Visualizer2 } = await Promise.resolve().then(() => (init_visualizer(), visualizer_exports));
      const container = document.getElementById("price-chart-container");
      container.classList.remove("hidden");
      Visualizer2.renderPriceChart(data.prices, "price-chart-container");
    } catch (e) {
      console.warn("[DamKoi] Chart load failed:", e);
    }
  }
  async function loadAlternatives(productId) {
    try {
      const alternatives = await safeFetch("FETCH_ALTERNATIVES", { productId });
      if (!alternatives || alternatives.length === 0)
        return;
      const section = document.getElementById("alternatives-section");
      const list = document.getElementById("alternatives-list");
      section.classList.remove("hidden");
      list.innerHTML = alternatives.map((alt) => `
      <a href="${alt.url}" target="_blank" class="alternative-item">
        ${alt.image_url ? `<img src="${alt.image_url}" alt="" class="alt-image" />` : '<img src="icons/dk_logo.svg" alt="" class="alt-image alt-image-logo" />'}
        <div class="alt-info">
          <div class="alt-title">${alt.title.slice(0, 50)}${alt.title.length > 50 ? "\u2026" : ""}</div>
          <div class="alt-price">${formatBDT(alt.current_price)}
            <span class="alt-savings">Save ${formatBDT(alt.savings)}</span>
          </div>
        </div>
        <div class="alt-score-val ${getScoreClass(alt.deal_score)}">${alt.deal_score}/10</div>
      </a>
    `).join("");
    } catch (e) {
      console.warn("[DamKoi] Alternatives load failed:", e);
    }
  }
  async function loadCompare(productId) {
    try {
      const data = await safeFetch("FETCH_COMPARE", { productId });
      const matches = (data?.alternatives || []).filter((a) => !a.is_original_request);
      if (matches.length === 0)
        return;
      const section = document.getElementById("compare-section");
      const list = document.getElementById("compare-list");
      section.classList.remove("hidden");
      const top3 = matches.filter((m) => m.current_price != null).sort((a, b) => a.current_price - b.current_price).slice(0, 3);
      const original = data.alternatives.find((a) => a.is_original_request);
      list.innerHTML = top3.map((m) => {
        const delta = original?.current_price != null ? m.current_price - original.current_price : null;
        const deltaHtml = delta !== null ? `<span class="${delta < 0 ? "alt-savings" : "alt-more"}">${delta < 0 ? "Save " + formatBDT(Math.abs(delta)) : "+" + formatBDT(delta)}</span>` : "";
        return `
        <a href="${m.url}" target="_blank" class="alternative-item">
          ${m.image_url ? `<img src="${m.image_url}" alt="" class="alt-image" />` : '<img src="icons/dk_logo.svg" alt="" class="alt-image alt-image-logo" />'}
          <div class="alt-info">
            <div class="alt-platform">${m.platform}</div>
            <div class="alt-price">${formatBDT(m.current_price)} ${deltaHtml}</div>
          </div>
        </a>
      `;
      }).join("");
    } catch (e) {
      console.warn("[DamKoi] Compare load failed:", e);
    }
  }
  function setupUrlInput() {
    const input = document.getElementById("url-input");
    const btn = document.getElementById("url-submit");
    btn?.addEventListener("click", async () => {
      const url = input?.value?.trim();
      const isSupportedUrl = url && (url.includes("daraz.com.bd") || url.includes("cartup.com.bd") || url.includes("rokomari.com") || url.includes("pickaboo.com") || url.includes("chaldal.com") || url.includes("othoba.com"));
      if (!isSupportedUrl) {
        input.classList.add("border-danger");
        return;
      }
      showState(loadingState);
      try {
        const resp = await fetch(
          `${API_BASE}/v1/products/lookup?url=${encodeURIComponent(url)}`
        );
        if (resp.status === 404) {
          showState(errorState);
          document.getElementById("error-message").textContent = "Product not found or not yet tracked.";
          return;
        }
        if (!resp.ok)
          throw new Error(`API error ${resp.status}`);
        renderVerdict(await resp.json());
      } catch {
        showState(errorState);
        document.getElementById("error-message").textContent = "Could not reach DamKoi. Check your connection.";
      }
    });
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        btn?.click();
    });
  }
  function setupHorizonSection(verdict, product) {
    const section = document.getElementById("horizon-section");
    const recEl = document.getElementById("horizon-rec");
    if (!section || !recEl)
      return;
    section.classList.remove("hidden");
    let currentHorizon = "days";
    function renderRec(horizon) {
      const rec = getHorizonRecommendation(horizon, verdict, product);
      const colorMap = { buy: "#22c55e", wait: "#f59e0b", neutral: "#a78bfa" };
      const color = colorMap[rec.action] || "#a78bfa";
      const label = { buy: "BUY NOW", wait: "WAIT", neutral: "NEUTRAL" }[rec.action] || rec.action.toUpperCase();
      recEl.innerHTML = `
      <div class="horizon-rec-inner" style="border-left:3px solid ${color};background:${color}18;">
        <div class="horizon-action" style="color:${color}">${label}</div>
        <div class="horizon-text">${rec.text}</div>
      </div>
    `;
    }
    renderRec(currentHorizon);
    document.querySelectorAll(".horizon-tab").forEach((tab2) => {
      tab2.onclick = () => {
        document.querySelectorAll(".horizon-tab").forEach((t) => t.classList.remove("active"));
        tab2.classList.add("active");
        currentHorizon = tab2.dataset.horizon;
        renderRec(currentHorizon);
      };
    });
  }
  function setupAlertButton(product) {
    const btn = document.getElementById("set-alert");
    const priceInput = document.getElementById("alert-price");
    const emailInput = document.getElementById("alert-email");
    const status = document.getElementById("alert-status");
    btn?.addEventListener("click", async () => {
      const email = emailInput?.value?.trim();
      const targetPrice = priceInput?.value?.trim();
      if (!isValidEmail(email)) {
        setStatusMessage(status, "error", "Enter a valid email address");
        return;
      }
      if (!isValidPrice(targetPrice)) {
        setStatusMessage(status, "error", "Enter a valid price");
        return;
      }
      setStatusMessage(status, "info", "Setting alert...");
      try {
        const payload = createAlertPayload(product.id, targetPrice, email);
        await safeFetch("CREATE_ALERT", { payload });
        setStatusMessage(status, "success", `Alert set! We'll email ${email}`);
        priceInput.value = "";
        emailInput.value = "";
      } catch (e) {
        setStatusMessage(status, "error", e.message);
      }
    });
  }
  function setupOptinModal(platform, cartTotal) {
    showState(optinModal);
    document.getElementById("optin-yes")?.addEventListener("click", async () => {
      await saveToStorage("coupon_optin", "always");
      showState(loadingState);
      await runCouponInjector(platform, cartTotal);
      window.close();
    }, { once: true });
    document.getElementById("optin-once")?.addEventListener("click", async () => {
      showState(loadingState);
      await runCouponInjector(platform, cartTotal);
      window.close();
    }, { once: true });
    document.getElementById("optin-no")?.addEventListener("click", async () => {
      await saveToStorage("coupon_optin", "no");
      window.close();
    }, { once: true });
  }
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "CART_DETECTED") {
      setupOptinModal(msg.platform, msg.cartTotal);
    }
  });
  document.addEventListener("DOMContentLoaded", init);
})();
