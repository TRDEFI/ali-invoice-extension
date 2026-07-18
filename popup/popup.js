const port = chrome.runtime.connect({ name: "popup" });
const els = {};

const GUMROAD_MONTHLY_URL = "https://trdefi.gumroad.com/l/monthly";
const TRIAL_LIMIT = 10;

const LANG = {
  en: {
    activateTitle: "Activate Your Access",
    monthlyName: "MONTHLY",
    monthlyPrice: "$10",
    monthlyPeriod: "/mo",
    monthlyFeature: "Unlimited invoices",
    freeTrialName: "FREE TRIAL",
    freeTrialPrice: "$0",
    freeTrialFeature: "10 invoices free",
    subscribeBtn: "Start Free",
    emailLabel: "Email Address",
    emailPlaceholder: "your@email.com",
    activateBtn: "START FREE",
    validatingBtn: "CHECKING...",
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
    invalidEmail: "Please enter a valid email address",
    emailAlreadyUsed: "This email is already registered. One free trial per email.",
    noOrders: "Please select both dates",
    dateOrder: "Start date must be before end date",
    noOrdersFound: "No orders found. Make sure AliExpress language is set to English (top-right corner).",
    errNetwork: "Could not connect to server. Check your internet connection.",
    limitReachedTitle: "Limit Reached",
    limitReachedMsg: "You've used all 10 free trial invoices. Upgrade to Monthly for unlimited downloads.",
    upgradeBtn: "UPGRADE TO MONTHLY - $10/mo",
    upgradeFeature: "Unlimited invoices, no limits",
    checking: "Checking...",
    monthlyLabel: "Monthly License Key",
    monthlyPlaceholder: "XXXX-XXXX-XXXX-XXXX",
    monthlyActivateBtn: "AKTIVE ET / ACTIVATE",
    monthlyValidating: "VALIDATING...",
    monthlyInvalidKey: "Invalid license key. Please check and try again.",
    monthlySuccess: "Monthly plan activated! Unlimited downloads.",
    errRefunded: "This purchase has been refunded. License deactivated.",
    errDisputed: "This purchase is disputed. License deactivated.",
  },
  tr: {
    activateTitle: "Erisiminizi Aktive Edin / Activate Your Access",
    monthlyName: "AYLIK / MONTHLY",
    monthlyPrice: "$10",
    monthlyPeriod: "/ay",
    monthlyFeature: "Sinirsiz fatura / Unlimited invoices",
    freeTrialName: "UYE DENEME / FREE TRIAL",
    freeTrialPrice: "$0",
    freeTrialFeature: "10 fatura ucretsiz / 10 invoices free",
    subscribeBtn: "Ucretsiz Basla / Start Free",
    emailLabel: "E-posta Adresi / Email Address",
    emailPlaceholder: "ornek@email.com",
    activateBtn: "UCRETSIZ BASLA / START FREE",
    validatingBtn: "KONTROL EDILIYOR / CHECKING...",
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
    invalidEmail: "Gecerli bir e-posta girin / Please enter a valid email address",
    emailAlreadyRegistered: "Bu e-posta zaten kayitli. E-posta basina bir ucretsiz deneme. / This email is already registered. One free trial per email.",
    noOrders: "Her iki tarihi de secin / Select both dates",
    dateOrder: "Baslangic tarihi, bitis tarihinden once olmali / Start date must be before end date",
    noOrdersFound: "Siparis bulunamadi / No orders found. AliExpress Ingilizce olmali / AliExpress must be set to English (top-right).",
    errNetwork: "Baglanti hatasi / Connection error. Internet baglantinizi kontrol edin / Check your internet connection.",
    limitReachedTitle: "Limit Doldu / Limit Reached",
    limitReachedMsg: "10 ucretsiz fatura hakkinizi kullandiniz. Sinirsiz indirme icin Aylik plana gecin. / You've used all 10 free trial invoices. Upgrade to Monthly for unlimited downloads.",
    upgradeBtn: "AYLIK PLANA GEC - $10/ay / UPGRADE TO MONTHLY - $10/mo",
    upgradeFeature: "Sinirsiz fatura, sinir yok / Unlimited invoices, no limits",
    checking: "Kontrol ediliyor / Checking...",
    monthlyLabel: "Aylik Lisans Anahtari / Monthly License Key",
    monthlyPlaceholder: "XXXX-XXXX-XXXX-XXXX",
    monthlyActivateBtn: "AKTIVE ET / ACTIVATE",
    monthlyValidating: "DOGRULANIYOR / VALIDATING...",
    monthlyInvalidKey: "Gecersiz lisans anahtari / Invalid license key. Kontrol edin / Please check and try again.",
    monthlySuccess: "Aylik plan aktif! Sinirsiz indirme. / Monthly plan activated! Unlimited downloads.",
    errRefunded: "Bu satin alim iade edildi. Lisans devre disi. / This purchase has been refunded. License deactivated.",
    errDisputed: "Bu satin alim itiraz edilmis. Lisans devre disi. / This purchase is disputed. License deactivated.",
  }
};

