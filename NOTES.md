# Notes: what is verified and what is not

## Verified by `tools/check.sh`

- **Dates** (`test/dates.test.js`): exact, month and year, year only, `ABT`/`ABOUT`/`CA`, `EST`, `CAL`,
  `BEF`, `AFT`, `BET x AND y`, `FROM x TO y`, `FROM x`, `TO x`, `INT x (phrase)`, dual years
  (`1712/13`, `1699/700`), the 5.5 calendar escapes (`@#DJULIAN@`, `@#DHEBREW@`, `@#DFRENCH R@`) and the
  7.0 calendar words, `B.C.`, month names in French, German, Dutch, Spanish, Italian and Portuguese,
  numeric forms (`1931-03-12`, `12/03/1931`, `12.03.1931`). Phrases and garbage are kept as text and
  treated as unknown.
- **The reader** (`test/reader.test.js`): LF, CRLF and CR line endings; UTF-8 with and without a
  byte-order mark; UTF-16 little and big endian, with and without a byte-order mark; ANSEL with
  combining marks; a non-UTF-8 Windows file; `CONT` and `CONC`; custom underscore tags ignored; `DEAT Y`,
  a bare burial, and cremation all count as a death recorded; christening standing in for birth;
  notes, source text (on the citation or the source record) and media count as a story, a bare source
  does not; `RESN privacy` and placeholder names; broken lines counted, people with no ID and
  unknown record types counted by reason, links to missing people counted; a CSV, an HTML page, a PNG,
  an empty file and a GEDCOM with no people each get a named error, never an exception.
- **The rules** (`test/tree.test.js`): a ten-person tree whose list is worked out by hand in the test
  (order, who each person can speak about, the words, the counts of others, the overlap years, the
  flags); the fifth-birthday and three-year edges; first cousins only as adults; a birth year
  estimated from a child; same file, same list.
- **Promise 1** (`test/promises.test.js`, `tools/offline-proof.js`): no page file contains `fetch(`,
  `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `localStorage`, `sessionStorage`,
  `indexedDB`, `document.cookie`, dynamic `import(`, workers or `new Image`, and no address other
  than the one PureTome link; the CSP is present and strict; headless Chrome with every host unreachable
  loads the demo, shows the list, and the DevTools protocol records only `file://` loads of the page's
  own six files. `check.sh` also proves the proof can fail: on a copy of the page with the CSP removed and
  an outside image added, it fails.
- **Promise 2** (`test/wording.js`): no page file, no README line and no text on the rendered page
  contains "living", "alive", "still with us", "before it's too late", "last chance", "running out",
  "time is short" or "probably". The reader recognises the placeholder name some exports write with a
  character-class pattern, because that one word is matched against files and never shown.

## Measured

- 50,000-person synthetic tree (`tools/big-tree.js`, 5.3 MB, 10,002 families), in Node 24 on the
  build machine, 2026-11-17: reading 470 ms, the list 108 ms, 3,670 people listed. Not yet measured in
  the browser, where drawing 3,670 cards is the likely cost (see "Not yet").

## Not yet verified

- The page in a real browser with a real export from each program. Dialect fixtures written from
  the exporters' documentation are planned (Ancestry, FamilySearch, MyHeritage, Gramps, RootsMagic,
  Family Tree Maker, GEDCOM 7).
- Large trees in the browser, keyboard and screen reader passes, print.
- The demo surnames (Brindlecott, Fenwhistle, Marrowby, Quillane, Ostervane, Wexcombe, Dunmarrow,
  Kettleby, Ashwell, Ellery, Penhallow, Gantry, Rockmoor, Halvering, Tamsworth, Orrin, Sallow, Brack)
  were made up for the file; they have not been searched against real family trees. Some may exist
  as real surnames; the combinations of names and dates are invented.

## Decisions

- **A death is recorded** when the person has a `DEAT`, `BURI` or `CREM` structure of any kind,
  dated or not. That errs toward leaving someone off the list rather than listing a person the tree
  says has died.
- **Dates with a range** use their middle for birth years and for death years. A death written
  `BEF 1950` counts as 1950 and `AFT 1950` as 1950, so an overlap can be overstated by the width of the
  range. The page shows the date as the tree gives it ("before 1950").
- **A death with no readable year** cannot be matched to anyone; the page counts those relatives.
- **Half siblings** are named only when both people have two parents recorded and share exactly one;
  a tree that records one parent cannot tell.
- **Aunts and uncles** are blood relatives only (a parent's brother or sister), not their spouses.
