'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDate } = require('../docs/gedcom.js');

// [value, kind, min, max, year]
const CASES = [
  ['12 MAR 1931', 'exact', 1931, 1931, 1931],
  ['MAR 1931', 'exact', 1931, 1931, 1931],
  ['1931', 'exact', 1931, 1931, 1931],
  ['ABT 1931', 'about', 1931, 1931, 1931],
  ['ABOUT 1931', 'about', 1931, 1931, 1931],
  ['CA. 1931', 'about', 1931, 1931, 1931],
  ['EST 1931', 'estimated', 1931, 1931, 1931],
  ['CAL 1931', 'calculated', 1931, 1931, 1931],
  ['BEF 1931', 'before', null, 1931, 1931],
  ['BEF 3 JAN 1931', 'before', null, 1931, 1931],
  ['AFT 1931', 'after', 1931, null, 1931],
  ['BET 1925 AND 1931', 'between', 1925, 1931, 1928],
  ['BET MAR 1925 AND 4 JUN 1929', 'between', 1925, 1929, 1927],
  ['FROM 1925 TO 1931', 'period', 1925, 1931, 1928],
  ['FROM 1925', 'period', 1925, 1925, 1925],
  ['TO 1931', 'period', 1931, 1931, 1931],
  ['11 FEB 1712/13', 'exact', 1713, 1713, 1713],
  ['1699/700', 'exact', 1700, 1700, 1700],
  ['INT 1931 (in the family Bible)', 'exact', 1931, 1931, 1931],
  ['@#DJULIAN@ 12 MAR 1720', 'exact', 1720, 1720, 1720],
  ['JULIAN 12 MAR 1720', 'exact', 1720, 1720, 1720],
  ['GREGORIAN 2 OCT 1931', 'exact', 1931, 1931, 1931],
  ['@#DHEBREW@ 5 TSH 5690', 'exact', 1930, 1930, 1930],
  ['@#DFRENCH R@ 1 VEND 8', 'exact', 1799, 1799, 1799],
  ['12 MÄR 1931', 'exact', 1931, 1931, 1931],
  ['3 OKT 1931', 'exact', 1931, 1931, 1931],
  ['3 MEI 1931', 'exact', 1931, 1931, 1931],
  ['3 JANV 1931', 'exact', 1931, 1931, 1931],
  ['3 ENE 1931', 'exact', 1931, 1931, 1931],
  ['12 March 1931', 'exact', 1931, 1931, 1931],
  ['1931-03-12', 'exact', 1931, 1931, 1931],
  ['12/03/1931', 'exact', 1931, 1931, 1931],
  ['12.03.1931', 'exact', 1931, 1931, 1931],
  ['44 BC', 'exact', -44, -44, -44],
];
const UNKNOWN = ['', 'unknown', 'sometime in the spring', '(stillborn)', 'ABT', 'BET 1925', '12 XYZ 1931', 'spring of 31', '0'];

for (const [v, kind, min, max, year] of CASES) {
  test(`date "${v}"`, () => {
    const d = parseDate(v);
    assert.equal(d.ok, true, JSON.stringify(d));
    assert.equal(d.kind, kind);
    assert.equal(d.min, min);
    assert.equal(d.max, max);
    assert.equal(d.year, year);
    assert.equal(d.text, v.trim());
  });
}
for (const v of UNKNOWN) {
  test(`date "${v}" is kept as text and treated as unknown`, () => {
    const d = parseDate(v);
    assert.equal(d.ok, false);
    assert.equal(d.year, null);
    assert.equal(d.text, v);
  });
}
