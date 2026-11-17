# A Question a Day, in Your Calendar

A small static site from PureTome. Add one calendar and, for 30 days, each day carries one question
to ask a parent or grandparent, with a follow-up and a short tip for the person asking. Then it stops.
No sign-up, no email, no tracking, nothing loaded from other sites.

Three feeds:

| Feed | Dates |
|---|---|
| 30 days with Mom or Dad | starts the day after you add it |
| 30 days before the holidays | Thu 2026-11-26 to Fri 2026-12-25 |
| 30 days with a veteran | starts the day after you add it |

Every feed can also be downloaded as a file starting on any date, and printed.

## Layout

- `data/questions.json`: the questions (source of truth).
- `config.json`: the base URL the site is served from (`https://questions.puretome.com/`), the
  range of start dates to pre-build, and fixed stamps. `docs/CNAME` holds the same host name for
  GitHub Pages.
- `build.js`: Node, standard library only. Writes everything in `docs/`.
- `src/index.template.html`: the landing page template.
- `docs/`: the site, committed, ready to serve as static files (GitHub Pages can serve `/docs` from
  `main` with no Actions). `docs/ics.js` is the one `.ics` generator, used by the build and by the
  page's download button.
- `tools/validate_ics.py`: Python standard library checker for RFC 5545 basics plus "30 events on 30
  consecutive days". `tools/check.sh` rebuilds and validates everything.
- `NOTES.md`: what Google, Apple and Outlook do with subscribed feeds, with sources, and the design
  decisions.

## Rebuild

```sh
# edit data/questions.json or config.json, then:
sh tools/check.sh      # node build.js + validator over every feed and sample downloads
git add -A docs data config.json && git commit -m "Rebuild"
```

The `webcal://`, Google and Outlook links and the links inside each event come from `baseUrl` in
`config.json`. It is part of every subscription, so do not change it once people have subscribed.
Everything else on the page uses relative links, so the site works under any path.

The evergreen feeds are pre-built for start dates up to `evergreenLastStart`. Move that date forward
and rebuild before it runs out; the page falls back to download-only after it.

## Also here: The World at Twenty

`twenty/` holds a second small tool, served at https://questions.puretome.com/twenty/: pick a
parent's birth year and print ten questions about the United States when they were 10, 20 and 30.
Its data, saved sources and checks are in `twenty/` (see `twenty/README.md`), and its pages are in
`docs/twenty/`. It has its own licence notes, because its facts come from Wikipedia under CC BY-SA 4.0.
Nothing in it touches the calendar feeds.

## Licence

- Code (everything except the questions): MIT, see `LICENSE`.
- Questions, follow-ups and tips (`data/questions.json`, `docs/questions.json`, the printable pages):
  Creative Commons Attribution 4.0 International (CC BY 4.0),
  https://creativecommons.org/licenses/by/4.0/ . Credit: PureTome, A Question a Day.

The veteran feed follows the outline of the Library of Congress Veterans History Project sample
interview questions, a federal work, in our own wording.
