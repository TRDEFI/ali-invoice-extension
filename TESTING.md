# AliExpress Invoice Downloader - Quick Test Guide

## Prerequisites
- Google Chrome (or Chromium-based browser)
- An AliExpress account with some orders

## Steps to Test

1. **Load the Extension**
   - Open Chrome and go to `chrome://extensions`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the folder `/workspace/ali-invoice-extension` (the one containing `manifest.json`)
   - You should see the extension appear in the list with the icon we created.

2. **Initialize Session**
   - Click the extension icon in the toolbar (orange "A" logo)
   - In the popup, click the button "Log in to AliExpress"
   - A new tab will open to `aliexpress.com`. Log in with your AliExpress credentials.
   - After you are logged in, return to the extension popup and click "Allow access" (or simply close the popup). The extension will have stored your session cookies securely.

3. **Navigate to Orders**
   - Go to an AliExpress order list page: https://www.aliexpress.com/order/list.htm
   - Or open any specific order detail page.

4. **Download Invoice**
   - You should see an orange button labeled "下载发票" (Download Invoice) next to each order.
   - Click the button for an order.
   - If all goes well, a PDF will be downloaded (or you may see a prompt to save the PDF).

5. **Troubleshooting**
   - If you see an error about missing `_m_h5_tk` token, you are not logged in or the extension didn't capture the cookies. Repeat step 2.
   - If you see a CAPTCHA prompt, solve the slide puzzle that appears in a popup, then try again.
   - If you get an error about invalid JSONP response, the AliExpress API may have changed; please check the network tab in DevTools to see the actual response.

## Notes for Development
- The extension stores cookies in `chrome.storage.sync` (encrypted). You can inspect this in `chrome://extensions -> Details -> Extension options` if you add an options page.
- The background service worker logs to the console (you can view via `chrome://extensions -> Service worker -> Inspect views: background page`).
- The content script runs on AliExpress pages and adds the button.
- The offscreen document is used to generate the PDF with jsPDF.

## Safety
- Your AliExpress session cookies are stored only in your browser's local storage (encrypted) and are never sent to any external server.
- All mtop requests are made directly to AliExpress's endpoints using your own session.

## Next Steps
If you encounter any issues, please open the Chrome DevTools console (on the extension's background page or the content script) and share the error messages. We can then adjust the code accordingly.

Happy invoicing!