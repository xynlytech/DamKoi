/**
 * DamKoi — Benchmark-Level Extension Content Script
 * 
 * Features:
 * - Sidebar-style overlay
 * - SVG gauges and charts
 * - Tabbed navigation
 * - Real-time alerts integration
 */

import { API_BASE, safeFetch, getScoreColor, formatBDT, createAlertPayload, setStatusMessage, isValidEmail, isValidPrice, getCacheKey, getFromCache, saveToCache, ALERT_CHANNELS, DEFAULT_ALERT_CHANNEL } from './utils.js';
import Visualizer from './visualizer.js';
import { ICONS } from './icons.js';
import { injectWidget } from './inline_widget.js';

class DamKoiExtension {
  constructor() {
    this.data = null;
    this.sidebar = null;
    this.currentTab = 'summary';
    this.alternativesCache = null;
    this.alertFormState = {};
  }

  async init() {
    this.platform = this.detectPlatform();
    if (!this.platform) return;

    if (this.platform === 'daraz-checkout' || this.platform === 'pickaboo-checkout') {
      console.log(`[DamKoi] Checkout detected. Launching coupon magic...`);
      this.initCouponMagic();
      return;
    }

    console.log(`[DamKoi] Content script starting on ${this.platform}...`);
    this.data = await this.fetchData(window.location.href);

    // ── 1. Inline widget — zero friction, appears automatically ──
    if (this.data && !this.data.notTracked) {
      // Enrich with full price history before rendering chart
      await this.enrichPriceHistory();
      injectWidget(this.data);
    }

    // ── 2. Sidebar — secondary surface, starts collapsed ─────────
    this.renderSidebar();
  }

  async enrichPriceHistory() {
    if (!this.data?.product?.id) return;
    try {
      const h = await safeFetch('FETCH_HISTORY', { productId: this.data.product.id, days: 90 });
      this.data.price_history = h.prices || [];
    } catch (e) {
      console.warn('[DamKoi] Could not fetch history:', e);
      this.data.price_history = [];
    }
  }

  /**
   * Detect if the current page is a product page on any supported BD platform.
   * Returns the platform name or null.
   */
  detectPlatform() {
    const { hostname, href } = window.location;

    if (hostname.includes('daraz.com.bd')) {
      if (href.includes('cart.daraz.com.bd') || href.includes('checkout.daraz.com.bd')) {
        return 'daraz-checkout';
      }
      const isProduct = /daraz\.com\.bd\/.*i\d+-s\d+/i.test(href) ||
                        href.includes('daraz.com.bd/products/');
      return isProduct ? 'daraz' : null;
    }
    if (hostname.includes('cartup.com.bd')) {
      return href.includes('/products/') ? 'cartup' : null;
    }
    if (hostname.includes('rokomari.com')) {
      return /\/book\/\d+/.test(href) ? 'rokomari' : null;
    }
    if (hostname.includes('pickaboo.com')) {
      if (href.includes('pickaboo.com/checkout/')) {
        return 'pickaboo-checkout';
      }
      return href.includes('/product/') ? 'pickaboo' : null;
    }
    if (hostname.includes('chaldal.com')) {
      return href.includes('/p/') || href.split('/').length > 3 ? 'chaldal' : null;
    }
    if (hostname.includes('othoba.com')) {
      return href.includes('/product/') ? 'othoba' : null;
    }
    return null;
  }

  async fetchData(url) {
    try {
      // Check cache first
      const cacheKey = getCacheKey('product', url);
      const cached = getFromCache(cacheKey);
      if (cached) {
        console.log('[DamKoi] Loaded from cache:', url);
        return cached;
      }

      const data = await safeFetch('FETCH_VERDICT', { url });
      
      // Cache the result
      saveToCache(cacheKey, data);
      return data;
    } catch (e) {
      console.error('[DamKoi] Fetch failed:', e);
      return { notTracked: true }; // Fallback to not tracked on error
    }
  }

  // ── Coupon Magic (Auto-Apply) ────────────────────────────────
  
