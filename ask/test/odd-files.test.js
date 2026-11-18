'use strict';
// Odd and broken files: the reader and the rules must never throw, and must say what they skipped.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Gedcom = require('../docs/gedcom.js');
const Tree = require('../docs/tree.js');
const Sheet = require('../docs/sheet.js');

function run(text, year = 2026) {
  const t = Gedcom.read(text);
  if (t.error) return { t };
  const r = Tree.analyze(t, { year });
  r.list.forEach((row) => Sheet.sheetFor(row, t.index));
  return { t, r };
}

test('a person who is their own grandparent (a loop in the tree) does not hang or throw', () => {
  const { t, r } = run(['0 HEAD',
    '0 @A@ INDI', '1 NAME Ann /Loop/', '1 SEX F', '1 BIRT', '2 DATE 1950',
    '0 @B@ INDI', '1 NAME Ben /Loop/', '1 SEX M', '1 BIRT', '2 DATE 1920', '1 DEAT', '2 DATE 1990',
    '0 @F1@ FAM', '1 HUSB @B@', '1 CHIL @A@',
    '0 @F2@ FAM', '1 WIFE @A@', '1 CHIL @B@',
    '0 @F3@ FAM', '1 HUSB @A@', '1 CHIL @A@',
    '0 TRLR'].join('\n'));
  assert.ok(!t.error);
  assert.ok(r.list.length <= 1);
});

test('tabs, lowercase tags, leading spaces, no HEAD and no TRLR', () => {
  const { t, r } = run(['0 @I1@ INDI', '  1\tname\tOla /Tab/', '1 sex F', '1 birt', '2 date 1950',
    '0 @I2@ INDI', '1 NAME Per /Tab/', '1 SEX M', '1 BIRT', '2 DATE 1920', '1 DEAT', '2 DATE 1990',
    '0 @F1@ FAM', '1 HUSB @I2@', '1 CHIL @I1@'].join('\n'));
  assert.ok(!t.error, t.error);
  assert.equal(t.index['@I1@'].name, 'Ola Tab');
  assert.deepEqual(r.list.map((x) => x.name), ['Ola Tab']);
});

test('the same ID twice keeps one person and says nothing breaks', () => {
  const { t } = run(['0 HEAD', '0 @I1@ INDI', '1 NAME First /Dup/', '0 @I1@ INDI', '1 NAME Second /Dup/', '0 TRLR'].join('\n'));
  assert.equal(t.people.length, 1);
});

test('levels that jump, an empty file of blank lines, and a huge note', () => {
  assert.ok(!run(['0 HEAD', '0 @I1@ INDI', '3 NAME Lost /Level/', '1 BIRT', '2 DATE 1950', '0 TRLR'].join('\n')).t.error);
  assert.equal(Gedcom.read('\n\n\n').error, 'not-gedcom');
  const big = 'x'.repeat(2000000);
  const { t } = run(['0 HEAD', '0 @I1@ INDI', '1 NAME Long /Note/', '1 NOTE ' + big, '0 TRLR'].join('\n'));
  assert.equal(t.index['@I1@'].story, true);
});

test('a family that names a person as both parent and child, and a spouse twice', () => {
  const { t } = run(['0 HEAD', '0 @I1@ INDI', '1 NAME Odd /One/', '1 BIRT', '2 DATE 1950',
    '0 @F1@ FAM', '1 HUSB @I1@', '1 WIFE @I1@', '1 CHIL @I1@', '0 TRLR'].join('\n'));
  assert.ok(!t.error);
});

test('a birth date far in the future or a death before birth is not trusted to list anyone', () => {
  const { r } = run(['0 HEAD',
    '0 @I1@ INDI', '1 NAME Future /Kid/', '1 BIRT', '2 DATE 2150',
    '0 @I2@ INDI', '1 NAME Old /Kid/', '1 SEX M', '1 BIRT', '2 DATE 1990', '1 DEAT', '2 DATE 1950',
    '0 @F1@ FAM', '1 HUSB @I2@', '1 CHIL @I1@', '0 TRLR'].join('\n'));
  assert.equal(r.list.length, 0);
});

// Seeded fuzzing: cut, duplicate, corrupt and shuffle lines and bytes of the demo file. Nothing throws.
test('2,000 damaged copies of the demo file never throw', () => {
  global.window = {};
  require('../docs/demo-data.js');
  const demo = Buffer.from(global.window.DEMO_GEDCOM, 'utf8');
  let seed = 12345;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let i = 0; i < 2000; i++) {
    let b = Buffer.from(demo);
    const kind = i % 5;
    if (kind === 0) b = b.subarray(0, rnd(b.length));                                  // cut short
    if (kind === 1) for (let k = 0; k < 20; k++) b[rnd(b.length)] = rnd(256);         // random bytes
    if (kind === 2) { const lines = b.toString('utf8').split('\n'); for (let k = 0; k < 30; k++) { const a = rnd(lines.length), c = rnd(lines.length); [lines[a], lines[c]] = [lines[c], lines[a]]; } b = Buffer.from(lines.join('\n')); }
    if (kind === 3) { const lines = b.toString('utf8').split('\n'); for (let k = 0; k < 20; k++) lines.splice(rnd(lines.length), 1); b = Buffer.from(lines.join('\r')); }
    if (kind === 4) { const lines = b.toString('utf8').split('\n'); for (let k = 0; k < 20; k++) lines[rnd(lines.length)] = lines[rnd(lines.length)].replace(/\d/g, () => String(rnd(10))); b = Buffer.from(lines.join('\n')); }
    assert.doesNotThrow(() => run(b), `copy ${i} (kind ${kind})`);
  }
});