function getLang() {
  try {
    const lang = navigator.language || navigator.userLanguage || "en";
    return lang.toLowerCase().startsWith("tr") ? "tr" : "en";
  } catch (_) {
    return "en";
  }
}
const t = LANG[getLang()];

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
  els.userEmail = $("user-email");
  els.btnActivate = $("btn-activate");
  els.btnSubscribeMonthly = $("btn-subscribe-monthly");
  els.licenseError = $("license-error");
  els.licenseType = $("license-type");
  els.licenseLimit = $("license-limit");
  els.activateTitle = $("activate-title");
  els.freeTrialName = $("free-trial-name");
  els.freeTrialFeature = $("free-trial-feature");
  els.monthlyName = $("monthly-name");
  els.monthlyFeature = $("monthly-feature");
  els.emailLabel = $("email-label");
  els.licenseKey = $("license-key");
  els.btnActivateMonthly = $("btn-activate-monthly");
  els.monthlyLabel = $("monthly-label");

  // Apply translations
  if (els.activateTitle) els.activateTitle.textContent = t.activateTitle;
  if (els.freeTrialName) els.freeTrialName.textContent = t.freeTrialName;
  if (els.freeTrialFeature) els.freeTrialFeature.textContent = t.freeTrialFeature;
  if (els.monthlyName) els.monthlyName.textContent = t.monthlyName;
  if (els.monthlyFeature) els.monthlyFeature.textContent = t.monthlyFeature;
  if (els.emailLabel) els.emailLabel.textContent = t.emailLabel;
  if (els.userEmail) els.userEmail.placeholder = t.emailPlaceholder;
  if (els.btnActivate) els.btnActivate.textContent = t.activateBtn;
  if (els.monthlyLabel) els.monthlyLabel.textContent = t.monthlyLabel;
  if (els.licenseKey) els.licenseKey.placeholder = t.monthlyPlaceholder;
  if (els.btnActivateMonthly) els.btnActivateMonthly.textContent = t.monthlyActivateBtn;

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
  els.btnActivateMonthly.addEventListener("click", onActivateMonthly);
  els.btnSubscribeMonthly.addEventListener("click", () => chrome.tabs.create({ url: GUMROAD_MONTHLY_URL }));

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
  if (!data || (!data.email && !data.licenseKey)) {
    showStep("license");
    return;
  }

  // If monthly, validate with Gumroad
  if (data.licenseType === "monthly") {
    try {
      const result = await chrome.runtime.sendMessage({ type: "validateLicense" });
      if (result && !result.valid) {
        showStep("license");
        showLicenseError(result.reason || t.errNetwork);
        await chrome.storage.local.remove("licenseData");
        return;
      }
    } catch (e) {
      console.warn("License validation error on open:", e);
    }
  }

  // Check current download state — restore correct screen on popup reopen
  try {
    const state = await chrome.runtime.sendMessage({ type: "getState" });
    if (state && state.phase === "COMPLETE") {
      showStep("complete");
      renderCompleteSummary(state);
      const isLimitReached = data.licenseType === "free_trial" && (data.downloadCount || 0) >= TRIAL_LIMIT;
      if (isLimitReached) renderUpgradePrompt();
      return;
    }
    if (state && (state.phase === "DOWNLOADING" || state.phase === "ANALYZING")) {
      els.progressTitle.textContent = state.phase === "ANALYZING" ? t.analyzingBtn : t.downloading;
      if (state.phase === "DOWNLOADING" && state.ok > 0) {
        els.countOk.textContent = state.ok || 0;
        els.countFail.textContent = state.fail || 0;
      }
      showStep("progress");
      return;
    }
    if (state && state.phase === "REVIEW") {
      showStep("review");
      renderReviewFromState(state);
      return;
    }
  } catch (e) {
    console.warn("State restore error:", e);
  }

  showStep("input");
  updateLicenseBar(data.licenseType, data.downloadCount || 0);
}

