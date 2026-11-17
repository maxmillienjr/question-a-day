# Notes: what is verified and what is not

## How an item is proved

- Every item's `source_quote` is found verbatim in its saved source file (`tools/check.py`; runs of
  whitespace, including line breaks, count as one space, nothing else is relaxed). Quotes are copied
  as the source has them, so they may contain dashes; quotes are never shown on the page.
- An item on a "<year> in the United States" page takes its year from the page: the page lists
  "April 19 ..." under that year, so a quote with a bare month and day belongs to the page's year.
- Song items: the saved Billboard number-one tables lost their column layout when flattened to text,
  so a row cannot be tied to one named chart. Song items say only what the page's own opening sentence
  and the song's row prove ("a number-one song in the United States in 1948, according to Billboard
  magazine", or "on The Billboard's national singles charts"). From 1959 the Hot 100 pages say in
  prose how many weeks a song spent at number one, and those items quote that prose together with the
  page's opening paragraph that ties "number one" to the Hot 100 for that year. 1935 to 1939 have no
  Billboard chart; their song items follow "<year> in music", which says its rankings are approximate,
  and are worded "listed among the (top) popular records of <year>", never "number one".
- Letter postage: from the USPS table, given only for years with no rate change inside the year (a
  rate is shown for a year only when it was in force from January 1 to December 31). From 1976 the
  item says "for the first ounce", after the table's footnote.
- Gasoline: from EIA Annual Energy Review 2011 Table 5.24, the first column (leaded regular, nominal
  dollars), 1949 onward. The table's notes say 1949 to 1973 come from Platt's Oil Price Handbook and
  Oilmanac, so the item says "the retail price", not "the average". The figure is read from the
  saved table by position (year, then the leaded regular value); the cold read noted that the column
  is implied by position, not named on the row.

## Sources that failed

- **Federal minimum wage history** (U.S. Department of Labor, www.dol.gov, chart of federal minimum
  wage rates): every request returned 403 Access Denied on 2026-11-17, with a generic and with a
  browser User-Agent, at both the current and the old URL. No other official host was found. No
  minimum wage items until a fetch succeeds.

## What is left out on purpose

Crime, trials, executions, riots, atomic tests, disasters with death counts, epidemics (the polio
vaccine items were left out under that rule), battles. At most one sombre item a year (a president's
death, the start of a war), never first, worded plainly; its question asks where the person was or
who told them. Politics is kept to a minimum.

Where two Wikipedia pages disagree (the TV dinner: Swanson on the 1953 page, Gerry Thomas on the
1954 page) the item is left out.

## Wording choices

- 1938: "The War of the Worlds" is given as broadcast, without the source's "causing panic", which is
  disputed and not something to read aloud as fact. 1941: Pearl Harbor is the year's one sombre item,
  worded "Pearl Harbor in Hawaii was attacked, and the United States was drawn into World War II".
- 1943's "Oklahoma!" keeps its exclamation mark because it is the title.
- Sombre items so far: 1941 Pearl Harbor, 1945 President Roosevelt's death, 1950 the start of the
  Korean War, 1963 President Kennedy, 1968 Martin Luther King Jr. (worded "was killed on April 4,
  1968", without the place or the manner the source gives). Each is last in its year and its question
  asks where the person was and who told them.
- Each price series (postage, gasoline) appears once per sheet, so a sheet never asks the stamp
  question three times.

## Not yet verified

- The page has been checked in headless Chrome at 375 and 1440 px, light and dark, and every offered
  birth year printed to PDF on one US Letter page (`tools/print-check.sh`). Not yet checked on a real phone, with a real screen reader, or on paper.
