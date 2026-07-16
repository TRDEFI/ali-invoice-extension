const STORAGE_KEY = "downloadState";
const ORDERS_URL = "https://www.aliexpress.com/p/order/index.html";
const TRIAL_LIMIT = 10;
const VALIDATION_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours
let keepAlivePorts = [];
let popupPort = null;

// Gumroad product IDs
const GUMROAD_MONTHLY_ID = "BuuG7LGEO7yEPQgNQE3J2A==";
const GUMROAD_TRIAL_ID = "O5BcIGctkjDqMBf-CGrvAg==";

// Keep service worker alive while popup is open
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    popupPort = port;
    port.onDisconnect.addListener(() => { popupPort = null; });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = HANDLERS[msg.type];
  if (handler) {
    handler(msg, sender).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
});

const HANDLERS = {};

HANDLERS.start = async (msg) => {
  const { fromDate, toDate } = msg;
  const state = { phase: "ANALYZING", fromDate, toDate, orders: [], total: 0, ok: 0, fail: 0, current: null, errors: [], stopped: false };
  await saveState(state);
  sendToPopup({ type: "stateChange", state });
  sendToPopup({ type: "log", text: "Finding orders tab..." });

  try {
    let tab = await findOrdersTab();
    if (!tab) {
      sendToPopup({ type: "log", text: "Creating new orders tab..." });
      tab = await chrome.tabs.create({ url: ORDERS_URL, active: false });
    }
    sendToPopup({ type: "log", text: `Tab found: ${tab.id}, waiting for page...` });
    await waitForContentScript(tab.id);
    sendToPopup({ type: "log", text: "Content script ready. Loading orders..." });

    const loadResult = await sendToTab(tab.id, { type: "loadAllOrders", fromDate });
    if (loadResult.error) { await abortWithError(state, loadResult.error); return; }

    const s1 = await loadState();
    if (!s1 || s1.stopped) { sendToPopup({ type: "stateChange", state: { phase: "IDLE" } }); return; }

    sendToPopup({ type: "log", text: `Total orders loaded: ${loadResult.total}` });

    const listResult = await sendToTab(tab.id, { type: "getOrderList" });
    if (listResult.error) { await abortWithError(state, listResult.error); return; }

    const filtered = filterOrders(listResult.orders, fromDate, toDate);
    state.orders = filtered;
    state.total = filtered.length;
    state.phase = "REVIEW";
    await saveState(state);
    sendToPopup({ type: "reviewOrders", orders: filtered, total: filtered.length, fromDate, toDate });
  } catch (e) {
    sendToPopup({ type: "log", text: `ERROR: ${e.message}` });
    await abortWithError(state, e.message);
  }
};

