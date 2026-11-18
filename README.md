# Who's Left to Ask

A small static page from PureTome. Open your family tree file (a GEDCOM `.ged`, which every
genealogy program and site can export) and see which relatives with no death date recorded overlapped
each ancestor, who to sit down with first, and who they can tell you about. Your tree has the dates;
this points you at the stories.

No sign-up, no tracking, nothing loaded from other sites. It works from the file system and offline.

## The two promises

**Your file never leaves your computer.** The page reads the file with the browser's File API and
keeps it in memory only. After the page loads it makes no network request of any kind, and it
writes nothing to cookies or browser storage. A Content-Security-Policy tag in `docs/index.html`
forbids connections (`connect-src 'none'`) and every outside source.

You can check this yourself:

1. Open the page, open your browser's developer tools, and pick the Network tab.
2. Choose your file. The Network tab shows nothing new: no request carries your file anywhere.
3. Or switch off your internet connection, reload, and use the page as normal.

The checks below prove the same thing automatically: `test/promises.test.js` scans every page file
for anything that can reach the network or store data, and `tools/offline-proof.js` runs the page
in headless Chrome with every host name unreachable and records every request the page makes.

**It never claims to know who has not died.** A tree records what someone typed in, not the truth. The page says
"no death date recorded" and nothing about time running short. People born more than 105 years ago
with no death date recorded are counted in one quiet line, not listed. `test/wording.js` holds the
words the page never uses, and the checks fail if a page file or the page on screen uses one.

## How the list is made

- **Who is on it.** People with no death, burial or cremation recorded, a birth year recorded or
  estimated, and born no more than 105 years ago. People marked private, or with a placeholder name
  such as "Private", are counted, not listed.
- **Estimated birth years.** When none is recorded (or a baptism date), it comes from parents (a
  parent is 15 to 50 years older), children, or a spouse (within 15 years), and is shown as estimated.
- **Who they can tell you about.** Relatives with a death recorded whose lives overlapped theirs for
  at least 3 years, counted from the listed person's fifth birthday (first cousins: from when both
  were 18). Close family only: parents, grandparents, great-grandparents, aunts and uncles, brothers
  and sisters, husbands and wives, parents-in-law, first cousins.
- **The order.** First, people who are one of only one or two on the list who knew a relative (the
  more such relatives, the higher); then the closer that relationship; then whoever was born earlier.
  The same file always gives the same list.
- **Only dates.** A relative whose record holds no note, no source text and no photo or document is
  flagged: ask about them first.

The rules live in `docs/tree.js` (`RULES` at the top).

## Layout

- `docs/`: the site, ready to serve as static files from any folder (all links are relative).
  `gedcom.js` is the GEDCOM reader, `tree.js` the overlap and ranking rules, `app.js` the page,
  `demo-data.js` the made-up family the "Try it" button loads.
- `demo/made-up-family.ged`: the same made-up family as a GEDCOM file. Every person in it is
  invented. `tools/make-demo.js` writes both files.
- `test/`: `node:test` tests and their small fixture files.
- `tools/check.sh`: runs every check. `tools/offline-proof.js`: the headless Chrome proof.
  `tools/big-tree.js`: writes a large synthetic tree for timing.
- `NOTES.md`: what is verified, what is not, and the decisions behind the rules.

## Check it

```sh
sh tools/check.sh
```

Needs Node 22 or later and Google Chrome (`CHROME=/path/to/chrome` to use another). No packages to
install.

## Licence

MIT, see `LICENSE`.
