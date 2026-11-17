#!/bin/sh
# Rebuild, then validate every hosted feed and a sample of browser downloads.
set -eu
cd "$(dirname "$0")/.."
node build.js
python3 tools/validate_ics.py docs/feeds
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
# The page's download button runs docs/ics.js in the browser; run the same
# code here for a few start dates (including a month end, a leap day and a
# year end) and validate what it produces.
node -e '
const ics = require("./docs/ics.js");
const cfg = require("./config.json");
const data = require("./data/questions.json");
const fs = require("fs");
for (const f of data.feeds) for (const s of ["2026-11-17", "2027-01-31", "2028-02-15", "2026-12-20"]) {
  fs.writeFileSync(process.argv[1] + "/" + f.id + "-" + s + ".ics",
    ics.buildCalendar(f, s, { baseUrl: cfg.baseUrl, dtstamp: cfg.dtstamp, uidPrefix: cfg.uidPrefix, alarmTrigger: cfg.alarmTrigger, variant: "file" }));
}' "$tmp"
python3 tools/validate_ics.py "$tmp"
