"use strict";

var tabData = {};
var domainCache = {};

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

// Fetch URLs sequentially until one works
function fetchFirst(links, index) {
  if (index >= links.length) return Promise.resolve(null);

  var url = links[index].url;
  console.log("[wearetosed] fetching:", url);

  return fetch(url, { redirect: "follow" })
    .then(function (resp) {
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      return resp.text();
    })
    .then(function (html) {
      var text = htmlToText(html);
      if (text.length < 200) throw new Error("Too short");
      var result = scanText(text);
      console.log("[wearetosed] fetched:", url, "score:", result.score);
      return result;
    })
    .catch(function (err) {
      console.log("[wearetosed] fetch failed:", url, err.message);
      return fetchFirst(links, index + 1);
    });
}

browser.runtime.onMessage.addListener(function (message, sender) {
  if (!sender.tab) {
    if (message.type === "getResults") {
      return browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
        if (tabs.length === 0) return null;
        return tabData[tabs[0].id] || null;
      });
    }
    return;
  }

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

  if (message.type === "policyLinks") {
    var cached = domainCache[domain];
    if (cached && cached.privacy && cached.terms) {
      var data = buildTabResult(domain, cached.privacy, cached.terms);
      tabData[tabId] = data;
      updateBadge(tabId, data.score);
      return;
    }

    var needPrivacy = !cached || !cached.privacy;
    var needTerms = !cached || !cached.terms;
    var privacyResult = cached ? cached.privacy : null;
    var termsResult = cached ? cached.terms : null;

    var privacyLinks = message.privacyLinks || [];
    var termsLinks = message.termsLinks || [];
    var origin = "https://" + domain;

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

    var promises = [];

    if (needPrivacy && privacyLinks.length > 0) {
      promises.push(fetchFirst(privacyLinks, 0).then(function (r) { privacyResult = r; }));
    }
    if (needTerms && termsLinks.length > 0) {
      promises.push(fetchFirst(termsLinks, 0).then(function (r) { termsResult = r; }));
    }

    if (promises.length > 0) {
      Promise.all(promises).then(function () {
        var data = buildTabResult(domain, privacyResult, termsResult);
        storeAndBadge(tabId, domain, data);
      });
    } else {
      var data = buildTabResult(domain, privacyResult, termsResult);
      tabData[tabId] = data;
      if (data.hasData) updateBadge(tabId, data.score);
    }
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
