"use strict";

(function () {
  // --- Is this a policy page? ---
  function isPolicyPage() {
    var path = location.pathname.toLowerCase();
    var policyPaths = [
      /\/(privacy|privacynotice|privacy[-_]?policy|data[-_]?policy)/,
      /\/(terms|tos|terms[-_]?of[-_]?(service|use))/,
      /\/(legal|cookie[-_]?policy|acceptable[-_]?use)/,
      /\/(gdpr|ccpa|data[-_]?processing|dpa)/,
      /\/(eula|end[-_]?user[-_]?license)/
    ];
    for (var i = 0; i < policyPaths.length; i++) {
      if (policyPaths[i].test(path)) return true;
    }

    // Check page title / h1
    var title = (document.title || "").toLowerCase();
    var h1 = document.querySelector("h1");
    var h1Text = h1 ? h1.textContent.toLowerCase() : "";
    var titlePatterns = /privacy\s*(policy|notice)|terms\s*(of\s*)?(service|use)|cookie\s*policy|data\s*policy|end\s*user\s*license|acceptable\s*use/;
    if (titlePatterns.test(title) || titlePatterns.test(h1Text)) return true;

    return false;
  }

  if (!isPolicyPage()) {
    browser.runtime.sendMessage({
      type: "scanResult",
      domain: location.hostname,
      isPolicyPage: false,
      items: [],
      score: 0,
      total: 0
    });
    return;
  }

  // --- Extract policy text ---
  function getPolicyText() {
    var target = document.querySelector("main, article, [role='main'], .content, #content, .policy, .legal");
    var el = target || document.body;
    return (el.innerText || "").toLowerCase();
  }

  var counts = {
    "data-sharing": 0,
    "surveillance": 0,
    "retention": 0,
    "law-enforcement": 0,
    "rights-erosion": 0,
    "unilateral-control": 0
  };
  var seen = {};

  function hit(pattern, key) {
    if (seen[key]) return;
    seen[key] = true;
    counts[pattern]++;
  }

  // --- 1. Data sharing / selling ---
  function scanDataSharing() {
    var patterns = [
      /shar(e|ing)\s+(your\s+)?(personal\s+)?(data|information|info)\s+(with|to)\s+(third\s*part|partner|affiliate|advertis|vendor)/,
      /disclos(e|ing|ure)\s+(your\s+)?(personal\s+)?(data|information|info)\s+to\s+(third|partner|affiliate)/,
      /sell\s+(your\s+)?(personal\s+)?(data|information|info)/,
      /may\s+sell/,
      /sell\s+or\s+rent/,
      /transfer\s+(your\s+)?(personal\s+)?(data|information)\s+to\s+(third|partner|other)/,
      /provid(e|ing)\s+(your\s+)?(personal\s+)?(data|information)\s+to\s+(our\s+)?(partner|affiliate|advertis|third)/,
      /share\s+(it\s+)?with\s+(our\s+)?(advertising|marketing|analytics)\s+(partner|network|provider)/,
      /third.party\s+(advertis|analytics|tracking|marketing)/
    ];
    return patterns;
  }

  // --- 2. Surveillance / cross-tracking ---
  function scanSurveillance() {
    var patterns = [
      /track(ing)?\s+(you\s+)?across\s+(website|site|device|platform|service)/,
      /cross[-\s]?(device|site|platform)\s+(track|identif|profil)/,
      /build(ing)?\s+(a\s+)?profile\s+(about|of)\s+(you|user)/,
      /fingerprint(ing)?\s+(your\s+)?(device|browser)/,
      /collect(ing|s)?\s+(your\s+)?(browsing|search)\s+(history|activit|data|habit)/,
      /monitor(ing)?\s+(your\s+)?(online\s+)?(activit|behavior|usage)/,
      /pixel(s)?\s+(or\s+)?beacon/,
      /web\s*beacon|tracking\s*pixel|clear\s*gif/,
      /automat(ed|ic)(ally)?\s+collect/
    ];
    return patterns;
  }

  // --- 3. Retention ---
  function scanRetention() {
    var patterns = [
      /retain(ing|s)?\s+(your\s+)?(data|information|record)\s+(indefinite|forever|permanent|as\s+long\s+as)/,
      /no\s+obligation\s+to\s+delete/,
      /keep\s+(your\s+)?(data|information)\s+(for\s+)?as\s+long\s+as/,
      /retain(ed)?\s+(for\s+)?as\s+long\s+as\s+(we\s+)?(deem|consider|see\s+fit|necessary|wish|choose)/,
      /retain\s+(your\s+)?(data|information)\s+after\s+(you\s+)?(delet|clos|terminat|deactivat)/,
      /even\s+after\s+(you\s+)?(delet|clos|terminat|cancel|deactivat)/,
      /may\s+(continue\s+to\s+)?(retain|keep|store|hold)\s+(your\s+)?/
    ];
    return patterns;
  }

  // --- 4. Law enforcement ---
  function scanLawEnforcement() {
    var patterns = [
      /law\s+enforcement/,
      /respond(ing)?\s+to\s+(a\s+)?(subpoena|warrant|court\s+order|legal\s+(request|process|requirement))/,
      /disclos(e|ure)\s+(to|with)\s+(government|authorit|regulat|law\s+enforce)/,
      /comply(ing)?\s+with\s+(a\s+)?(legal|lawful)\s+(request|obligation|requirement|process)/,
      /cooperat(e|ing)\s+with\s+(law\s+enforce|government|authorit|investigat)/,
      /national\s+security/,
      /government\s+(request|inquir|demand|order)/
    ];
    return patterns;
  }

  // --- 5. Rights erosion ---
  function scanRightsErosion() {
    var patterns = [
      /binding\s+arbitration/,
      /waiv(e|ing|er)\s+(your\s+)?(right|claim|ability)/,
      /class\s+action\s+waiver/,
      /give\s+up\s+(your\s+)?(right|claim)/,
      /you\s+agree\s+to\s+waive/,
      /relinquish\s+(your\s+)?(right|claim)/,
      /no\s+(right\s+to\s+)?jury\s+trial/,
      /limit(ation|ed|ing)?\s+(of\s+)?(our\s+)?liabilit/,
      /not\s+(be\s+)?(liable|responsible)\s+(for|to)/,
      /as[-\s]?is/,
      /without\s+warrant(y|ies)/,
      /disclaim(s|ing|er)?\s+(all\s+)?(warrant|liabilit|responsibilit)/
    ];
    return patterns;
  }

  // --- 6. Unilateral control ---
  function scanUnilateralControl() {
    var patterns = [
      /modif(y|ied|ying|ication)\s+(these\s+)?(terms|policy|agreement)\s+(at\s+)?any\s+time/,
      /change\s+(these\s+)?(terms|policy|agreement)\s+(at\s+any\s+time|without\s+(prior\s+)?notice)/,
      /without\s+(prior\s+)?notice\s+to\s+you/,
      /sole\s+(and\s+(absolute\s+))?discretion/,
      /right\s+to\s+terminat(e|ion)\s+(your\s+)?(account|access|service)\s+(at\s+any\s+time|without\s+(cause|reason|notice))/,
      /we\s+(may|can|reserve)\s+(the\s+right\s+to\s+)?(suspend|terminat|restrict|revoke)\s+(your\s+)?(account|access)/,
      /continued\s+use\s+(of\s+)?(the\s+)?(service|site|website|platform)\s+(constitutes|means|indicates|signifies)\s+(your\s+)?(acceptance|agreement|consent)/,
      /deem(ed)?\s+to\s+have\s+accepted/
    ];
    return patterns;
  }

  // --- Run all scanners ---
  var text = getPolicyText();

  var scanners = {
    "data-sharing": scanDataSharing(),
    "surveillance": scanSurveillance(),
    "retention": scanRetention(),
    "law-enforcement": scanLawEnforcement(),
    "rights-erosion": scanRightsErosion(),
    "unilateral-control": scanUnilateralControl()
  };

  for (var category in scanners) {
    var patterns = scanners[category];
    for (var i = 0; i < patterns.length; i++) {
      var matches = text.match(new RegExp(patterns[i].source, "gi"));
      if (matches) {
        for (var j = 0; j < matches.length; j++) {
          hit(category, category + ":" + matches[j].slice(0, 40));
        }
      }
    }
  }

  // --- Score ---
  var items = [];
  var total = 0;
  var patternCount = 0;
  for (var p in counts) {
    if (counts[p] > 0) {
      items.push({ pattern: p, count: counts[p] });
      total += counts[p];
      patternCount++;
    }
  }

  var score = Math.min(100, patternCount * 20);

  console.log("[wearetosed] score:", score, "patterns:", patternCount, "total:", total, items);

  browser.runtime.sendMessage({
    type: "scanResult",
    domain: location.hostname,
    isPolicyPage: true,
    items: items,
    score: score,
    total: total
  });
})();
