const port = chrome.runtime.connect({ name: "popup" });
const els = {};

const GUMROAD_MONTHLY_URL = "https://trdefi.gumroad.com/l/monthly";
const GUMROAD_TRIAL_URL = "https://trdefi.gumroad.com/l/FreeTrial";
const TRIAL_LIMIT = 10;

// Bilingual labels
const LANG = {
  en: {
    activateTitle: "Activate Your License",
    monthlyName: "MONTHLY",
    monthlyPrice: "$10",
    monthlyPeriod: "/mo",
    monthlyFeature: "Unlimited invoices",
    freeTrialName: "FREE TRIAL",
    freeTrialPrice: "$0",
    freeTrialFeature: "10 invoices free",
    subscribeBtn: "Start Free",
    licenseKeyLabel: "License Key",
    licenseKeyPlaceholder: "Paste your license key here",
    activateBtn: "ACTIVATE",
    validatingBtn: "VALIDATING...",
    monthlyPlan: "Monthly Plan",
    freeTrialPlan: "Free Trial",
    unlimited: "Unlimited",
    dateRangeLabel: "Date Range",
    fromDate: "From",
    toDate: "To",
    analyzeBtn: "ANALYZE",
    analyzingBtn: "ANALYZING...",
    ordersFound: "Orders Found",
    cancelBtn: "CANCEL",
    downloadAllBtn: "DOWNLOAD ALL",
    downloading: "Downloading...",
    stopBtn: "STOP",
    downloadComplete: "Download Complete",
    newDownloadBtn: "NEW DOWNLOAD",
    ok: "OK",
    fail: "FAIL",
    total: "Total",
    current: "Current",
    remaining: "remaining",
    invalidKey: "Invalid license key. Please check and try again.",
    validationFailed: "Validation failed. Please try again.",
    enterKey: "Please enter a license key",
    noOrders: "Please select both dates",
    dateOrder: "Start date must be before end date",
    licenseRevoked: "License has been revoked (refunded/disputed). Please contact support.",
    networkError: "Could not validate license online. Please check your connection.",
    rateLimit: "Too many attempts. Please wait a moment and try again.",
    noOrdersFound: "No orders found. Make sure AliExpress language is set to English (top-right corner).",
    errNetwork: "Could not connect to license server. Check your internet connection.",
    errInvalid: "Invalid license key. Please check and try again.",
    errRefunded: "This purchase has been refunded. License deactivated.",
    errDisputed: "This purchase is under dispute. License deactivated.",
    errRateLimit: "Too many attempts. Please wait a moment and try again.",
  },
  tr: {
    activateTitle: "Lisansinizi Aktive Edin / Activate Your License",
    monthlyName: "AYLIK / MONTHLY",
    monthlyPrice: "$10",
    monthlyPeriod: "/ay",
    monthlyFeature: "Sinirsiz fatura / Unlimited invoices",
    freeTrialName: "UYE DENEME / FREE TRIAL",
    freeTrialPrice: "$0",
    freeTrialFeature: "10 fatura ucretsiz / 10 invoices free",
    subscribeBtn: "Ucretsiz Basla / Start Free",
    licenseKeyLabel: "Lisans Anahtari / License Key",
    licenseKeyPlaceholder: "Lisans anahtarini buraya yapistirin / Paste your license key here",
    activateBtn: "AKTIVE ET / ACTIVATE",
    validatingBtn: "KONTROL EDILIYOR / VALIDATING...",
    monthlyPlan: "Aylik Plan / Monthly Plan",
    freeTrialPlan: "Ucretsiz Deneme / Free Trial",
    unlimited: "Sinirsiz / Unlimited",
    dateRangeLabel: "Tarih Araligi / Date Range",
    fromDate: "Baslangic / From",
    toDate: "Bitis / To",
    analyzeBtn: "ANALIZ ET / ANALYZE",
    analyzingBtn: "ANALIZ EDILIYOR / ANALYZING...",
    ordersFound: "Siparisler Bulundu / Orders Found",
    cancelBtn: "IPTAL / CANCEL",
    downloadAllBtn: "HEPSINI INDIR / DOWNLOAD ALL",
    downloading: "Indiriliyor / Downloading...",
    stopBtn: "DUR / STOP",
    downloadComplete: "Indirme Tamamlandi / Download Complete",
    newDownloadBtn: "YENI INDIRME / NEW DOWNLOAD",
    ok: "OKU / OK",
    fail: "HATA / FAIL",
    total: "Toplam / Total",
    current: "Su an / Current",
    remaining: "kaldi / remaining",
    invalidKey: "Gecersiz lisans anahtari / Invalid license key. Kontrol edin ve tekrar deneyin / Please check and try again.",
    validationFailed: "Dogrulama basarisiz oldu / Validation failed. Tekrar deneyin / Please try again.",
    enterKey: "Lisans anahtari girin / Enter a license key",
    noOrders: "Her iki tarihi de secin / Select both dates",
    dateOrder: "Baslangic tarihi, bitis tarihinden once olmali / Start date must be before end date",
    licenseRevoked: "Lisans iptal edildi / License revoked (refunded/disputed). Destek ile iletisime gecin / Contact support.",
    networkError: "Lisans dogrulanamadi / Could not validate license. Baglantinizi kontrol edin / Check your connection.",
    rateLimit: "Cok fazla deneme / Too many attempts. Bekleyip tekrar deneyin / Please wait and try again.",
    noOrdersFound: "Siparis bulunamadi / No orders found. AliExpress Ingilizce olmali / AliExpress must be set to English (top-right).",
    errNetwork: "Baglanti hatasi / Connection error. Internet baglantinizi kontrol edin / Check your internet connection.",
    errInvalid: "Gecersiz lisans anahtari / Invalid license key. Kontrol edin ve tekrar deneyin / Please check and try again.",
    errRefunded: "Satin alma iade edilmis / Purchase refunded. Lisans iptal edildi / License deactivated.",
    errDisputed: "Satin alma dispute altinda / Purchase disputed. Lisans iptal edildi / License deactivated.",
    errRateLimit: "Cok fazla deneme / Too many attempts. Bekleyip tekrar deneyin / Please wait and try again.",
  }
};

