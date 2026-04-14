/**
 * DamKoi — Chrome Extension Background Service Worker
 *
 * Handles:
 * - Extension icon badge updates
 * - Communication between popup and content scripts
 * - Periodic cache cleanup via alarms API
 */

// ── Configuration ────────────────────────────────────────────

const API_BASE = 'http://localhost:8000/v1'; // Change to production URL when deploying

// ── Message Handler ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_VERDICT') {
    fetchVerdictBackground(message.url)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // indicates async response
  }

  if (message.type === 'UPDATE_BADGE') {
    updateBadge(message.score, sender.tab?.id);
    sendResponse({ success: true });
  }
});

// ── Badge Updates ────────────────────────────────────────────

function updateBadge(score, tabId) {
  if (!tabId) return;

  let color, text;

  if (score >= 8) {
    color = '#10b981'; // green
    text = `${score}`;
  } else if (score >= 6) {
    color = '#f59e0b'; // amber
    text = `${score}`;
  } else if (score >= 4) {
    color = '#ef4444'; // red
    text = `${score}`;
  } else {
    color = '#dc2626'; // dark red
    text = `${score}`;
  }

  chrome.action.setBadgeBackgroundColor({ color, tabId });
  chrome.action.setBadgeText({ text, tabId });
}

// ── API Fetch ────────────────────────────────────────────────

async function fetchVerdictBackground(url) {
  const resp = await fetch(
    `${API_BASE}/products/lookup?url=${encodeURIComponent(url)}`
  );

  if (!resp.ok) {
    throw new Error(`API returned ${resp.status}`);
  }

  return resp.json();
}

// ── Alarms (Cache Cleanup) ───────────────────────────────────

chrome.alarms.create('cache-cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cache-cleanup') {
    console.log('[DamKoi] Running cache cleanup...');
    // Cache cleanup is handled by content script's manageCacheSize
  }
});

// ── Install Event ────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[DamKoi] Extension installed! Welcome.');
    // Could open a welcome page here
  }
});
