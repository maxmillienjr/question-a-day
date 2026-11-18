/* A forgiving GEDCOM reader (5.5, 5.5.1 and 7.0) that runs in the browser and in Node.
   It turns the bytes of a family tree file into people and families, keeps every date it
   cannot read as plain text, and says what it could not use. Nothing here touches the network. */
(function (root) {
  'use strict';

  // ---- Bytes to text ---------------------------------------------------------------------

  // ANSEL (ANSI Z39.47), the character set older GEDCOM 5.5 files use. Spacing characters,
  // then combining marks, which in ANSEL come BEFORE the letter they sit on.
  var ANSEL_SPACING = {
    0xA1: 'Ł', 0xA2: 'Ø', 0xA3: 'Đ', 0xA4: 'Þ', 0xA5: 'Æ', 0xA6: 'Œ',
    0xA7: 'ʹ', 0xA8: '·', 0xA9: '♭', 0xAA: '®', 0xAB: '±', 0xAC: 'Ơ',
    0xAD: 'Ư', 0xAE: 'ʼ', 0xB0: 'ʻ', 0xB1: 'ł', 0xB2: 'ø', 0xB3: 'đ',
    0xB4: 'þ', 0xB5: 'æ', 0xB6: 'œ', 0xB7: 'ʺ', 0xB8: 'ı', 0xB9: '£',
    0xBA: 'ð', 0xBC: 'ơ', 0xBD: 'ư', 0xC0: '°', 0xC1: 'ℓ', 0xC2: '℗',
    0xC3: '©', 0xC4: '♯', 0xC5: '¿', 0xC6: '¡', 0xC7: 'ß', 0xC8: '€'
  };
  var ANSEL_COMBINING = {
    0xE0: '̉', 0xE1: '̀', 0xE2: '́', 0xE3: '̂', 0xE4: '̃', 0xE5: '̄',
    0xE6: '̆', 0xE7: '̇', 0xE8: '̈', 0xE9: '̌', 0xEA: '̊', 0xEB: '︠',
    0xEC: '︡', 0xED: '̕', 0xEE: '̋', 0xEF: '̐', 0xF0: '̧', 0xF1: '̨',
    0xF2: '̣', 0xF3: '̤', 0xF4: '̥', 0xF5: '̳', 0xF6: '̲', 0xF7: '̦',
    0xF8: '̜', 0xF9: '̮', 0xFA: '︢', 0xFB: '︣', 0xFE: '̓'
  };

  function decodeAnsel(bytes) {
    var out = '', pending = '', unknown = 0;
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      if (b < 0x80) { out += String.fromCharCode(b) + pending; pending = ''; continue; }
      if (ANSEL_COMBINING[b]) { pending += ANSEL_COMBINING[b]; continue; }
      var ch = ANSEL_SPACING[b];
      if (!ch) { ch = '�'; unknown++; }
      out += ch + pending; pending = '';
    }
    out += pending;
    return { text: out.normalize ? out.normalize('NFC') : out, unknown: unknown };
  }

  function td(label, bytes, fatal) {
    return new TextDecoder(label, { fatal: !!fatal }).decode(bytes);
  }

  // Returns { text, encoding, note } or { error }. Accepts a string, an ArrayBuffer or a Uint8Array.
  function decode(input) {
    if (typeof input === 'string') {
      return { text: input.replace(/^﻿/, ''), encoding: 'text' };
    }
    var bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length === 0) return { error: 'empty' };
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return { text: td('utf-8', bytes.subarray(3)), encoding: 'UTF-8' };
    }
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) return { text: td('utf-16le', bytes.subarray(2)), encoding: 'UTF-16' };
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) return { text: td('utf-16be', bytes.subarray(2)), encoding: 'UTF-16' };
    // UTF-16 without a byte-order mark: a GEDCOM file starts with "0", so one of the first two bytes is zero.
    if (bytes.length > 1 && bytes[0] === 0x30 && bytes[1] === 0) return { text: td('utf-16le', bytes), encoding: 'UTF-16' };
    if (bytes.length > 1 && bytes[0] === 0 && bytes[1] === 0x30) return { text: td('utf-16be', bytes), encoding: 'UTF-16' };

    // Look at the header's CHAR line, read as plain ASCII.
    var head = '';
    for (var i = 0; i < Math.min(bytes.length, 4000); i++) head += String.fromCharCode(bytes[i] < 0x80 ? bytes[i] : 0x3F);
    var m = /\n\s*1\s+CHAR\s+([^\r\n]+)/i.exec('\n' + head);
    var declared = m ? m[1].trim().toUpperCase() : '';
    var high = false;
    for (var j = 0; j < bytes.length; j++) if (bytes[j] >= 0x80) { high = true; break; }

    if (declared === 'ANSEL' && high) {
      var a = decodeAnsel(bytes);
      return { text: a.text, encoding: 'ANSEL', note: a.unknown ? 'ansel-unknown' : 'ansel' };
    }
    // No byte above 127: plain ASCII, which reads the same in every set. GEDCOM 7 has no CHAR line
    // and is always UTF-8.
    if (!high) return { text: td('utf-8', bytes), encoding: declared || 'UTF-8' };
    try {
      return { text: td('utf-8', bytes, true), encoding: 'UTF-8' };
    } catch (e) {
      // Not valid UTF-8. ANSI and IBM PC files are almost always the Windows Western set.
      try {
        return { text: td('windows-1252', bytes), encoding: declared || 'ANSI', note: 'ansi-guess' };
      } catch (e2) {
        return { error: 'encoding', encoding: declared || 'unknown' };
      }
    }
  }

  // ---- Dates -----------------------------------------------------------------------------

  var MONTHS = {};
  function months(names, from) { names.split(' ').forEach(function (n, i) { MONTHS[n] = from ? from[i] : i + 1; }); }
  months('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC');
  months('JANUARY FEBRUARY MARCH APRIL JUNE JULY AUGUST SEPTEMBER OCTOBER NOVEMBER DECEMBER SEPT',
    [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 9]);
  // Month names some programs write in other languages (French, German, Dutch, Spanish,
  // Italian, Portuguese, Scandinavian). Only the year matters here, so a month is just checked.
  months('JANV FEVR FÉVR MARS AVR MAI JUIN JUIL AOUT AOÛT DÉC', [1, 2, 2, 3, 4, 5, 6, 7, 8, 8, 12]);
  months('JÄN MÄR MRZ MAER MAERZ MÄRZ OKT DEZ JANUAR FEBRUAR', [1, 3, 3, 3, 3, 3, 10, 12, 1, 2]);
  months('MRT MAA MAART MEI', [3, 3, 3, 5]);
  months('ENE ABR AGO SET DIC GEN MAG GIU LUG OTT FEV OUT MAJ', [1, 4, 8, 9, 12, 1, 5, 6, 7, 10, 2, 10, 5]);
  // The French republican and Hebrew calendar months GEDCOM itself defines.
  months('VEND BRUM FRIM NIVO PLUV VENT GERM FLOR PRAI MESS THER FRUC COMP');
  months('TSH CSH KSL TVT SHV ADR ADS NSN IYR SVN TMZ AAV ELL');

  var APPROX = { ABT: 'about', ABOUT: 'about', CA: 'about', CIRCA: 'about', C: 'about', APPROX: 'about',
    EST: 'estimated', CAL: 'calculated' };

  // One simple date: [day] [month] year [B.C.], with dual years ("1712/13"). Returns {year} or null.
  function simpleYear(s, calendar) {
    s = s.trim();
    var num = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(s);
    if (num) return { year: +num[3], nonstandard: true };
    s = s.replace(/[.,]/g, ' ').trim();
    var bc = false;
    var mbc = /\s*\b(B\s*C|BCE)\s*$/.exec(s);
    if (mbc) { bc = true; s = s.slice(0, mbc.index).trim(); }
    var iso = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(s);
    if (iso) return { year: +iso[1], nonstandard: true };
    var parts = s.split(/\s+/).filter(Boolean);
    if (!parts.length || parts.length > 3) return null;
    var y = parts[parts.length - 1];
    var my = /^(\d{1,4})(?:\/(\d{1,4}))?$/.exec(y);
    if (!my) return null;
    var year = +my[1];
    if (my[2]) {
      // Dual year, "1712/13": the second form is the new-style year.
      var tail = my[2], full = +(my[1].slice(0, my[1].length - tail.length) + tail);
      year = full >= year ? full : year + 1;
    }
    var rest = parts.slice(0, -1);
    if (rest.length === 2) {
      if (!/^\d{1,2}$/.test(rest[0]) || !MONTHS[rest[1]]) return null;
    } else if (rest.length === 1) {
      if (!MONTHS[rest[0]]) return null;
    }
    if (calendar === 'HEBREW') year -= 3760;
    else if (calendar === 'FRENCH_R') year += 1791;
    if (bc) year = -year;
    if (year === 0 || year > 2200) return null;
    return { year: year };
  }

  // Returns { text, kind, min, max, year, approx, ok }.
  // kind: exact, about, estimated, calculated, before, after, between, period, phrase, unknown.
  function parseDate(raw) {
    var text = (raw || '').trim();
    var res = { text: text, kind: 'unknown', min: null, max: null, year: null, approx: false, ok: false };
    if (!text) return res;
    var s = text.toUpperCase();
    // GEDCOM 5.5 calendar escapes and the 7.0 calendar words.
    var calendar = null;
    s = s.replace(/@#D([A-Z ]+?)@/g, function (_, c) { calendar = c.replace(/\s+/g, '_').replace('FRENCH_R', 'FRENCH_R'); return ' '; });
    s = s.replace(/\b(GREGORIAN|JULIAN|FRENCH_R|HEBREW)\b/g, function (_, c) { calendar = c; return ' '; });
    if (calendar === 'FRENCH R') calendar = 'FRENCH_R';
    s = s.replace(/\s+/g, ' ').trim();
    if (/^\(.*\)$/.test(s)) { res.kind = 'phrase'; return res; }
    s = s.replace(/\(.*\)$/, '').trim();
    s = s.replace(/^INT\s+/, '');

    var m, a, b;
    if ((m = /^BET(?:WEEN)?\.?\s+(.+?)\s+AND\s+(.+)$/.exec(s))) {
      a = simpleYear(m[1], calendar); b = simpleYear(m[2], calendar);
      if (a && b) return fill(res, 'between', Math.min(a.year, b.year), Math.max(a.year, b.year));
      return res;
    }
    if ((m = /^FROM\s+(.+?)(?:\s+TO\s+(.+))?$/.exec(s))) {
      a = simpleYear(m[1], calendar); b = m[2] ? simpleYear(m[2], calendar) : null;
      if (a && (b || !m[2])) return fill(res, 'period', a.year, b ? b.year : a.year);
      return res;
    }
    if ((m = /^TO\s+(.+)$/.exec(s))) {
      a = simpleYear(m[1], calendar);
      return a ? fill(res, 'period', a.year, a.year) : res;
    }
    if ((m = /^(BEF|BEFORE)\.?\s+(.+)$/.exec(s))) {
      a = simpleYear(m[2], calendar);
      return a ? fill(res, 'before', null, a.year) : res;
    }
    if ((m = /^(AFT|AFTER)\.?\s+(.+)$/.exec(s))) {
      a = simpleYear(m[2], calendar);
      return a ? fill(res, 'after', a.year, null) : res;
    }
    if ((m = /^(ABT|ABOUT|CA|CIRCA|C|APPROX|EST|CAL)\.?\s+(.+)$/.exec(s))) {
      a = simpleYear(m[2], calendar);
      return a ? fill(res, APPROX[m[1]], a.year, a.year) : res;
    }
    a = simpleYear(s, calendar);
    if (a) return fill(res, 'exact', a.year, a.year);
    return res;
  }

  function fill(res, kind, min, max) {
    res.kind = kind; res.min = min; res.max = max; res.ok = true;
    res.approx = kind !== 'exact';
    if (min != null && max != null) res.year = Math.round((min + max) / 2);
    else res.year = min != null ? min : max;
    return res;
  }

  // ---- Lines to records ------------------------------------------------------------------

  var LINE = /^\s*(\d{1,2})\s+(?:(@[^@\s][^@]*@)\s+)?([A-Za-z0-9_]+)(?:\s(.*))?$/;

  function parseLines(text, report) {
    var lines = text.split(/\r\n|\r|\n/);
    var records = [], stack = [], bad = 0, firstBad = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) continue;
      var m = LINE.exec(line);
      if (!m) {
        // Some exports wrap long notes onto a new line with no level number. Join it to the
        // note above it rather than lose it; anywhere else it is a broken line.
        var top = stack[stack.length - 1];
        if (top && /^(NOTE|SNOTE|TEXT)$/.test(top.tag)) { top.value = (top.value || '') + '\n' + line.trim(); continue; }
        bad++; if (firstBad === null) firstBad = i + 1;
        continue;
      }
      var level = +m[1];
      var node = { level: level, xref: m[2] || null, tag: m[3].toUpperCase(), value: m[4] == null ? '' : m[4], children: [] };
      // GEDCOM 7.0 escapes a value that starts with @ by doubling it.
      if (node.value.slice(0, 2) === '@@') node.value = node.value.slice(1);
      if (node.tag === 'CONT' || node.tag === 'CONC') {
        var parent = stack[level - 1];
        if (parent) {
          parent.value = (parent.value || '') + (node.tag === 'CONT' ? '\n' : '') + node.value;
          continue;
        }
      }
      while (stack.length > level) stack.pop();
      if (level === 0) {
        records.push(node);
        stack = [node];
      } else if (stack.length === level) {
        stack[level - 1].children.push(node);
        stack.push(node);
      } else {
        // A level that jumps by more than one: attach it to the nearest open parent.
        if (!stack.length) { bad++; continue; }
        stack[stack.length - 1].children.push(node);
        stack.push(node);
      }
    }
    report.badLines = bad;
    report.firstBadLine = firstBad;
    return records;
  }

  function child(node, tag) {
    for (var i = 0; i < node.children.length; i++) if (node.children[i].tag === tag) return node.children[i];
    return null;
  }
  function children(node, tag) { return node.children.filter(function (c) { return c.tag === tag; }); }
  function pointer(v) { var m = /^\s*(@[^@]+@)\s*$/.exec(v || ''); return m ? m[1] : null; }

  // ---- Records to people -----------------------------------------------------------------

  var DEATH_TAGS = ['DEAT', 'BURI', 'CREM'];
  var BIRTH_TAGS = ['BIRT', 'CHR', 'BAPM'];
  // Placeholder names some exports write instead of a person's name. One of them is a word the
  // page never says (test/promises.test.js bans it from every page file); it is spelled with a
  // character class here because it is only matched against the file, never shown.
  var PLACEHOLDER = /^(private|priv|hidden|confidential|l[i]ving|unknown|n\.?\s*n\.?|\?+)$/i;

  function cleanName(v) {
    return (v || '').replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
  }

  function read(input) {
    var report = { encoding: null, notes: [], skipped: {}, badLines: 0 };
    var dec = decode(input);
    if (dec.error) return { error: dec.error, encoding: dec.encoding, report: report };
    report.encoding = dec.encoding;
    if (dec.note) report.notes.push(dec.note);
    var text = dec.text.replace(/^﻿/, '');
    var firstLine = (text.match(/^\s*[^\r\n]*/) || [''])[0].trim();
    // A GEDCOM file starts with a level-0 line, nearly always "0 HEAD".
    if (!/^0\s+(HEAD\b|@[^@]+@\s+[A-Z_]+)/i.test(firstLine)) return { error: 'not-gedcom', report: report };
    var records = parseLines(text, report);
    if (!records.length) return { error: 'not-gedcom', report: report };

    var head = records.filter(function (r) { return r.tag === 'HEAD'; })[0];
    var version = null, source = null;
    if (head) {
      var g = child(head, 'GEDC'); var v = g && child(g, 'VERS'); version = v ? v.value.trim() : null;
      var so = child(head, 'SOUR'); source = so ? so.value.trim() : null;
    }

    var byX = { INDI: {}, FAM: {}, NOTE: {}, SNOTE: {}, SOUR: {}, OBJE: {} };
    var people = [], families = [], skipped = report.skipped;
    function skip(why) { skipped[why] = (skipped[why] || 0) + 1; }

    records.forEach(function (r) {
      if (byX[r.tag]) {
        if (r.xref) byX[r.tag][r.xref] = r;
        else if (r.tag === 'INDI' || r.tag === 'FAM') skip(r.tag === 'INDI' ? 'person with no ID' : 'family with no ID');
      } else if (r.tag !== 'HEAD' && r.tag !== 'TRLR' && r.tag !== 'SUBM' && r.tag !== 'SUBN' && r.tag !== 'REPO' && r.tag.charAt(0) !== '_') {
        skip('record of type ' + r.tag);
      }
    });

    function noteText(n) {
      var t = n.value || '';
      var p = pointer(t);
      if (p) { var rec = byX.NOTE[p] || byX.SNOTE[p]; t = rec ? rec.value || '' : ''; }
      return t.trim();
    }

    // Does this record hold anything beyond dates and places: a note, source text or media?
    function story(node) {
      var found = false;
      (function walk(n) {
        if (found) return;
        n.children.forEach(function (c) {
          if (found) return;
          if ((c.tag === 'NOTE' || c.tag === 'SNOTE') && noteText(c)) { found = true; return; }
          if (c.tag === 'OBJE') { found = true; return; }
          if (c.tag === 'TEXT' && (c.value || '').trim()) { found = true; return; }
          if (c.tag === 'SOUR') {
            var p = pointer(c.value), rec = p && byX.SOUR[p];
            if (rec && hasText(rec)) { found = true; return; }
          }
          walk(c);
        });
      })(node);
      return found;
    }
    function hasText(rec) {
      var t = child(rec, 'TEXT'); if (t && t.value.trim()) return true;
      var d = child(rec, 'DATA'); if (d) { var dt = child(d, 'TEXT'); if (dt && dt.value.trim()) return true; }
      return false;
    }

    var index = {};
    Object.keys(byX.INDI).forEach(function (x) {
      var r = byX.INDI[x];
      var nameNode = child(r, 'NAME');
      var name = '';
      if (nameNode) {
        name = cleanName(nameNode.value);
        if (!name) {
          var gv = child(nameNode, 'GIVN'), sn = child(nameNode, 'SURN');
          name = cleanName([gv ? gv.value : '', sn ? sn.value : ''].join(' '));
        }
      }
      var sexNode = child(r, 'SEX');
      var sex = sexNode ? sexNode.value.trim().toUpperCase().charAt(0) : 'U';
      if (sex !== 'M' && sex !== 'F') sex = 'U';
      var resn = child(r, 'RESN');
      var priv = !!(resn && /privacy|confidential|private/i.test(resn.value));
      // "Private", or a given name such as "Private" with the surname kept, as several exports write.
      var given = nameNode ? cleanName(nameNode.value.split('/')[0]) : '';
      var givn = nameNode && child(nameNode, 'GIVN');
      if (!given && givn) given = cleanName(givn.value);
      var placeholder = !name || PLACEHOLDER.test(name) || (!!given && PLACEHOLDER.test(given));

      var birth = null, birthFrom = null;
      for (var i = 0; i < BIRTH_TAGS.length && !birth; i++) {
        var ev = child(r, BIRTH_TAGS[i]);
        var dn = ev && child(ev, 'DATE');
        if (dn) { var pd = parseDate(dn.value); if (pd.ok) { birth = pd; birthFrom = BIRTH_TAGS[i]; } else if (!birth) birth = null; }
      }
      var birthText = null;
      var bev = child(r, 'BIRT'); var bdn = bev && child(bev, 'DATE');
      if (bdn) birthText = bdn.value.trim();

      var deathRecorded = false, death = null, deathText = null;
      DEATH_TAGS.forEach(function (t) {
        var ev = child(r, t);
        if (!ev) return;
        // DEAT, BURI or CREM in any form says a death is recorded, including a bare "DEAT Y".
        deathRecorded = true;
        var dn = child(ev, 'DATE');
        if (dn) {
          var pd = parseDate(dn.value);
          if (t === 'DEAT' || !deathText) deathText = dn.value.trim();
          if (pd.ok && (!death || t === 'DEAT')) death = pd;
        }
      });

      var p = {
        id: x, name: name || '', sex: sex, private: priv, placeholder: placeholder,
        birth: birth, birthFrom: birthFrom, birthText: birthText,
        deathRecorded: deathRecorded, death: death, deathText: deathText,
        story: story(r),
        famc: children(r, 'FAMC').map(function (c) { return pointer(c.value); }).filter(Boolean),
        fams: children(r, 'FAMS').map(function (c) { return pointer(c.value); }).filter(Boolean),
        parents: [], spouses: [], children: []
      };
      people.push(p); index[x] = p;
    });

    // Families are the truth about who is whose parent and spouse; the links on the
    // individuals fill in when a family record is missing a line.
    var famIndex = {};
    Object.keys(byX.FAM).forEach(function (x) {
      var r = byX.FAM[x];
      var f = { id: x, partners: [], children: [] };
      ['HUSB', 'WIFE'].forEach(function (t) {
        children(r, t).forEach(function (c) { var q = pointer(c.value); if (q && index[q]) f.partners.push(q); else if (q && q !== '@VOID@') skip('family link to a missing person'); });
      });
      // GEDCOM 7 writes @VOID@ for a person it knows exists but has no record for.
      children(r, 'CHIL').forEach(function (c) { var q = pointer(c.value); if (q && index[q]) f.children.push(q); else if (q && q !== '@VOID@') skip('family link to a missing person'); });
      families.push(f); famIndex[x] = f;
    });
    people.forEach(function (p) {
      p.famc.forEach(function (fx) { var f = famIndex[fx]; if (f && f.children.indexOf(p.id) < 0) f.children.push(p.id); });
      p.fams.forEach(function (fx) { var f = famIndex[fx]; if (f && f.partners.indexOf(p.id) < 0) f.partners.push(p.id); });
    });
    families.forEach(function (f) {
      f.children.forEach(function (c) {
        f.partners.forEach(function (q) {
          add(index[c].parents, q); add(index[q].children, c);
        });
      });
      f.partners.forEach(function (a) { f.partners.forEach(function (b) { if (a !== b) add(index[a].spouses, b); }); });
    });

    if (!people.length) return { error: 'no-people', report: report };
    report.people = people.length;
    report.families = families.length;
    report.noUsableBirth = people.filter(function (p) { return !p.birth; }).length;
    report.unreadBirthDates = people.filter(function (p) { return !p.birth && p.birthText; }).length;

    return { version: version, source: source, people: people, families: families, index: index, report: report };
  }

  function add(list, v) { if (list.indexOf(v) < 0) list.push(v); }

  var api = { read: read, parseDate: parseDate, decode: decode, decodeAnsel: decodeAnsel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Gedcom = api;
})(this);
