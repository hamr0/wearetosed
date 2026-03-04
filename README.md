# wearetosed

> Score any terms of service — know what you're agreeing to.

**Every "I agree" is a blind handshake.** Privacy policies and terms of service are designed to be unread. They bury data selling behind "trusted partners", strip your right to sue behind "binding arbitration", and reserve the right to change everything "without notice".

wearetosed scores every privacy policy and terms page you visit from 0 to 100 based on red flags it finds in the text. No AI, no cloud lookups — just regex pattern matching against the page content. Navigate to any site's /privacy or /terms page and the badge lights up.

Part of the **weare____** privacy tool series.

## What it detects

### Data sharing & selling
"Share your information with third parties", "sell your data", "transfer to partners", "provide to affiliates". The clauses that turn your data into a product.

### Tracking & profiling
"Track across websites", "build a profile", "collect browsing history", "web beacons", "automatically collect". The surveillance infrastructure described in plain sight.

### Data retention
"Retain indefinitely", "keep as long as necessary", "even after you delete your account", "no obligation to delete". Your data outlives your relationship with the service.

### Law enforcement access
"Respond to subpoenas", "law enforcement requests", "cooperate with authorities", "national security". How quickly your data moves from private to public.

### Rights & liability waivers
"Binding arbitration", "class action waiver", "waive your right", "as-is", "without warranties", "limitation of liability". The clauses that protect them, not you.

### Unilateral control
"Modify these terms at any time", "without prior notice", "sole discretion", "continued use constitutes acceptance". They can change the deal whenever they want.

## How scoring works

Score = (categories detected × 8) + (total unique matches × 2), capped at 100. More categories and more matches within each category both increase the score.

| Score | Badge | Meaning |
|---|---|---|
| 0 | Green | No red flags found. |
| 1–20 | Green | Standard boilerplate. |
| 21–60 | Orange | Watch what you agree to. |
| 61–100 | Red | You're getting tossed. |

## How it works

1. **On any page**: finds privacy/terms links in the DOM, fetches them, and scans the text
2. **On a policy page**: detects it via URL, hostname, title, and h1 heuristics — scans the rendered content directly
3. **SPA support**: MutationObserver re-scans when content loads after initial render; detects pushState/overlay navigations (Etsy, etc.)
4. **Cross-origin fallback**: if content script fetch fails (CORS), routes through background script
5. **Caching**: results cached per domain so repeat visits are instant

All processing is local. No data leaves your browser.

## Install

### Chrome
1. Clone or download this repo
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `chrome-extension/` folder

### Firefox
1. Clone or download this repo
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on** → select any file inside the `firefox-extension/` folder

Visit any site — wearetosed auto-fetches its privacy policy and terms. Or navigate directly to a site's policy page for a guaranteed scan.

## Project structure

```
chrome-extension/     # Chrome MV3
firefox-extension/    # Firefox MV2
  scanner.js          # Shared regex scanner (6 categories)
  content.js          # Page detection, link discovery, fetch + SPA handling
  background.js       # Caching, badge, cross-origin fetch fallback
  popup.html/js/css   # Score + breakdown UI
```
