"use strict";

function tabKey(tabId) {
  return "tab:" + tabId;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "scanResult" && sender.tab) {
    var tabId = sender.tab.id;
    var obj = {};
    obj[tabKey(tabId)] = message;
    chrome.storage.session.set(obj);
    if (message.isPolicyPage) {
      updateBadge(tabId, message.score);
    } else {
      chrome.action.setBadgeText({ text: "", tabId: tabId });
    }
  }

  if (message.type === "getResults") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length === 0) {
        sendResponse(null);
        return;
      }
      var tabId = tabs[0].id;
      chrome.storage.session.get(tabKey(tabId), function (result) {
        sendResponse(result[tabKey(tabId)] || null);
      });
    });
    return true;
  }
});

function updateBadge(tabId, score) {
  var text = score > 0 ? String(score) : "0";
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
    if (data && data.isPolicyPage) {
      updateBadge(activeInfo.tabId, data.score);
    }
  });
});
