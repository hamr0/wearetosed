"use strict";

var tabData = {};
var domainCache = {};

function buildTabResult(domain, privacyResult, termsResult) {
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

function storeAndBadge(tabId, domain, data) {
  tabData[tabId] = data;
  domainCache[domain] = { privacy: data.privacy, terms: data.terms, score: data.score };
  updateBadge(tabId, data.score);
}

browser.runtime.onMessage.addListener(function (message, sender) {
  if (message.type === "getResults") {
    return browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
      if (tabs.length === 0) return null;
      return tabData[tabs[0].id] || null;
    });
  }

  if (!sender.tab) return;
  var tabId = sender.tab.id;
  var domain = message.domain;

  if (message.type === "directScan") {
    var pageType = message.pageType;
    var scanResult = { items: message.items, score: message.score, total: message.total };
    var cached = domainCache[domain] || {};
    var privacyResult = pageType === "privacy" ? scanResult : (cached.privacy || null);
    var termsResult = pageType === "terms" ? scanResult : (cached.terms || null);
    var data = buildTabResult(domain, privacyResult, termsResult);
    storeAndBadge(tabId, domain, data);
    return;
  }

  if (message.type === "checkCache") {
    var entry = domainCache[domain] || null;
    if (entry && entry.privacy && entry.terms) {
      var data = buildTabResult(domain, entry.privacy, entry.terms);
      tabData[tabId] = data;
      updateBadge(tabId, data.score);
    }
    return Promise.resolve(entry);
  }

  if (message.type === "fetchedResults") {
    var data = buildTabResult(domain, message.privacy, message.terms);
    storeAndBadge(tabId, domain, data);
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

  browser.browserAction.setBadgeText({ text: text, tabId: tabId });
  browser.browserAction.setBadgeBackgroundColor({ color: color, tabId: tabId });
}

browser.tabs.onRemoved.addListener(function (tabId) {
  delete tabData[tabId];
});

browser.tabs.onActivated.addListener(function (activeInfo) {
  var data = tabData[activeInfo.tabId];
  if (data && data.hasData) {
    updateBadge(activeInfo.tabId, data.score);
  }
});
