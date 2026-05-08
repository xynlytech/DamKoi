/**
 * DamKoi — Shared Utilities
 * Common functions used across popup and content scripts
 */

// ── API Configuration ─────────────────────────────────────────
//
// These values are injected at build time by esbuild (see build.js).
// In development:   http://localhost:8000/v1
// In production:    https://api.damkoi.com/v1  (or your Render URL)
//
// To build for production: NODE_ENV=production node build.js
//
export const API_BASE       = typeof __API_BASE__       !== 'undefined' ? __API_BASE__       : 'http://127.0.0.1:8000';
export const DASHBOARD_BASE = typeof __DASHBOARD_BASE__ !== 'undefined' ? __DASHBOARD_BASE__ : 'http://127.0.0.1:3000';

/**
 * Proxies API requests through the background script to bypass CORS
 * and Mixed Content (HTTP vs HTTPS) restrictions.
 */
export async function safeFetch(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, ...payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

// Alert notification channels
export const ALERT_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push'
};

// Default alert channel
export const DEFAULT_ALERT_CHANNEL = ALERT_CHANNELS.EMAIL;

// Cache TTL in milliseconds (1 hour)
const CACHE_TTL = 60 * 60 * 1000;

// Maximum number of verdict cache entries to keep
const MAX_VERDICT_CACHE_SIZE = 10;

// Recent verdicts list key
const RECENT_VERDICTS_KEY = 'damkoi:recent-verdicts';

// ── Cache Key Generation ──────────────────────────

export function getCacheKey(type, identifier) {
  return `damkoi:${type}:${identifier}`;
}

// ── Generic Cache Operations ─────────────────────

export function getFromCache(cacheKey) {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    // Return null if cache is older than TTL
    if (age > CACHE_TTL) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data;
  } catch (e) {
    console.warn('[DamKoi Cache] Failed to read cache:', e);
    return null;
  }
}

export function saveToCache(cacheKey, data) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('[DamKoi Cache] Failed to save cache:', e);
  }
}

export function clearCache(cacheKey) {
  try {
    localStorage.removeItem(cacheKey);
  } catch (e) {
    console.warn('[DamKoi Cache] Failed to clear cache:', e);
  }
}

// ── Recent Verdicts Management (Last 10) ─────────

export function getRecentVerdicts() {
  try {
    const data = localStorage.getItem(RECENT_VERDICTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('[DamKoi] Failed to read recent verdicts:', e);
    return [];
  }
}

export function addToRecentVerdicts(verdict) {
  try {
    const recent = getRecentVerdicts();

    // Remove duplicate if exists
    const filtered = recent.filter(v => v.product_id !== verdict.product_id);

    // Add new verdict to front
    const updated = [verdict, ...filtered].slice(0, MAX_VERDICT_CACHE_SIZE);

    localStorage.setItem(RECENT_VERDICTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[DamKoi] Failed to add recent verdict:', e);
  }
}

export function clearRecentVerdicts() {
  try {
    localStorage.removeItem(RECENT_VERDICTS_KEY);
  } catch (e) {
    console.warn('[DamKoi] Failed to clear recent verdicts:', e);
  }
}

// ── Performance Tracking ──────────────────────────

const PERF_KEY = 'damkoi:perf-metrics';

export function recordPerformanceMetric(metricName, duration) {
  try {
    const metrics = JSON.parse(localStorage.getItem(PERF_KEY) || '{}');
    metrics[metricName] = {
      duration,
      timestamp: Date.now()
    };
    localStorage.setItem(PERF_KEY, JSON.stringify(metrics));
  } catch (e) {
    console.warn('[DamKoi Perf] Failed to record metric:', e);
  }
}

export function getPerformanceMetrics() {
  try {
    return JSON.parse(localStorage.getItem(PERF_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

// ── Color mapping for deal scores ──────────────

export function getScoreColor(score) {
  if (score >= 8) return '#10b981';  // Green
  if (score >= 6) return '#f59e0b';  // Amber
  if (score >= 4) return '#ef4444';  // Light Red
  return '#dc2626';                   // Dark Red
}

export function getScoreClass(score) {
  if (score >= 8) return 'score-green';
  if (score >= 6) return 'score-amber';
  return 'score-red';
}

// ── Format price in BDT with locale awareness ──

export function formatBDT(paisa) {
  if (!paisa) return '—';
  const bdt = paisa / 100;
  return `৳${bdt.toLocaleString('en-BD')}`;
}

// ── Create alert payload for API submission ────

export function createAlertPayload(productId, targetPrice, email, channels = [DEFAULT_ALERT_CHANNEL]) {
  return {
    product_id: productId,
    target_price: parseInt(targetPrice) * 100,
    email: email.trim(),
    notify_via: channels,
  };
}

// ── Set status message with consistent styling ─

export function setStatusMessage(element, type, message) {
  if (!element) return;
  const isSuccess = type === 'success';
  const isInfo = type === 'info';

  element.textContent = message;

  // Reset classes
  element.classList.remove('dk-status-success', 'dk-status-error', 'dk-status-info');

  // Add appropriate class
  if (isSuccess) {
    element.classList.add('dk-status-success');
  } else if (isInfo) {
    element.classList.add('dk-status-info');
  } else {
    element.classList.add('dk-status-error');
  }
}

// ── Validate email format ────────────────────────

export function isValidEmail(email) {
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ── Validate price input ──────────────────────────

export function isValidPrice(price) {
  const parsed = parseInt(price);
  return !isNaN(parsed) && parsed > 0;
}

// ── Extract product ID from Daraz URL ──────────

export function extractProductIdFromUrl(url) {
  if (!url) return null;
  // Pattern 1: i{id} followed by -s{sku} or .html
  let match = url.match(/i(\d+)(?:-s\d+)?\.html/);
  if (match) return match[1];

  // Pattern 2: ?itemId= query parameter
  match = url.match(/[?&]itemId=(\d+)/);
  if (match) return match[1];

  // Pattern 3: Fallback — i{id} anywhere in path preceded by - or /
  match = url.match(/[-/]i(\d+)(?:[^\d]|$)/);
  if (match) return match[1];

  return null;
}
