/**
 * DamKoi — Benchmark-Level Extension Content Script
 * 
 * Features:
 * - Sidebar-style overlay
 * - SVG gauges and charts
 * - Tabbed navigation
 * - Real-time alerts integration
 */

import { API_BASE, getScoreColor, formatBDT, createAlertPayload, setStatusMessage, isValidEmail, isValidPrice, getCacheKey, getFromCache, saveToCache, ALERT_CHANNELS, DEFAULT_ALERT_CHANNEL } from './utils.js';
import Visualizer from './visualizer.js';
import { ICONS } from './icons.js';

class DamKoiExtension {
  constructor() {
    this.data = null;
    this.sidebar = null;
    this.currentTab = 'summary';
    this.alternativesCache = null;
    this.alertFormState = {};
  }

  async init() {
    if (!this.isDarazProductPage()) return;
    
    console.log('[DamKoi] Benchmark content script starting...');
    this.data = await this.fetchData(window.location.href);
    this.renderSidebar();
  }

  isDarazProductPage() {
    const { hostname, pathname, href } = window.location;
    return hostname === 'www.daraz.com.bd' && 
           (pathname.includes('/products/') || href.match(/-i\d+-s\d+\.html/));
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

      const resp = await fetch(`${API_BASE}/products/lookup?url=${encodeURIComponent(url)}`);
      if (!resp.ok) return { notTracked: true };

      const data = await resp.json();
      // Cache the result
      saveToCache(cacheKey, data);
      return data;
    } catch (e) {
      console.error('[DamKoi] Fetch failed:', e);
      return null;
    }
  }

  renderSidebar() {
    if (this.sidebar) this.sidebar.remove();
    
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'damkoi-sidebar';
    
    this.sidebar.innerHTML = `
      <nav class="damkoi-nav">
        <div class="damkoi-nav-logo" style="margin-bottom: 20px; opacity: 0.8;">🛒</div>
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
        <div id="damkoi-content"></div>
      </main>
    `;

    document.body.appendChild(this.sidebar);
    this.setupEvents();
    this.switchTab('summary');
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
      this.renderNotTracked(section);
      return;
    }

    switch(tabId) {
      case 'summary': this.renderSummary(section); break;
      case 'history': this.renderHistory(section); break;
      case 'alternatives': this.renderAlternatives(section); break;
      case 'alerts': this.renderAlerts(section); break;
    }
  }

  renderNotTracked(container) {
    container.innerHTML = `
      <h3>⏳ Getting Started</h3>
      <p style="margin: 15px 0; color: rgba(255,255,255,0.4);">
        This product is not fully tracked yet. We've added it to our next scrape batch.
      </p>
      <div class="damkoi-card">
        <p style="font-size: 13px;">Check back in about 15-30 minutes for a full price drop history and verdict.</p>
      </div>
    `;
  }

  renderSummary(container) {
    const { verdict, product } = this.data;
    
    container.innerHTML = `
      <div class="damkoi-summary-row">
        <div class="damkoi-card damkoi-score-card">
          <div id="damkoi-gauge"></div>
        </div>
      </div>
      <div class="damkoi-card" style="margin-bottom: 20px;">
        <h4 style="margin-bottom: 8px;">Verdict: ${verdict.display}</h4>
        <p style="font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.5;">${verdict.explanation}</p>
      </div>
      <div class="damkoi-price-grid">
        <div class="damkoi-price-item">
          <div class="damkoi-label">Current</div>
          <div class="damkoi-value">৳${(product.current_price / 100).toLocaleString()}</div>
        </div>
        <div class="damkoi-price-item">
          <div class="damkoi-label">30d Avg</div>
          <div class="damkoi-value">৳${(verdict.avg_30d / 100).toLocaleString()}</div>
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

      const resp = await fetch(`${API_BASE}/products/${this.data.product.id}/alternatives`);
      if (!resp.ok) throw new Error('Failed');

      const alts = await resp.json();
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

    if (!alts || alts.length === 0) {
      list.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.4;">No cheaper alternatives found in this category yet.</div>';
      return;
    }

    list.innerHTML = alts.map((alt, idx) => `
      <div class="damkoi-card" style="margin-bottom: 12px; display: flex; gap: 12px; cursor: pointer;" data-alt-url="${alt.url}" data-alt-idx="${idx}">
        ${alt.image_url ? `<img src="${alt.image_url}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" />` : ''}
        <div style="flex: 1;">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${alt.title}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; font-weight: 700; color: #a78bfa;">${formatBDT(alt.current_price)}</span>
            <span style="font-size: 10px; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 2px 6px; border-radius: 4px;">Save ${formatBDT(alt.savings)}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Use event delegation instead of inline onclick
    list.addEventListener('click', (e) => {
      const card = e.target.closest('[data-alt-url]');
      if (card) {
        window.location.href = card.dataset.altUrl;
      }
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
        const resp = await fetch(`${API_BASE}/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (resp.ok) {
          setStatusMessage(status, 'success', `Tracking active!`);
        } else {
          throw new Error('Failed');
        }
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
