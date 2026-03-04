# wearetosed

> ToS toxicity scorecard — know what you're agreeing to.

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

Each red flag category detected adds 20 points. Maximum score is 100.

| Score | Badge | Meaning |
|---|---|---|
| 0 | Green | No red flags found. |
| 1–20 | Green | Standard boilerplate. |
| 21–60 | Orange | Watch what you agree to. |
| 61–100 | Red | You're getting tossed. |

## How it works

1. **content.js** checks if the current page is a policy/terms page (URL pattern + title/h1 heuristics)
2. If yes, extracts the main text content and runs 6 regex-based scanners
3. Results are sent to **background.js** which stores them per tab and updates the badge
4. **popup.js** renders the toxicity score and breakdown by section
5. Non-policy pages show "Not a privacy policy or terms page"

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

Navigate to any site's privacy policy or terms of service page — the badge shows the toxicity score.

## Testing checklist

- [ ] Load extension, visit google.com/policies/privacy — expect high score
- [ ] Visit facebook.com/privacy/policy — expect high score
- [ ] Visit a small indie site's /privacy — expect lower score
- [ ] Visit a non-policy page (e.g. wikipedia.org) — expect "Not a policy page" message
- [ ] Click badge → popup shows score, verdict, and red flag breakdown

## Project structure

```
chrome-extension/
  manifest.json       # Chrome MV3 manifest
  content.js          # Policy detection + 6 red flag scanners
  background.js       # chrome.storage.session + badge scoring
  popup.html/js/css   # Toxicity score + breakdown rendering
  icon48/128.png      # Extension icons (placeholder)
firefox-extension/
  manifest.json       # Firefox MV2 manifest
  content.js          # Same scanners, browser.runtime API
  background.js       # In-memory tabData + browser.browserAction badge
  popup.html/js/css   # Same UI, promise-based messaging
  icon48/128.png      # Extension icons (placeholder)
store-assets/
```
