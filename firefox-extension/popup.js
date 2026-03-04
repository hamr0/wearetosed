"use strict";

var PATTERN_LABELS = {
  "data-sharing": "Data sharing & selling",
  "surveillance": "Tracking & profiling",
  "retention": "Data retention",
  "law-enforcement": "Law enforcement access",
  "rights-erosion": "Rights & liability waivers",
  "unilateral-control": "Unilateral control"
};

var SECTIONS = {
  "Data practices": ["data-sharing", "surveillance", "retention"],
  "Your rights": ["law-enforcement", "rights-erosion", "unilateral-control"]
};

var SECTION_ORDER = ["Data practices", "Your rights"];

document.addEventListener("DOMContentLoaded", function () {
  browser.runtime.sendMessage({ type: "getResults" }).then(function (data) {
    render(data);
  });
});

function render(data) {
  var verdictEl = document.getElementById("verdict");
  var breakdownEl = document.getElementById("breakdown");
  var emptyEl = document.getElementById("empty");
  var notFoundEl = document.getElementById("not-found");

  if (!data || !data.hasData) {
    notFoundEl.classList.remove("hidden");
    return;
  }

  var domain = stripDomain(data.domain);
  verdictEl.appendChild(buildVerdict(domain, data.score));

  var hasBreakdown = false;

  if (data.privacy && data.privacy.score > 0) {
    hasBreakdown = true;
    breakdownEl.appendChild(buildDocSection("Privacy Policy", data.privacy));
  }

  if (data.terms && data.terms.score > 0) {
    hasBreakdown = true;
    breakdownEl.appendChild(buildDocSection("Terms of Service", data.terms));
  }

  if (hasBreakdown) {
    breakdownEl.classList.remove("hidden");
  } else {
    emptyEl.classList.remove("hidden");
  }
}

function stripDomain(hostname) {
  return hostname.replace(/^www\./, "");
}

function buildVerdict(domain, score) {
  var level, message;
  if (score === 0) {
    level = "clean";
    message = "No red flags found.";
  } else if (score <= 20) {
    level = "warn";
    message = "Standard boilerplate.";
  } else if (score <= 60) {
    level = "moderate";
    message = "Watch what you agree to.";
  } else {
    level = "bad";
    message = "You're getting tossed.";
  }

  var wrap = el("div", "verdict verdict-" + level);

  var domainEl = el("div", "verdict-domain");
  domainEl.textContent = domain;
  wrap.appendChild(domainEl);

  var scoreEl = el("div", "verdict-score");
  var scoreNum = el("span", "");
  scoreNum.textContent = score;
  var scoreMax = el("span", "verdict-max");
  scoreMax.textContent = "/100";
  scoreEl.appendChild(scoreNum);
  scoreEl.appendChild(scoreMax);
  wrap.appendChild(scoreEl);

  var labelEl = el("div", "verdict-label");
  labelEl.textContent = "toxicity score";
  wrap.appendChild(labelEl);

  var msgEl = el("div", "verdict-message");
  msgEl.textContent = message;
  wrap.appendChild(msgEl);

  return wrap;
}

function buildDocSection(title, docResult) {
  var wrap = el("div", "doc-section");

  var header = el("div", "doc-header");
  var headerTitle = el("span", "doc-title");
  headerTitle.textContent = title;
  header.appendChild(headerTitle);
  var headerScore = el("span", "doc-score");
  headerScore.textContent = docResult.score + "/100";
  header.appendChild(headerScore);
  wrap.appendChild(header);

  var itemMap = {};
  for (var i = 0; i < docResult.items.length; i++) {
    itemMap[docResult.items[i].pattern] = docResult.items[i].count;
  }

  for (var s = 0; s < SECTION_ORDER.length; s++) {
    var sectionName = SECTION_ORDER[s];
    var patterns = SECTIONS[sectionName];
    var hasAny = false;

    for (var p = 0; p < patterns.length; p++) {
      if (itemMap[patterns[p]]) { hasAny = true; break; }
    }
    if (!hasAny) continue;

    var heading = el("div", "breakdown-heading");
    heading.textContent = sectionName;
    wrap.appendChild(heading);

    for (var j = 0; j < patterns.length; j++) {
      var pattern = patterns[j];
      var count = itemMap[pattern];
      if (!count) continue;

      var row = el("div", "breakdown-row");

      var label = el("span", "row-label");
      label.textContent = PATTERN_LABELS[pattern];
      row.appendChild(label);

      var countEl = el("span", "row-count");
      countEl.textContent = count;
      row.appendChild(countEl);

      wrap.appendChild(row);
    }
  }

  return wrap;
}

function el(tag, className) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