// Soru #3: Language detection (TR/EN only)
function getLang() {
  try {
    const lang = navigator.language || navigator.userLanguage || "en";
    return lang.toLowerCase().startsWith("tr") ? "tr" : "en";
  } catch (_) {
    return "en";
  }
}
const t = LANG[getLang()];

// Tab mode detection
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("tab") === "1") {
  document.body.classList.add("tab-mode");
}

function $(id) { return document.getElementById(id); }

function init() {
  els.stepLicense = $("step-license");
  els.stepInput = $("step-input");
  els.stepReview = $("step-review");
  els.stepProgress = $("step-progress");
  els.stepComplete = $("step-complete");
  els.fromDate = $("from-date");
  els.toDate = $("to-date");
  els.btnAnalyze = $("btn-analyze");
  els.btnCancel = $("btn-cancel");
  els.btnDownload = $("btn-download");
  els.btnNew = $("btn-new");
  els.btnStop = $("btn-stop");
  els.progressTitle = $("progress-title");
  els.reviewSummary = $("review-summary");
  els.reviewList = $("review-list");
  els.progressFill = $("progress-fill");
  els.progressInfo = $("progress-info");
  els.countOk = $("count-ok");
  els.countFail = $("count-fail");
  els.logEl = $("log");
  els.completeSummary = $("complete-summary");
  els.completeList = $("complete-list");
  els.licenseKey = $("license-key");
  els.btnActivate = $("btn-activate");
  els.btnSubscribeMonthly = $("btn-subscribe-monthly");
  els.btnSubscribeFreeTrial = $("btn-subscribe-free-trial");
  els.licenseError = $("license-error");
  els.licenseType = $("license-type");
  els.licenseLimit = $("license-limit");

  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  els.fromDate.value = toLocalDateStr(first);
  els.toDate.value = toLocalDateStr(last);

  els.btnAnalyze.addEventListener("click", onAnalyze);
  els.btnCancel.addEventListener("click", onCancel);
  els.btnDownload.addEventListener("click", onDownload);
  els.btnNew.addEventListener("click", onNew);
  els.btnStop.addEventListener("click", onStop);
  els.btnActivate.addEventListener("click", onActivate);
  els.btnSubscribeMonthly.addEventListener("click", () => chrome.tabs.create({ url: GUMROAD_MONTHLY_URL }));
  els.btnSubscribeFreeTrial.addEventListener("click", () => chrome.tabs.create({ url: GUMROAD_TRIAL_URL }));

  // Expand button: open in full tab
  const btnExpand = document.getElementById("btn-expand");
  if (btnExpand) {
    btnExpand.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("popup/popup.html?tab=1") });
    });
  }

  port.onMessage.addListener(onMessage);
  port.onDisconnect.addListener(() => {});

  chrome.runtime.onMessage.addListener((msg) => {
    onMessage(msg);
  });

  checkLicenseAndInit();
}

