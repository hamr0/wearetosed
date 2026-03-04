"use strict";

importScripts("scanner.js");

function tabKey(tabId) {
  return "tab:" + tabId;
}

function cacheKey(domain) {
  return "cache:" + domain;
}

function buildTabData(domain, privacyResult, termsResult) {
  var pScore = privacyResult ? privacyResult.score : 0;
  var tScore = termsResult ? termsResult.score : 0;
  var combined = Math.min(100, Math.round((pScore + tScore) / 2));

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
  // Popup requesting results
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

  if (!sender.tab) return;
  var tabId = sender.tab.id;
  var domain = message.domain;

  // Direct scan from a policy/terms page
  if (message.type === "directScan") {
    var pageType = message.pageType;
    var scanResult = { items: message.items, score: message.score, total: message.total };

    chrome.storage.local.get(cacheKey(domain), function (cached) {
      var entry = cached[cacheKey(domain)] || {};
      var privacyResult = pageType === "privacy" ? scanResult : (entry.privacy || null);
      var termsResult = pageType === "terms" ? scanResult : (entry.terms || null);
      var tabData = buildTabData(domain, privacyResult, termsResult);
      storeAndBadge(tabId, domain, tabData);
    });
    return;
  }

  // Background fetch for cross-origin URLs (Google etc.)
  if (message.type === "bgFetch") {
    var url = message.url;
    fetch(url, { redirect: "follow" })
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.text();
      })
      .then(function (html) {
        // Follow meta refresh redirects (Google pattern)
        var metaRedirect = html.match(/content=["'][^"']*URL=([^"'\s>]+)/i);
        if (metaRedirect && html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length < 500) {
          return fetch(metaRedirect[1], { redirect: "follow" })
            .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); });
        }
        return html;
      })
      .then(function (html) {
        var text = html
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
        if (text.length < 200) throw new Error("Too short");
        var result = scanText(text);
        sendResponse(result);
      })
      .catch(function () {
        sendResponse(null);
      });
    return true;
  }

  // Content script checking cache before fetching
  if (message.type === "checkCache") {
    chrome.storage.local.get(cacheKey(domain), function (cached) {
      var entry = cached[cacheKey(domain)] || null;
      if (entry && entry.privacy && entry.terms) {
        // Full cache — set tab data and badge
        var tabData = buildTabData(domain, entry.privacy, entry.terms);
        var tabObj = {};
        tabObj[tabKey(tabId)] = tabData;
        chrome.storage.session.set(tabObj);
        updateBadge(tabId, tabData.score);
      }
      sendResponse(entry);
    });
    return true;
  }

  // Content script finished fetching — store results
  if (message.type === "fetchedResults") {
    var tabData = buildTabData(domain, message.privacy, message.terms);
    storeAndBadge(tabId, domain, tabData);
    return;
  }
});

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
