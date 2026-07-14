let abortLoading = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "abortLoading") {
    abortLoading = true;
    sendResponse({ ok: true });
    return;
  }
  const handler = COMMANDS[msg.type];
  if (handler) {
    handler(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
});

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function parseOrderDate(dateText) {
  const m = dateText.match(/([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (month === undefined) return null;
  return new Date(parseInt(m[3]), month, parseInt(m[2]));
}

const COMMANDS = {};

COMMANDS.ping = async () => ({ ok: true });

COMMANDS.loadAllOrders = async (msg) => {
  abortLoading = false;
  const fromDateStr = msg.fromDate;
  let fromDate = null;
  if (fromDateStr) {
    const [y, m, d] = fromDateStr.split('-').map(Number);
    fromDate = new Date(y, m - 1, d);
  }

  let noNewCount = 0;
  for (let i = 0; i < 50; i++) {
    if (abortLoading) return { ok: true, total: document.querySelectorAll("div.order-item").length, aborted: true };

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2000);

    const btn = document.querySelector("button.comet-btn-borderless");
    if (btn && btn.textContent.trim() === "View orders") {
      btn.scrollIntoView({ behavior: "instant", block: "center" });
      btn.click();
      await sleep(4000);

      if (fromDate) {
        const items = document.querySelectorAll("div.order-item");
        const lastItem = items[items.length - 1];
        if (lastItem) {
          const text = lastItem.textContent || "";
          const dateMatch = text.match(/Date:\s*([A-Za-z]{3}\s+\d{1,2},?\s+\d{4})/);
          if (dateMatch) {
            const oldestDate = parseOrderDate(dateMatch[1]);
            if (oldestDate && oldestDate < fromDate) {
              return { ok: true, total: items.length, cutoff: true };
            }
          }
        }
      }
    } else {
      const prev = document.querySelectorAll("div.order-item").length;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(3000);
      const curr = document.querySelectorAll("div.order-item").length;
      if (curr === prev) {
        noNewCount++;
        if (noNewCount >= 2) break;
      } else {
        noNewCount = 0;
      }
    }
  }
  const total = document.querySelectorAll("div.order-item").length;
  return { ok: true, total };
};

COMMANDS.getOrderList = async () => {
  const items = document.querySelectorAll("div.order-item");
  const orders = [];
  for (const el of items) {
    const text = el.textContent || "";
    const dateMatch = text.match(/Date:\s*([A-Za-z]{3}\s+\d{1,2},?\s+\d{4})/);
    const refMatch = text.match(/Ref\.?\s*Number[:\s]*(\d+)/);
    if (refMatch && dateMatch) {
      orders.push({ orderId: refMatch[1], dateText: dateMatch[1] });
    }
  }
  return { ok: true, orders };
};

COMMANDS.navigateToDetail = async (msg) => {
  const { orderId } = msg;
  if (!/^\d+$/.test(orderId)) return { ok: false, error: "Invalid orderId" };
  window.location.href = `https://www.aliexpress.com/p/order/detail.html?orderId=${orderId}`;
  return { ok: true };
};

COMMANDS.clickReceipt = async () => {
  const btns = document.querySelectorAll("button.comet-btn");
  for (const b of btns) {
    if (b.textContent.trim() === "Receipt") {
      b.click();
      return { ok: true };
    }
  }
  return { ok: false, error: "Receipt button not found" };
};

COMMANDS.clickDownload = async () => {
  const frames = document.querySelectorAll("iframe");
  for (const f of frames) {
    if (!(f.src || "").includes("tax-ui")) continue;
    try {
      const doc = f.contentDocument;
      if (!doc) continue;
      const btn = doc.querySelector("#download-receipt");
      if (btn) {
        btn.click();
        return { ok: true };
      }
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  return { ok: false, error: "Tax iframe not found" };
};

COMMANDS.waitForIframe = async () => {
  for (let i = 0; i < 30; i++) {
    const frames = document.querySelectorAll("iframe");
    for (const f of frames) {
      if ((f.src || "").includes("tax-ui")) return { ok: true };
    }
    await sleep(500);
  }
  return { ok: false, error: "Tax iframe did not appear" };
};

COMMANDS.goBack = async () => {
  window.location.href = "https://www.aliexpress.com/p/order/index.html";
  return { ok: true };
};

COMMANDS.getPageInfo = async () => {
  const url = window.location.href;
  const isOrdersPage = url.includes("/order/index.html");
  const isDetailPage = url.includes("/order/detail.html");
  const detailMatch = url.match(/orderId=(\d+)/);
  const hasTaxIframe = Array.from(document.querySelectorAll("iframe")).some(f =>
    (f.src || "").includes("tax-ui")
  );
  const isEmptyLogin = document.querySelector(".comet-breadcrumb") === null;
  return {
    url: url.substring(0, 120),
    isOrdersPage,
    isDetailPage,
    orderId: detailMatch ? detailMatch[1] : null,
    hasTaxIframe,
    isEmptyLogin,
  };
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
