/**
 * DamKoi — Extension Popup Script
 *
 * Handles the popup UI logic:
 * - Detects if current tab is a Daraz product page
 * - Fetches verdict from API
 * - Renders results
 * - Handles alert creation
 */

import { API_BASE, getScoreColor, formatBDT, createAlertPayload, setStatusMessage, isValidEmail, isValidPrice, getCacheKey, getFromCache, saveToCache, ALERT_CHANNELS, DEFAULT_ALERT_CHANNEL } from './utils.js';

// ── DOM Elements ─────────────────────────────────────────────

const loadingState = document.getElementById('loading-state');
const notDarazState = document.getElementById('not-daraz-state');
const verdictState = document.getElementById('verdict-state');
const errorState = document.getElementById('error-state');

// ── Helpers ──────────────────────────────────────────────────

function showState(state) {
  [loadingState, notDarazState, verdictState, errorState].forEach(
    (s) => (s.style.display = 'none')
  );
  state.style.display = 'block';
}

// ── Main Logic ───────────────────────────────────────────────

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
      return;
    }

    // It's a Daraz product page — fetch verdict
    showState(loadingState);

    // Check cache first
    const cacheKey = getCacheKey('product', tab.url);
    let data = getFromCache(cacheKey);

    if (!data) {
      // Not in cache, fetch from API
      const resp = await fetch(
        `${API_BASE}/products/lookup?url=${encodeURIComponent(tab.url)}`
      );

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
        return;
      }

      if (!resp.ok) throw new Error(`API error: ${resp.status}`);

      data = await resp.json();
      // Cache the result
      saveToCache(cacheKey, data);
    }

    renderVerdict(data);
  } catch (error) {
    console.error('[DamKoi Popup]', error);
    showState(errorState);
    document.getElementById('error-message').textContent =
      'Could not connect to DamKoi. Please try again.';
  }
}

function renderVerdict(data) {
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

  // History link
  document.getElementById('history-link').href = 'http://localhost:3000/dashboard';

  // Alert setup
  setupAlertButton(product);

  // Update extension badge
  chrome.runtime.sendMessage({
    type: 'UPDATE_BADGE',
    score: verdict.deal_score,
  });
}

// ── URL Input (when not on Daraz) ────────────────────────────

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

// ── Alert Button ─────────────────────────────────────────────

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
    } catch (e) {
      setStatusMessage(status, 'error', e.message);
    }
  });
}

// ── Initialize ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