HANDLERS.startDownload = async (msg) => {
  const state = await loadState();
  if (!state || state.orders.length === 0) return { ok: false, error: "No orders to process" };

  // Server-side license validation before download
  const licenseCheck = await validateLicenseServerSide();
  if (!licenseCheck.valid) {
    const reason = licenseCheck.reason || "License validation failed. Please reactivate.";
    sendToPopup({ type: "log", text: reason });
    return { ok: false, error: reason };
  }

  // Check download limit
  const limitCheck = await checkDownloadLimit();
  if (!limitCheck.allowed) {
    sendToPopup({ type: "log", text: limitCheck.reason });
    sendToPopup({ type: "log", text: "Subscribe to Monthly plan for unlimited downloads." });
    return { ok: false, error: limitCheck.reason };
  }

  state.phase = "DOWNLOADING";
  state.ok = 0;
  state.fail = 0;
  state.current = null;
  state.errors = [];
  await saveState(state);
  sendToPopup({ type: "stateChange", state });

  let tab = await findOrdersTab();
  if (!tab) { await abortWithError(state, "Orders tab not found"); return; }

  // Track downloads completing
  let downloadCompleted = false;
  const downloadListener = (delta) => {
    if (delta.state && delta.state.current === "complete") {
      downloadCompleted = true;
    }
  };
  chrome.downloads.onChanged.addListener(downloadListener);

  // Process orders sequentially in a loop
  for (let i = 0; i < state.orders.length; i++) {
    const s = await loadState();
    if (!s || s.phase !== "DOWNLOADING" || s.stopped) break;

    // Re-validate license every 10 downloads
    if (i > 0 && i % 10 === 0) {
      const recheck = await validateLicenseServerSide();
      if (!recheck.valid) {
        sendToPopup({ type: "log", text: recheck.reason || "License invalid. Stopping download." });
        break;
      }
    }

    const order = s.orders[i];
    s.current = order.orderId;
    downloadCompleted = false;
    await saveState(s);
    sendToPopup({ type: "log", text: `[${i + 1}/${s.orders.length}] ${order.orderId} (${order.dateText})` });
    sendToPopup({ type: "progress", current: order.orderId, ok: s.ok, fail: s.fail, index: i, total: s.orders.length });

    try {
      // Check stopped before each step
      let check = await loadState();
      if (!check || check.stopped) break;

      // Navigate to detail page
      await sendToTab(tab.id, { type: "navigateToDetail", orderId: order.orderId });
      await waitForPage(tab.id, 15000);

      check = await loadState();
      if (!check || check.stopped) break;

      await waitForContentScript(tab.id);

      // Click Receipt button
      const receiptResult = await sendToTab(tab.id, { type: "clickReceipt" });
      if (receiptResult.error) throw new Error(receiptResult.error);

      check = await loadState();
      if (!check || check.stopped) break;

      // Wait for tax iframe
      await sleep(6000);

      check = await loadState();
      if (!check || check.stopped) break;

      const iframeResult = await sendToTab(tab.id, { type: "waitForIframe" });
      if (iframeResult.error) throw new Error(iframeResult.error);

      // Click Download in iframe
      await sleep(2000);

      check = await loadState();
      if (!check || check.stopped) break;

      const dlResult = await sendToTab(tab.id, { type: "clickDownload" });
      if (dlResult.error) throw new Error(dlResult.error);

      sendToPopup({ type: "log", text: `Download triggered for ${order.orderId}` });

      // Wait for download to complete (timeout 25s)
      let waited = 0;
      while (waited < 25000) {
        if (downloadCompleted) break;
        check = await loadState();
        if (!check || check.stopped) break;
        await sleep(1000);
        waited += 1000;
      }

      check = await loadState();
      if (!check || check.stopped) break;

      s.ok++;
      s.current = null;
      await saveState(s);
      await incrementDownloadCount();
      sendToPopup({ type: "progress", ok: s.ok, fail: s.fail });

      // Go back to orders page
      await sendToTab(tab.id, { type: "goBack" });
      await waitForPage(tab.id, 15000);

      check = await loadState();
      if (!check || check.stopped) break;

      await waitForContentScript(tab.id);

    } catch (e) {
      s.fail++;
      s.errors.push(`${order.orderId}: ${e.message}`);
      s.current = null;
      await saveState(s);
      sendToPopup({ type: "progress", ok: s.ok, fail: s.fail });
      sendToPopup({ type: "log", text: `FAIL: ${order.orderId} - ${e.message}` });
      // Try to recover: go back to orders
      try {
        await sendToTab(tab.id, { type: "goBack" });
        await waitForPage(tab.id, 15000);
      } catch (_) {}
    }
  }

  chrome.downloads.onChanged.removeListener(downloadListener);

  // All done
  const finalState = await loadState();
  if (finalState) {
    if (finalState.stopped) {
      sendToPopup({ type: "stateChange", state: { phase: "IDLE" } });
    } else {
      finalState.phase = "COMPLETE";
      finalState.current = null;
      await saveState(finalState);
      sendToPopup({ type: "complete", ok: finalState.ok, fail: finalState.fail, orders: finalState.orders, errors: finalState.errors });
    }
  }
};

HANDLERS.abort = async () => {
  const tab = await findOrdersTab();
  if (tab) {
    try { await sendToTab(tab.id, { type: "abortLoading" }); } catch (_) {}
  }
  const state = await loadState();
  if (state) {
    state.stopped = true;
    state.phase = "IDLE";
    await saveState(state);
  }
  sendToPopup({ type: "stateChange", state: { phase: "IDLE" } });
};

HANDLERS.getState = async () => {
  return (await loadState()) || { phase: "IDLE" };
};

// Handle server-side validation request from popup
HANDLERS.validateLicense = async (msg) => {
  return await validateLicenseServerSide();
};

async function sendToTab(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch (e) {
    return { error: e.message };
  }
}

function sendToPopup(msg) {
  if (popupPort) {
    try { popupPort.postMessage(msg); } catch (_) {}
    return;
  }
  // Fallback: send to any tab with popup.html open (tab mode)
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && tab.url.includes("popup/popup.html")) {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
      }
    }
  });
}

async function waitForContentScript(tabId) {
  for (let i = 0; i < 30; i++) {
    try {
      const result = await chrome.tabs.sendMessage(tabId, { type: "ping" });
      if (result && result.ok) return true;
    } catch (_) {}
    await sleep(1000);
  }
  throw new Error("Content script not responding after 30s");
}

