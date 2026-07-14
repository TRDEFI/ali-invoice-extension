# AliExpress Receipt Downloader

A Chrome extension that downloads AliExpress order receipts by date range.

## Features

- **Free Trial** — 10 free invoice downloads, no credit card required
- **Date Range Filter** — Pick exactly which orders to download
- **Bulk Download** — Download hundreds of receipts in one session
- **Smart Loading** — Automatically loads all orders before downloading
- **Progress Tracking** — Real-time progress bar with success/fail counts
- **Stop & Resume** — Cancel anytime and start fresh
- **Bilingual Interface** — English and Turkish UI (auto-detected from browser language)
- **Server-side Validation** — License validated on each session and periodically during use

## How It Works

1. Open https://www.aliexpress.com/p/order/index.html (must be logged in)
2. Click the extension icon → set date range → click ANALYZE
3. Review found orders → click DOWNLOAD ALL
4. Receipts save to your Chrome Downloads folder

**Important:** AliExpress language must be set to English for order date parsing to work correctly.

## Supported Plans

| Plan | Price | Downloads |
|------|-------|-----------|
| Free Trial | $0 | 10 invoices |
| Monthly | $10/mo | Unlimited |

## Permissions

| Permission | Why |
|-----------|-----|
| `storage` | Store license key, license type, and download count locally |
| `downloads` | Save receipt PNG files to your computer |
| `tabs` | Manage AliExpress tab for navigation and message passing |
| `aliexpress.com/p/order/*` | Access order pages and receipt iframes |
| `api.gumroad.com` | Validate license key and detect refunds/disputes |

## Installation (Developer Mode)

1. Download the ZIP from Releases
2. Unzip to a folder
3. Open `chrome://extensions`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked**
6. Select the unzipped folder

## Usage

1. Make sure you're logged into AliExpress
2. Navigate to your orders page
3. Click the extension toolbar icon
4. Enter your license key or start Free Trial
5. Select date range → **ANALYZE**
6. Review the order list → **DOWNLOAD ALL**
7. Receipts appear in your Downloads folder as PNG files

## Building from Source

```
git clone https://github.com/TRDEFI/ali-invoice-extension.git
cd ali-invoice-extension
# No build step needed — pure JavaScript
```

## License

MIT
