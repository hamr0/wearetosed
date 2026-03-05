# wearetosed

> Score any terms of service — know what you're agreeing to.

Every "I agree" is a blind handshake. Privacy policies and terms of service are designed to be unread. They bury data selling behind "trusted partners", strip your right to sue behind "binding arbitration", and reserve the right to change everything "without notice". wearetosed scores every privacy policy and terms page from 0 to 100 based on red flags in the text.

No AI, no cloud lookups — just regex pattern matching. All processing is local.

## What it detects
- **Data sharing & selling** — "share with third parties", "sell your data", "transfer to partners"
- **Tracking & profiling** — "track across websites", "build a profile", "collect browsing history"
- **Data retention** — "retain indefinitely", "even after you delete your account"
- **Law enforcement access** — "respond to subpoenas", "law enforcement requests"
- **Rights & liability waivers** — "binding arbitration", "class action waiver", "as-is"
- **Unilateral control** — "modify these terms at any time", "without prior notice"

## How scoring works

Score = (categories detected × 8) + (total unique matches × 2), capped at 100.

| Score | Badge | Meaning |
|---|---|---|
| 0 | Green | No red flags found. |
| 1–20 | Green | Standard boilerplate. |
| 21–60 | Orange | Watch what you agree to. |
| 61–100 | Red | You're getting tossed. |

## Try It Now

Store approval pending — install locally in under a minute:

### Chrome
1. Download this repo (Code → Download ZIP) and unzip
2. Go to `chrome://extensions` and turn on **Developer mode** (top right)
3. Click **Load unpacked** → select the `chrome-extension` folder
4. That's it — browse any site and click the extension icon

### Firefox
1. Download this repo (Code → Download ZIP) and unzip
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on** → pick any file in the `firefox-extension` folder
4. That's it — browse any site and click the extension icon

> Firefox temporary add-ons reset when you close the browser — just re-load next session.

---

## The weare____ Suite

Privacy tools that show what's happening — no cloud, no accounts, nothing leaves your browser.

| Extension | What it exposes |
|-----------|----------------|
| [wearecooked](https://github.com/hamr0/wearecooked) | Cookies, tracking pixels, and beacons |
| [wearebaked](https://github.com/hamr0/wearebaked) | Network requests, third-party scripts, and data brokers |
| [weareleaking](https://github.com/hamr0/weareleaking) | localStorage and sessionStorage tracking data |
| [wearelinked](https://github.com/hamr0/wearelinked) | Redirect chains and tracking parameters in links |
| [wearewatched](https://github.com/hamr0/wearewatched) | Browser fingerprinting and silent permission access |
| [weareplayed](https://github.com/hamr0/weareplayed) | Dark patterns: fake urgency, confirm-shaming, pre-checked boxes |
| **wearetosed** | Toxic clauses in privacy policies and terms of service |
| [wearesilent](https://github.com/hamr0/wearesilent) | Form input exfiltration before you click submit |

All extensions run entirely on your device and work on Chrome and Firefox.