async function checkLicenseAndInit() {
  const data = await getLicenseData();
  if (!data || !data.licenseKey) {
    showStep("license");
    return;
  }

  // Server-side validation on popup open
  try {
    const result = await chrome.runtime.sendMessage({ type: "validateLicense" });
    if (result && !result.valid) {
      // License revoked (refunded/disputed)
      showStep("license");
      showLicenseError(result.reason || t.licenseRevoked);
      // Clear invalid license
      await chrome.storage.local.remove("licenseData");
      return;
    }
  } catch (e) {
    // Network error — allow but warn
    console.warn("License validation error on open:", e);
  }

  showStep("input");
  updateLicenseBar(data.licenseType, data.downloadCount || 0);
}

// Plain storage — no obfuscation
async function getLicenseData() {
  const data = await chrome.storage.local.get("licenseData");
  return data.licenseData || null;
}

async function setLicenseData(data) {
  await chrome.storage.local.set({ licenseData: data });
}

function updateLicenseBar(type, count) {
  if (type === "monthly") {
    els.licenseType.textContent = t.monthlyPlan;
    els.licenseLimit.textContent = t.unlimited;
    els.licenseLimit.className = "limit unlimited";
  } else {
    els.licenseType.textContent = t.freeTrialPlan;
    const remaining = TRIAL_LIMIT - count;
    els.licenseLimit.textContent = `${remaining}/${TRIAL_LIMIT} ${t.remaining}`;
    els.licenseLimit.className = "limit";
    if (remaining <= 3) els.licenseLimit.className += " danger";
    else if (remaining <= 5) els.licenseLimit.className += " warning";
  }
}

async function onActivate() {
  const key = els.licenseKey.value.trim();
  if (!key) {
    showLicenseError(t.enterKey);
    return;
  }

  // Client-side key format validation
  if (key.length < 16 || !/^[a-zA-Z0-9\-]+$/.test(key)) {
    showLicenseError(t.invalidKey);
    return;
  }

  els.btnActivate.disabled = true;
  els.btnActivate.textContent = t.validatingBtn;
  showLicenseError("");

  try {
    const result = await validateLicense(key);
    if (result.valid) {
      await setLicenseData({
        licenseKey: key,
        licenseType: result.type,
        licenseEmail: result.email || "",
        downloadCount: 0,
        lastValidation: Date.now(),
        cachedInvalid: false
      });
      showStep("input");
      updateLicenseBar(result.type, 0);
    } else {
      // Soru #4: Specific error messages
      const errorMap = {
        network: t.errNetwork,
        invalid: t.errInvalid,
        refunded: t.errRefunded,
        disputed: t.errDisputed,
      };
      showLicenseError(errorMap[result.error] || t.invalidKey);
    }
  } catch (e) {
    showLicenseError(t.validationFailed);
  }

  els.btnActivate.disabled = false;
  els.btnActivate.textContent = t.activateBtn;
}

function showLicenseError(msg) {
  els.licenseError.style.display = msg ? "block" : "none";
  els.licenseError.textContent = msg;
}

