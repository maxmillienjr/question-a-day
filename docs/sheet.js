// The fixed rule that turns a birth year into one sheet. Same input, same sheet.
// Used by the page and by tools/test-sheet.js.
(function (root) {
  "use strict";
  var FIRST = 1925, LAST = 1975;
  // Ages in the order they claim items; the sheet still shows 10, 20, 30.
  var AGES = [{ age: 20, n: 4 }, { age: 10, n: 3 }, { age: 30, n: 3 }];

  // Walk the year's items in file order: first one item of each category not yet
  // used in this group, then the rest in order, until the group's share is full.
  // An item whose text is already on the sheet (the same stamp price in two years)
  // is skipped. A short year gives a short group; nothing is padded.
  function pickGroup(items, n, taken) {
    var pool = items.filter(function (it) { return !taken[it.text]; });
    var out = [], cats = {};
    pool.forEach(function (it) {
      if (out.length < n && !cats[it.category]) { cats[it.category] = true; out.push(it); }
    });
    pool.forEach(function (it) {
      if (out.length < n && out.indexOf(it) < 0) out.push(it);
    });
    out.sort(function (a, b) {
      if (a.sombre !== b.sombre) return a.sombre ? 1 : -1; // a sombre item is never first
      return items.indexOf(a) - items.indexOf(b);
    });
    out.forEach(function (it) { taken[it.text] = true; });
    return out;
  }

  function sheet(data, birthYear) {
    var taken = {}, groups = {};
    AGES.forEach(function (a) {
      var y = String(birthYear + a.age);
      var items = data.years[y];
      groups[a.age] = { age: a.age, year: birthYear + a.age, ready: !!items, items: items ? pickGroup(items, a.n, taken) : [] };
    });
    return [groups[10], groups[20], groups[30]];
  }

  // Birth years the picker offers: those with at least one of the three years present.
  function offered(data) {
    var out = [];
    for (var b = FIRST; b <= LAST; b++) {
      if (data.years[b + 10] || data.years[b + 20] || data.years[b + 30]) out.push(b);
    }
    return out;
  }

  var api = { sheet: sheet, offered: offered, FIRST: FIRST, LAST: LAST };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WorldSheet = api;
})(this);
