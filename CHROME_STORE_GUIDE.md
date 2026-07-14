# Chrome Web Store - Submission Guide

## Extension Info

- **Name:** AliExpress Receipt Downloader
- **Version:** 1.1.0
- **Category:** Developer Tools (or Shopping)
- **Language:** English, Turkish (auto-detected)

---

## Short Description (132 chars max)

Download AliExpress order receipts by date range. Free trial available — no credit card required.

---

## Detailed Description

**Download AliExpress order receipts effortlessly with just a few clicks.**

AliExpress Receipt Downloader is a Chrome extension that lets you bulk download order receipts from your AliExpress account by selecting a date range.

**How it works:**
1. Open your AliExpress Orders page
2. Select a date range
3. Click ANALYZE to find all orders in that period
4. Review the order list
5. Click DOWNLOAD ALL to save receipts to your computer

**Important:** AliExpress language must be set to English for order date parsing to work correctly.

**Features:**
• **Free Trial** — 10 free invoice downloads, no credit card required
• **Date Range Filter** — Pick exactly which orders to download
• **Bulk Download** — Download hundreds of receipts in one session
• **Smart Loading** — Automatically loads all orders before downloading
• **Progress Tracking** — Real-time progress bar with success/fail counts
• **Stop & Resume** — Cancel anytime and start fresh
• **Bilingual Interface** — English and Turkish UI (auto-detected from browser language)

**Supported Plans:**
• **Free Trial ($0):** 10 invoice downloads — try before you buy
• **Monthly Plan ($10/mo):** Unlimited invoice downloads

**Privacy & Security:**
• No browsing data collected
• No analytics or tracking
• License key validated through Gumroad API
• Server-side license validation on each session and periodically during downloads
• Refund and dispute detection — revoked licenses are blocked automatically
• Clear, specific error messages for easy troubleshooting
• All data stored locally on your device

**Open Source:** https://github.com/TRDEFI/ali-invoice-extension

---

## Permission Justifications

### `storage`
**Why needed:** To store your license key, license type (Monthly or Free Trial), and download count locally on your device. This allows the extension to remember your subscription status and enforce download limits for trial users without requiring an internet connection for every operation.

### `downloads`
**Why needed:** To save order receipt images/PDFs from AliExpress to your computer's default Downloads folder. This is the core functionality of the extension — without this permission, receipts cannot be saved to your device.

### `tabs`
**Why needed:** To manage the AliExpress orders tab for navigation, content script injection, and message passing during the download process. The extension needs to open/navigate AliExpress pages and communicate with content scripts to extract order data.

### `*://*.aliexpress.com/p/order/*`
**Why needed:** To access your AliExpress order pages and order detail pages. The extension reads order IDs and dates from the orders list, and triggers receipt downloads from individual order detail pages. This permission is restricted only to AliExpress order pages — no other websites or pages are accessed.

### `*://api.gumroad.com/*`
**Why needed:** To validate your license key with Gumroad's API when you activate the extension, and to periodically verify your license is still valid (not refunded or disputed). This ensures only active subscribers can use the extension.

---

## Privacy Policy URL

https://trdefi.github.io/ali-invoice-extension/

---

## Screenshots

### Screenshot 1 (1280x800): License Screen
Shows the extension popup with the license activation screen:
- Two plan cards (Free Trial $0, Monthly $10)
- License key input field
- ACTIVATE button

### Screenshot 2 (1280x800): Main Interface
Shows the extension popup with the date range selection:
- License bar showing active plan and remaining downloads
- Date range inputs (From → To)
- ANALYZE button

### Screenshot 3 (1280x800): Download Progress
Shows the extension during active download:
- Progress bar
- Success/Fail counters
- Real-time log output
- STOP button

---

## Store Icon

128x128 PNG — Available at: `aliexpress-receipt-ext/icons/icon128.png`

---

## Notes

- Extension uses Manifest V3 (required for Chrome Web Store)
- No remote code — all JavaScript is bundled locally
- Single purpose: Download AliExpress order receipts
- No analytics, no tracking, no data collection beyond license validation
- Server-side license validation via Gumroad API (on activation, popup open, and periodically during downloads)
- Refund and dispute detection via Gumroad API
- AliExpress must be set to English for date parsing to work
- Specific error messages for network, invalid key, refund, and dispute scenarios
