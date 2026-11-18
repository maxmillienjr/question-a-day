'use strict';
// The reader: encodings, line endings, continuation lines, odd structures and broken files.
const test = require('node:test');
const assert = require('node:assert/strict');
const { read, decode } = require('../docs/gedcom.js');

const BASIC = [
  '0 HEAD', '1 GEDC', '2 VERS 5.5.1', '1 CHAR UTF-8',
  '0 @I1@ INDI', '1 NAME Thea /Brask/', '2 GIVN Thea', '2 SURN Brask', '1 SEX F', '1 BIRT', '2 DATE 2 FEB 1931',
  '1 NOTE First line of a long note', '2 CONC  that goes on', '2 CONT and a second line.',
  '1 _CUSTOM whatever an exporter likes', '2 _MORE nested custom',
  '0 @I2@ INDI', '1 NAME Ove /Brask/', '1 SEX M', '1 DEAT Y',
  '0 @I3@ INDI', '1 NAME Pia /Brask/', '1 SEX F', '1 BURI', '2 PLAC Hollin',
  '0 @F1@ FAM', '1 HUSB @I2@', '1 WIFE @I3@', '1 CHIL @I1@',
  '0 TRLR'];

function check(t) {
  assert.ok(!t.error, t.error);
  assert.equal(t.people.length, 3);
  const thea = t.index['@I1@'];
  assert.equal(thea.name, 'Thea Brask');
  assert.equal(thea.birth.year, 1931);
  assert.equal(thea.deathRecorded, false);
  assert.equal(thea.story, true);
  assert.deepEqual(thea.parents.sort(), ['@I2@', '@I3@']);
  assert.equal(t.index['@I2@'].deathRecorded, true, 'DEAT Y counts as a death recorded');
  assert.equal(t.index['@I2@'].death, null);
  assert.equal(t.index['@I3@'].deathRecorded, true, 'a burial counts as a death recorded');
  assert.deepEqual(t.report.skipped, {}, 'custom tags are ignored without complaint');
}

for (const [label, eol] of [['LF', '\n'], ['CRLF', '\r\n'], ['CR', '\r']]) {
  test(`line endings: ${label}`, () => check(read(BASIC.join(eol) + eol)));
}

test('CONT and CONC rebuild a note', () => {
  const t = read(BASIC.join('\n'));
  assert.equal(t.version, '5.5.1');
  // The note itself is not exposed, but it counts as a story.
  assert.equal(t.index['@I1@'].story, true);
});

test('UTF-8 with a byte-order mark', () => {
  const bytes = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(BASIC.join('\n').replace('Thea', 'Théa'), 'utf8')]);
  const t = read(bytes);
  assert.equal(t.report.encoding, 'UTF-8');
  assert.equal(t.index['@I1@'].name, 'Théa Brask');
});

test('UTF-16 little endian with a byte-order mark, and big endian without one', () => {
  const text = BASIC.join('\r\n');
  const le = Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(text, 'utf16le')]);
  check(read(le));
  assert.equal(read(le).report.encoding, 'UTF-16');
  const be = Buffer.from(text, 'utf16le').swap16();
  check(read(be));
});

test('ANSEL: combining marks come before the letter', () => {
  // "Renée" in ANSEL is R e n (0xE2 acute) e e.
  const head = Buffer.from('0 HEAD\n1 CHAR ANSEL\n0 @I1@ INDI\n1 NAME Ren', 'latin1');
  const body = Buffer.from([0xE2, 0x65, 0x65]);
  const tail = Buffer.from(' /Os/\n1 BIRT\n2 DATE 1950\n0 TRLR\n', 'latin1');
  const t = read(Buffer.concat([head, body, tail]));
  assert.equal(t.report.encoding, 'ANSEL');
  assert.equal(t.index['@I1@'].name, 'Renée Os');
});

test('a Windows (ANSI) file that is not UTF-8 is read as Windows Western', () => {
  const bytes = Buffer.from('0 HEAD\n1 CHAR ANSI\n0 @I1@ INDI\n1 NAME Jörg /Müller/\n0 TRLR\n', 'latin1');
  const t = read(bytes);
  assert.equal(t.index['@I1@'].name, 'Jörg Müller');
  assert.equal(t.report.encoding, 'ANSI');
});