async function waitForPage(tabId, timeout) {
  return new Promise((resolve, reject) => {
    const listener = (changedTabId, changeInfo) => {
      if (changedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeout);
  });
}

async function findOrdersTab() {
  const tabs = await chrome.tabs.query({ url: "*://*.aliexpress.com/p/order/*" });
  return tabs.length > 0 ? tabs[0] : null;
}

function filterOrders(orders, fromDate, toDate) {
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td, 23, 59, 59, 999);

  return orders.filter((o) => {
    const m = o.dateText.match(/([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
    if (!m) return false;
    const month = months[m[1]];
    if (month === undefined) return false;
    const d = new Date(parseInt(m[3]), month, parseInt(m[2]));
    return d >= from && d <= to;
  });
}

async function abortWithError(state, error) {
  state.phase = "IDLE";
  state.errors.push(error);
  await saveState(state);
  sendToPopup({ type: "stateChange", state });
  sendToPopup({ type: "log", text: `ERROR: ${error}` });
}

async function saveState(state) {
  await chrome.storage.session.set({ [STORAGE_KEY]: state });
}

async function loadState() {
  const data = await chrome.storage.session.get(STORAGE_KEY);
  return data[STORAGE_KEY] || null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ===== LICENSE VALIDATION =====

// Plain storage — no obfuscation (obfuscation is security theater)
async function getLicenseData() {
  const data = await chrome.storage.local.get("licenseData");
  return data.licenseData || null;
}

async function setLicenseData(data) {
  await chrome.storage.local.set({ licenseData: data });
}

// Server-side license validation with 24h cache
async function validateLicenseServerSide() {
  const licenseData = await getLicenseData();
  if (!licenseData || !licenseData.licenseKey) {
    return { valid: false, reason: "No license found. Please activate." };
  }

  // Check cache freshness
  const now = Date.now();
  if (licenseData.lastValidation && (now - licenseData.lastValidation) < VALIDATION_CACHE_MS) {
    // Cache is fresh — use cached result
    if (licenseData.cachedInvalid) {
      return { valid: false, reason: "License invalid (cached). Please reactivate." };
    }
    return { valid: true, type: licenseData.licenseType };
  }

  // Cache stale — validate with Gumroad API
  const key = licenseData.licenseKey;
  let productId = null;
  let expectedType = null;

  if (licenseData.licenseType === "monthly") {
    productId = GUMROAD_MONTHLY_ID;
    expectedType = "monthly";
  } else if (licenseData.licenseType === "free_trial" || licenseData.licenseType === "daily_trial") {
    productId = GUMROAD_TRIAL_ID;
    expectedType = "free_trial";
  } else {
    return { valid: false, reason: "Unknown license type." };
  }

  try {
    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        product_id: productId,
        license_key: key,
        increment_uses_count: "false" // Don't increment on validation check
      })
    });
    const data = await res.json();

    // Update cache
    licenseData.lastValidation = now;

    if (!data.success) {
      // License invalid
      licenseData.cachedInvalid = true;
      await setLicenseData(licenseData);
      return { valid: false, reason: "License key invalid. Please reactivate." };
    }

    // Check for refund or dispute
    if (data.purchase?.refunded) {
      licenseData.cachedInvalid = true;
      await setLicenseData(licenseData);
      return { valid: false, reason: "This purchase has been refunded. License deactivated." };
    }

    if (data.purchase?.disputed) {
      licenseData.cachedInvalid = true;
      await setLicenseData(licenseData);
      return { valid: false, reason: "This purchase is under dispute. License deactivated." };
    }

    // Valid — update cache
    licenseData.cachedInvalid = false;
    licenseData.lastValidation = now;
    await setLicenseData(licenseData);

    return { valid: true, type: expectedType };
  } catch (e) {
    console.error("Server-side validation error:", e);
    // Network error — use stale cache if available
    if (licenseData.cachedInvalid) {
      return { valid: false, reason: "License invalid (cached). Please check your connection." };
    }
    // No cached result — allow but log warning
    return { valid: true, type: licenseData.licenseType, warning: "Could not validate license online." };
  }
}

// ===== DOWNLOAD LIMIT =====

async function checkDownloadLimit() {
  const licenseData = await getLicenseData();
  const licenseType = licenseData?.licenseType;
  const downloadCount = licenseData?.downloadCount || 0;

  if (!licenseType) {
    return { allowed: false, reason: "No license found. Please activate." };
  }

  if (licenseType === "monthly") {
    return { allowed: true };
  }

  // Both free_trial and daily_trial use the same limit
  if ((licenseType === "free_trial" || licenseType === "daily_trial") && downloadCount >= TRIAL_LIMIT) {
    return {
      allowed: false,
      reason: `Free trial limit reached (${TRIAL_LIMIT} invoices). Subscribe to Monthly for unlimited.`
    };
  }

  return { allowed: true, remaining: TRIAL_LIMIT - downloadCount };
}

async function incrementDownloadCount() {
  const licenseData = await getLicenseData();
  if (!licenseData) return;

  if (licenseData.licenseType === "free_trial" || licenseData.licenseType === "daily_trial") {
    licenseData.downloadCount = (licenseData.downloadCount || 0) + 1;
    await setLicenseData(licenseData);
  }
}
