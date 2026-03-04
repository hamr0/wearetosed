"use strict";

var tabData = {};

browser.runtime.onMessage.addListener(function (message, sender) {
  if (message.type === "scanResult" && sender.tab) {
    var tabId = sender.tab.id;
    tabData[tabId] = message;
    if (message.isPolicyPage) {
      updateBadge(tabId, message.score);
    } else {
      browser.browserAction.setBadgeText({ text: "", tabId: tabId });
    }
    return;
  }

  if (message.type === "getResults") {
    return browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
      if (tabs.length === 0) return null;
      var tabId = tabs[0].id;
      return tabData[tabId] || null;
    });
  }
});

function updateBadge(tabId, score) {
  var text = score > 0 ? String(score) : "0";
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
  if (data && data.isPolicyPage) {
    updateBadge(activeInfo.tabId, data.score);
  }
});