function renderReviewFromState(state) {
  const dateRange = `${state.fromDate} \u2192 ${state.toDate}`;
  els.reviewSummary.textContent = "";
  const rangeDiv = document.createElement("div");
  rangeDiv.className = "date-range-label";
  rangeDiv.textContent = `${t.dateRangeLabel}: ` + dateRange;
  els.reviewSummary.appendChild(rangeDiv);
  const totalDiv = document.createElement("div");
  totalDiv.textContent = `${state.total} order(s) found`;
  els.reviewSummary.appendChild(totalDiv);
  if (state.total === 0) {
    const hintDiv = document.createElement("div");
    hintDiv.className = "no-orders-hint";
    hintDiv.textContent = t.noOrdersFound;
    els.reviewSummary.appendChild(hintDiv);
  }
  els.reviewList.textContent = "";
  const sorted = [...(state.orders || [])].sort((a, b) => {
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
  els.btnDownload.textContent = `${t.downloadAllBtn} (${state.total})`;
}

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
    const remaining = Math.max(0, TRIAL_LIMIT - count);
    els.licenseLimit.textContent = `${remaining}/${TRIAL_LIMIT} ${t.remaining}`;
    els.licenseLimit.className = "limit";
    if (remaining <= 3) els.licenseLimit.className += " danger";
    else if (remaining <= 5) els.licenseLimit.className += " warning";
  }
}

async function onActivate() {
  const email = els.userEmail.value.trim().toLowerCase();

  // Validate email format
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showLicenseError(t.invalidEmail);
    return;
  }

  els.btnActivate.disabled = true;
  els.btnActivate.textContent = t.validatingBtn;
  showLicenseError("");

  try {
    // 1. Check if email exists and has remaining downloads
    const limitCheck = await chrome.runtime.sendMessage({ type: "checkDownloadLimitRPC", email: email });

    if (limitCheck.allowed) {
      // Email exists with remaining count → login
      await setLicenseData({
        email: email,
        licenseType: "free_trial",
        downloadCount: limitCheck.count || 0,
        createdAt: Date.now()
      });
      showStep("input");
      updateLicenseBar("free_trial", limitCheck.count || 0);
    } else if (limitCheck.reason === "Email not found") {
      // New user → register
      const regResult = await chrome.runtime.sendMessage({ type: "registerEmail", email: email });
      if (regResult && regResult.success) {
        await setLicenseData({
          email: email,
          licenseType: "free_trial",
          downloadCount: 0,
          createdAt: Date.now()
        });
        showStep("input");
        updateLicenseBar("free_trial", 0);
      } else {
        showLicenseError(regResult?.error || t.errNetwork);
      }
    } else {
      // Limit reached
      showLicenseError(t.emailAlreadyRegistered);
    }
  } catch (e) {
    console.error("Activation error:", e);
    showLicenseError(t.errNetwork);
  }

  els.btnActivate.disabled = false;
  els.btnActivate.textContent = t.activateBtn;
}

