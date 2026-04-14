/**
 * DamKoi — Shared Utilities
 * Common functions used across popup and content scripts
 */

// Configuration
export const API_BASE = 'http://localhost:8000/v1';

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

// Cache key generator
export function getCacheKey(type, identifier) {
  return `damkoi:${type}:${identifier}`;
}

// Get from cache
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

// Save to cache
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

// Clear cache for a given URL
export function clearCache(cacheKey) {
  try {
    localStorage.removeItem(cacheKey);
  } catch (e) {
    console.warn('[DamKoi Cache] Failed to clear cache:', e);
  }
}

// Color mapping for deal scores
export function getScoreColor(score) {
  if (score >= 8) return '#10b981';  // Green
  if (score >= 6) return '#f59e0b';  // Amber
  if (score >= 4) return '#ef4444';  // Light Red
  return '#dc2626';                   // Dark Red
}

// Format price in BDT with locale awareness
export function formatBDT(paisa) {
  if (!paisa) return '—';
  const bdt = paisa / 100;
  return `৳${bdt.toLocaleString('en-BD')}`;
}

// Create alert payload for API submission
export function createAlertPayload(productId, targetPrice, email, channels = [DEFAULT_ALERT_CHANNEL]) {
  return {
    product_id: productId,
    target_price: parseInt(targetPrice) * 100,
    email: email.trim(),
    notify_via: channels,
  };
}

// Set status message with consistent styling
export function setStatusMessage(element, type, message) {
  if (!element) return;
  const isSuccess = type === 'success';
  element.textContent = `${isSuccess ? '✅' : '❌'} ${message}`;
  element.style.color = isSuccess ? '#10b981' : '#ef4444';
  element.style.background = isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
}

// Validate email format
export function isValidEmail(email) {
  return email && email.trim().includes('@');
}

// Validate price input
export function isValidPrice(price) {
  const parsed = parseInt(price);
  return !isNaN(parsed) && parsed > 0;
}
