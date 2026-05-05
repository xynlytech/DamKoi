/**
 * DamKoi — Extension Popup Script
 *
 * Handles the popup UI logic:
 * - Detects if current tab is a Daraz product page
 * - Fetches verdict from API (with performance tracking)
 * - Renders results
 * - Handles alert creation
 * - Tracks local cache of recent verdicts
 */

import {
  API_BASE,
  DASHBOARD_BASE,
  safeFetch,
  getScoreColor,
  getScoreClass,
  formatBDT,
  createAlertPayload,
  setStatusMessage,
  isValidEmail,
  isValidPrice,
  getCacheKey,
  getFromCache,
  saveToCache,
  addToRecentVerdicts,
  recordPerformanceMetric,
  ALERT_CHANNELS,
  DEFAULT_ALERT_CHANNEL,
  extractProductIdFromUrl
} from './utils.js';
import { getFromStorage, saveToStorage } from './storage.js';
import { runCouponInjector } from './coupon_injector.js';

// ── DOM Elements ─────────────────────────────────────────────

const loadingState = document.getElementById('loading-state');
const notDarazState = document.getElementById('not-daraz-state');
const verdictState = document.getElementById('verdict-state');
const errorState = document.getElementById('error-state');
const optinModal = document.getElementById('optin-modal');

// ── Performance Tracking ─────────────────────────

const PERF_START = Date.now();

function recordTiming(name) {
  const duration = Date.now() - PERF_START;
  recordPerformanceMetric(`popup_${name}`, duration);
  console.log(`[DamKoi] ${name}: ${duration}ms`);
}

// ── Helpers ──────────────────────────────────────

function showState(state) {
  [loadingState, notDarazState, verdictState, errorState, optinModal].forEach(
    (s) => s?.classList.add('hidden')
  );
  state?.classList.remove('hidden');
}

// ── Main Logic ───────────────────────────────────

async function init() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // Detect all Daraz product URL formats:
    //   /products/name-i{id}-s{id}.html
    //   /i{id}-s{id}.html
    //   /name-i{id}-s{id}.html
    const isDarazProduct = tab?.url && (
      tab.url.includes('daraz.com.bd/products/') ||
      /daraz\.com\.bd\/.*i\d+-s\d+/i.test(tab.url)
    );

    if (!isDarazProduct) {
      showState(notDarazState);
      setupUrlInput();
      recordTiming('not-daraz');
      return;
    }

    // It's a Daraz product page — fetch verdict
    showState(loadingState);

    // Check cache first
    const cacheKey = getCacheKey('product', tab.url);
    let data = getFromCache(cacheKey);
    let fromCache = false;

    if (data) {
      fromCache = true;
      console.log('[DamKoi Popup] Loaded from cache (< 50ms expected)');
    } else {
      // Not in cache, fetch from API
      try {
        const fetchStart = Date.now();
        data = await safeFetch('FETCH_VERDICT', { url: tab.url });
        
        const fetchDuration = Date.now() - fetchStart;
        console.log(`[DamKoi] API fetch: ${fetchDuration}ms`);

        // Cache the result
        saveToCache(cacheKey, data);
      } catch (error) {
        if (error.message.includes('404')) {
           showState(verdictState);
           document.getElementById('product-title').textContent = 'Product not yet tracked';
           const badge = document.getElementById('verdict-badge');
           badge.textContent = 'TRACKING STARTING';
           badge.classList.add('text-orange');
           document.getElementById('deal-score').textContent = '';
           document.getElementById('verdict-explanation').textContent = 'This product will be picked up in our next scrape cycle. Check back in an hour!';
           document.querySelector('.price-grid').classList.add('hidden');
           recordTiming('fetch-not-found');
           return;
        }
        throw error;
      }
    }

    renderVerdict(data, fromCache);
    recordTiming(fromCache ? 'render-cached' : 'render-fresh');
  } catch (error) {
    console.error('[DamKoi Popup]', error);
    showState(errorState);
    document.getElementById('error-message').textContent =
      'Could not connect to DamKoi. Please try again.';
    recordTiming('error');
  }
}