async function onActivateMonthly() {
  const key = els.licenseKey.value.trim();
  if (!key) {
    showLicenseError(t.monthlyInvalidKey);
    return;
  }

  els.btnActivateMonthly.disabled = true;
  els.btnActivateMonthly.textContent = t.monthlyValidating;
  showLicenseError("");

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
      if (data.purchase?.refunded) {
        showLicenseError(t.errRefunded || t.monthlyInvalidKey);
        els.btnActivateMonthly.disabled = false;
        els.btnActivateMonthly.textContent = t.monthlyActivateBtn;
        return;
      }
      if (data.purchase?.disputed) {
        showLicenseError(t.errDisputed || t.monthlyInvalidKey);
        els.btnActivateMonthly.disabled = false;
        els.btnActivateMonthly.textContent = t.monthlyActivateBtn;
        return;
      }
      // Valid monthly license — save
      await setLicenseData({
        licenseKey: key,
        licenseType: "monthly",
        email: data.purchase?.email || "",
        downloadCount: 0,
        lastValidation: Date.now(),
        cachedInvalid: false
      });
      showStep("input");
      updateLicenseBar("monthly", 0);
      els.btnActivateMonthly.disabled = false;
      els.btnActivateMonthly.textContent = t.monthlyActivateBtn;
      return;
    }
  } catch (e) {
    console.error("Monthly activation error:", e);
  }

  showLicenseError(t.monthlyInvalidKey);
  els.btnActivateMonthly.disabled = false;
  els.btnActivateMonthly.textContent = t.monthlyActivateBtn;
}

function showLicenseError(msg) {
  els.licenseError.style.display = msg ? "block" : "none";
  els.licenseError.textContent = msg;
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

async function onNew() {
  els.logEl.textContent = "";
  chrome.runtime.sendMessage({ type: "clearState" });
  showStep("input");
  els.btnAnalyze.disabled = false;
  els.btnAnalyze.textContent = t.analyzeBtn;
  const data = await getLicenseData();
  if (data) {
    updateLicenseBar(data.licenseType, data.downloadCount || 0);
  }
}

function onMessage(msg) {
  switch (msg.type) {
    case "stateChange":
      if (msg.state.phase === "IDLE") {
        els.logEl.textContent = "";
        showStep("input");
        els.btnAnalyze.disabled = false;
        els.btnAnalyze.textContent = t.analyzeBtn;
        getLicenseData().then(d => {
          if (d) updateLicenseBar(d.licenseType, d.downloadCount || 0);
        });
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
      if (msg.limitReached) {
        renderUpgradePrompt();
      }
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

function renderUpgradePrompt() {
  const existing = document.querySelector(".upgrade-card");
  if (existing) existing.remove();

  const upgradeDiv = document.createElement("div");
  upgradeDiv.className = "upgrade-card";

  const titleDiv = document.createElement("div");
  titleDiv.className = "upgrade-title";
  titleDiv.textContent = t.limitReachedTitle;

  const msgDiv = document.createElement("div");
  msgDiv.className = "upgrade-msg";
  msgDiv.textContent = t.limitReachedMsg;

  const featureDiv = document.createElement("div");
  featureDiv.className = "upgrade-feature";
  featureDiv.textContent = t.upgradeFeature;

  const btn = document.createElement("button");
  btn.className = "btn primary upgrade-btn";
  btn.id = "btn-upgrade-monthly";
  btn.textContent = t.upgradeBtn;
  btn.addEventListener("click", () => {
    chrome.tabs.create({ url: GUMROAD_MONTHLY_URL });
  });

  upgradeDiv.appendChild(titleDiv);
  upgradeDiv.appendChild(msgDiv);
  upgradeDiv.appendChild(featureDiv);
  upgradeDiv.appendChild(btn);

  els.completeSummary.parentNode.insertBefore(upgradeDiv, els.completeSummary.nextSibling);
}

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

document.addEventListener("DOMContentLoaded", init);
