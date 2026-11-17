# The World at Twenty

A small static page from PureTome. Pick the year your mother or father was born (1925 to 1975) and
get one printable page of ten questions about what was happening in the United States when they were
10, 20 and 30: the news, the songs, the prices, the new machines. Each fact is one line, each question
asks where they were or who they were with, and there is room to write the answer. Take it on a visit.

No sign-up, no tracking, nothing loaded from other sites. It works from the file system and offline.

**Every fact comes from a saved source.** A wrong fact on a printed family sheet is worse than none,
so each item in `data/years/` carries the source's URL, the saved copy of the page it came from, and
the exact words in that copy that back it. The checker fails if those words are not in the saved copy.
A year with nothing gentle in a category leaves that category empty rather than guess.

## Layout

- `data/years/<year>.json`: the items for one calendar year (source of truth). Each item has
  `category` (news, song, price, technology), `text`, `question`, `source_url`, `source_file`,
  `source_quote` (a string, or a list when the proof needs two pieces, such as a table row and the
  table's title), `checked` (date) and `sombre` (true for at most one item a year, never first).
- `sources/`: the fetched text of every page used, each starting with its URL, fetch date, revision
  (Wikipedia), licence and credit line. `tools/fetch.py` writes them.
- `tools/add_prices.py`: writes the price items into every year from the saved government tables,
  so no figure is typed by hand.
- `tools/build.py`: writes `docs/years.js` from the year files.
- `tools/check.py`: the checker (Python standard library). `tools/test-sheet.js`: checks the sheet
  rule for every birth year (Node, no packages).
- `docs/`: the site, ready to serve as static files. `docs/sheet.js` holds the rule that picks a
  sheet: the year at 20 takes four items, then the years at 10 and 30 take three each; within a year
  it takes the first item of each category in file order, then the rest in order, and skips any fact
  already on the sheet. Same birth year, same sheet. A short year gives a short group; nothing is padded.
- `NOTES.md`: what is verified, what is not, and which sources failed.

## Check

```sh
sh tools/check.sh      # build docs/years.js, check every item against its source, check the sheet rule
```

To add a year: fetch its pages with `tools/fetch.py`, write `data/years/<year>.json`, run
`python3 tools/add_prices.py`, then `sh tools/check.sh`. Nothing is added unless the check passes.

## Licence

- Code: MIT, see `LICENSE`.
- Year data (`data/years/`, `docs/years.js`) and the saved Wikipedia texts in `sources/wikipedia/`:
  Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0),
  https://creativecommons.org/licenses/by-sa/4.0/ . The items are drawn from English Wikipedia
  articles. Credit: Wikipedia contributors, the articles named in each saved file (each file gives the
  article's URL and the revision used), adapted by PureTome, The World at Twenty.
- `sources/government/`: works of the United States government, in the public domain. Credit: United
  States Postal Service, "Rates for Domestic Letters Since 1863"; U.S. Energy Information
  Administration, Annual Energy Review 2011, Table 5.24.
- The page credits Wikipedia in its footer and links every item on a sheet to its source.
