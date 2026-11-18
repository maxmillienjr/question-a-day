'use strict';
// The overlap and ranking rules on a small tree whose right answer is worked out by hand below.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Gedcom = require('../docs/gedcom.js');
const Tree = require('../docs/tree.js');

function load(name, year = 2026) {
  const tree = Gedcom.read(fs.readFileSync(path.join(__dirname, 'fixtures', name)));
  assert.ok(!tree.error, tree.error);
  return Tree.analyze(tree, { year });
}

/* Worked by hand, year 2026 (born before 1921 is left off):
   Ruth 1930:  father Arthur (d1980, from 1935: 45 y), mother Edna (d1950: 15 y),
               brother Walter (buried 2000: 65 y), husband Hal (d1990: 55 y).
   June 1960:  father Hal (from 1965: 25 y), her mother's father Arthur (15 y),
               her mother's mother Edna (died 1950, before June was 5: no), her mother's brother Walter (35 y).
   Iris 1938:  husband Walter (57 y), husband's father Arthur (37 y), husband's mother Edna (7 y).
   Ned 1965:   father Walter (30 y), his father's father Arthur (10 y), Edna no (died 1950).
   Known by:   Arthur 4 (Ruth, June, Iris, Ned), Walter 4, Edna 2 (Ruth, Iris), Hal 2 (Ruth, June).
   Few others (known by 2 or fewer): Edna, Hal.
   Ruth has 2 of those, June 1 (closest: father), Iris 1 (closest: parent-in-law), Ned 0.
   Order: Ruth, June, Iris, Ned. Mabel (1915) is too far back; "Living Dorn" is a placeholder. */
test('the hand-worked tree gives the hand-worked list', () => {
  const r = load('hand-tree.ged');
  assert.deepEqual(r.list.map(x => x.name), ['Ruth Pell', 'June Dorn', 'Iris Pell', 'Ned Pell']);
  assert.deepEqual(r.list.map(x => x.scarceCount), [2, 1, 1, 0]);
  assert.equal(r.counts.noDeath, 6);
  assert.equal(r.counts.tooOld, 1);
  assert.equal(r.counts.hidden, 1);
  assert.equal(r.cutoff, 1921);
});

// Within a person: relatives known by two or fewer on the list first, then those with only dates
// (Walter has no note, Arthur has one), then fewest others, then closest.
test('each person: who they can speak about, in what words, and how many others knew them', () => {
  const r = load('hand-tree.ged');
  const by = Object.fromEntries(r.list.map(x => [x.name, x.speak.map(s => [s.name, s.words, s.others, s.years])]));
  assert.deepEqual(by['Ruth Pell'], [
    ['Edna Pell', 'her mother', 1, 15],
    ['Hal Dorn', 'her husband', 1, 55],
    ['Walter Pell', 'her brother', 3, 65],
    ['Arthur Pell', 'her father', 3, 45],
  ]);
  assert.deepEqual(by['June Dorn'], [
    ['Hal Dorn', 'her father', 1, 25],
    ['Walter Pell', "her mother's brother", 3, 35],
    ['Arthur Pell', "her mother's father", 3, 15],
  ]);
  assert.deepEqual(by['Iris Pell'], [
    ['Edna Pell', "her husband's mother", 1, 7],
    ['Walter Pell', 'her husband', 3, 57],
    ['Arthur Pell', "her husband's father", 3, 37],
  ]);
  assert.deepEqual(by['Ned Pell'], [
    ['Walter Pell', 'his father', 3, 30],
    ['Arthur Pell', "his father's father", 3, 10],
  ]);
});

test('dates but no stories: only Arthur has a note', () => {
  const r = load('hand-tree.ged');
  const flags = {};
  r.list.forEach(x => x.speak.forEach(s => { flags[s.name] = s.noStory; }));
  assert.deepEqual(flags, { 'Edna Pell': true, 'Hal Dorn': true, 'Arthur Pell': false, 'Walter Pell': true });
});