function renderVerdict(data, fromCache = false) {
  showState(verdictState);

  const { product, verdict } = data;

  // Product title
  document.getElementById('product-title').textContent = product.title;

  // ── Verdict badge (neumorphic class system) ──
  const BADGE_CLASS = {
    FAKE_DISCOUNT: 'fake',
    BEST_PRICE:    'best',
    GOOD_DEAL:     'good',
    FAIR_PRICE:    'fair',
    INSUFFICIENT_DATA: 'pending',
  };
  const badge = document.getElementById('verdict-badge');
  badge.textContent = verdict.display;
  badge.className = `verdict-badge ${BADGE_CLASS[verdict.label] || 'fair'}`;

  // ── Prices ──
  document.getElementById('current-price').textContent = formatBDT(product.current_price);
  document.getElementById('avg-price').textContent = formatBDT(verdict.avg_30d);
  document.getElementById('lowest-price').textContent = formatBDT(verdict.all_time_low);

  // ── Explanation ──
  document.getElementById('verdict-explanation').textContent = verdict.explanation;

  // ── History link ──
  document.getElementById('history-link').href = `${DASHBOARD_BASE}/product/${product.id}`;

  // ── Render deal gauge (visualizer) ──
  import('./visualizer.js').then(({ default: Visualizer }) => {
    Visualizer.renderDealGauge(verdict.deal_score, 'deal-gauge');
  }).catch(() => {
    // Fallback — plain text score
    const gauge = document.getElementById('deal-gauge');
    gauge.innerHTML = `<div class="gauge-plain">${verdict.deal_score}<span class="gauge-plain-sub">/10</span></div>`;
    gauge.querySelector('.gauge-plain').classList.add(getScoreClass(verdict.deal_score));
  });

  // ── Track recent verdicts ──
  addToRecentVerdicts({
    product_id: product.id,
    title: product.title,
    url: window.location.href,
    verdict_label: verdict.label,
    deal_score: verdict.deal_score,
    timestamp: Date.now()
  });

  // ── Alert setup ──
  setupAlertButton(product);

  // ── Extension badge ──
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', score: verdict.deal_score });

  // ── Cache indicator ──
  if (fromCache) {
    const pt = document.getElementById('product-title');
    const badge = document.createElement('span');
    badge.className = 'cache-badge';
    badge.textContent = 'cached';
    pt.appendChild(badge);
  }

  // ── Async enrichment ────────────────────────────────────
  loadPriceChart(product.id);
  loadAlternatives(product.id);
  loadCompare(product.id);
}

async function loadPriceChart(productId) {
  try {
    const data = await safeFetch('FETCH_HISTORY', { productId, days: 30 });
    if (!data.prices || data.prices.length < 2) return;

    // Dynamically import the visualizer
    const { default: Visualizer } = await import('./visualizer.js');
    const container = document.getElementById('price-chart-container');
    container.classList.remove('hidden');
    Visualizer.renderPriceChart(data.prices, 'price-chart-container');
  } catch (e) {
    console.warn('[DamKoi] Chart load failed:', e);
  }
}

async function loadAlternatives(productId) {
  try {
    const alternatives = await safeFetch('FETCH_ALTERNATIVES', { productId });
    if (!alternatives || alternatives.length === 0) return;

    const section = document.getElementById('alternatives-section');
    const list = document.getElementById('alternatives-list');
    section.classList.remove('hidden');

    list.innerHTML = alternatives.map(alt => `
      <a href="${alt.url}" target="_blank" class="alternative-item">
        ${alt.image_url ? `<img src="${alt.image_url}" alt="" class="alt-image" />` : '<img src="icons/dk_logo.svg" alt="" class="alt-image alt-image-logo" />'}
        <div class="alt-info">
          <div class="alt-title">${alt.title.slice(0, 50)}${alt.title.length > 50 ? '…' : ''}</div>
          <div class="alt-price">${formatBDT(alt.current_price)}
            <span class="alt-savings">Save ${formatBDT(alt.savings)}</span>
          </div>
        </div>
        <div class="alt-score-val ${getScoreClass(alt.deal_score)}">${alt.deal_score}/10</div>
      </a>
    `).join('');
  } catch (e) {
    console.warn('[DamKoi] Alternatives load failed:', e);
  }
}

