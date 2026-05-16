/**
 * DamKoi — Chrome Extension Content Script
 *
 * 6-tab sidebar: Price History, LookALike, Coupons, Alerts, Recent Views, Settings
 */

import {
  safeFetch, formatBDT, createAlertPayload, setStatusMessage,
  isValidEmail, isValidPrice, getCacheKey, getFromCache, saveToCache,
  saveRecentView, getRecentViews, clearRecentViews,
  isRecentViewsEnabled, setRecentViewsEnabled,
  getCouponVotes, voteCoupon,
  getSavedEmail, setSavedEmail,
  getAutoApply, setAutoApply,
  getHorizonRecommendation,
} from './utils.js';
import Visualizer from './visualizer.js';
import { ICONS } from './icons.js';
import { injectWidget } from './inline_widget.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 8) return '#10b981';
  if (score >= 6) return '#f59e0b';
  if (score >= 4) return '#ef4444';
  return '#dc2626';
}

// ── Main Class ────────────────────────────────────────────────────────────────

class DamKoiExtension {
  constructor() {
    this.data             = null;
    this.sidebar          = null;
    this.currentTab       = 'priceHistory';
    this.alternativesCache = null;
    this.alertFormState   = {};
    this._sidebarRange    = '1M';
    this._sidebarHorizon  = 'days';
    this._paymentMethod   = null;
  }

  async init() {
    this.platform = this.detectPlatform();
    if (!this.platform) return;

    if (this.platform === 'daraz-checkout' || this.platform === 'pickaboo-checkout') {
      this.initCouponMagic();
      return;
    }

    this.data = await this.fetchData(window.location.href);

    if (this.data && !this.data.notTracked) {
      await this.enrichPriceHistory();
      injectWidget(this.data);
      saveRecentView(this.data.product, this.data.verdict).catch(() => {});
    }

    this.renderSidebar();
  }

  async enrichPriceHistory() {
    if (!this.data?.product?.id) return;
    try {
      const h = await safeFetch('FETCH_HISTORY', { productId: this.data.product.id, days: 180 });
      this.data.price_history = h.prices || [];
    } catch (e) {
      this.data.price_history = [];
    }
  }

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
      if (href.includes('pickaboo.com/checkout/')) return 'pickaboo-checkout';
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
      const cacheKey = getCacheKey('product', url);
      const cached = getFromCache(cacheKey);
      if (cached?.product && cached?.verdict) return cached;

