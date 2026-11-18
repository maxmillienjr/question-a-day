'use strict';
// The printable sheet: which relatives, which questions, and the wording of the question bank.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Gedcom = require('../docs/gedcom.js');
const Tree = require('../docs/tree.js');
const Sheet = require('../docs/sheet.js');
const { wordingProblems } = require('./wording.js');

test('Ruth\'s sheet: four relatives in list order, three questions each, no repeats', () => {
  const tree = Gedcom.read(fs.readFileSync(path.join(__dirname, 'fixtures', 'hand-tree.ged')));
  const r = Tree.analyze(tree, { year: 2026 });
  const sheet = Sheet.sheetFor(r.list[0], tree.index);
  assert.equal(sheet.name, 'Ruth Pell');
  assert.deepEqual(sheet.relatives.map((x) => [x.name, x.kind]), [
    ['Edna Pell', 'parent'], ['Hal Dorn', 'spouse'], ['Walter Pell', 'sibling'], ['Arthur Pell', 'parent']]);
  assert.equal(sheet.more, 0);
  // Two parents on one sheet get different questions: Edna the first three, Arthur the next three.
  assert.deepEqual(sheet.relatives[0].questions, Sheet.BANK.parent.slice(0, 3).map((q) => q.replace(/\{first\}/g, 'Edna').replace(/\{his\}/g, 'her').replace(/\{him\}/g, 'her')));
  assert.deepEqual(sheet.relatives[3].questions, Sheet.BANK.parent.slice(3, 6).map((q) => q.replace(/\{first\}/g, 'Arthur').replace(/\{his\}/g, 'his').replace(/\{him\}/g, 'him')));
  const all = sheet.relatives.flatMap((x) => x.questions);
  assert.equal(new Set(all).size, 12);
  for (const q of all) assert.ok(!/[{}]/.test(q), q);
});

test('every relationship the rules produce has at least three questions', () => {
  for (const k of ['parent', 'grandparent', 'great-grandparent', 'aunt or uncle', 'sibling', 'spouse', 'parent-in-law', 'first cousin']) {
    assert.ok(Sheet.BANK[k] && Sheet.BANK[k].length >= 3, k);
  }
});

test('the question bank never uses the words the page avoids', () => {
  const text = Object.values(Sheet.BANK).flat().join('\n');
  assert.deepEqual(wordingProblems(text, 'the question bank'), []);
});