async function loadCompare(productId) {
  try {
    const data = await safeFetch('FETCH_COMPARE', { productId });
    const matches = (data?.alternatives || []).filter(a => !a.is_original_request);
    if (matches.length === 0) return;

    const section = document.getElementById('compare-section');
    const list = document.getElementById('compare-list');
    section.classList.remove('hidden');

    // Show top 3 cheapest matches
    const top3 = matches
      .filter(m => m.current_price != null)
      .sort((a, b) => a.current_price - b.current_price)
      .slice(0, 3);

    const original = data.alternatives.find(a => a.is_original_request);
    list.innerHTML = top3.map(m => {
      const delta = original?.current_price != null
        ? m.current_price - original.current_price
        : null;
      const deltaHtml = delta !== null
        ? `<span class="${delta < 0 ? 'alt-savings' : 'alt-more'}">${delta < 0 ? 'Save ' + formatBDT(Math.abs(delta)) : '+' + formatBDT(delta)}</span>`
        : '';
      return `
        <a href="${m.url}" target="_blank" class="alternative-item">
          ${m.image_url ? `<img src="${m.image_url}" alt="" class="alt-image" />` : '<img src="icons/dk_logo.svg" alt="" class="alt-image alt-image-logo" />'}
          <div class="alt-info">
            <div class="alt-platform">${m.platform}</div>
            <div class="alt-price">${formatBDT(m.current_price)} ${deltaHtml}</div>
          </div>
        </a>
      `;
    }).join('');
  } catch (e) {
    console.warn('[DamKoi] Compare load failed:', e);
  }
}


// ── URL Input (when not on Daraz) ────────────────

function setupUrlInput() {
  const input = document.getElementById('url-input');
  const btn = document.getElementById('url-submit');

  btn?.addEventListener('click', async () => {
    const url = input?.value?.trim();
    if (!url || !url.includes('daraz.com.bd')) {
      input.classList.add('border-danger');
      return;
    }

    showState(loadingState);

    try {
      const data = await safeFetch('FETCH_VERDICT', { url });
      renderVerdict(data);
    } catch {
      showState(errorState);
      document.getElementById('error-message').textContent =
        'Product not found or not yet tracked.';
    }
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn?.click();
  });
}

// ── Alert Button ─────────────────────────────────

function setupAlertButton(product) {
  const btn = document.getElementById('set-alert');
  const priceInput = document.getElementById('alert-price');
  const emailInput = document.getElementById('alert-email');
  const status = document.getElementById('alert-status');

  btn?.addEventListener('click', async () => {
    const email = emailInput?.value?.trim();
    const targetPrice = priceInput?.value?.trim();

    if (!isValidEmail(email)) {
      setStatusMessage(status, 'error', 'Enter a valid email address');
      return;
    }

    if (!isValidPrice(targetPrice)) {
      setStatusMessage(status, 'error', 'Enter a valid price');
      return;
    }

    setStatusMessage(status, 'info', 'Setting alert...');

    try {
      const payload = createAlertPayload(product.id, targetPrice, email);
      await safeFetch('CREATE_ALERT', { payload });

      setStatusMessage(status, 'success', `Alert set! We'll email ${email}`);
      priceInput.value = '';
      emailInput.value = '';
    } catch (e) {
      setStatusMessage(status, 'error', e.message);
    }
  });
}

// ── Coupon Opt-in Modal ──────────────────────────

function setupOptinModal(platform, cartTotal) {
  showState(optinModal);

  document.getElementById('optin-yes')?.addEventListener('click', async () => {
    await saveToStorage('coupon_optin', 'always');
    showState(loadingState);
    await runCouponInjector(platform, cartTotal);
    window.close();
  }, { once: true });

  document.getElementById('optin-once')?.addEventListener('click', async () => {
    showState(loadingState);
    await runCouponInjector(platform, cartTotal);
    window.close();
  }, { once: true });

  document.getElementById('optin-no')?.addEventListener('click', async () => {
    await saveToStorage('coupon_optin', 'no');
    window.close();
  }, { once: true });
}

// Listen for cart detection signals from cart_detector content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'CART_DETECTED') {
    setupOptinModal(msg.platform, msg.cartTotal);
  }
});

// ── Initialize ───────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
