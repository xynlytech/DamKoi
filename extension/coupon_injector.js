/**
 * DamKoi — Coupon Auto-Apply
 *
 * Called by cart_detector when the user reaches a Daraz checkout page
 * and has opted in. Fetches the best coupon, injects it into the coupon
 * input field, and monitors the DOM for success/failure.
 */

import { safeFetch } from './utils.js';

const COUPON_INPUT_SELECTORS = [
  'input[placeholder*="oupon" i]',
  'input[name*="coupon" i]',
  'input[id*="coupon" i]',
  '[data-spm*="coupon"] input',
  '.coupon-input input',
  '#coupon-code',
];

const APPLY_BTN_SELECTORS = [
  'button[data-spm*="coupon"]',
  'button[class*="coupon"]',
  '.coupon-apply button',
  'button[id*="couponApply"]',
];

const SUCCESS_INDICATORS = [
  '[class*="couponSuccess"]',
  '[class*="discount-applied"]',
  '.coupon-success',
  '[data-spm*="couponSuccess"]',
];

const FAILURE_INDICATORS = [
  '[class*="couponError"]',
  '[class*="coupon-invalid"]',
  '.coupon-error',
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function findElement(selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}

function waitForSuccess(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const interval = setInterval(() => {
      if (findElement(SUCCESS_INDICATORS)) {
        clearInterval(interval);
        resolve(true);
        return;
      }
      if (findElement(FAILURE_INDICATORS) || Date.now() > deadline) {
        clearInterval(interval);
        resolve(false);
      }
    }, 200);
  });
}

function showToast(message, type = 'success') {
  const existing = document.getElementById('damkoi-coupon-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'damkoi-coupon-toast';
  toast.style.cssText = `
    position: fixed; bottom: 80px; right: 20px; z-index: 999999;
    background: ${type === 'success' ? '#10b981' : '#6366f1'};
    color: white; padding: 12px 18px; border-radius: 12px;
    font-family: sans-serif; font-size: 13px; font-weight: 700;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: damkoi-slide-in 0.3s ease;
  `;
  toast.textContent = message;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes damkoi-slide-in {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function showCopyFallback(code) {
  const existing = document.getElementById('damkoi-copy-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'damkoi-copy-toast';
  el.style.cssText = `
    position: fixed; bottom: 80px; right: 20px; z-index: 999999;
    background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
    color: white; padding: 12px 18px; border-radius: 12px;
    font-family: sans-serif; font-size: 13px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  el.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;">DamKoi found a coupon!</div>
    <div style="font-family:monospace;font-size:15px;letter-spacing:0.1em;">${code}</div>
    <button id="damkoi-copy-btn" style="
      margin-top:8px; background:#6366f1; color:white; border:none;
      padding:6px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700;
    ">Copy code</button>
  `;
  document.body.appendChild(el);

  document.getElementById('damkoi-copy-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(code).catch(() => {});
    el.remove();
  });

  setTimeout(() => el.remove(), 10000);
}

async function tryCoupon(input, applyBtn, code) {
  input.focus();
  input.value = code;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  applyBtn.click();
  return waitForSuccess(3000);
}

export async function runCouponInjector(platform, cartTotal) {
  const input = findElement(COUPON_INPUT_SELECTORS);
  const applyBtn = findElement(APPLY_BTN_SELECTORS);

  if (!input || !applyBtn) {
    console.log('[DamKoi] Coupon input/button not found on this page.');
    return;
  }

  let coupons;
  try {
    coupons = await safeFetch('FETCH_COUPONS', { platform, cartTotal });
  } catch {
    return;
  }

  if (!coupons || coupons.length === 0) return;

  let applied = false;
  let savedAmount = 0;
  let usedCode = '';

  for (let i = 0; i < Math.min(MAX_RETRIES, coupons.length); i++) {
    const code = coupons[i]?.code;
    if (!code) continue;

    const success = await tryCoupon(input, applyBtn, code);

    chrome.runtime.sendMessage({
      type: 'LOG_COUPON',
      payload: {
        platform,
        coupon_code: code,
        cart_total: cartTotal,
        savings: success ? (coupons[i]?.discount_amount ?? 0) : 0,
        success,
      },
    });

    if (success) {
      applied = true;
      savedAmount = coupons[i]?.discount_amount ?? 0;
      usedCode = code;
      break;
    }

    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
  }

  if (applied && savedAmount > 0) {
    showToast(`✓ DamKoi saved you ৳${(savedAmount / 100).toLocaleString('en-BD')} with ${usedCode}`);
  } else if (!applied && coupons[0]?.code) {
    showCopyFallback(coupons[0].code);
  }
}
