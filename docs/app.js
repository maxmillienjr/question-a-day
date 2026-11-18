/* The page. Reads the chosen file with the File API, keeps it in memory, and draws the list.
   No network, no storage: nothing here fetches, posts, or saves anything. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var YEAR = new Date().getFullYear();

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var ERRORS = {
    'empty': 'That file is empty. Try exporting your tree again.',
    'not-gedcom': 'This file does not look like a GEDCOM family tree file. In your genealogy program or site, look for Export, Download or Share, choose GEDCOM, and open the .ged file it gives you.',
    'no-people': 'This GEDCOM file opened, but it has no people in it. Some programs export only part of a tree; try exporting the whole tree.',
    'encoding': 'This file is written in a character set this page cannot read. Try exporting it again and choose UTF-8 if your program offers it.'
  };
  var NOTES = {
    'ansel': 'This file uses ANSEL, the character set older GEDCOM files use. Accented letters were converted; if a name looks wrong, the tree itself is fine.',
    'ansel-unknown': 'This file uses ANSEL, the character set older GEDCOM files use. A few characters could not be converted and show as a question mark.',
    'ansi-guess': 'This file is not UTF-8, so it was read as a Windows file. If accented letters look wrong, export again as UTF-8.'
  };

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function status(parts, isError) {
    var s = $('status');
    s.textContent = '';
    s.className = 'status' + (isError ? ' error' : '');
    parts.forEach(function (t) { s.appendChild(el('p', null, t)); });
  }

  function load(input, label) {
    var t0 = Date.now();
    var tree;
    try {
      tree = Gedcom.read(input);
    } catch (e) {
      tree = { error: 'not-gedcom' };
    }
    if (tree.error) {
      $('results').hidden = true;
      status([ERRORS[tree.error] || ERRORS['not-gedcom']], true);
      return;
    }
    var result = Tree.analyze(tree, { year: YEAR });
    var r = tree.report;
    var lines = ['Read ' + plural(r.people, 'person', 'people') + ' and ' + plural(r.families, 'family', 'families') +
      ' from ' + label + (tree.version ? ' (GEDCOM ' + tree.version + ')' : '') + '.'];
    (r.notes || []).forEach(function (n) { if (NOTES[n]) lines.push(NOTES[n]); });
    if (r.badLines) lines.push(plural(r.badLines, 'line', 'lines') + ' could not be read and ' + (r.badLines === 1 ? 'was' : 'were') + ' skipped (the first is line ' + r.firstBadLine + ').');
    Object.keys(r.skipped).forEach(function (k) { lines.push('Skipped, ' + k + ': ' + r.skipped[k] + '.'); });
    if (r.unreadBirthDates) lines.push(plural(r.unreadBirthDates, 'birth date', 'birth dates') + ' could not be read as a date and ' + (r.unreadBirthDates === 1 ? 'was' : 'were') + ' kept as written.');
    status(lines, false);
    draw(result, tree);
    window.__whosLeft = { ms: Date.now() - t0, listed: result.list.length };
  }

  function birthWords(row) {
    var p = row.person || row;
    if (p.birthEstimated) return 'birth year estimated, about ' + p.birthYear;
    var b = p.birth;
    if (!b) return '';
    if (b.kind === 'exact') return 'born ' + b.year;
    if (b.kind === 'before') return 'born before ' + b.max;
    if (b.kind === 'after') return 'born after ' + b.min;
    if (b.kind === 'between' || b.kind === 'period') return 'born between ' + b.min + ' and ' + b.max;
    return 'born about ' + b.year;
  }

  // A year as the tree gives it: "1931", "about 1931", "before 1950", "after 1950". A range
  // ("BET 1928 AND 1930") reads as "about" its middle, because "1928 and 1930 to 1983" would not read.
  function yearWords(d, year, estimated) {
    if (year == null) return '';
    if (estimated || !d) return 'about ' + year;
    if (d.kind === 'exact') return String(d.year);
    if (d.kind === 'before') return 'before ' + d.max;
    if (d.kind === 'after') return 'after ' + d.min;
    return 'about ' + d.year;
  }

  function lifeWords(s) {
    var from = yearWords(s.birth, s.birthYear, s.birthEstimated);
    var to = yearWords(s.death, s.deathYear, false);
    if (from && to) return from + ' to ' + to;
    if (to) return 'died ' + to;
    return '';
  }

  var OBJ = { M: 'him', F: 'her', U: 'them' };

  function othersWords(s, sex) {
    if (s.others === 0) return 'No one else on this list knew ' + OBJ[sex] + '.';
    if (s.others === 1) return '1 other person on this list knew ' + OBJ[sex] + '.';
    return s.others + ' others on this list knew ' + OBJ[sex] + '.';
  }

  function ancestorItem(s, idx) {
    var li = el('li', 'anc' + (s.noStory ? ' nostory' : ''));
    var head = el('p', 'anc-head');
    head.appendChild(el('span', 'rel', cap(s.words)));
    head.appendChild(document.createTextNode(', '));
    head.appendChild(el('strong', null, s.name));
    var life = lifeWords(s);
    if (life) head.appendChild(el('span', 'life', ' (' + life + ')'));
    li.appendChild(head);
    var sex = idx[s.id].sex;
    var meta = el('p', 'anc-meta', othersWords(s, sex) + ' Overlapped for ' + plural(s.years, 'year', 'years') + '.');
    li.appendChild(meta);
    if (s.noStory) li.appendChild(el('p', 'flag', 'Only dates in your tree for ' + OBJ[sex] + '. Ask about ' + OBJ[sex] + ' first.'));
    return li;
  }

  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  var SHOW = 4;

  function draw(result, tree) {
    var list = $('people');
    list.textContent = '';
    var idx = tree.index;
    result.list.forEach(function (row) {
      var li = el('li', 'person');
      var art = el('article');
      var h = el('h3', null, row.name);
      art.appendChild(h);
      art.appendChild(el('p', 'born', cap(birthWords(row)) + '. Can tell you about ' + plural(row.speak.length, 'relative', 'relatives') + '.'));
      var ul = el('ul', 'ancs');
      row.speak.slice(0, SHOW).forEach(function (s) { ul.appendChild(ancestorItem(s, idx)); });
      art.appendChild(ul);
      if (row.speak.length > SHOW) {
        var more = el('details', 'more');
        more.appendChild(el('summary', null, plural(row.speak.length - SHOW, 'more relative', 'more relatives')));
        var ul2 = el('ul', 'ancs');
        row.speak.slice(SHOW).forEach(function (s) { ul2.appendChild(ancestorItem(s, idx)); });
        more.appendChild(ul2);
        art.appendChild(more);
      }
      li.appendChild(art);
      list.appendChild(li);
    });

    var c = result.counts, R = result.rules;
    $('results-lede').textContent = result.list.length ?
      plural(result.list.length, 'person', 'people') + ' in your tree with no death date recorded can tell you about relatives who have died. Talk to the first ones first.' :
      'No one in this tree with no death date recorded overlapped a relative with a recorded death long enough to be listed.';
    $('rule-order-1').textContent = '1. First, people who are one of only one or two on this list who knew a relative. The more relatives like that, the higher they come.';
    $('rule-order-2').textContent = '2. Then the closer that relationship: a parent or spouse before a grandparent, a grandparent before an aunt, uncle or cousin.';
    $('rule-order-3').textContent = '3. Then whoever was born earlier. The same file always gives the same list.';
    $('rule-overlap').textContent = 'Someone can tell you about a relative with a death recorded when their lives overlapped for at least ' + R.minOverlap +
      ' years, counted from their fifth birthday (for first cousins, from when both were ' + R.cousinsFrom + '). Close family only: parents, grandparents, great-grandparents, aunts and uncles, brothers and sisters, husbands and wives, parents-in-law, and first cousins.';
    $('rule-flags').textContent = '"Only dates in your tree" means the tree holds dates and places for that relative but no note, no source text and no photo or document. Those are the ones to ask about first.';
    var counts = $('counts');
    counts.textContent = '';
    function q(t) { counts.appendChild(el('li', null, t)); }
    if (c.tooOld) q(plural(c.tooOld, 'person has', 'people have') + ' no death date recorded but ' + (c.tooOld === 1 ? 'was' : 'were') + ' born before ' + result.cutoff + '; they are not listed.');
    if (c.hidden) q(plural(c.hidden, 'person is', 'people are') + ' marked private or ' + (c.hidden === 1 ? 'has' : 'have') + ' no name in the file; they are counted here, not listed.');
    if (c.noBirthYear) q(plural(c.noBirthYear, 'person', 'people') + ' with no death date recorded ' + (c.noBirthYear === 1 ? 'has' : 'have') + ' no birth year the page could read or estimate.');
    if (c.noOverlap) q(plural(c.noOverlap, 'person', 'people') + ' with no death date recorded did not overlap a relative with a recorded death long enough to be listed.');
    if (c.estimated) q(plural(c.estimated, 'birth year was', 'birth years were') + ' estimated from parents, children or a spouse (a parent ' + R.parentGap[0] + ' to ' + R.parentGap[1] + ' years older, a spouse within ' + R.spouseGap + ' years).');
    if (c.deathYearUnknown) q(plural(c.deathYearUnknown, 'relative has', 'relatives have') + ' a death recorded with no year the page could read, so no one is matched to them.');
    $('results').hidden = false;
    $('results-title').focus();
  }

  function readFile(file) {
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () { load(new Uint8Array(fr.result), file.name); };
    fr.onerror = function () { status(['The file could not be opened. Try choosing it again.'], true); };
    fr.readAsArrayBuffer(file);
  }

  $('file').addEventListener('change', function (e) { readFile(e.target.files[0]); e.target.value = ''; });
  $('demo').addEventListener('click', function () { load(window.DEMO_GEDCOM, 'the made-up family'); });
  var drop = $('drop');
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  // A file dropped anywhere else on the page would make the browser open it; catch it here instead.
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
  if (location.hash === '#demo') load(window.DEMO_GEDCOM, 'the made-up family');
})();
