const STORAGE_KEY = "downloadState";
const ORDERS_URL = "https://www.aliexpress.com/p/order/index.html";
const TRIAL_LIMIT = 10;
const VALIDATION_CACHE_MS = 24 * 60 * 60 * 1000;
let keepAlivePorts = [];
let popupPort = null;

// Supabase config
const SUPABASE_URL = "https://gnqwcozjqqpmfbhmvpar.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImducXdjb3pqcXFwbWZiaG12cGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTAxNDYsImV4cCI6MjA5OTg2NjE0Nn0.sFilRPT96L2dgQqm6dAZNqoqls8g9UEPDyny2IDuyzU";

// Gumroad product IDs (monthly only)
const GUMROAD_MONTHLY_ID = "BuuG7LGEO7yEPQgNQE3J2A==";

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

// ===== EMAIL OPERATIONS =====

HANDLERS.registerEmail = async (msg) => {
  const { email } = msg;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ext_users`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        email: email,
        invoice_count: 0,
        license_type: "free_trial"
      })
    });
    if (res.ok) {
      return { success: true };
    }
    const err = await res.json();
    if (err.code === "23505") {
      return { success: false, errorCode: "23505", error: "Email already registered" };
    }
    return { success: false, error: err.message || "Registration failed" };
  } catch (e) {
    console.error("Supabase registerEmail error:", e);
    return { success: false, error: e.message };
  }
};

// ===== ORDER PROCESSING =====

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

  // Check download limit
  const limitCheck = await checkDownloadLimit();
  if (!limitCheck.allowed) {
    sendToPopup({ type: "log", text: limitCheck.reason });
    sendToPopup({ type: "complete", ok: 0, fail: 0, orders: state.orders, errors: [], limitReached: true });
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

  let downloadCompleted = false;
  const downloadListener = (delta) => {
    if (delta.state && delta.state.current === "complete") {
      chrome.downloads.search({ id: delta.id }, (items) => {
        if (items && items[0] && items[0].filename && /OrderSummary|receipt|invoice|tax/i.test(items[0].filename)) {
          downloadCompleted = true;
        }
      });
    }
  };
  chrome.downloads.onChanged.addListener(downloadListener);

  for (let i = 0; i < state.orders.length; i++) {
    const s = await loadState();
    if (!s || s.phase !== "DOWNLOADING" || s.stopped) break;

    // Check limit before each order
    const limitData = await getLicenseData();
    if (limitData && limitData.licenseType === "free_trial" && (limitData.downloadCount || 0) >= TRIAL_LIMIT) {
      sendToPopup({ type: "log", text: `Free trial limit reached (${TRIAL_LIMIT}/${TRIAL_LIMIT})` });
      const limitState = await loadState();
      if (limitState) {
        limitState.phase = "COMPLETE";
        limitState.current = null;
        await saveState(limitState);
        sendToPopup({ type: "complete", ok: limitState.ok, fail: limitState.fail, orders: limitState.orders, errors: limitState.errors, limitReached: true });
      }
      break;
    }

    const order = s.orders[i];
    s.current = order.orderId;
    downloadCompleted = false;
    await saveState(s);
    sendToPopup({ type: "log", text: `[${i + 1}/${s.orders.length}] ${order.orderId} (${order.dateText})` });
    sendToPopup({ type: "progress", current: order.orderId, ok: s.ok, fail: s.fail, index: i, total: s.orders.length });

    try {
      let check = await loadState();
      if (!check || check.stopped) break;

      await sendToTab(tab.id, { type: "navigateToDetail", orderId: order.orderId });
      await waitForPage(tab.id, 15000);

      check = await loadState();
      if (!check || check.stopped) break;

      await waitForContentScript(tab.id);

      const receiptResult = await sendToTab(tab.id, { type: "clickReceipt" });
      if (receiptResult.error) throw new Error(receiptResult.error);

      check = await loadState();
      if (!check || check.stopped) break;

      await sleep(10000);

      check = await loadState();
      if (!check || check.stopped) break;

      let iframeResult = await sendToTab(tab.id, { type: "waitForIframe" });
      if (iframeResult.error) {
        // Retry once after short delay
        check = await loadState();
        if (!check || check.stopped) break;
        await sleep(3000);
        check = await loadState();
        if (!check || check.stopped) break;
        iframeResult = await sendToTab(tab.id, { type: "waitForIframe" });
        if (iframeResult.error) throw new Error(iframeResult.error);
      }

      await sleep(2000);

      check = await loadState();
      if (!check || check.stopped) break;

      const dlResult = await sendToTab(tab.id, { type: "clickDownload" });
      if (dlResult.error) throw new Error(dlResult.error);

      sendToPopup({ type: "log", text: `Download triggered for ${order.orderId}` });

      let waited = 0;
      while (waited < 25000) {
        if (downloadCompleted) break;
        if (waited > 0 && waited % 2000 === 0) {
          try {
            const recentDownloads = await chrome.downloads.search({
              orderBy: ["-startTime"],
              limit: 3
            });
            for (const d of recentDownloads) {
              if (d.filename && /OrderSummary|receipt|invoice|tax/i.test(d.filename) && d.state === "complete") {
                downloadCompleted = true;
                break;
              }
            }
          } catch (_) {}
        }
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
      try {
        await sendToTab(tab.id, { type: "goBack" });
        await waitForPage(tab.id, 15000);
      } catch (_) {}
    }
  }

  chrome.downloads.onChanged.removeListener(downloadListener);

  const finalState = await loadState();
  if (finalState) {
    if (finalState.stopped) {
      sendToPopup({ type: "stateChange", state: { phase: "IDLE" } });
    } else if (finalState.phase !== "COMPLETE") {
      finalState.phase = "COMPLETE";
      finalState.current = null;
      await saveState(finalState);
      const finalLicense = await getLicenseData();
      const limitReached = finalLicense && finalLicense.licenseType === "free_trial" && (finalLicense.downloadCount || 0) >= TRIAL_LIMIT;
      sendToPopup({ type: "complete", ok: finalState.ok, fail: finalState.fail, orders: finalState.orders, errors: finalState.errors, limitReached });
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

HANDLERS.clearState = async () => {
  await chrome.storage.session.remove(STORAGE_KEY);
  return { ok: true };
};

// Handle server-side validation request from popup (monthly only)
HANDLERS.validateLicense = async (msg) => {
  return await validateLicenseServerSide();
};

// ===== HELPERS =====

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

// ===== LICENSE VALIDATION (Monthly only via Gumroad) =====

async function getLicenseData() {
  const data = await chrome.storage.local.get("licenseData");
  return data.licenseData || null;
}

async function setLicenseData(data) {
  await chrome.storage.local.set({ licenseData: data });
}

async function validateLicenseServerSide() {
  const licenseData = await getLicenseData();
  if (!licenseData) {
    return { valid: false, reason: "No license found. Please activate." };
  }

  // Free trial - validate via Supabase
  if (licenseData.licenseType === "free_trial") {
    if (!licenseData.email) {
      return { valid: false, reason: "No email found. Please activate." };
    }
    // Check Supabase for email existence and count
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/ext_users?email=eq.${encodeURIComponent(licenseData.email)}&select=invoice_count`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.length === 0) {
        return { valid: false, reason: "Email not found. Please activate." };
      }
      // Sync download count from Supabase
      licenseData.downloadCount = data[0].invoice_count || 0;
      await setLicenseData(licenseData);
      return { valid: true, type: "free_trial" };
    } catch (e) {
      console.error("Supabase validation error:", e);
      // Allow on network error
      return { valid: true, type: "free_trial", warning: "Could not validate online." };
    }
  }

  // Monthly - validate via Gumroad
  if (licenseData.licenseType === "monthly") {
    const now = Date.now();
    if (licenseData.lastValidation && (now - licenseData.lastValidation) < VALIDATION_CACHE_MS) {
      if (licenseData.cachedInvalid) {
        return { valid: false, reason: "License invalid (cached)." };
      }
      return { valid: true, type: "monthly" };
    }

    const key = licenseData.licenseKey;
    if (!key) {
      return { valid: false, reason: "No license key found." };
    }

    try {
      const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          product_id: GUMROAD_MONTHLY_ID,
          license_key: key,
          increment_uses_count: "false"
        })
      });
      const data = await res.json();

      if (!data.success) {
        licenseData.cachedInvalid = true;
        await setLicenseData(licenseData);
        return { valid: false, reason: "License key invalid." };
      }

      if (data.purchase?.refunded) {
        licenseData.cachedInvalid = true;
        await setLicenseData(licenseData);
        return { valid: false, reason: "Purchase refunded. License deactivated." };
      }

      if (data.purchase?.disputed) {
        licenseData.cachedInvalid = true;
        await setLicenseData(licenseData);
        return { valid: false, reason: "Purchase disputed. License deactivated." };
      }

      licenseData.cachedInvalid = false;
      licenseData.lastValidation = now;
      await setLicenseData(licenseData);
      return { valid: true, type: "monthly" };
    } catch (e) {
      console.error("Monthly validation error:", e);
      if (licenseData.cachedInvalid) {
        return { valid: false, reason: "License invalid. Check connection." };
      }
      return { valid: true, type: "monthly", warning: "Could not validate online." };
    }
  }

  return { valid: false, reason: "Unknown license type." };
}