  async initCouponMagic() {
    // Inject floating UI
    const widget = document.createElement('div');
    widget.id = 'damkoi-coupon-widget';
    widget.innerHTML = `
      <div style="background: rgba(10,10,12,0.95); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 16px; width: 300px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); backdrop-filter: blur(12px); color: white; font-family: system-ui, sans-serif; z-index: 999999; position: fixed; bottom: 20px; right: 20px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <img src="${chrome.runtime.getURL('icons/dk_logo.svg')}" style="width: 20px; height: 20px;" />
          <span style="font-weight: 800; font-size: 14px;">DamKoi Magic</span>
        </div>
        <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin: 0 0 16px 0; line-height: 1.4;">
          We found active coupons. Do you want to test them all to find the best discount?
        </p>
        <button id="dk-apply-btn" style="width: 100%; background: #6366f1; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s;">
          Auto-Apply Coupons
        </button>
      </div>
    `;
    document.body.appendChild(widget);

    document.getElementById('dk-apply-btn').onclick = async () => {
      const btn = document.getElementById('dk-apply-btn');
      btn.innerText = 'Testing Coupons...';
      btn.style.background = '#4f46e5';
      btn.style.opacity = '0.7';
      btn.disabled = true;

      try {
        const coupons = await safeFetch('FETCH_COUPONS', {});
        if (!coupons || coupons.length === 0) {
          btn.innerText = 'No valid coupons found';
          return;
        }

        // DOM sequence varies by platform
        const isDaraz = window.location.hostname.includes('daraz');
        const inputSelector = isDaraz ? '.next-input.next-medium input' : '.coupon-input-field'; 
        const applyBtnSelector = isDaraz ? '.next-btn.next-btn-primary.next-btn-medium' : '.apply-coupon-btn';
        
        let bestDiscount = 0;
        let bestCode = null;

        for (let i = 0; i < coupons.length; i++) {
          const c = coupons[i];
          btn.innerText = `Testing ${c.code} (${i+1}/${coupons.length})`;
          
          const input = document.querySelector(inputSelector);
          const applyBtn = document.querySelector(applyBtnSelector);
          
          if (input && applyBtn) {
            // Simulate typing
            input.value = c.code;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Simulate click
            applyBtn.click();
            
            // Wait for network/DOM update (crude wait for MVP)
            await new Promise(r => setTimeout(r, 2000));
            
            // Read success toast or discount line
            const discountSelector = isDaraz ? '.checkout-order-total-discount' : '.order-summary .discount-amount';
            const discountLine = document.querySelector(discountSelector);
            if (discountLine) {
              const text = discountLine.innerText;
              const match = text.match(/[\d,]+/);
              if (match) {
                const val = parseInt(match[0].replace(/,/g, ''));
                if (val > bestDiscount) {
                  bestDiscount = val;
                  bestCode = c.code;
                }
              }
            }
          }
        }

        if (bestCode) {
          // Re-apply the best code
          btn.innerText = `Applying best code: ${bestCode}`;
          const input = document.querySelector(inputSelector);
          const applyBtn = document.querySelector(applyBtnSelector);
          if (input && applyBtn) {
            input.value = bestCode;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            applyBtn.click();
            await new Promise(r => setTimeout(r, 1000));
          }
          btn.innerText = `Saved ৳${bestDiscount}! 🎉`;
          btn.style.background = '#10b981';
        } else {
          btn.innerText = 'No coupons worked 😔';
          btn.style.background = '#3f3f46';
        }
      } catch (e) {
        console.error(e);
        btn.innerText = 'Error trying coupons';
      }
    };
  }

