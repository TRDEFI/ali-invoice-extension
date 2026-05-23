// background/service-worker.js
// Handles messages from content script and offscreen document.
// Manages request queue, signing, and PDF generation.

// Simple in-memory queue (could be persisted in storage)
const requestQueue = [];
let isProcessing = false;

// MD5 helper (we'll import from lib/md5.js via importScripts)
// Since service worker cannot use ES modules easily, we'll use importScripts.

// We'll import the md5 function from a separate file.
importScripts('lib/md5.js');

// Function to sign mtop request
function signMtopRequest(appKey, token, t, data) {
  // AliExpress uses MD5(appKey + t + token + data)
  const str = appKey + t + token + data;
  return md5(str);
}

// Function to build mtop URL
function buildMtopUrl(api, v, data, appKey, t, sign) {
  const base = `https://gateway.aliexpress.com/h5/mtop.${api}/${v}/`;
  const params = new URLSearchParams({
    jsv: '2.4.8',
    appKey: appKey,
    t: t.toString(),
    sign: sign,
    data: encodeURIComponent(data),
    api: `mtop.${api}`,
    v: v,
    type: 'originaljson',
    timeout: '20000',
    dataType: 'json',
    callback: 'mtopjsonp2'
  });
  return base + '?' + params.toString();
}

// Process queue
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;
  isProcessing = true;
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    try {
      const response = await fetch(request.url, {
        method: 'GET',
        headers: request.headers,
        credentials: 'include' // include cookies
      });
      const text = await response.text();
      // JSONP response: mtopjsonp2({...})
      const jsonMatch = text.match(/^mtopjsonp2\((.*)\)$/);
      if (!jsonMatch) {
        throw new Error('Invalid JSONP response');
      }
      const jsonStr = jsonMatch[1];
      const data = JSON.parse(jsonStr);
      // Check for CAPTCHA
      if (data.ret && data.ret[0] === 'LOGIN_FAILED' && data.captcha) {
        // TODO: handle captcha - for now, reject and let content script handle
        request.reject(new Error('CAPTCHA required'));
        continue;
      }
      request.resolve(data);
    } catch (err) {
      request.reject(err);
    }
  }
  isProcessing = false;
}

// Listen for messages from content script or offscreen
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_INVOICE') {
    // Enqueue request
    const { orderId, billType, cookies, userAgent } = msg;
    // Build data payload
    const dataObj = {
      orderId: orderId,
      billType: billType || 1
    };
    const data = JSON.stringify(dataObj);
    const appKey = '23861257'; // public appKey for international site
    const t = Math.floor(Date.now() / 1000);
    // Extract token from _m_h5_tk cookie from the provided cookies string
    const tokenMatch = cookies ? cookies.match(/_m_h5_tk=([^;]+)/) : null;
    const token = tokenMatch ? tokenMatch[1].split('_')[0] : '';
    if (!token) {
      sendResponse({ error: 'Missing _m_h5_tk token' });
      return;
    }
    const sign = signMtopRequest(appKey, token, t, data);
    const url = buildMtopUrl('aliexpress.com.trade.order.getInvoice', '2.0', data, appKey, t, sign);
    const headers = {
      'cookie': cookies,
      'referer': 'https://www.aliexpress.com/',
      'user-agent': userAgent,
      'accept': 'application/json'
    };
    // Create promise
    let resolveFn, rejectFn;
    const promise = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });
    requestQueue.push({ url, headers, resolve: resolveFn, reject: rejectFn });
    // Start processing if not already
    if (!isProcessing) {
      processQueue();
    }
    // Wait for result
    promise.then(result => {
      sendResponse({ result });
    }).catch(err => {
      sendResponse({ error: err.message });
    });
    // Return true to indicate we will respond asynchronously
    return true;
  }
  if (msg.type === 'GET_PDF') {
    // Offscreen document will handle PDF generation
    // We'll just forward the message to offscreen document
    chrome.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Invoice PDF generation'
    }).then(() => {
      // Send message to offscreen document
      chrome.runtime.sendMessage({ type: 'GENERATE_PDF', data: msg.data });
    });
    return true;
  }
});

// Listen for messages from offscreen document (when PDF is ready)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'PDF_READY') {
    // Send the blob back to the original sender (content script)
    // We need to keep a mapping; for simplicity, we'll just forward.
    // In a real extension, we'd use a message channel.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'PDF_READY', blob: msg.blob });
      }
    });
  }
});