test('a file that is not GEDCOM gets a named error, not an exception', () => {
  assert.equal(read('Name,Born,Died\nThea,1931,\n').error, 'not-gedcom');
  assert.equal(read('<html><body>hello</body></html>').error, 'not-gedcom');
  assert.equal(read(new Uint8Array(0)).error, 'empty');
  assert.equal(read(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 13])).error, 'not-gedcom');
  assert.equal(read('0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 TRLR\n').error, 'no-people');
});

test('broken lines are counted, odd records named, and the rest still read', () => {
  const t = read([
    '0 HEAD',
    '0 @I1@ INDI', '1 NAME Ida /Lorne/', '1 BIRT', '2 DATE sometime in spring',
    'this line has no level number',
    '0 @I2@ INDI', '1 NAME Bo /Lorne/', '1 BIRT', '2 DATE 1950',
    '0 INDI', '1 NAME Nobody',
    '0 @X1@ WIDGET',
    '0 @F1@ FAM', '1 HUSB @I9@', '1 CHIL @I2@',
    '0 TRLR'].join('\n'));
  assert.ok(!t.error);
  assert.equal(t.people.length, 2);
  assert.equal(t.report.badLines, 1);
  assert.equal(t.report.noUsableBirth, 1);
  assert.equal(t.report.unreadBirthDates, 1);
  assert.equal(t.index['@I1@'].birthText, 'sometime in spring');
  assert.deepEqual(t.report.skipped, { 'person with no ID': 1, 'record of type WIDGET': 1, 'family link to a missing person': 1 });
});

test('a private person and a placeholder name are recognised', () => {
  const t = read(['0 HEAD',
    '0 @I1@ INDI', '1 NAME Ann /Fisk/', '1 RESN privacy',
    '0 @I2@ INDI', '1 NAME Private /Fisk/',
    '0 @I3@ INDI', '1 NAME /Fisk/',
    '0 @I4@ INDI', '1 NAME Living',
    '0 @I5@ INDI', '1 NAME Livia /Fisk/',
    '0 TRLR'].join('\n'));
  assert.equal(t.index['@I1@'].private, true);
  assert.equal(t.index['@I2@'].placeholder, true);
  assert.equal(t.index['@I3@'].placeholder, false, 'a surname alone is still a name');
  assert.equal(t.index['@I4@'].placeholder, true);
  assert.equal(t.index['@I5@'].placeholder, false);
});

test('a christening date stands in for a missing birth date', () => {
  const t = read('0 HEAD\n0 @I1@ INDI\n1 NAME Al /Dee/\n1 CHR\n2 DATE 14 APR 1933\n0 TRLR\n');
  assert.equal(t.index['@I1@'].birth.year, 1933);
  assert.equal(t.index['@I1@'].birthFrom, 'CHR');
});

test('source text and media count as a story; a bare source does not', () => {
  const t = read(['0 HEAD',
    '0 @S1@ SOUR', '1 TITL Census', '0 @S2@ SOUR', '1 TITL Letter', '1 TEXT Dear Ma, the river is up again.',
    '0 @I1@ INDI', '1 NAME A /B/', '1 BIRT', '2 DATE 1900', '2 SOUR @S1@',
    '0 @I2@ INDI', '1 NAME C /B/', '1 SOUR @S2@',
    '0 @I3@ INDI', '1 NAME D /B/', '1 OBJE', '2 FILE photo.jpg',
    '0 @I4@ INDI', '1 NAME E /B/', '1 BIRT', '2 SOUR @S1@', '3 DATA', '4 TEXT Born at home in the back room.',
    '0 TRLR'].join('\n'));
  assert.deepEqual(['@I1@', '@I2@', '@I3@', '@I4@'].map(x => t.index[x].story), [false, true, true, true]);
});

test('decode reports the encoding it used', () => {
  assert.equal(decode(Buffer.from('0 HEAD\n1 CHAR ASCII\n')).encoding, 'ASCII');
});
