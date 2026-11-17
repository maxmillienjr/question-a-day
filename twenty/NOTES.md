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
- Gasoline: from EIA Annual Energy Review 2011 Table 5.24, leaded regular (nominal dollars) from 1949
  while the table has it, unleaded regular from 1991 when leaded is "NA". Each item quotes the table's
  whole header with its row, so the column can be read off. Prices of a dollar or more are given as
  the table has them ("$1.311") and rounded half up in the question ("about $1.31"). The table's
  notes say 1949 to 1973 come from Platt's Oil Price Handbook and Oilmanac and only later years are
  annual averages, so the item says "the retail price", not "the average".

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
- Sombre items: 1941 Pearl Harbor, 1945 President Roosevelt's death, 1950 the start of the Korean
  War, 1963 President Kennedy, 1968 Martin Luther King Jr. (worded "was killed on April 4, 1968",
  without the place or the manner the source gives), 1986 the Challenger, 2001 the September 11
  attacks (worded with no detail).
- Left out as too thin to ask about: the 1994 America Online browser line and the 2000 "Y2K scare"
  line (the page lists it only as "Ongoing").
- Superlatives the source states as of that year ("setting a new record" for the 1983 M*A*S*H
  finale, the 1977 "You Light Up My Life" run) are kept in the source's own time-bound words. Each is last in its year and its question
  asks where the person was and who told them.
- Each price series (postage, gasoline) appears once per sheet, so a sheet never asks the stamp
  question three times.

## The audit (2026-11-17)

Every item (391) was read cold against its quote alone, in six batches, by readers who saw only the
sentence, the question and the quote. Then every changed item (81) was read again the same way.
What changed:
- **Questions now claim no more than the quote either.** "Was on the radio" became "was number one"
  (or "was a popular record" for 1935 to 1939 and 1945 to 1947), and "on television or the radio"
  became "how did you hear about it", unless the quote names the radio or the television. Character
  names (Fred and Wilma, Tim Taylor), a team the quote does not name (Brooklyn), ration books, the
  Wizard of Oz turning to color, a music video, a dance and high notes came out of their questions.
- **1945, 1946 and 1947 songs** now come from "<year> in music". The flattened Billboard number-one
  tables for those years do not tie a row to "number one" in words, so those items say "listed among
  the top popular records", with the row's "US Billboard" mark as proof, and never "number one".
- **1977 "You Light Up My Life":** the quote now runs to the end of the clause, so "the longest
  unbroken run atop the Hot 100" is proved.
- "The sitcom" (1991 Home Improvement) and "the films" (1984 Ghostbusters and Gremlins) came out of
  their sentences.
- Readers asked to drop the sombre items for 1963, 1968 and 2001. They stay, under the stated rule:
  one a year at most, never first, no detail, and the question asks only where the person was or
  who told them.

Printed sheets: `docs/print/<birth year>.pdf`, one per birth year, each one US Letter page. Opened
from the file system they say the sources are under Sources on the page; once the page has a
public address, set it in `<meta name="site-url">` and re-run `tools/make-pdfs.sh`.

## Not yet verified

- The page has been checked in headless Chrome at 375 and 1440 px, light and dark, and every offered
  birth year printed to PDF on one US Letter page (`tools/print-check.sh`). Not yet checked on a real phone, with a real screen reader, or on paper.
