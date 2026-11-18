# Notes: what is verified and what is not

Last checked 2026-11-17 with `sh tools/check.sh` (Node 24, Google Chrome on Linux), from a fresh clone.

## Verified by `tools/check.sh`

- **Dates** (`test/dates.test.js`): exact, month and year, year only, `ABT`/`ABOUT`/`CA`, `EST`, `CAL`,
  `BEF`, `AFT`, `BET x AND y`, `FROM x TO y`, `FROM x`, `TO x`, `INT x (phrase)`, dual years
  (`1712/13`, `1699/700`), the 5.5 calendar escapes (`@#DJULIAN@`, `@#DHEBREW@`, `@#DFRENCH R@`) and the
  7.0 calendar words, `B.C.`, month names in French, German, Dutch, Spanish, Italian and Portuguese,
  numeric forms (`1931-03-12`, `12/03/1931`, `12.03.1931`), mixed case and full stops (`Bef. 1950`,
  `Abt. 1950`, `2 Feb 1931`). Phrases and garbage are kept as text and treated as unknown.
- **The reader** (`test/reader.test.js`): LF, CRLF and CR line endings; UTF-8 with and without a
  byte-order mark; UTF-16 little and big endian, with and without a byte-order mark; ANSEL with
  combining marks; a non-UTF-8 Windows file; `CONT` and `CONC`; custom underscore tags ignored; `DEAT Y`,
  a bare burial, and cremation all count as a death recorded; christening standing in for birth;
  notes, source text (on the citation or the source record) and media count as a story, a bare source
  does not; `RESN privacy` and placeholder names; broken lines counted, people with no ID and
  unknown record types counted by reason, links to missing people counted; a CSV, an HTML page, a PNG,
  an empty file and a GEDCOM with no people each get a named error, never an exception.
- **Dialects** (`test/dialects.test.js`): one five-person synthetic family written in the style of
  Ancestry, FamilySearch, MyHeritage, Gramps, RootsMagic, Family Tree Maker (ANSEL, CRLF, GEDCOM 5.5)
  and GEDCOM 7.0, each giving the same hand-worked list. The styles come from the exporters' published
  descriptions and the GEDCOM specifications as I understand them (header `SOUR` names, `_APID`,
  `_FSFTID`, `_UPD`/`RIN`/`_UID`/`_MARNM`, Gramps `@N0000@` notes and `PEDI`, RootsMagic `_PRIM`,
  FTM `_FREL`/`_MREL`/`_MILT`, GEDCOM 7 `SCHMA`, `EXID`, `SNOTE`, `PHRASE`, `@VOID@`, `NO`, `SEX X`).
  **They are not copies of real exports**; no real export has been run through the page.
- **The rules** (`test/tree.test.js`): a ten-person tree whose list is worked out by hand in the test
  (order, who each person can speak about, the words, the counts of others, the overlap years, the
  flags); the fifth-birthday and three-year edges; first cousins only as adults; a birth year
  estimated from a child; same file, same list.
- **The sheet** (`test/sheet.test.js`, `tools/print-check.sh`): which relatives and questions a sheet
  gets, no repeated question, every relationship has at least three questions, the bank passes the
  wording check; every one of the demo's 23 sheets prints on one US Letter page with no file path on
  it; a sheet for a family with very long names, opened through the file picker, also prints on one page.
- **Odd files** (`test/odd-files.test.js`): a loop in the tree (someone their own grandparent), tabs,
  lowercase tags, no `HEAD` or `TRLR`, a repeated ID, jumping levels, a 2 MB note, a person named as
  their own parent, a birth year in the future; and 2,000 seeded damaged copies of the demo (cut short,
  random bytes, shuffled, deleted lines, scrambled digits) that never throw.
- **Promise 1** (`test/promises.test.js`, `tools/offline-proof.js`): no page file contains `fetch(`,
  `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `localStorage`, `sessionStorage`,
  `indexedDB`, `document.cookie`, dynamic `import(`, workers or `new Image`, and no address other
  than the one PureTome link; the CSP is present and strict; headless Chrome with every host unreachable
  loads the demo, shows the list, and the DevTools protocol records only `file://` loads of the page's
  own seven files. `check.sh` also proves the proof can fail: on a copy of the page with the CSP removed
  and an outside image added, it fails.
- **Promise 2** (`test/wording.js`): no page file, no README line, no text on the rendered list or
  person view and no printed sheet contains "living", "alive", "still with us", "before it's too late",
  "last chance", "running out", "time is short" or "probably". The reader recognises the placeholder
  name some exports write with a character-class pattern, because that one word is matched against
  files and never shown.
- **Accessibility, automated part** (`tools/offline-proof.js`): every button, link and input in
  Chrome's accessibility tree has a name (158 on the demo), the first heading is the `h1`, and no
  heading level is skipped. The check is proved to fail when a button's text is removed.

## Measured

- 50,000-person synthetic tree (`tools/big-tree.js`, 5.3 MB, 10,002 families, 3,670 listed):
  - Node 24: reading 470 ms, the list 108 ms.
  - Chrome, opened through the page's own file picker: the list on screen 512 ms after the file was
    chosen (read, list and the first 50 cards: 481 ms). The tab is busy for that half second and then
    free; the rest of the list comes 50 at a time behind a button, so it never draws 3,670 cards at once.

## Not verified

- **Real exports.** No real program's export has been opened. Run one from each program (on a tree of
  invented people) before saying "works with Ancestry" and so on.
- **A screen reader and keyboard by hand.** The automated checks cover names and headings only. The
  file picker is a visually hidden input under a styled label; it takes focus and shows a ring, but this
  has not been tried with VoiceOver, NVDA or TalkBack.
- **Other browsers.** Only Chrome on Linux. Firefox and Safari have not been opened.
- **Printing from a real browser dialog.** The PDFs come from Chrome's print-to-PDF; a home printer's
  margins may differ.
- **The demo surnames.** Brindlecott, Fenwhistle, Marrowby, Quillane and Ostervane were searched on the
  web on 2026-11-17 and turned up no family of that name (only lookalikes such as Brindle and Fenwick).
  The in-law surnames (Ashwell, Ellery, Penhallow, Gantry, Rockmoor, Halvering, Tamsworth, Orrin,
  Sallow, Brack, Kettleby, Wexcombe, Dunmarrow) were not searched; some exist as real surnames, but the
  combinations of names, dates and relationships are invented.

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
- **Within a person**, relatives few others knew come first, then those with only dates, so the sheet's
  four are the ones most worth the visit.
- **A sheet with a long heading** (more than one printed line) gets slightly less writing space so it
  stays on one page.