async function validateLicense(key) {
  // Try monthly product first
  try {
    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        product_id: "BuuG7LGEO7yEPQgNQE3J2A==",
        license_key: key,
        increment_uses_count: "true"
      })
    });
    const data = await res.json();
    if (data.success && data.product_id === "BuuG7LGEO7yEPQgNQE3J2A==") {
      if (data.purchase?.refunded) return { valid: false, error: "refunded" };
      if (data.purchase?.disputed) return { valid: false, error: "disputed" };
      return { valid: true, type: "monthly", email: data.purchase?.email };
    }
  } catch (e) {
    console.error("Monthly validation error:", e);
    return { valid: false, error: "network" };
  }

  // Try free trial product
  try {
    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        product_id: "O5BcIGctkjDqMBf-CGrvAg==",
        license_key: key,
        increment_uses_count: "true"
      })
    });
    const data = await res.json();
    if (data.success) {
      if (data.purchase?.refunded) return { valid: false, error: "refunded" };
      if (data.purchase?.disputed) return { valid: false, error: "disputed" };
      return { valid: true, type: "free_trial", email: data.purchase?.email };
    }
  } catch (e) {
    console.error("Free trial validation error:", e);
    return { valid: false, error: "network" };
  }

  return { valid: false, error: "invalid" };
}

async function onAnalyze() {
  const from = els.fromDate.value;
  const to = els.toDate.value;
  if (!from || !to) { addLog(t.noOrders, "error"); return; }
  if (from > to) { addLog(t.dateOrder, "error"); return; }

  els.btnAnalyze.disabled = true;
  els.btnAnalyze.textContent = t.analyzingBtn;
  els.progressTitle.textContent = t.analyzingBtn;
  els.logEl.textContent = "";
  showStep("progress");
  addLog(`${t.analyzeBtn}: ${from} → ${to}`, "info");

  chrome.runtime.sendMessage({ type: "start", fromDate: from, toDate: to });
}

function onCancel() {
  chrome.runtime.sendMessage({ type: "abort" });
  els.logEl.textContent = "";
  showStep("input");
  els.btnAnalyze.disabled = false;
  els.btnAnalyze.textContent = t.analyzeBtn;
}

function onStop() {
  chrome.runtime.sendMessage({ type: "abort" });
  els.logEl.textContent = "";
  showStep("input");
  els.btnAnalyze.disabled = false;
  els.btnAnalyze.textContent = t.analyzeBtn;
}

function onDownload() {
  els.progressTitle.textContent = t.downloading;
  els.logEl.textContent = "";
  chrome.runtime.sendMessage({ type: "startDownload" });
  showStep("progress");
}

function onNew() {
  els.logEl.textContent = "";
  showStep("input");
  els.btnAnalyze.disabled = false;
  els.btnAnalyze.textContent = t.analyzeBtn;
}

