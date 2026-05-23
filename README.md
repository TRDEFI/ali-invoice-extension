# AliExpress Invoice Downloader Chrome Extension

This extension allows you to download official invoices for your AliExpress orders by using your logged-in session and calling AliExpress's internal mtop API.

## Features

- Adds a "下载发票" (Download Invoice) button on AliExpress order list and order detail pages.
- Fetches invoice data via signed mtop requests using your session cookies.
- Generates a PDF invoice that matches the official AliExpress layout.
- Handles basic throttling and CAPTCHA prompts (requires manual solving if encountered).

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the folder containing this extension (the folder with `manifest.json`).
5. The extension should now appear in your toolbar.

## Usage

1. Click the extension icon in the toolbar.
2. In the popup, click "Log in to AliExpress".
3. A new tab will open to `aliexpress.com`. Log in with your AliExpress account.
4. After logging in, return to the extension popup and click "Allow access" (or simply close the popup; the extension will have captured your session cookies).
5. Now visit any AliExpress order list page (e.g., `https://www.aliexpress.com/order/list.htm`) or an order detail page.
6. You should see a orange button labeled "下载发票" next to each order.
7. Click the button to download the invoice as a PDF.

## How It Works

- The extension stores your AliExpress session cookies (including `_m_h5_tk` and `_m_h5_tk_enc`) encrypted in `chrome.storage.sync`.
- When you request an invoice, it builds a signed mtop request to `https://gateway.aliexpress.com/h5/mtop.aliexpress.com.trade.order.getInvoice/2.0/` using the public appKey `23861257` and an MD5 signature.
- The response is a JSON containing the invoice details, which is then formatted into a PDF using jsPDF.
- The PDF is generated in an offscreen document and sent back to the content script for download.

## Notes

- The extension only works while you are logged into AliExpress. If you log out, you will need to repeat the login step.
- For security, the extension does not transmit your cookies or credentials to any external server. All processing happens locally in your browser.
- If you encounter a CAPTCHA (slide puzzle), you will need to solve it manually in the popup that appears. The extension will then retry the request.
- The extension is provided as-is. Use at your own risk. It is intended for personal use to download invoices for your own orders.

## Troubleshooting

- **No button appears**: Make sure you are on an AliExpress order list or detail page. Try refreshing the page.
- **Error: Missing _m_h5_tk token**: This means you are not logged in or the extension did not capture your cookies. Repeat the login step.
- **Error: CAPTCHA required**: Solve the CAPTCHA that appears in a popup, then try again.
- **Error: Invalid JSONP response**: The AliExpress API may have changed. Please report an issue.

## Building the PDF

The extension uses two methods for PDF generation (fallback):
1. **Primary**: Uses jsPDF to layout the invoice data (in `offscreen/offscreen.html`).
2. **Fallback**: If jsPDF fails, you can switch to using `window.print()` with a CSS template (commented out in the offscreen file).

## Credits

- Based on the open-source project: https://github.com/Johennes/aliexpress-invoice-generator
- MD5 implementation: public domain.

## License

MIT
