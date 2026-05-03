/**
 * DamKoi — Daraz Cart Page Detector
 *
 * Injected on Daraz checkout pages. Detects when the user is on a cart/checkout
 * page, extracts the cart total, and signals the coupon injector.
 */

import { getFromStorage } from './storage.js';
import { runCouponInjector } from './coupon_injector.js';

const CART_URL_PATTERN = /\/(checkout|cart)\//i;
const CART_TOTAL_SELECTORS = [
  '[data-spm="totalPrice"]',
  '.checkout-order-summary__price--total',
  '.cart-summary__total',
  '#cart-total',
  '[class*="totalPrice"]',
  '[class*="orderTotal"]',
];

function extractCartTotal() {
  for (const selector of CART_TOTAL_SELECTORS) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const raw = el.textContent.replace(/[^\d.]/g, '');
    const taka = parseFloat(raw);
    if (!isNaN(taka) && taka > 0) {
      return Math.round(taka * 100); // convert to paisa
    }
  }
  return null;
}

function isCheckoutPage() {
  return CART_URL_PATTERN.test(window.location.pathname);
}

async function onCartPageDetected() {
  const pref = await getFromStorage('coupon_optin');
  if (pref === 'no') return;

  const cartTotal = extractCartTotal();

  if (pref === 'yes' || pref === 'always') {
    // Auto-apply without asking
    await runCouponInjector('daraz', cartTotal);
  } else {
    // Prompt not yet shown — signal background to show opt-in modal via popup
    chrome.runtime.sendMessage({
      type: 'CART_DETECTED',
      platform: 'daraz',
      cartTotal,
      url: window.location.href,
    });
  }
}

function init() {
  if (!isCheckoutPage()) return;

  // Fire immediately if DOM is ready, else wait for it
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onCartPageDetected, { once: true });
  } else {
    onCartPageDetected();
  }

  // Also watch for SPA navigation (Daraz is a React SPA)
  let lastPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      if (isCheckoutPage()) onCartPageDetected();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

init();