      const data = await safeFetch('FETCH_VERDICT', { url });
      saveToCache(cacheKey, data);
      return data;
    } catch (e) {
      const is404 = e.message?.startsWith('404');
      return { notTracked: true, connectionError: !is404 };
    }
  }

  // ── Sidebar Shell ──────────────────────────────────────────────────────────

  renderSidebar() {
    if (this.sidebar) this.sidebar.remove();

    this.sidebar = document.createElement('div');
    this.sidebar.id = 'damkoi-sidebar';

    this.sidebar.innerHTML = `
      <nav class="damkoi-nav">
        <img src="${chrome.runtime.getURL('icons/dk_logo.svg')}" style="width:28px;height:28px;margin-bottom:20px;opacity:0.9;" />
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

    if (this.data) this.switchTab('priceHistory');
  }

  setupEvents() {
    this.sidebar.querySelector('.damkoi-close').onclick = () => {
      this.sidebar.classList.toggle('collapsed');
    };

    this.sidebar.querySelectorAll('.damkoi-nav-item').forEach(item => {
      item.onclick = () => {
        const wasCollapsed = this.sidebar.classList.contains('collapsed');
        if (wasCollapsed) this.sidebar.classList.remove('collapsed');
        this.switchTab(item.dataset.tab);
      };
    });
  }

  switchTab(tabId) {
    if (this.currentTab === tabId && !this.sidebar?.classList.contains('collapsed')) return;
    this.currentTab = tabId;

    this.sidebar.querySelectorAll('.damkoi-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });

    const content = this.sidebar.querySelector('#damkoi-content');
    content.innerHTML = '';
    const section = document.createElement('div');
    section.className = 'damkoi-section active';
    content.appendChild(section);

    // These tabs always work regardless of tracking status
    if (tabId === 'recentViews') { this.renderRecentViews(section); return; }
    if (tabId === 'settings')    { this.renderSettings(section); return; }

    if (!this.data || this.data.notTracked) {
      if (tabId === 'coupons') { this.renderCoupons(section); return; }
      this.renderNotTracked(section, tabId);
      return;
    }

    switch (tabId) {
      case 'priceHistory': this.renderPriceHistory(section); break;
      case 'lookalike':    this.renderLookAlike(section);    break;
      case 'coupons':      this.renderCoupons(section);      break;
      case 'alerts':       this.renderAlerts(section);       break;
    }
  }

  renderNotTracked(container, tabId) {
    const WEB = 'https://damkoi.xynly.com';
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
          <p class="dk-es-desc">DamKoi API is temporarily offline. Your internet is fine — this is on our end.</p>
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

    if (tabId === 'priceHistory') {
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
          <p class="dk-nt-desc">First price data arrives within <strong>15–30 minutes</strong>. Check back or get notified below.</p>
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
      lookalike:  { icon: ICONS.lookalike,   title: 'LookALike Deals', desc: 'We\'ll surface similar products once our system indexes this item.' },
      coupons:    { icon: ICONS.coupons,     title: 'Coupons',         desc: 'Platform-wide coupons may still be available once tracking starts.' },
      alerts:     { icon: ICONS.alerts,      title: 'Price Alerts',    desc: 'Set alerts once we collect the first price point. Almost there!' },
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
      FAKE_DISCOUNT:     'verdict-fake',
      BEST_PRICE:        'verdict-best',
      GOOD_DEAL:         'verdict-good',
      FAIR_PRICE:        'verdict-fair',
      INSUFFICIENT_DATA: 'verdict-pending',
    };
    const badgeClass = BADGE_CLASS[verdict.label] || 'verdict-fair';
    const dataPoints = verdict.data_points || this.data.price_history?.length || 0;

    container.innerHTML = `
      ${dataPoints > 0 ? `<div class="dk-social-proof">Based on ${dataPoints} price recordings for this product</div>` : ''}

      <div class="damkoi-card" style="margin-bottom:12px;">
        <div id="damkoi-gauge"></div>
        <span class="verdict-badge ${badgeClass}" style="margin-top:12px;">${verdict.display}</span>
        <p style="font-size:11px;color:var(--dk-dim);line-height:1.6;margin-top:6px;">${verdict.explanation}</p>
      </div>

      <div class="damkoi-price-grid" style="margin-bottom:16px;">
        <div class="damkoi-price-item">
          <div class="damkoi-label">Current</div>
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
          <div class="damkoi-label">Data Points</div>
          <div class="damkoi-value">${dataPoints || '—'}</div>
        </div>
      </div>

      <div class="dk-range-tabs">
        ${['1M','3M','6M','ALL'].map(r => `<button class="dk-range-tab ${r === this._sidebarRange ? 'active' : ''}" data-range="${r}">${r}</button>`).join('')}
      </div>
      <div class="damkoi-chart-container" style="padding:8px;margin-bottom:16px;">
        <div id="damkoi-sparkline"></div>
      </div>

      <div class="dk-divider"></div>

      <div class="dk-horizon-section">
        <div class="dk-section-label">Should you buy now?</div>
        <div class="dk-horizon-tabs">
          <button class="dk-horizon-tab ${this._sidebarHorizon==='days'  ? 'active':''}" data-horizon="days">2-3 Days</button>
          <button class="dk-horizon-tab ${this._sidebarHorizon==='week'  ? 'active':''}" data-horizon="week">1 Week</button>
          <button class="dk-horizon-tab ${this._sidebarHorizon==='month' ? 'active':''}" data-horizon="month">1 Month</button>
        </div>
        <div id="dk-horizon-rec"></div>
      </div>
    `;

    Visualizer.renderDealGauge(verdict.deal_score, 'damkoi-gauge');
    this._renderSidebarChart(container);
    this._wireChartTabs(container);
    this._wireHorizonTabs(container);
  }

  _filterByRange(range) {
    const prices = this.data.price_history || [];
    if (range === 'ALL') return prices;
    const days = { '1M': 30, '3M': 90, '6M': 180 }[range] || 30;
    const cutoff = Date.now() - days * 86400000;
    const filtered = prices.filter(p => {
      const ts = new Date(p.date || p.recorded_at || p.timestamp || 0).getTime();
      return ts >= cutoff;
    });
    return filtered.length >= 3 ? filtered : prices.slice(-Math.min(prices.length, 30));
  }

  _renderSidebarChart(container) {
    const filtered = this._filterByRange(this._sidebarRange);
    Visualizer.renderPriceChart(filtered, 'damkoi-sparkline');
  }

  _wireChartTabs(container) {
    container.querySelectorAll('.dk-range-tab').forEach(tab => {
      tab.onclick = () => {
        container.querySelectorAll('.dk-range-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._sidebarRange = tab.dataset.range;
        this._renderSidebarChart(container);
      };
    });
  }

  _wireHorizonTabs(container) {
    const recEl = container.querySelector('#dk-horizon-rec');
    if (recEl) recEl.innerHTML = this._buildHorizonRecHtml(this._sidebarHorizon);

    container.querySelectorAll('.dk-horizon-tab').forEach(tab => {
      tab.onclick = () => {
        container.querySelectorAll('.dk-horizon-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._sidebarHorizon = tab.dataset.horizon;
        const rec = container.querySelector('#dk-horizon-rec');
        if (rec) rec.innerHTML = this._buildHorizonRecHtml(this._sidebarHorizon);
      };
    });
  }

  _buildHorizonRecHtml(horizon) {
    const { verdict, product } = this.data;
    const rec = getHorizonRecommendation(horizon, verdict, product);
    const colorMap = { buy: '#22c55e', wait: '#f59e0b', neutral: '#a78bfa' };
    const color = colorMap[rec.action] || '#a78bfa';
    const label = { buy: 'BUY NOW', wait: 'WAIT', neutral: 'NEUTRAL' }[rec.action] || rec.action.toUpperCase();
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

    const altsEl    = container.querySelector('#dk-alts-list');
    const compareEl = container.querySelector('#dk-compare-section');
    const compareList = container.querySelector('#dk-compare-list');

    // Fetch alternatives
    try {
      const cacheKey = getCacheKey('alternatives', this.data.product.id);
      let alts = getFromCache(cacheKey);
      if (!alts) {
        const resp = await safeFetch('FETCH_ALTERNATIVES', { productId: this.data.product.id });
        alts = resp.alternatives || [];
        saveToCache(cacheKey, alts);
      }
      this.alternativesCache = alts;
      this._displayAlts(altsEl, alts);
    } catch (e) {
      altsEl.innerHTML = '<div class="dk-empty-state">Could not load alternatives.</div>';
    }

    // Fetch cross-platform compare (non-blocking)
    try {
      const resp = await safeFetch('FETCH_COMPARE', { productId: this.data.product.id });
      const comparisons = (resp.comparisons || resp.platforms || (Array.isArray(resp) ? resp : []));
      const filtered = comparisons.filter(c => c.platform !== this.platform);
      if (filtered.length) {
        compareEl.style.display = '';
        compareList.innerHTML = filtered.map(c => `
          <div class="damkoi-card" style="margin-bottom:8px;display:flex;align-items:center;gap:10px;">
            <span class="dk-platform-badge">${c.platform}</span>
            <div style="flex:1;font-size:11px;color:var(--dk-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.title || ''}</div>
            <span style="font-size:13px;font-weight:800;">${formatBDT(c.current_price)}</span>
            <a href="${c.url}" target="_blank" rel="noopener" style="color:var(--dk-accent);font-size:10px;white-space:nowrap;text-decoration:none;">View</a>
          </div>
        `).join('');
      }
    } catch (e) {
      // cross-platform compare not critical
    }
  }

  _displayAlts(listEl, alts) {
    const otherAlts = alts.filter(a => !a.is_original_request);
    if (!otherAlts.length) {
      listEl.innerHTML = '<div class="dk-empty-state">No cheaper alternatives in this category yet.</div>';
      return;
    }
    const currentPrice = this.data.product.current_price;
    listEl.innerHTML = otherAlts.map(alt => {
      const savings = currentPrice && alt.current_price ? currentPrice - alt.current_price : 0;
      return `
        <div class="damkoi-card" style="margin-bottom:10px;display:flex;gap:12px;cursor:pointer;" data-alt-url="${alt.url}">
          ${alt.image_url
            ? `<img src="${alt.image_url}" style="width:46px;height:46px;border-radius:8px;object-fit:cover;flex-shrink:0;" />`
            : `<div style="width:46px;height:46px;border-radius:8px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--dk-dim);">${ICONS.lookalike}</div>`
          }
          <div style="flex:1;min-width:0;">
            <span class="dk-platform-badge">${alt.platform}</span>
            <div style="font-size:11px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--dk-text);margin-bottom:4px;">${alt.title}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;font-weight:800;">${formatBDT(alt.current_price)}</span>
              ${savings > 0 ? `<span class="dk-save-badge">Save ${formatBDT(savings)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    listEl.addEventListener('click', e => {
      const card = e.target.closest('[data-alt-url]');
      if (card) window.open(card.dataset.altUrl, '_blank');
    });
  }

  // ── Tab: Coupons ───────────────────────────────────────────────────────────

  async renderCoupons(container) {
    const platform = this.platform || 'daraz';
    const productId = this.data?.product?.id;

    container.innerHTML = `
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${ICONS.coupons}</span> Coupons & Deals</h3>
      <p style="font-size:11px;color:var(--dk-dim);margin:0 0 14px;">Copy & paste at checkout for instant savings.</p>
      <div id="dk-coupon-list"><div class="dk-loading">Loading coupons...</div></div>
    `;

    const listEl = container.querySelector('#dk-coupon-list');

    try {
      const [prodResult, platResult] = await Promise.allSettled([
        productId ? safeFetch('FETCH_PRODUCT_COUPONS', { productId }) : Promise.resolve([]),
        safeFetch('FETCH_COUPONS', { platform }),
      ]);

      const prodCoupons = (prodResult.status === 'fulfilled' ? (prodResult.value || []) : []);
      const platCoupons = (platResult.status === 'fulfilled' ? (platResult.value || []) : []);

      // Deduplicate by code
      const seen = new Set();
      const coupons = [...prodCoupons, ...platCoupons].filter(c => {
        if (seen.has(c.code)) return false;
        seen.add(c.code);
        return true;
      });

      if (!coupons.length) {
        listEl.innerHTML = '<div class="dk-empty-state">No coupons available right now.</div>';
        return;
      }

      const votes = await getCouponVotes();

      listEl.innerHTML = coupons.map(c => {
        const id = c.id || c.code;
        const upActive   = votes[id] === true  ? 'active' : '';
        const downActive = votes[id] === false ? 'active' : '';
        const discount = c.discount_label || (c.discount_percent ? `-${c.discount_percent}%` : '') || (c.max_discount ? `Up to ৳${(c.max_discount/100).toLocaleString('en-BD')}` : '');
        return `
          <div class="dk-coupon-card" data-coupon-id="${id}">
            <div class="dk-coupon-top">
              <span class="dk-coupon-code">${c.code}</span>
              ${discount ? `<span class="dk-coupon-discount">${discount}</span>` : ''}
              <button class="dk-coupon-copy" data-code="${c.code}" title="Copy code">${ICONS.copy}</button>
            </div>
            ${c.description ? `<p class="dk-coupon-desc">${c.description}</p>` : ''}
            <div class="dk-coupon-footer">
              <div class="dk-coupon-votes">
                <button class="dk-vote-btn dk-vote-up ${upActive}" data-id="${id}" data-val="up">${ICONS.thumbsUp} <span>${c.upvotes || 0}</span></button>
                <button class="dk-vote-btn dk-vote-down ${downActive}" data-id="${id}" data-val="down">${ICONS.thumbsDown} <span>${c.downvotes || 0}</span></button>
              </div>
              ${c.category ? `<span class="dk-coupon-cat">${c.category}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Wire copy buttons
      listEl.querySelectorAll('.dk-coupon-copy').forEach(btn => {
        btn.onclick = () => {
          navigator.clipboard.writeText(btn.dataset.code).then(() => {
            btn.innerHTML = ICONS.check;
            btn.style.color = '#22c55e';
            setTimeout(() => { btn.innerHTML = ICONS.copy; btn.style.color = ''; }, 2000);
          }).catch(() => {});
        };
      });

      // Wire vote buttons
      listEl.querySelectorAll('.dk-vote-btn').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.id;
          const helpful = btn.dataset.val === 'up';
          await voteCoupon(id, helpful);
          const card = btn.closest('.dk-coupon-card');
          card.querySelectorAll('.dk-vote-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        };
      });
    } catch (e) {
      listEl.innerHTML = '<div class="dk-empty-state" style="color:var(--dk-danger)">Failed to load coupons.</div>';
    }
  }

  // ── Tab: Alerts ────────────────────────────────────────────────────────────

  async renderAlerts(container) {
    const savedEmail  = this.alertFormState.email || await getSavedEmail();
    const defaultPrice = this.data?.product?.current_price
      ? Math.floor(this.data.product.current_price / 100 * 0.9)
      : '';

    container.innerHTML = `
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${ICONS.alerts}</span> Price Alert</h3>
      <div class="damkoi-card" style="margin-bottom:16px;">
        <p style="font-size:12px;color:var(--dk-dim);margin:0 0 12px;">Get notified the instant this product drops below your target.</p>
        <input type="email" id="alert-email" class="damkoi-input" placeholder="Your email address" value="${savedEmail}" />
        <div style="position:relative;">
          <span style="position:absolute;left:16px;top:12px;font-weight:700;color:var(--dk-accent);">৳</span>
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
      container.querySelector('#dk-existing-alerts').innerHTML =
        '<div class="dk-empty-state">Enter your email above to see your alerts.</div>';
    }

    const emailInput = container.querySelector('#alert-email');
    const priceInput = container.querySelector('#alert-price');
    const btn        = container.querySelector('#save-alert');
    const status     = container.querySelector('#alert-status');

    btn.onclick = async () => {
      const email = emailInput.value.trim();
      const targetPrice = priceInput.value.trim();
      if (!isValidEmail(email))  { setStatusMessage(status, 'error', 'Enter valid email'); return; }
      if (!isValidPrice(targetPrice)) { setStatusMessage(status, 'error', 'Enter valid price'); return; }
      this.alertFormState = { email, price: targetPrice };
      await setSavedEmail(email);
      setStatusMessage(status, 'info', 'Saving...');
      try {
        const payload = createAlertPayload(this.data.product.id, targetPrice, email);
        await safeFetch('CREATE_ALERT', { payload });
        setStatusMessage(status, 'success', 'Alert set!');
        this._loadExistingAlerts(container, email);
      } catch (e) {
        setStatusMessage(status, 'error', 'Error saving alert');
      }
    };

    emailInput.addEventListener('blur', () => {
      const email = emailInput.value.trim();
      if (isValidEmail(email)) this._loadExistingAlerts(container, email);
    });
  }

  async _loadExistingAlerts(container, email) {
    const el = container.querySelector('#dk-existing-alerts');
    if (!el) return;
    try {
      const alerts = await safeFetch('GET_ALERTS_BY_EMAIL', { email });
      if (!alerts || alerts.length === 0) {
        el.innerHTML = '<div class="dk-empty-state">No active alerts for this email.</div>';
        return;
      }
      el.innerHTML = alerts.map(a => `
        <div class="damkoi-card" style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="min-width:0;flex:1;">
              <div style="font-size:10px;color:var(--dk-dim);margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.product_title || 'Product'}</div>
              <div style="font-size:13px;font-weight:700;">Target: ${formatBDT(a.target_price)}</div>
            </div>
            <span class="dk-alert-badge ${a.is_active ? 'active' : 'inactive'}">${a.is_active ? 'Active' : 'Paused'}</span>
          </div>
        </div>
      `).join('');
    } catch (e) {
      el.innerHTML = '<div class="dk-empty-state">Could not load alerts.</div>';
    }
  }

  // ── Tab: Recent Views ──────────────────────────────────────────────────────

  async renderRecentViews(container) {
    const enabled = await isRecentViewsEnabled();
    const views   = enabled ? await getRecentViews() : [];

    container.innerHTML = `
      <h3 style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:16px;display:inline-block;">${ICONS.recentViews}</span> Recent Views</h3>
      <div class="dk-privacy-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        History stays on your device. Never shared.
      </div>
      <div class="dk-settings-row" style="margin-bottom:16px;">
        <span style="font-size:12px;color:var(--dk-muted);">Remember recent views</span>
        <label class="dk-toggle">
          <input type="checkbox" id="dk-views-toggle" ${enabled ? 'checked' : ''}>
          <span class="dk-toggle-slider"></span>
        </label>
      </div>
      ${views.length ? `
        <div class="dk-rv-grid" id="dk-rv-grid">
          ${views.map(v => `
            <div class="dk-rv-card" data-url="${v.url}">
              <div class="dk-rv-img-wrap">
                ${v.image_url
                  ? `<img src="${v.image_url}" class="dk-rv-img" />`
                  : `<div class="dk-rv-img-placeholder">${ICONS.history}</div>`
                }
                ${v.deal_score != null ? `<span class="dk-rv-score" style="background:${scoreColor(v.deal_score)}">${v.deal_score}</span>` : ''}
              </div>
              <div class="dk-rv-info">
                <div class="dk-rv-title">${v.title}</div>
                <div class="dk-rv-meta">
                  <span class="dk-platform-badge">${v.platform}</span>
                  <span class="dk-rv-price">${formatBDT(v.price)}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="dk-ghost-btn" id="dk-clear-views" style="margin-top:12px;width:100%;">Clear History</button>
      ` : `<div class="dk-empty-state">${enabled ? 'No products viewed yet.' : 'Enable above to track viewed products.'}</div>`}
    `;

    container.querySelector('#dk-views-toggle').onchange = async (e) => {
      await setRecentViewsEnabled(e.target.checked);
      this.renderRecentViews(container);
    };

    const clearBtn = container.querySelector('#dk-clear-views');
    if (clearBtn) clearBtn.onclick = async () => {
      await clearRecentViews();
      this.renderRecentViews(container);
    };

    const grid = container.querySelector('#dk-rv-grid');
    if (grid) grid.addEventListener('click', e => {
      const card = e.target.closest('[data-url]');
      if (card) window.open(card.dataset.url, '_blank');
    });
  }

  // ── Tab: Settings ──────────────────────────────────────────────────────────

  async renderSettings(container) {
    const email     = await getSavedEmail();
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
              <input type="checkbox" id="settings-auto-apply" ${autoApply ? 'checked' : ''}>
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
        DamKoi v2.1.0 · Made in Bangladesh
      </div>
    `;

    const emailInput   = container.querySelector('#settings-email');
    const emailStatus  = container.querySelector('#settings-email-status');
    const cacheStatus  = container.querySelector('#settings-cache-status');

    container.querySelector('#settings-save-email').onclick = async () => {
      const val = emailInput.value.trim();
      if (!isValidEmail(val)) {
        emailStatus.textContent = 'Invalid email';
        emailStatus.style.color = '#ef4444';
        return;
      }
      await setSavedEmail(val);
      this.alertFormState.email = val;
      emailStatus.textContent = 'Saved!';
      emailStatus.style.color = '#22c55e';
      setTimeout(() => emailStatus.textContent = '', 2000);
    };

    container.querySelector('#settings-auto-apply').onchange = async (e) => {
      await setAutoApply(e.target.checked);
    };

    container.querySelector('#settings-clear-cache').onclick = () => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('damkoi:'));
      keys.forEach(k => localStorage.removeItem(k));
      cacheStatus.textContent = `Cleared ${keys.length} cached item${keys.length !== 1 ? 's' : ''}`;
      cacheStatus.style.color = '#22c55e';
      setTimeout(() => cacheStatus.textContent = '', 3000);
    };
  }

  // ── Checkout Coupon Magic ──────────────────────────────────────────────────

  detectPaymentMethod() {
    const METHODS = ['bkash', 'nagad', 'rocket', 'upay', 'tap', 'card', 'cod'];
    const scan = () => {
      const candidates = [
        ...document.querySelectorAll('[class*="payment"][class*="active"], [class*="payment"][class*="selected"], [class*="cashier"][class*="active"], [aria-checked="true"][class*="payment"]'),
        ...document.querySelectorAll('.cashier-active, .payment-method-active, .pay-method--active'),
      ];
      for (const el of candidates) {
        const text = (el.textContent || '').toLowerCase();
        const imgAlt = [...el.querySelectorAll('img')].map(i => (i.alt || '').toLowerCase()).join(' ');
        const combined = text + ' ' + imgAlt;
        for (const m of METHODS) {
          if (combined.includes(m)) return m;
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
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-checked'] });

    document.addEventListener('click', (e) => {
      const target = e.target.closest('[class*="payment"], [class*="cashier"], [class*="pay-method"]');
      if (!target) return;
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
    const label = document.getElementById('dk-payment-label');
    if (!label) return;
    const pm = this._paymentMethod;
    if (pm) {
      const NAME = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', upay: 'Upay', card: 'Card', cod: 'Cash on Delivery' };
      label.textContent = `Showing ${NAME[pm] || pm} codes`;
      label.style.color = pm === 'bkash' ? '#e91e8c' : pm === 'nagad' ? '#f97316' : '#a78bfa';
    } else {
      label.textContent = 'Showing all codes';
      label.style.color = 'rgba(255,255,255,0.4)';
    }
  }

  async initCouponMagic() {
    this._paymentMethod = null;
    this.detectPaymentMethod();

    const widget = document.createElement('div');
    widget.id = 'damkoi-coupon-widget';
    widget.innerHTML = `
      <div style="background: rgba(10,10,12,0.95); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 16px; width: 300px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); backdrop-filter: blur(12px); color: white; font-family: system-ui, sans-serif; z-index: 999999; position: fixed; bottom: 20px; right: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${chrome.runtime.getURL('icons/dk_logo.svg')}" style="width: 20px; height: 20px;" />
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

    document.getElementById('dk-apply-btn').onclick = async () => {
      const btn = document.getElementById('dk-apply-btn');
      btn.innerText = 'Testing Coupons...';
      btn.style.background = '#4f46e5';
      btn.style.opacity = '0.7';
      btn.disabled = true;

      try {
        const isDaraz = window.location.hostname.includes('daraz');
        const coupons = await safeFetch('FETCH_COUPONS', {
          platform: isDaraz ? 'daraz' : 'pickaboo',
          paymentMethod: this._paymentMethod || undefined,
        });
        if (!coupons || coupons.length === 0) {
          btn.innerText = 'No valid coupons found';
          btn.disabled = false;
          return;
        }

        const inputSelector = isDaraz
          ? 'input[placeholder*="oupon" i], input[name*="coupon" i], .next-input.next-medium input'
          : 'input[placeholder*="oupon" i], input[name*="coupon" i], .coupon-input input, #coupon-code';
        const applyBtnSelector = isDaraz
          ? 'button[data-spm*="coupon"], .next-btn.next-btn-primary.next-btn-medium, button[class*="couponApply"]'
          : 'button[class*="coupon"], .apply-coupon-btn, button[id*="couponApply"]';
        const discountSelector = isDaraz
          ? '.checkout-order-total-discount, [class*="discount"][class*="total"], [class*="coupon"][class*="discount"]'
          : '.order-summary .discount-amount, [class*="discount-amount"]';

        let bestDiscount = 0;
        let bestCode = null;

        for (let i = 0; i < coupons.length; i++) {
          const c = coupons[i];
          btn.innerText = `Testing ${c.code} (${i + 1}/${coupons.length})`;

          const input    = document.querySelector(inputSelector);
          const applyBtn = document.querySelector(applyBtnSelector);

          if (input && applyBtn) {
            input.value = c.code;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            applyBtn.click();
            await new Promise(r => setTimeout(r, 2000));

            const discountLine = document.querySelector(discountSelector);
            if (discountLine) {
              const match = discountLine.innerText.match(/[\d,]+/);
              if (match) {
                const val = parseInt(match[0].replace(/,/g, ''));
                if (val > bestDiscount) { bestDiscount = val; bestCode = c.code; }
              }
            }
          }
        }

        if (bestCode) {
          btn.innerText = `Applying best: ${bestCode}`;
          const input    = document.querySelector(inputSelector);
          const applyBtn = document.querySelector(applyBtnSelector);
          if (input && applyBtn) {
            input.value = bestCode;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            applyBtn.click();
            await new Promise(r => setTimeout(r, 1000));
          }
          btn.innerText = `Saved ৳${bestDiscount.toLocaleString('en-BD')}!`;
          btn.style.background = '#10b981';
          btn.disabled = false;
        } else {
          btn.innerText = 'No coupons worked';
          btn.style.background = '#3f3f46';
          btn.disabled = false;
        }
      } catch (e) {
        console.error('[DamKoi]', e);
        btn.innerText = 'Error trying coupons';
        btn.disabled = false;
      }
    };
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────────

const damkoi = new DamKoiExtension();
if (document.readyState === 'complete') {
  damkoi.init();
} else {
  window.addEventListener('load', () => damkoi.init());
}
