/**
 * DamKoi — Chrome Extension Content Script
 *
 * Runs on every Daraz.com.bd product page.
 * Detects the product, calls DamKoi API, and injects a floating verdict widget.
 */

// ── Configuration ────────────────────────────────────────────

const API_BASE = 'http://localhost:8000/v1'; // Change to https://api.damkoi.com/v1 in production

// ── Product Detection ────────────────────────────────────────

function isDarazProductPage() {
  return (
    window.location.hostname === 'www.daraz.com.bd' &&
    window.location.pathname.includes('/products/')
  );
}

function extractProductId() {
  const url = window.location.href;

  // Pattern: -i{id}-s{sku}.html
  const match = url.match(/-i(\d+)(?:-s\d+)?\.html/);
  if (match) return match[1];

  // Pattern: ?itemId={id}
  const params = new URLSearchParams(window.location.search);
  return params.get('itemId');
}

function extractCurrentPrice() {
  // Try __NEXT_DATA__ first
  try {
    const nextData = document.getElementById('__NEXT_DATA__');
    if (nextData) {
      const data = JSON.parse(nextData.textContent);
      // Navigate to product price — Daraz structure varies
      const product =
        data?.props?.pageProps?.product ||
        data?.props?.pageProps?.data?.product;
      if (product) {
        return product.price || product.skuInfos?.price || product.priceInfo?.price;
      }
    }
  } catch (e) {
    console.log('[DamKoi] __NEXT_DATA__ extraction failed:', e);
  }

  // Fallback: DOM selectors
  const selectors = [
    '.pdp-price .pdp-price_type_normal',
    '.pdp-price .pdp-price_color_orange',
    'span.pdp-price',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent.replace(/[৳Tk\s,]/g, '');
      const price = parseFloat(text);
      if (!isNaN(price)) return price;
    }
  }

  return null;
}

// ── API Communication ────────────────────────────────────────

async function fetchVerdict(url) {
  // Check local cache first (last 10 verdicts)
  const cacheKey = `damkoi_cache_${extractProductId()}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    // Cache valid for 1 hour
    if (Date.now() - parsed.timestamp < 3600000) {
      console.log('[DamKoi] Using cached verdict');
      return parsed.data;
    }
  }

  try {
    const resp = await fetch(
      `${API_BASE}/products/lookup?url=${encodeURIComponent(url)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!resp.ok) {
      if (resp.status === 404) {
        return { notTracked: true };
      }
      throw new Error(`API error: ${resp.status}`);
    }

    const data = await resp.json();

    // Cache the result
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data, timestamp: Date.now() })
    );

    // Manage cache size (keep last 10)
    manageCacheSize();

    return data;
  } catch (error) {
    console.error('[DamKoi] API fetch failed:', error);
    return null;
  }
}

function manageCacheSize() {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith('damkoi_cache_')
  );
  if (keys.length > 10) {
    // Remove oldest entries
    const entries = keys.map((k) => ({
      key: k,
      timestamp: JSON.parse(localStorage.getItem(k))?.timestamp || 0,
    }));
    entries.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < entries.length - 10; i++) {
      localStorage.removeItem(entries[i].key);
    }
  }
}

// ── Widget Rendering ─────────────────────────────────────────

function renderWidget(data) {
  // Remove existing widget if any
  const existing = document.getElementById('damkoi-widget');
  if (existing) existing.remove();

  const widget = document.createElement('div');
  widget.id = 'damkoi-widget';

  if (!data || data.notTracked) {
    widget.innerHTML = `
      <div class="damkoi-header">
        <span class="damkoi-logo">🛒 DamKoi</span>
        <button class="damkoi-close" id="damkoi-close">✕</button>
      </div>
      <div class="damkoi-body">
        <div class="damkoi-status">⏳ Not yet tracked</div>
        <p class="damkoi-text">This product will be picked up in our next scrape cycle.</p>
      </div>
    `;
  } else {
    const { product, verdict } = data;
    const currentBDT = (product.current_price / 100).toLocaleString('en-BD');
    const avgBDT = verdict.avg_30d
      ? (verdict.avg_30d / 100).toLocaleString('en-BD')
      : '—';
    const atlBDT = verdict.all_time_low
      ? (verdict.all_time_low / 100).toLocaleString('en-BD')
      : '—';

    // Score color
    let scoreColor = '#6b7280'; // gray
    if (verdict.deal_score >= 8) scoreColor = '#10b981'; // green
    else if (verdict.deal_score >= 6) scoreColor = '#f59e0b'; // amber
    else if (verdict.deal_score >= 4) scoreColor = '#ef4444'; // red
    else scoreColor = '#dc2626'; // dark red

    widget.innerHTML = `
      <div class="damkoi-header">
        <span class="damkoi-logo">🛒 DamKoi</span>
        <button class="damkoi-close" id="damkoi-close">✕</button>
      </div>
      <div class="damkoi-body">
        <div class="damkoi-verdict">${verdict.display}</div>
        <div class="damkoi-score" style="color: ${scoreColor}">
          Deal Score: ${verdict.deal_score} / 10
        </div>
        <div class="damkoi-prices">
          <div class="damkoi-price-row">
            <span>💰 Current:</span>
            <span>৳${currentBDT}</span>
          </div>
          <div class="damkoi-price-row">
            <span>📊 30-Day Avg:</span>
            <span>৳${avgBDT}</span>
          </div>
          <div class="damkoi-price-row">
            <span>📉 Lowest Ever:</span>
            <span>৳${atlBDT}${verdict.all_time_low_date ? ` (${verdict.all_time_low_date})` : ''}</span>
          </div>
        </div>
        <p class="damkoi-explanation">${verdict.explanation}</p>
        <a class="damkoi-link" href="${API_BASE.replace('/v1', '')}/product/${data.product.id}" target="_blank">
          📉 See Full Price History
        </a>
      </div>
    `;
  }

  document.body.appendChild(widget);

  // Close button handler
  document.getElementById('damkoi-close')?.addEventListener('click', () => {
    widget.remove();
  });
}

// ── Main Execution ───────────────────────────────────────────

async function main() {
  if (!isDarazProductPage()) return;

  console.log('[DamKoi] Product page detected. Fetching verdict...');

  const data = await fetchVerdict(window.location.href);
  renderWidget(data);
}

// Run after page is fully loaded
if (document.readyState === 'complete') {
  main();
} else {
  window.addEventListener('load', main);
}