function onMessage(msg) {
  switch (msg.type) {
    case "stateChange":
      if (msg.state.phase === "IDLE") {
        els.logEl.textContent = "";
        showStep("input");
        els.btnAnalyze.disabled = false;
        els.btnAnalyze.textContent = t.analyzeBtn;
      }
      break;

    case "reviewOrders":
      showStep("review");
      const dateRange = `${msg.fromDate} \u2192 ${msg.toDate}`;
      els.reviewSummary.textContent = "";
      const rangeDiv = document.createElement("div");
      rangeDiv.className = "date-range-label";
      rangeDiv.textContent = `${t.dateRangeLabel}: ` + dateRange;
      els.reviewSummary.appendChild(rangeDiv);
      const totalDiv = document.createElement("div");
      totalDiv.textContent = `${msg.total} order(s) found`;
      els.reviewSummary.appendChild(totalDiv);
      // Soru #5: No orders found — helpful message
      if (msg.total === 0) {
        const hintDiv = document.createElement("div");
        hintDiv.className = "no-orders-hint";
        hintDiv.textContent = t.noOrdersFound;
        els.reviewSummary.appendChild(hintDiv);
      }
      els.reviewList.textContent = "";
      const sorted = [...msg.orders].sort((a, b) => {
        const ma = a.dateText.match(/(\w{3})\s+(\d+)/);
        const mb = b.dateText.match(/(\w{3})\s+(\d+)/);
        return parseInt(ma[2]) - parseInt(mb[2]);
      });
      for (const o of sorted) {
        const row = document.createElement("div");
        row.className = "review-row";
        const idSpan = document.createElement("span");
        idSpan.className = "order-id";
        idSpan.textContent = o.orderId;
        const dateSpan = document.createElement("span");
        dateSpan.className = "order-date";
        dateSpan.textContent = o.dateText;
        row.appendChild(idSpan);
        row.appendChild(dateSpan);
        els.reviewList.appendChild(row);
      }
      els.btnDownload.textContent = `${t.downloadAllBtn} (${msg.total})`;
      break;

    case "progress":
      els.countOk.textContent = msg.ok || 0;
      els.countFail.textContent = msg.fail || 0;
      if (msg.total && msg.index !== undefined) {
        const pct = Math.round((msg.index / msg.total) * 100);
        els.progressFill.style.width = Math.min(pct, 100) + "%";
      }
      if (msg.current) {
        els.progressInfo.textContent = `${t.current}: ${msg.current}`;
      }
      break;

    case "complete":
      els.progressFill.style.width = "100%";
      showStep("complete");
      renderCompleteSummary(msg);
      break;

    case "log":
      addLog(msg.text);
      break;
  }
}

function showStep(step) {
  els.stepLicense.style.display = "none";
  els.stepInput.style.display = "none";
  els.stepReview.style.display = "none";
  els.stepProgress.style.display = "none";
  els.stepComplete.style.display = "none";
  const map = {
    license: "stepLicense",
    input: "stepInput",
    review: "stepReview",
    progress: "stepProgress",
    complete: "stepComplete"
  };
  const el = els[map[step]];
  if (el) el.style.display = "block";
}

function addLog(text, type = "") {
  const entry = document.createElement("div");
  entry.className = "log-entry" + (type ? " " + CSS.escape(type) : "");
  const time = new Date().toLocaleTimeString();
  entry.textContent = `[${time}] ${text}`;
  els.logEl.appendChild(entry);
  els.logEl.scrollTop = els.logEl.scrollHeight;
}

function renderCompleteSummary(data) {
  const ok = data.ok || 0;
  const fail = data.fail || 0;
  const total = ok + fail;
  els.completeSummary.textContent = "";
  const okSpan = document.createElement("span");
  okSpan.className = "ok";
  okSpan.textContent = `${t.ok}: ` + ok;
  const sep1 = document.createTextNode(" | ");
  const failSpan = document.createElement("span");
  failSpan.className = "fail";
  failSpan.textContent = `${t.fail}: ` + fail;
  const sep2 = document.createTextNode(` | ${t.total}: ` + total);
  els.completeSummary.appendChild(okSpan);
  els.completeSummary.appendChild(sep1);
  els.completeSummary.appendChild(failSpan);
  els.completeSummary.appendChild(sep2);

  els.completeList.textContent = "";
  const orders = data.orders || [];
  const errors = data.errors || [];
  const failedOrderIds = errors.map(e => e.split(":")[0].trim());

  for (const o of orders) {
    const isFailed = failedOrderIds.includes(o.orderId);
    const row = document.createElement("div");
    row.className = "complete-row" + (isFailed ? " failed" : " success");
    const icon = isFailed ? "\u2717" : "\u2713";
    const iconSpan = document.createElement("span");
    iconSpan.className = "status-icon";
    iconSpan.textContent = icon;
    const idSpan = document.createElement("span");
    idSpan.className = "order-id";
    idSpan.textContent = o.orderId;
    const dateSpan = document.createElement("span");
    dateSpan.className = "order-date";
    dateSpan.textContent = o.dateText;
    row.appendChild(iconSpan);
    row.appendChild(idSpan);
    row.appendChild(dateSpan);
    els.completeList.appendChild(row);
  }
}

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

document.addEventListener("DOMContentLoaded", init);
