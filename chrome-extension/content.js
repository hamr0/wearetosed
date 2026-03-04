"use strict";

(function () {
  // --- Is this a policy/terms page? ---
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

  // --- Find policy/terms links in the DOM ---
  function findPolicyLinks() {
    var privacyLinks = [];
    var termsLinks = [];
    var seen = {};

    var privacyRe = /privacy(\s*(policy|notice|security))?|data\s*policy|cookie\s*policy|datenschutz|privacybeleid|politique\s*de\s*confidentialit/i;
    var termsRe = /terms\s*(of\s*)?(service|use)|terms\s*(&|and)\s*conditions|conditions\s*(of\s*)?use|acceptable\s*use|eula|legal\s*notice|nutzungsbedingungen|algemene\s*voorwaarden|conditions\s*d['']utilisation|gebruiksvoorwaarden/i;

    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].href;
      if (!href || href.startsWith("javascript:") || href.startsWith("#")) continue;
      var text = (links[i].textContent || "").trim();
      if (text.length > 80) continue;

      try {
        var url = new URL(href, location.origin);
        var key = url.origin + url.pathname;
        if (seen[key]) continue;

        var titleAttr = links[i].getAttribute("title") || "";
        var combined = text + " " + decodeURIComponent(url.pathname) + " " + titleAttr;
        if (privacyRe.test(combined)) {
          seen[key] = true;
          privacyLinks.push({ url: url.href, text: text });
        } else if (termsRe.test(combined)) {
          seen[key] = true;
          termsLinks.push({ url: url.href, text: text });
        }
      } catch (e) { /* skip */ }
    }

    // Scan inline JS for policy URLs (sites like Shein embed paths in config)
    if (privacyLinks.length === 0 || termsLinks.length === 0) {
      var scripts = document.querySelectorAll("script:not([src])");
      var privacyUrlRe = /['"](\/?[^'"]*privac[^'"]{0,60}\.html?)['"]/i;
      var termsUrlRe = /['"](\/?[^'"]*terms[^'"]{0,60}\.html?)['"]/i;
      for (var s = 0; s < scripts.length; s++) {
        var src = scripts[s].textContent || "";
        if (src.length > 200000) continue;
        if (privacyLinks.length === 0) {
          var pm = src.match(privacyUrlRe);
          if (pm) {
            try {
              var pUrl = new URL(pm[1], location.origin).href;
              privacyLinks.push({ url: pUrl, text: "privacy (from script)" });
            } catch (e) { /* skip */ }
          }
        }
        if (termsLinks.length === 0) {
          var tm = src.match(termsUrlRe);
          if (tm) {
            try {
              var tUrl = new URL(tm[1], location.origin).href;
              termsLinks.push({ url: tUrl, text: "terms (from script)" });
            } catch (e) { /* skip */ }
          }
        }
      }
    }

    return { privacy: privacyLinks, terms: termsLinks };
  }

  // --- Extract text from current page ---
  function getPolicyText() {
    var target = document.querySelector("main, article, [role='main'], .content, #content, .policy, .legal");
    var el = target || document.body;
    return (el.innerText || "");
  }

  // --- Strip HTML to text ---
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

  // --- Fetch a URL from page context (has cookies/session) ---
  function fetchAndScan(urls, index, callback) {
    if (index >= urls.length) { callback(null); return; }

    var url = urls[index].url;
    console.log("[wearetosed] fetching:", url);

    fetch(url, { credentials: "include", redirect: "follow" })
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.text();
      })
      .then(function (html) {
        // Follow meta refresh redirects (Google pattern)
        var metaRedirect = html.match(/content=["'][^"']*URL=([^"'\s>]+)/i);
        if (metaRedirect && htmlToText(html).length < 500) {
          console.log("[wearetosed] following meta redirect:", metaRedirect[1]);
          return fetch(metaRedirect[1], { credentials: "include", redirect: "follow" })
            .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); });
        }
        return html;
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
        fetchAndScan(urls, index + 1, callback);
      });
  }

  // --- Main ---
  var pageType = getPageType();

  if (pageType) {
    // We're on a policy/terms page — scan directly
    var text = getPolicyText();
    var result = scanText(text);

    console.log("[wearetosed] direct scan (" + pageType + ") — score:", result.score, result.items);

    chrome.runtime.sendMessage({
      type: "directScan",
      domain: location.hostname,
      pageType: pageType,
      items: result.items,
      score: result.score,
      total: result.total
    });
  } else {
    // Check cache first via background
    chrome.runtime.sendMessage({ type: "checkCache", domain: location.hostname }, function (cached) {
      if (cached && cached.privacy && cached.terms) {
        // Full cache — background will handle badge
        return;
      }

      var found = findPolicyLinks();
      var origin = location.origin;

      // Add fallback paths
      if (found.privacy.length === 0) {
        found.privacy = [
          { url: origin + "/privacy", text: "privacy" },
          { url: origin + "/privacy-policy", text: "privacy-policy" },
          { url: origin + "/privacypolicy", text: "privacypolicy" }
        ];
      }
      if (found.terms.length === 0) {
        found.terms = [
          { url: origin + "/terms", text: "terms" },
          { url: origin + "/terms-of-service", text: "terms-of-service" },
          { url: origin + "/tos", text: "tos" }
        ];
      }

      var needPrivacy = !cached || !cached.privacy;
      var needTerms = !cached || !cached.terms;
      var pending = 0;
      var done = 0;
      var privacyResult = cached ? cached.privacy : null;
      var termsResult = cached ? cached.terms : null;

      function finish() {
        done++;
        if (done < pending) return;
        chrome.runtime.sendMessage({
          type: "fetchedResults",
          domain: location.hostname,
          privacy: privacyResult,
          terms: termsResult
        });
      }

      if (needPrivacy) {
        pending++;
        fetchAndScan(found.privacy, 0, function (r) { privacyResult = r; finish(); });
      }
      if (needTerms) {
        pending++;
        fetchAndScan(found.terms, 0, function (r) { termsResult = r; finish(); });
      }

      if (pending === 0) {
        chrome.runtime.sendMessage({
          type: "fetchedResults",
          domain: location.hostname,
          privacy: privacyResult,
          terms: termsResult
        });
      }
    });
  }
})();