test('the overlap counts from the fifth birthday and needs three years', () => {
  // Edna died 1950. Someone born 1943 overlaps from 1948: 2 years, not enough. Born 1942: 3 years, enough.
  const ged = (by) => `0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 @A@ INDI\n1 NAME Edna /Pell/\n1 SEX F\n1 BIRT\n2 DATE 1905\n1 DEAT\n2 DATE 1950\n` +
    `0 @B@ INDI\n1 NAME Kit /Pell/\n1 SEX U\n1 BIRT\n2 DATE ${by}\n0 @F@ FAM\n1 WIFE @A@\n1 CHIL @B@\n0 TRLR\n`;
  const at = (by) => Tree.analyze(Gedcom.read(ged(by)), { year: 2026 });
  assert.equal(at(1943).list.length, 0);
  assert.equal(at(1943).counts.noOverlap, 1);
  assert.equal(at(1942).list.length, 1);
  assert.equal(at(1942).list[0].speak[0].words, 'their mother');
});

test('first cousins count only from when both were adults', () => {
  // Cousin Ada born 1930 died 1960; Bea born 1945 is adult from 1963: no overlap. Born 1935: adult 1953, 7 years.
  const ged = (by) => `0 HEAD\n0 @G@ INDI\n1 NAME Gus /Rae/\n1 SEX M\n1 BIRT\n2 DATE 1880\n1 DEAT\n2 DATE 1925\n` +
    `0 @M@ INDI\n1 NAME Moll /Rae/\n1 SEX F\n1 BIRT\n2 DATE 1905\n1 DEAT\n2 DATE 1930\n` +
    `0 @N@ INDI\n1 NAME Nan /Rae/\n1 SEX F\n1 BIRT\n2 DATE 1907\n1 DEAT\n2 DATE 1931\n` +
    `0 @A@ INDI\n1 NAME Ada /Rae/\n1 SEX F\n1 BIRT\n2 DATE 1930\n1 DEAT\n2 DATE 1960\n` +
    `0 @B@ INDI\n1 NAME Bea /Rae/\n1 SEX F\n1 BIRT\n2 DATE ${by}\n` +
    `0 @F1@ FAM\n1 HUSB @G@\n1 CHIL @M@\n1 CHIL @N@\n0 @F2@ FAM\n1 WIFE @M@\n1 CHIL @A@\n0 @F3@ FAM\n1 WIFE @N@\n1 CHIL @B@\n0 TRLR\n`;
  assert.equal(Tree.analyze(Gedcom.read(ged(1945)), { year: 2026 }).list.length, 0);
  const r = Tree.analyze(Gedcom.read(ged(1935)), { year: 2026 });
  assert.deepEqual(r.list[0].speak.map(s => [s.name, s.words, s.years]), [['Ada Rae', "her mother's sister's daughter", 7]]);
});

test('a birth year is estimated from a child when none is recorded, and marked', () => {
  const ged = `0 HEAD\n0 @A@ INDI\n1 NAME Otto /Vale/\n1 SEX M\n1 DEAT\n2 DATE 1990\n` +
    `0 @B@ INDI\n1 NAME Lena /Vale/\n1 SEX F\n0 @C@ INDI\n1 NAME Max /Vale/\n1 SEX M\n1 BIRT\n2 DATE 1960\n` +
    `0 @F@ FAM\n1 HUSB @A@\n1 WIFE @B@\n1 CHIL @C@\n0 TRLR\n`;
  const r = Tree.analyze(Gedcom.read(ged), { year: 2026 });
  // Lena: child born 1960, so born 1910 to 1945, estimated 1928 (middle, rounded); husband estimated too.
  const lena = r.list.find(x => x.name === 'Lena Vale');
  assert.equal(lena.birthYear, 1928);
  assert.equal(lena.birthEstimated, true);
  assert.equal(r.counts.estimated, 1);
});

test('same file, same year, same list', () => {
  assert.deepEqual(load('hand-tree.ged').list.map(x => x.id), load('hand-tree.ged').list.map(x => x.id));
});
