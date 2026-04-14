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
  getScoreColor,
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

// ── DOM Elements ─────────────────────────────────────────────

const loadingState = document.getElementById('loading-state');
const notDarazState = document.getElementById('not-daraz-state');
const verdictState = document.getElementById('verdict-state');
const errorState = document.getElementById('error-state');

// ── Performance Tracking ─────────────────────────

const PERF_START = Date.now();

function recordTiming(name) {
  const duration = Date.now() - PERF_START;
  recordPerformanceMetric(`popup_${name}`, duration);
  console.log(`[DamKoi] ${name}: ${duration}ms`);
}

// ── Helpers ──────────────────────────────────────

function showState(state) {
  [loadingState, notDarazState, verdictState, errorState].forEach(
    (s) => (s.style.display = 'none')
  );
  state.style.display = 'block';
}

// ── Main Logic ───────────────────────────────────

async function init() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url?.includes('daraz.com.bd/products/')) {
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
      // Not in cache, fetch from API (with timeout for <1s requirement)
      const fetchStart = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);

      try {
        const resp = await fetch(
          `${API_BASE}/products/lookup?url=${encodeURIComponent(tab.url)}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        const fetchDuration = Date.now() - fetchStart;
        console.log(`[DamKoi] API fetch: ${fetchDuration}ms`);

        if (resp.status === 404) {
          showState(verdictState);
          document.getElementById('product-title').textContent =
            'Product not yet tracked';
          document.getElementById('verdict-badge').textContent =
            '⏳ TRACKING STARTING';
          document.getElementById('verdict-badge').style.color = '#f59e0b';
          document.getElementById('deal-score').textContent = '';
          document.getElementById('verdict-explanation').textContent =
            'This product will be picked up in our next scrape cycle. Check back in an hour!';

          // Hide empty price grid
          document.querySelector('.price-grid').style.display = 'none';
          recordTiming('fetch-not-found');
          return;
        }

        if (!resp.ok) throw new Error(`API error: ${resp.status}`);

        data = await resp.json();
        // Cache the result
        saveToCache(cacheKey, data);
      } catch (error) {
        if (error.name === 'AbortError') {
          showState(errorState);
          document.getElementById('error-message').textContent =
            'API timeout (>1s). Please try again.';
          recordTiming('fetch-timeout');
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

  // Verdict badge
  const badge = document.getElementById('verdict-badge');
  badge.textContent = verdict.display;

  // Deal score
  const score = document.getElementById('deal-score');
  score.textContent = `Deal Score: ${verdict.deal_score} / 10`;
  score.style.color = getScoreColor(verdict.deal_score);

  // Prices
  document.getElementById('current-price').textContent = formatBDT(
    product.current_price
  );
  document.getElementById('avg-price').textContent = formatBDT(verdict.avg_30d);
  document.getElementById('lowest-price').textContent =
    formatBDT(verdict.all_time_low) +
    (verdict.all_time_low_date ? ` (${verdict.all_time_low_date})` : '');

  // Explanation
  document.getElementById('verdict-explanation').textContent =
    verdict.explanation;

  // History link with dynamic dashboard base
  const productId = product.id;
  document.getElementById('history-link').href =
    `${DASHBOARD_BASE}/product/${productId}`;

  // Add to recent verdicts
  addToRecentVerdicts({
    product_id: product.id,
    title: product.title,
    url: window.location.href,
    verdict_label: verdict.label,
    deal_score: verdict.deal_score,
    timestamp: Date.now()
  });

  // Alert setup
  setupAlertButton(product);

  // Update extension badge
  chrome.runtime.sendMessage({
    type: 'UPDATE_BADGE',
    score: verdict.deal_score,
  });

  // Show cache indicator if loaded from cache
  if (fromCache) {
    const indicator = document.createElement('small');
    indicator.style.fontSize = '0.75rem';
    indicator.style.color = '#6b7280';
    indicator.style.marginTop = '8px';
    indicator.textContent = '(Cached)';
    verdictState.appendChild(indicator);
  }
}

// ── URL Input (when not on Daraz) ────────────────

function setupUrlInput() {
  const input = document.getElementById('url-input');
  const btn = document.getElementById('url-submit');

  btn?.addEventListener('click', async () => {
    const url = input?.value?.trim();
    if (!url || !url.includes('daraz.com.bd')) {
      input.style.borderColor = '#ef4444';
      return;
    }

    showState(loadingState);

    try {
      const resp = await fetch(
        `${API_BASE}/products/lookup?url=${encodeURIComponent(url)}`
      );

      if (!resp.ok) throw new Error(`API error: ${resp.status}`);

      const data = await resp.json();
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
      const resp = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `API error: ${resp.status}`);
      }

      setStatusMessage(status, 'success', `Alert set! We'll email ${email}`);
      priceInput.value = '';
      emailInput.value = '';
    } catch (e) {
      setStatusMessage(status, 'error', e.message);
    }
  });
}

// ── Initialize ───────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
