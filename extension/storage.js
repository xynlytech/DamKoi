/**
 * DamKoi — chrome.storage.local helpers
 *
 * Thin wrappers around chrome.storage.local that return Promises.
 * Used for persisting user preferences (coupon opt-in, email, etc.).
 */

export function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] ?? null);
    });
  });
}

export function saveToStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

export function removeFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], resolve);
  });
}

export async function getAllPrefs() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, resolve);
  });
}
