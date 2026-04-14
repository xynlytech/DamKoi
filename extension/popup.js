/**
 * DamKoi — Extension Popup Script
 *
 * Handles the popup UI logic:
 * - Detects if current tab is a Daraz product page
 * - Fetches verdict from API
 * - Renders results
 * - Handles alert creation
 */

const API_BASE = 'http://localhost:8000/v1'; // Change to production URL

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

function formatBDT(paisa) {
  if (!paisa) return '—';
  const bdt = paisa / 100;
  return `৳${bdt.toLocaleString('en-BD')}`;
}

function getScoreColor(score) {
  if (score >= 8) return '#10b981';
  if (score >= 6) return '#f59e0b';
  if (score >= 4) return '#ef4444';
  return '#dc2626';
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
      return;
    }

    if (!resp.ok) throw new Error(`API error: ${resp.status}`);

    const data = await resp.json();
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
  document.getElementById('history-link').href = `${API_BASE.replace(
    '/v1',
    ''
  )}/product/${product.id}`;

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
  const input = document.getElementById('alert-price');
  const status = document.getElementById('alert-status');

  btn?.addEventListener('click', async () => {
    const targetPrice = parseInt(input?.value);
    if (!targetPrice || targetPrice <= 0) {
      status.textContent = '⚠️ Enter a valid price';
      status.style.color = '#ef4444';
      return;
    }

    // Get or create anonymous ID
    let anonId = (await chrome.storage.local.get('anon_id'))?.anon_id;
    if (!anonId) {
      anonId = 'anon_' + Math.random().toString(36).substr(2, 12);
      await chrome.storage.local.set({ anon_id: anonId });
    }

    try {
      // For MVP, just store locally + show confirmation
      // Full alert API requires user auth (handled in Phase 2)
      const alerts = (await chrome.storage.local.get('alerts'))?.alerts || [];
      alerts.push({
        product_id: product.id,
        product_title: product.title,
        target_price: targetPrice * 100, // to paisa
        created_at: new Date().toISOString(),
      });
      await chrome.storage.local.set({ alerts });

      status.textContent = `✅ Alert set for ৳${targetPrice.toLocaleString()}!`;
      status.style.color = '#10b981';
      input.value = '';
    } catch {
      status.textContent = '❌ Failed to set alert. Try again.';
      status.style.color = '#ef4444';
    }
  });
}

// ── Initialize ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
