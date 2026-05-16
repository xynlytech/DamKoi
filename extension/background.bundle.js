(() => {
  // utils.js
  var API_BASE = true ? "http://127.0.0.1:8000" : "http://127.0.0.1:8000";
  var ALERT_CHANNELS = {
    EMAIL: "email",
    SMS: "sms",
    PUSH: "push"
  };
  var DEFAULT_ALERT_CHANNEL = ALERT_CHANNELS.EMAIL;
  var CACHE_TTL = 60 * 60 * 1e3;

  // background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handlers = {
      "FETCH_VERDICT": () => fetchApi(`/v1/products/lookup?url=${encodeURIComponent(message.url)}`),
      "FETCH_HISTORY": () => fetchApi(`/v1/products/${message.productId}/price-history?days=${message.days || 90}`),
      "FETCH_ALTERNATIVES": () => fetchApi(`/v1/products/${message.productId}/alternatives`),
      "FETCH_COMPARE": () => fetchApi(`/v1/products/${message.productId}/compare`),
      "FETCH_PRODUCT_COUPONS": () => fetchApi(`/v1/products/${message.productId}/coupons`),
      "GET_ALERTS_BY_EMAIL": () => fetchApi(`/v1/alerts/by-email?email=${encodeURIComponent(message.email)}`),
      "FETCH_COUPONS": () => {
        const params = new URLSearchParams();
        if (message.cartTotal)
          params.set("cart_total", message.cartTotal);
        if (message.paymentMethod)
          params.set("payment_method", message.paymentMethod);
        const qs = params.toString();
        return fetchApi(`/v1/coupons/${message.platform || "daraz"}${qs ? `?${qs}` : ""}`);
      },
      "LOG_COUPON": () => fetchApi(`/v1/telemetry/coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message.payload)
      }),
      "CREATE_ALERT": () => fetchApi(`/v1/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message.payload)
      }),
      "UPDATE_BADGE": () => {
        updateBadge(message.score, sender.tab?.id);
        return Promise.resolve({ success: true });
      }
    };
    if (handlers[message.type]) {
      console.log(`[DamKoi] Handling ${message.type}:`, message);
      handlers[message.type]().then((data) => {
        console.log(`[DamKoi] ${message.type} success:`, data);
        sendResponse({ success: true, data });
      }).catch((err) => {
        console.error(`[DamKoi] ${message.type} error:`, err);
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }
  });
  function updateBadge(score, tabId) {
    if (!tabId)
      return;
    let color, text;
    if (score >= 8) {
      color = "#10b981";
      text = `${score}`;
    } else if (score >= 6) {
      color = "#f59e0b";
      text = `${score}`;
    } else if (score >= 4) {
      color = "#ef4444";
      text = `${score}`;
    } else {
      color = "#dc2626";
      text = `${score}`;
    }
    chrome.action.setBadgeBackgroundColor({ color, tabId });
    chrome.action.setBadgeText({ text, tabId });
  }
  async function fetchApi(path, options = {}) {
    const resp = await fetch(`${API_BASE}${path}`, options);
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(`${resp.status}: ${errorData.detail || `API error ${resp.status}`}`);
    }
    return resp.json();
  }
  chrome.alarms.create("cache-cleanup", { periodInMinutes: 60 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "cache-cleanup") {
      console.log("[DamKoi] Running cache cleanup...");
    }
  });
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      console.log("[DamKoi] Extension installed! Welcome.");
    }
  });
})();
