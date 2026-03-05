# wearetosed — Product Reference

## Overview
Score any terms of service — know what you're agreeing to.

Every "I agree" is a blind handshake. Privacy policies and terms of service are designed to be unread. They bury data selling behind "trusted partners", strip your right to sue behind "binding arbitration", and reserve the right to change everything "without notice".

wearetosed scores every privacy policy and terms page you visit from 0 to 100 based on red flags it finds in the text. No AI, no cloud lookups — just regex pattern matching against the page content.

## How it works
1. **On any page**: finds privacy/terms links in the DOM, fetches them, and scans the text
2. **On a policy page**: detects it via URL, hostname, title, and h1 heuristics — scans the rendered content directly
3. **SPA support**: MutationObserver re-scans when content loads after initial render; detects pushState/overlay navigations (Etsy, etc.)
4. **Cross-origin fallback**: if content script fetch fails (CORS), routes through background script
5. **Caching**: results cached per domain so repeat visits are instant

## Project structure
```
chrome-extension/     # Chrome MV3
firefox-extension/    # Firefox MV2
  scanner.js          # Shared regex scanner (6 categories)
  content.js          # Page detection, link discovery, fetch + SPA handling
  background.js       # Caching, badge, cross-origin fetch fallback
  popup.html/js/css   # Score + breakdown UI
```
