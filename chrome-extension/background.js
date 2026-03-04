"use strict";

importScripts("scanner.js");

function tabKey(tabId) {
  return "tab:" + tabId;
}

function cacheKey(domain) {
  return "cache:" + domain;
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Merge two scan results into a combined tab data object
function buildTabData(domain, privacyResult, termsResult) {
  var pScore = privacyResult ? privacyResult.score : 0;
  var tScore = termsResult ? termsResult.score : 0;
  var combined = Math.min(100, Math.round((pScore + tScore) / 2));

  // If only one exists, use that score directly
  if (privacyResult && !termsResult) combined = pScore;
  if (!privacyResult && termsResult) combined = tScore;

  return {
    domain: domain,
    hasData: !!(privacyResult || termsResult),
    score: combined,
    privacy: privacyResult || null,
    terms: termsResult || null
  };
}

function storeAndBadge(tabId, domain, tabData) {
  var tabObj = {};
  tabObj[tabKey(tabId)] = tabData;
  chrome.storage.session.set(tabObj);

  // Cache permanently
  var cacheObj = {};
  cacheObj[cacheKey(domain)] = {
    privacy: tabData.privacy,
    terms: tabData.terms,
    score: tabData.score,
    ts: Date.now()
  };
  chrome.storage.local.set(cacheObj);

  updateBadge(tabId, tabData.score);
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!sender.tab) {
    // Popup request
    if (message.type === "getResults") {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length === 0) { sendResponse(null); return; }
        var tid = tabs[0].id;
        chrome.storage.session.get(tabKey(tid), function (result) {
          sendResponse(result[tabKey(tid)] || null);
        });
      });
      return true;
    }
    return;
  }

  var tabId = sender.tab.id;
  var domain = message.domain;

  // Direct scan from a policy/terms page
  if (message.type === "directScan") {
    var pageType = message.pageType; // "privacy" or "terms"
    var scanResult = { items: message.items, score: message.score, total: message.total };

    // Load existing cache to merge
    chrome.storage.local.get(cacheKey(domain), function (cached) {
      var entry = cached[cacheKey(domain)] || {};
      var privacyResult = pageType === "privacy" ? scanResult : (entry.privacy || null);
      var termsResult = pageType === "terms" ? scanResult : (entry.terms || null);

      var tabData = buildTabData(domain, privacyResult, termsResult);
      storeAndBadge(tabId, domain, tabData);
    });
    return;
  }

  // Non-policy page — check cache or fetch
  if (message.type === "policyLinks") {
    chrome.storage.local.get(cacheKey(domain), function (cached) {
      var entry = cached[cacheKey(domain)];
      if (entry && entry.privacy && entry.terms) {
        // Full cache hit
        var tabData = buildTabData(domain, entry.privacy, entry.terms);
        var tabObj = {};
        tabObj[tabKey(tabId)] = tabData;
        chrome.storage.session.set(tabObj);
        updateBadge(tabId, tabData.score);
        return;
      }

      // Fetch what's missing
      var needPrivacy = !entry || !entry.privacy;
      var needTerms = !entry || !entry.terms;
      var privacyResult = entry ? entry.privacy : null;
      var termsResult = entry ? entry.terms : null;

      var privacyLinks = message.privacyLinks || [];
      var termsLinks = message.termsLinks || [];
      var origin = "https://" + domain;

      // Add fallback paths if no links found
      if (privacyLinks.length === 0 && needPrivacy) {
        privacyLinks = [
          { url: origin + "/privacy", text: "privacy" },
          { url: origin + "/privacy-policy", text: "privacy policy" }
        ];
      }
      if (termsLinks.length === 0 && needTerms) {
        termsLinks = [
          { url: origin + "/terms", text: "terms" },
          { url: origin + "/terms-of-service", text: "terms of service" },
          { url: origin + "/tos", text: "tos" }
        ];
      }

      var pending = 0;
      var done = 0;

      function finish() {
        done++;
        if (done < pending) return;
        var tabData = buildTabData(domain, privacyResult, termsResult);
        storeAndBadge(tabId, domain, tabData);
      }

      if (needPrivacy && privacyLinks.length > 0) {
        pending++;
        fetchFirst(privacyLinks, 0, function (result) {
          privacyResult = result;
          finish();
        });
      }

      if (needTerms && termsLinks.length > 0) {
        pending++;
        fetchFirst(termsLinks, 0, function (result) {
          termsResult = result;
          finish();
        });
      }

      if (pending === 0) {
        var tabData = buildTabData(domain, privacyResult, termsResult);
        var tabObj = {};
        tabObj[tabKey(tabId)] = tabData;
        chrome.storage.session.set(tabObj);
        if (tabData.hasData) updateBadge(tabId, tabData.score);
      }
    });
    return;
  }
});

// Fetch URLs sequentially until one works, return scan result or null
function fetchFirst(links, index, callback) {
  if (index >= links.length) {
    callback(null);
    return;
  }

  var url = links[index].url;
  console.log("[wearetosed] fetching:", url);

  fetch(url, { redirect: "follow" })
    .then(function (resp) {
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      return resp.text();
    })
    .then(function (html) {
      var text = htmlToText(html);
      if (text.length < 200) throw new Error("Too short");

      var result = scanText(text);
      console.log("[wearetosed] fetched:", url, "score:", result.score);
      callback(result);
    })
    .catch(function (err) {
      console.log("[wearetosed] fetch failed:", url, err.message);
      fetchFirst(links, index + 1, callback);
    });
}

function updateBadge(tabId, score) {
  var text = score > 0 ? String(score) : "";
  var color;
  if (score === 0) color = "#4caf50";
  else if (score <= 30) color = "#4caf50";
  else if (score <= 60) color = "#e0a458";
  else color = "#e74c3c";

  chrome.action.setBadgeText({ text: text, tabId: tabId });
  chrome.action.setBadgeBackgroundColor({ color: color, tabId: tabId });
}

chrome.tabs.onRemoved.addListener(function (tabId) {
  chrome.storage.session.remove(tabKey(tabId));
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.storage.session.get(tabKey(activeInfo.tabId), function (result) {
    var data = result[tabKey(activeInfo.tabId)];
    if (data && data.hasData) {
      updateBadge(activeInfo.tabId, data.score);
    }
  });
});