  renderSidebar() {
    if (this.sidebar) this.sidebar.remove();
    
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'damkoi-sidebar';
    
    this.sidebar.innerHTML = `
      <nav class="damkoi-nav">
        <img src="${chrome.runtime.getURL('icons/dk_logo.svg')}" style="width:28px;height:28px;margin-bottom:20px;opacity:0.9;" />
        <div class="damkoi-nav-item active" data-tab="summary">${ICONS.summary}</div>
        <div class="damkoi-nav-item" data-tab="history">${ICONS.history}</div>
        <div class="damkoi-nav-item" data-tab="alternatives">${ICONS.alternatives}</div>
        <div class="damkoi-nav-item" data-tab="alerts">${ICONS.alerts}</div>
      </nav>
      <main class="damkoi-main">
        <header class="damkoi-header">
          <span class="damkoi-logo">DamKoi</span>
          <div class="damkoi-close" title="Click to collapse">${ICONS.close}</div>
        </header>
        <div id="damkoi-content">
          <!-- Skeleton shown until real data arrives -->
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

    // Only call switchTab when real data is ready; the skeleton above covers the gap
    if (this.data && !this.data.notTracked) {
      this.switchTab('summary');
    } else if (this.data) {
      // Not tracked — skip skeleton, show proper empty state
      this.switchTab('summary');
    }
    // If data is still null (still fetching), the skeleton remains until
    // init() eventually calls renderSidebar() again after data arrives.
  }

  setupEvents() {
    this.sidebar.querySelector('.damkoi-close').onclick = () => {
      this.sidebar.classList.toggle('collapsed');
    };
    
    this.sidebar.querySelectorAll('.damkoi-nav-item').forEach(item => {
      item.onclick = (e) => {
        const wasCollapsed = this.sidebar.classList.contains('collapsed');
        this.switchTab(item.dataset.tab);
        if (wasCollapsed) {
          this.sidebar.classList.remove('collapsed');
        } else if (this.currentTab === item.dataset.tab && !wasCollapsed) {
          // If already on this tab and clicking again, maybe collapse? 
          // Let's stick to simple benchmark: click icon -> expand.
        }
      };
    });
  }

  switchTab(tabId) {
    // Prevent unnecessary DOM rebuilds if already on this tab and not collapsed
    if (this.currentTab === tabId && !this.sidebar?.classList.contains('collapsed')) {
      return;
    }

    this.currentTab = tabId;

    // Update nav
    this.sidebar.querySelectorAll('.damkoi-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });

    const content = this.sidebar.querySelector('#damkoi-content');
    content.innerHTML = '';

    const section = document.createElement('div');
    section.className = 'damkoi-section active';
    content.appendChild(section);

    if (!this.data || this.data.notTracked) {
      this.renderNotTracked(section, tabId);
      return;
    }

    switch(tabId) {
      case 'summary': this.renderSummary(section); break;
      case 'history': this.renderHistory(section); break;
      case 'alternatives': this.renderAlternatives(section); break;
      case 'alerts': this.renderAlerts(section); break;
    }
  }

  renderNotTracked(container, tabId) {
    if (tabId === 'history') {
      container.innerHTML = `
        <h3>📈 Price History</h3>
        <p style="margin: 15px 0; color: var(--dk-dim); line-height: 1.5;">
          No price history available yet. We are tracking this item starting today.
        </p>
      `;
    } else if (tabId === 'alternatives') {
      container.innerHTML = `
        <h3>🔍 Alternatives</h3>
        <p style="margin: 15px 0; color: var(--dk-dim); line-height: 1.5;">
          Searching for similar deals... This will populate once our system analyzes the product.
        </p>
      `;
    } else if (tabId === 'alerts') {
      container.innerHTML = `
        <h3>🔔 Price Alerts</h3>
        <p style="margin: 15px 0; color: var(--dk-dim); line-height: 1.5;">
          You can set target price alerts once the initial price data is gathered. Check back soon!
        </p>
      `;
    } else {
      container.innerHTML = `
        <h3>⏳ Getting Started</h3>
        <p style="margin: 15px 0; color: var(--dk-dim); line-height: 1.5;">
          This product is not fully tracked yet. We've added it to our next scrape batch.
        </p>
        <div class="damkoi-card">
          <p style="font-size: 13px; color: var(--dk-text); font-weight: 600;">Check back in about 15-30 minutes for a full price drop history and verdict.</p>
        </div>
      `;
    }
  }

  renderSummary(container) {
    const { verdict, product } = this.data;

    const BADGE_CLASS = {
      FAKE_DISCOUNT:     'verdict-fake',
      BEST_PRICE:        'verdict-best',
      GOOD_DEAL:         'verdict-good',
      FAIR_PRICE:        'verdict-fair',
      INSUFFICIENT_DATA: 'verdict-pending',
    };
    const badgeClass = BADGE_CLASS[verdict.label] || 'verdict-fair';
    
    container.innerHTML = `
      <div class="damkoi-card damkoi-score-card" style="margin-bottom:12px;">
        <div id="damkoi-gauge"></div>
      </div>
      <div class="damkoi-card" style="margin-bottom:12px;">
        <span class="verdict-badge ${badgeClass}">${verdict.display}</span>
        <p style="font-size:11px;color:rgba(226,226,240,0.55);line-height:1.6;margin-top:4px;">${verdict.explanation}</p>
      </div>
      <div class="damkoi-price-grid">
        <div class="damkoi-price-item">
          <div class="damkoi-label">Current Price</div>
          <div class="damkoi-value accent">৳${(product.current_price / 100).toLocaleString('en-BD')}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">30-Day Avg</div>
          <div class="damkoi-value">৳${verdict.avg_30d ? (verdict.avg_30d / 100).toLocaleString('en-BD') : '—'}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">All-Time Low</div>
          <div class="damkoi-value success">৳${verdict.all_time_low ? (verdict.all_time_low / 100).toLocaleString('en-BD') : '—'}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">Confidence</div>
          <div class="damkoi-value">${verdict.data_points || '—'} pts</div>
        </div>
      </div>
    `;
    
    Visualizer.renderDealGauge(verdict.deal_score, 'damkoi-gauge');
  }

  renderHistory(container) {
    container.innerHTML = `
      <h3>📈 Price Trend</h3>
      <p style="font-size: 11px; margin: 4px 0 15px; color: rgba(255,255,255,0.4);">Last 30 data points</p>
      <div id="damkoi-sparkline"></div>
      <div class="damkoi-price-grid">
        <div class="damkoi-price-item">
          <div class="damkoi-label">All-Time Low</div>
          <div class="damkoi-value">৳${(this.data.verdict.all_time_low / 100).toLocaleString()}</div>
          <div style="font-size: 10px; opacity: 0.4;">${this.data.verdict.all_time_low_date}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">Total Points</div>
          <div class="damkoi-value">${this.data.data_points}</div>
        </div>
      </div>
    `;
    
    Visualizer.renderPriceChart(this.data.price_history, 'damkoi-sparkline');
  }

  renderAlternatives(container) {
    container.innerHTML = `<h3>🔍 Look-Alike Deals</h3><div id="damkoi-alternatives-list">Loading...</div>`;

    // Use cached alternatives if available
    if (this.alternativesCache) {
      this.displayAlternatives(container, this.alternativesCache);
    } else {
      this.fetchAlternatives(container);
    }
  }

  async fetchAlternatives(container) {
    const list = container.querySelector('#damkoi-alternatives-list');
    try {
      // Check cache first
      const cacheKey = getCacheKey('alternatives', this.data.product.id);
      const cached = getFromCache(cacheKey);
      if (cached) {
        this.alternativesCache = cached;
        this.displayAlternatives(container, cached);
        return;
      }

      const response = await safeFetch('FETCH_ALTERNATIVES', { productId: this.data.product.id });
      // The API returns { product_id, match_group_id, alternatives: [...] }
      const alts = response.alternatives || [];
      this.alternativesCache = alts;
      // Cache the result
      saveToCache(cacheKey, alts);
      this.displayAlternatives(container, alts);
    } catch (e) {
      list.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Failed to load alternatives.</div>';
    }
  }

  displayAlternatives(container, alts) {
    const list = container.querySelector('#damkoi-alternatives-list');

    // Filter out the current product itself from the alternatives list
    const otherAlts = alts.filter(a => !a.is_original_request);

    if (otherAlts.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--dk-dim);">No cheaper alternatives in this category yet.</div>';
      return;
    }

    // Get current product price to calculate savings
    const currentPrice = this.data.product.current_price;

    list.innerHTML = otherAlts.map((alt, idx) => {
      const savings = currentPrice && alt.current_price ? currentPrice - alt.current_price : 0;
      
      return `
      <div class="damkoi-card" style="margin-bottom:10px;display:flex;gap:12px;cursor:pointer;" data-alt-url="${alt.url}" data-alt-idx="${idx}">
        ${alt.image_url
          ? `<img src="${alt.image_url}" style="width:46px;height:46px;border-radius:8px;object-fit:cover;flex-shrink:0;box-shadow:var(--dk-insetSh);" />`
          : `<img src="${chrome.runtime.getURL('icons/dk_logo.svg')}" style="width:46px;height:46px;border-radius:8px;background:#fff;object-fit:contain;padding:6px;box-shadow:var(--dk-insetSh);flex-shrink:0;" />`
        }
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:var(--dk-accent);">${alt.platform}</span>
          </div>
          <div style="font-size:11px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--dk-text);margin-bottom:4px;">${alt.title}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:800;color:var(--dk-text);">${formatBDT(alt.current_price)}</span>
            ${savings > 0 ? `<span style="font-size:10px;background:rgba(16,185,129,0.1);color:var(--dk-success);padding:2px 7px;border-radius:10px;font-weight:600;">Save ${formatBDT(savings)}</span>` : ''}
          </div>
        </div>
      </div>
    `}).join('');

    list.addEventListener('click', (e) => {
      const card = e.target.closest('[data-alt-url]');
      if (card) window.location.href = card.dataset.altUrl;
    });
  }

  renderAlerts(container) {
    const defaultPrice = Math.floor(this.data.product.current_price / 100 * 0.9);
    const savedEmail = this.alertFormState.email || '';
    const savedPrice = this.alertFormState.price || defaultPrice;

    container.innerHTML = `
      <h3>🔔 Set Price Alert</h3>
      <p style="margin: 8px 0 20px; font-size: 12px; color: rgba(255,255,255,0.4);">
        Get an email the instant this product drops below your target.
      </p>
      <input type="email" id="alert-email" class="damkoi-input" placeholder="Your email address" value="${savedEmail}" />
      <div style="position: relative;">
        <span style="position: absolute; left: 16px; top: 12px; font-weight: 700; color: #a78bfa;">৳</span>
        <input type="number" id="alert-price" class="damkoi-input" style="padding-left: 35px;" placeholder="Target Price" value="${savedPrice}" />
      </div>
      <button class="damkoi-btn" id="save-alert">Update Alert</button>
      <div id="alert-status" class="damkoi-status-pill"></div>
    `;

    // Attach handler only once, remove old handlers first
    const btn = container.querySelector('#save-alert');
    const emailInput = container.querySelector('#alert-email');
    const priceInput = container.querySelector('#alert-price');

    // Remove any existing listeners
    btn.replaceWith(btn.cloneNode(true));
    const newBtn = container.querySelector('#save-alert');

    newBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const targetPrice = priceInput.value.trim();
      const status = container.querySelector('#alert-status');

      // Validate and save state
      if (!isValidEmail(email)) {
        setStatusMessage(status, 'error', 'Enter a valid email address');
        return;
      }

      if (!isValidPrice(targetPrice)) {
        setStatusMessage(status, 'error', 'Enter a valid price');
        return;
      }

      // Save form state
      this.alertFormState = { email, price: targetPrice };

      setStatusMessage(status, 'info', 'Saving...');

      try {
        const payload = createAlertPayload(this.data.product.id, targetPrice, email);
        await safeFetch('CREATE_ALERT', { payload });
        setStatusMessage(status, 'success', `Tracking active!`);
      } catch (e) {
        setStatusMessage(status, 'error', 'Error saving alert');
      }
    });
  }
}

// Global start
const damkoi = new DamKoiExtension();
if (document.readyState === 'complete') {
  damkoi.init();
} else {
  window.addEventListener('load', () => damkoi.init());
}
