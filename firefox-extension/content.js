"use strict";

(function () {
  function getPageType() {
    var path = location.pathname.toLowerCase();
    var title = (document.title || "").toLowerCase();
    var h1 = document.querySelector("h1");
    var h1Text = h1 ? h1.textContent.toLowerCase() : "";
    var all = path + " " + title + " " + h1Text;

    if (/privacy(\s*policy|\s*notice)?|data\s*policy|cookie\s*policy/.test(all)) return "privacy";
    if (/terms\s*(of\s*)?(service|use)|acceptable\s*use|eula|end\s*user\s*license/.test(all)) return "terms";
    if (/\/(legal|gdpr|ccpa|data[-_]?processing)/.test(path)) return "privacy";
    return null;
  }

  function findPolicyLinks() {
    var privacyLinks = [];
    var termsLinks = [];
    var seen = {};

    var privacyRe = /privacy(\s*policy)?|data\s*policy|cookie\s*policy/i;
    var termsRe = /terms\s*(of\s*)?(service|use)|acceptable\s*use|eula|legal\s*notice/i;

    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].href;
      if (!href || href.startsWith("javascript:") || href.startsWith("#")) continue;
      var text = (links[i].textContent || "").trim();
      if (text.length < 3 || text.length > 80) continue;

      try {
        var url = new URL(href, location.origin);
        var key = url.origin + url.pathname;
        if (seen[key]) continue;

        var combined = text + " " + url.pathname;
        if (privacyRe.test(combined)) {
          seen[key] = true;
          privacyLinks.push({ url: url.href, text: text });
        } else if (termsRe.test(combined)) {
          seen[key] = true;
          termsLinks.push({ url: url.href, text: text });
        }
      } catch (e) { /* skip */ }
    }

    return { privacy: privacyLinks, terms: termsLinks };
  }

  function getPolicyText() {
    var target = document.querySelector("main, article, [role='main'], .content, #content, .policy, .legal");
    var el = target || document.body;
    return (el.innerText || "");
  }

  var pageType = getPageType();

  if (pageType) {
    var text = getPolicyText();
    var result = scanText(text);

    console.log("[wearetosed] direct scan (" + pageType + ") — score:", result.score, result.items);

    browser.runtime.sendMessage({
      type: "directScan",
      domain: location.hostname,
      pageType: pageType,
      items: result.items,
      score: result.score,
      total: result.total
    });
  } else {
    var found = findPolicyLinks();

    console.log("[wearetosed] found links — privacy:", found.privacy.length, "terms:", found.terms.length);

    browser.runtime.sendMessage({
      type: "policyLinks",
      domain: location.hostname,
      privacyLinks: found.privacy,
      termsLinks: found.terms
    });
  }
})();
