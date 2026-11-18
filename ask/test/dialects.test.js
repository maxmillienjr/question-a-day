'use strict';
/* One small synthetic family written in the style of each common exporter (test/fixtures/dialects/).
   Every file holds the same five invented people, so the right answer is the same for all of them:
   Harlan Voss (1921 to about 1990) and Edith Corran (about 1924 to 1975) are June Voss's parents;
   June (1950) married Carl Ressler (1948 to 2010); their son is Dean Ressler (1980).
   In 2026 June can speak about her father, her mother and her husband; Dean about his father and his
   mother's father (Edith died before Dean was five). Each relative is known by two or fewer, so June
   (three such relatives) comes before Dean (two). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Gedcom = require('../docs/gedcom.js');
const Tree = require('../docs/tree.js');

const DIR = path.join(__dirname, 'fixtures', 'dialects');
const CASES = {
  'ancestry.ged': { version: '5.5.1', encoding: 'UTF-8', stories: ['Edith Mae Corran'] },
  'familysearch.ged': { version: '5.5.1', encoding: 'UTF-8', stories: [], extraPeople: 1, deathYearUnknown: 1 },
  'myheritage.ged': { version: '5.5.1', encoding: 'UTF-8', stories: [] },
  'gramps.ged': { version: '5.5.1', encoding: 'UTF-8', stories: ['Carl Ressler'], deanEstimated: true },
  'rootsmagic.ged': { version: '5.5.1', encoding: 'UTF-8', stories: ['Harlan Voss'], extraPeople: 1, hidden: 1 },
  'familytreemaker.ged': { version: '5.5', encoding: 'ANSEL', stories: [], edith: 'Renée Corran' },
  // Dean is SEX X here (GEDCOM 7's "does not fit male or female"), so the page says "their".
  'gedcom7.ged': { version: '7.0', encoding: 'UTF-8', stories: ['Edith Corran', 'Carl Ressler'], pronoun: 'their' },
};

for (const [file, want] of Object.entries(CASES)) {
  test(`dialect: ${file}`, () => {
    const tree = Gedcom.read(fs.readFileSync(path.join(DIR, file)));
    assert.ok(!tree.error, tree.error);
    assert.equal(tree.version, want.version);
    assert.equal(tree.report.encoding, want.encoding);
    assert.equal(tree.people.length, 5 + (want.extraPeople || 0));
    assert.deepEqual(tree.report.skipped, {}, 'nothing skipped');
    assert.equal(tree.report.badLines, 0);
    const edith = want.edith || (file === 'ancestry.ged' ? 'Edith Mae Corran' : file === 'myheritage.ged' ? 'Edith Voss' : 'Edith Corran');
    const names = tree.people.map((p) => p.name);
    for (const n of ['Harlan Voss', edith, 'June Voss', 'Carl Ressler', 'Dean Ressler']) assert.ok(names.includes(n), `${n} in ${names}`);
    const stories = tree.people.filter((p) => p.story).map((p) => p.name).sort();
    assert.deepEqual(stories, want.stories.slice().sort());

    const r = Tree.analyze(tree, { year: 2026 });
    assert.deepEqual(r.list.map((x) => x.name), ['June Voss', 'Dean Ressler']);
    assert.deepEqual(r.list[0].speak.map((s) => s.words).sort(), ['her father', 'her husband', 'her mother']);
    const his = want.pronoun || 'his';
    assert.deepEqual(r.list[1].speak.map((s) => s.words).sort(), [`${his} father`, `${his} mother's father`]);
    assert.equal(r.list[1].birthEstimated, !!want.deanEstimated);
    assert.equal(r.counts.hidden, want.hidden || 0);
    assert.equal(r.counts.deathYearUnknown, want.deathYearUnknown || 0);
  });
}
