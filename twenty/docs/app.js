(function () {
  "use strict";
  var data = window.WORLD_AT_TWENTY, S = window.WorldSheet;
  var select = document.getElementById("birth-year");
  var form = document.getElementById("pick");
  var offered = S.offered(data);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  offered.forEach(function (y) {
    var o = el("option", "", String(y));
    o.value = String(y);
    select.appendChild(o);
  });
  var years = Object.keys(data.years).map(Number).sort();
  document.getElementById("coverage").textContent = offered.length < (S.LAST - S.FIRST + 1)
    ? "Birth years " + offered[0] + " to " + offered[offered.length - 1] + " for now. More years are being added and checked."
    : "";

  function render(birth) {
    var groups = S.sheet(data, birth);
    var box = document.getElementById("groups");
    box.textContent = "";
    var list = document.getElementById("source-list");
    list.textContent = "";
    var used = {};
    document.getElementById("sheet-title").textContent = "Born in " + birth + ": the world at 10, 20 and 30";
    document.getElementById("pdf").href = "print/" + birth + ".pdf";
    groups.forEach(function (g) {
      var sec = el("section", "group");
      var h = el("h3", "", "At " + g.age + ", in " + g.year);
      sec.appendChild(h);
      if (!g.ready) {
        sec.appendChild(el("p", "coming", g.year + " is still being put together. It is coming."));
      } else {
        var ol = el("ol", "items");
        g.items.forEach(function (it) {
          var li = el("li", "item");
          li.appendChild(el("p", "fact", it.text));
          li.appendChild(el("p", "q", it.question));
          var lines = el("div", "lines");
          lines.setAttribute("aria-hidden", "true");
          li.appendChild(lines);
          ol.appendChild(li);
          var s = el("li", "");
          s.appendChild(el("span", "", "At " + g.age + ": " + it.text + " "));
          var a = el("a", "", data.sources[it.source_url].credit || it.source_url);
          a.href = it.source_url;
          s.appendChild(a);
          s.appendChild(el("span", "lic", " (" + data.sources[it.source_url].licence.replace(/ \(http.*\)$/, "") + ")"));
          list.appendChild(s);
          used[data.sources[it.source_url].licence.indexOf("CC BY-SA") === 0 ? "w" : "g"] = true;
        });
        sec.appendChild(ol);
      }
      box.appendChild(sec);
    });
    var credit = "Facts about the United States";
    var from = [];
    if (used.w) from.push("English Wikipedia (CC BY-SA 4.0)");
    if (used.g) from.push("public tables of the US Postal Service and the US Energy Information Administration");
    document.getElementById("print-credit").textContent = credit + (from.length ? ", from " + from.join(" and ") : "") + ". " + where(birth);
    ["sheet", "how", "sources"].forEach(function (id) { document.getElementById(id).hidden = false; });
  }

  // Where the printed sheet says its sources are. A page served over the web gives its own address;
  // opened from the file system (or printed to the PDFs in docs/print/) it gives the published
  // address from <meta name="site-url"> when one is set, and never a local file path.
  function where(birth) {
    var base = /^https?:$/.test(location.protocol) ? location.href.replace(/#.*$/, "") : "";
    var meta = document.querySelector('meta[name="site-url"]');
    if (!base && meta && meta.content) base = meta.content;
    return base ? "Every source is listed at " + base + "#" + birth + "."
      : "Every source is listed under Sources for this sheet on the page.";
  }

  function fromHash() {
    var y = parseInt((location.hash || "").slice(1), 10);
    return offered.indexOf(y) >= 0 ? y : null;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var y = parseInt(select.value, 10);
    if (location.hash !== "#" + y) history.replaceState(null, "", "#" + y);
    render(y);
    document.getElementById("sheet-title").focus();
  });
  document.getElementById("print").addEventListener("click", function () { window.print(); });
  window.addEventListener("hashchange", function () {
    var y = fromHash();
    if (y) { select.value = String(y); render(y); }
  });
  var start = fromHash();
  if (start) { select.value = String(start); render(start); }
  else if (offered.indexOf(1948) >= 0) select.value = "1948";
})();
