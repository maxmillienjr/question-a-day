/* Who can speak about whom. Takes what gedcom.js read and works out, for each person with no
   death date recorded, which relatives with a recorded death they overlapped long enough to
   remember, then orders the list. Deterministic: the same file and the same year give the same list. */
(function (root) {
  'use strict';

  var RULES = {
    maxAge: 105,          // born more than this many years ago: counted, not listed
    rememberFrom: 5,      // the overlap counts from the listed person's fifth birthday
    minOverlap: 3,        // and has to last at least this many years
    cousinsFrom: 18,      // first cousins count only from when both were adults
    scarce: 2,            // an ancestor known to this many listed people or fewer is "few others knew"
    parentGap: [15, 50],  // a parent is this many years older than a child, for estimating a birth year
    spouseGap: 15         // spouses are within this many years of each other, for the same purpose
  };

  // ---- Birth years, recorded or estimated ------------------------------------------------

  function estimateBirths(tree) {
    var people = tree.people, idx = tree.index;
    people.forEach(function (p) {
      p.birthYear = p.birth ? p.birth.year : null;
      p.birthEstimated = false;
      p.deathYear = p.death ? p.death.year : null;
    });
    // Two passes: the second may lean on a year the first estimated.
    for (var pass = 0; pass < 2; pass++) {
      var found = {};
      people.forEach(function (p) {
        if (p.birthYear != null) return;
        var lo = -Infinity, hi = Infinity, any = false;
        function bound(a, b) { any = true; lo = Math.max(lo, a); hi = Math.min(hi, b); }
        p.parents.forEach(function (q) { var y = idx[q].birthYear; if (y != null) bound(y + RULES.parentGap[0], y + RULES.parentGap[1]); });
        p.children.forEach(function (q) { var y = idx[q].birthYear; if (y != null) bound(y - RULES.parentGap[1], y - RULES.parentGap[0]); });
        p.spouses.forEach(function (q) { var y = idx[q].birthYear; if (y != null) bound(y - RULES.spouseGap, y + RULES.spouseGap); });
        if (p.deathYear != null) bound(-Infinity, p.deathYear);
        if (!any || lo === -Infinity || hi === Infinity || lo > hi) return;
        found[p.id] = Math.round((lo + hi) / 2);
      });
      Object.keys(found).forEach(function (x) { idx[x].birthYear = found[x]; idx[x].birthEstimated = true; });
    }
  }

  // ---- Relationships in plain words ------------------------------------------------------

  var NOUN = {
    parent: { M: 'father', F: 'mother', U: 'parent' },
    sibling: { M: 'brother', F: 'sister', U: 'sibling' },
    half: { M: 'half-brother', F: 'half-sister', U: 'half-sibling' },
    child: { M: 'son', F: 'daughter', U: 'child' },
    spouse: { M: 'husband', F: 'wife', U: 'spouse' }
  };
  var PRONOUN = { M: 'his', F: 'her', U: 'their' };

  function words(subject, chain) {
    return PRONOUN[subject.sex] + ' ' + chain.map(function (c) { return NOUN[c.role][c.p.sex]; }).join("'s ");
  }

  function siblingsOf(p, idx) {
    var out = [];
    p.parents.forEach(function (q) {
      idx[q].children.forEach(function (c) {
        if (c === p.id || out.some(function (o) { return o.id === c; })) return;
        var s = idx[c];
        // Half only when both have two parents recorded and share just one of them;
        // a tree that records one parent cannot tell, so it says brother or sister.
        var shared = p.parents.filter(function (x) { return s.parents.indexOf(x) >= 0; }).length;
        var full = !(p.parents.length > 1 && s.parents.length > 1 && shared < 2);
        out.push({ id: c, full: full });
      });
    });
    return out;
  }

  // Every close relative of p, once each, with the closest way of naming them.
  function relativesOf(p, idx) {
    var seen = {}, out = [];
    function put(q, chain, degree, kind) {
      if (q.id === p.id) return;
      var prev = seen[q.id];
      if (prev && prev.degree <= degree) return;
      var r = { id: q.id, words: words(p, chain), degree: degree, kind: kind };
      if (prev) out[out.indexOf(prev)] = r; else out.push(r);
      seen[q.id] = r;
    }
    p.spouses.forEach(function (s) { put(idx[s], [{ role: 'spouse', p: idx[s] }], 1, 'spouse'); });
    p.parents.forEach(function (a) {
      var A = idx[a];
      put(A, [{ role: 'parent', p: A }], 1, 'parent');
      A.parents.forEach(function (b) {
        var B = idx[b];
        put(B, [{ role: 'parent', p: A }, { role: 'parent', p: B }], 2, 'grandparent');
        B.parents.forEach(function (c) {
          var C = idx[c];
          put(C, [{ role: 'parent', p: A }, { role: 'parent', p: B }, { role: 'parent', p: C }], 3, 'great-grandparent');
        });
      });
      siblingsOf(A, idx).forEach(function (s) {
        var S = idx[s.id];
        var role = s.full ? 'sibling' : 'half';
        put(S, [{ role: 'parent', p: A }, { role: role, p: S }], 3, 'aunt or uncle');
        S.children.forEach(function (k) {
          var K = idx[k];
          put(K, [{ role: 'parent', p: A }, { role: role, p: S }, { role: 'child', p: K }], 4, 'first cousin');
        });
      });
    });
    siblingsOf(p, idx).forEach(function (s) {
      var S = idx[s.id];
      put(S, [{ role: s.full ? 'sibling' : 'half', p: S }], 2, 'sibling');
    });
    p.spouses.forEach(function (s) {
      var S = idx[s];
      S.parents.forEach(function (a) {
        var A = idx[a];
        put(A, [{ role: 'spouse', p: S }, { role: 'parent', p: A }], 2, 'parent-in-law');
      });
    });
    return out;
  }

  // Years the listed person p and the relative r shared, counted the way the page states it.
  function overlapYears(p, q, kind) {
    if (q.deathYear == null || p.birthYear == null) return null;
    var from = p.birthYear + RULES.rememberFrom;
    if (q.birthYear != null) from = Math.max(from, q.birthYear);
    if (kind === 'first cousin') {
      if (q.birthYear == null) return null;
      from = Math.max(p.birthYear, q.birthYear) + RULES.cousinsFrom;
    }
    return q.deathYear - from;
  }

  // ---- The list --------------------------------------------------------------------------

  function analyze(tree, opts) {
    opts = opts || {};
    var year = opts.year || new Date().getFullYear();
    var idx = tree.index;
    estimateBirths(tree);

    var counts = { noDeath: 0, hidden: 0, tooOld: 0, noBirthYear: 0, noOverlap: 0, deathYearUnknown: 0, estimated: 0 };
    var cutoff = year - RULES.maxAge;
    var candidates = [];
    tree.people.forEach(function (p) {
      if (p.deathRecorded) { if (p.deathYear == null) counts.deathYearUnknown++; return; }
      counts.noDeath++;
      if (p.private || p.placeholder) { counts.hidden++; return; }
      // A birth year after this year is a typing slip; it cannot place anyone.
      if (p.birthYear == null || p.birthYear > year) { counts.noBirthYear++; return; }
      if (p.birthYear < cutoff) { counts.tooOld++; return; }
      candidates.push(p);
    });

    var knownBy = {}; // ancestor id -> listed ids who overlapped them
    var rows = [];
    candidates.forEach(function (p) {
      var speak = [];
      relativesOf(p, idx).forEach(function (r) {
        var q = idx[r.id];
        if (!q.deathRecorded) return;
        var yrs = overlapYears(p, q, r.kind);
        if (yrs == null || yrs < RULES.minOverlap) return;
        speak.push({ id: q.id, words: r.words, degree: r.degree, kind: r.kind, years: yrs });
      });
      if (!speak.length) { counts.noOverlap++; return; }
      speak.forEach(function (s) { (knownBy[s.id] = knownBy[s.id] || []).push(p.id); });
      rows.push({ id: p.id, person: p, speak: speak });
    });

    rows.forEach(function (row) {
      row.speak.forEach(function (s) {
        var q = idx[s.id];
        s.name = q.name || 'Name not recorded';
        s.others = knownBy[s.id].length - 1;
        s.scarce = knownBy[s.id].length <= RULES.scarce;
        s.noStory = !q.story;
        s.birthYear = q.birthYear; s.birthEstimated = q.birthEstimated; s.birth = q.birth; s.deathYear = q.deathYear; s.death = q.death;
      });
      // Within a person: relatives few others knew, then those with only dates in the tree,
      // then the fewest others, the closest, the name.
      row.speak.sort(function (a, b) {
        return (b.scarce - a.scarce) || (b.noStory - a.noStory) || a.others - b.others || a.degree - b.degree ||
          cmp(a.name, b.name) || cmp(a.id, b.id);
      });
      var scarce = row.speak.filter(function (s) { return s.scarce; });
      row.scarceCount = scarce.length;
      row.closest = Math.min.apply(null, (scarce.length ? scarce : row.speak).map(function (s) { return s.degree; }));
      row.name = row.person.name;
      row.birthYear = row.person.birthYear;
      row.birthEstimated = row.person.birthEstimated;
      if (row.birthEstimated) counts.estimated++;
    });
    rows.sort(function (a, b) {
      return b.scarceCount - a.scarceCount || a.closest - b.closest || a.birthYear - b.birthYear ||
        cmp(a.name, b.name) || cmp(a.id, b.id);
    });
    rows.forEach(function (r, i) { r.rank = i + 1; });

    return { year: year, cutoff: cutoff, rules: RULES, list: rows, counts: counts };
  }

  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  var api = { analyze: analyze, relativesOf: relativesOf, estimateBirths: estimateBirths, RULES: RULES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Tree = api;
})(this);
