// content/order-page.js
// This script runs on AliExpress order/list and order detail pages.
// It adds a "Download Invoice" button next to each order (in the list) or on the order detail page.

// Wait for DOM to be ready
function waitForElement(selector, callback, timeout = 5000) {
  const start = Date.now();
  const interval = setInterval(() => {
    const element = document.querySelector(selector);
    if (element) {
      clearInterval(interval);
      callback(element);
    } else if (Date.now() - start > timeout) {
      clearInterval(interval);
      console.warn('Timeout waiting for element:', selector);
    }
  }, 50);
}

// Function to extract order ID from the page (different for list and detail)
function getOrderIdFromPage() {
  // Try to get from URL: https://www.aliexpress.com/order/XXXXX.htm
  const urlMatch = window.location.pathname.match(/\/order\/(\d+)\./);
  if (urlMatch) return urlMatch[1];

  // Try to get from order list items (each item has data-order-id)
  const orderItem = document.querySelector('[data-order-id]');
  if (orderItem) return orderItem.getAttribute('data-order-id');

  // Try to get from detail page (maybe in a hidden input or data attribute)
  const detailId = document.querySelector('[data-id]');
  if (detailId) return detailId.getAttribute('data-id');

  return null;
}

// Function to add button to order list items
function enhanceOrderList() {
  const orderItems = document.querySelectorAll('.order-item, .order-list-item, [data-order-id]');
  orderItems.forEach(item => {
    // Avoid adding multiple buttons
    if (item.querySelector('.invoice-download-btn')) return;

    const orderId = item.getAttribute('data-order-id');
    if (!orderId) return;

    const btn = document.createElement('button');
    btn.textContent = '下载发票'; // Chinese for "Download Invoice"
    btn.className = 'invoice-download-btn';
    btn.style.marginLeft = '8px';
    btn.style.padding = '2px 6px';
    btn.style.fontSize = '12px';
    btn.style.backgroundColor = '#ff6a00'; // AliExpress orange
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '2px';
    btn.style.cursor = 'pointer';

    btn.addEventListener('click', () => {
      // Send message to background to get invoice
      chrome.runtime.sendMessage({
        type: 'GET_INVOICE',
        orderId: orderId,
        billType: 1, // normal invoice
        // We'll need to get cookies and userAgent from the background? Actually we can get them from content script.
        // But the background expects cookies and userAgent in the message. Let's get them here.
        cookies: document.cookie,
        userAgent: navigator.userAgent
      }, response => {
        if (response.error) {
          alert('Error: ' + response.error);
          return;
        }
        if (response.result) {
          // We have the invoice JSON, now we need to generate PDF.
          // Send a message to background to generate PDF via offscreen.
          chrome.runtime.sendMessage({
            type: 'GET_PDF',
            data: response.result
          });
        }
      });
    });

    // Find a good place to insert the button (after the order actions or at the end of the item)
    const actions = item.querySelector('.order-actions, .order-operations, .btn-group');
    if (actions) {
      actions.appendChild(btn);
    } else {
      item.appendChild(btn);
    }
  });
}

// Function to add button to order detail page
function enhanceOrderDetail() {
  // Avoid adding multiple buttons
  if (document.querySelector('.invoice-download-btn-detail')) return;

  const orderId = getOrderIdFromPage();
  if (!orderId) return;

  const btn = document.createElement('button');
  btn.textContent = '下载发票';
  btn.className = 'invoice-download-btn-detail';
  btn.style.margin = '10px';
  btn.style.padding = '8px 16px';
  btn.style.fontSize = '14px';
  btn.style.backgroundColor = '#ff6a00';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '4px';
  btn.style.cursor = 'pointer';

  btn.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'GET_INVOICE',
      orderId: orderId,
      billType: 1,
      cookies: document.cookie,
      userAgent: navigator.userAgent
    }, response => {
      if (response.error) {
        alert('Error: ' + response.error);
        return;
      }
      if (response.result) {
        chrome.runtime.sendMessage({
          type: 'GET_PDF',
          data: response.result
        });
      }
    });
  });

  // Find a good place to insert (near the order info or action buttons)
  const container = document.querySelector('.order-info, .order-detail-wrap, .order-infos');
  if (container) {
    container.appendChild(btn);
  } else {
    // fallback to body
    document.body.appendChild(btn);
  }
}

// Main
(function() {
  // Wait for the page to load fully
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Check if we are on order list or detail page
    const path = window.location.pathname;
    if (path.includes('/order/list') || path.includes('/trade/orderList')) {
      // Order list page
      waitForElement('.order-item, .order-list-item, [data-order-id]', enhanceOrderList);
    } else if (path.includes('/order/')) {
      // Order detail page
      waitForElement('.order-info, .order-detail-wrap, [data-id]', enhanceOrderDetail);
    }
    // Also, we might want to re-check after AJAX updates (optional)
    // setInterval(enhanceOrderList, 2000);
    // setInterval(enhanceOrderDetail, 2000);
  }
})();