// ===== DOWNLOAD LIMIT =====

async function checkDownloadLimit() {
  const licenseData = await getLicenseData();
  const licenseType = licenseData?.licenseType;

  if (!licenseType) {
    return { allowed: false, reason: "No license found. Please activate." };
  }

  if (licenseType === "monthly") {
    return { allowed: true };
  }

  // Free trial - check via RPC
  if (licenseType === "free_trial") {
    if (!licenseData.email) {
      return { allowed: false, reason: "No email found. Please activate." };
    }
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_download_limit`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ user_email: licenseData.email, max_count: TRIAL_LIMIT })
      });
      const result = await res.json();
      return result;
    } catch (e) {
      console.error("Supabase limit check error:", e);
      return { allowed: true, remaining: TRIAL_LIMIT, warning: "Could not check limit online." };
    }
  }

  return { allowed: true };
}

async function incrementDownloadCount() {
  const licenseData = await getLicenseData();
  if (!licenseData || licenseData.licenseType !== "free_trial" || !licenseData.email) return;

  // Increment via RPC
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_invoice_count`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ user_email: licenseData.email })
    });
    const newCount = await res.json();
    if (typeof newCount === "number") {
      licenseData.downloadCount = newCount;
      await setLicenseData(licenseData);
    }
  } catch (e) {
    console.error("Supabase increment error:", e);
    // Fallback: increment locally only
    licenseData.downloadCount = (licenseData.downloadCount || 0) + 1;
    await setLicenseData(licenseData);
  }
}
