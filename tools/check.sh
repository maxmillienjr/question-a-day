#!/bin/sh
# Rebuild, then validate every hosted feed and a sample of browser downloads.
set -eu
cd "$(dirname "$0")/.."
node build.js
python3 tools/validate_ics.py docs/feeds
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
# The page's download button runs docs/ics.js in the browser; run the same
# code here for six start dates per evergreen feed (month ends, a leap year,
# a year end) and for the holiday feed's fixed dates, and validate the output.
node -e '
const ics = require("./docs/ics.js");
const cfg = require("./config.json");
const data = require("./data/questions.json");
const fs = require("fs");
for (const f of data.feeds) for (const s of (f.kind === "fixed" ? [f.start] : ["2026-11-17", "2027-01-31", "2028-02-15", "2026-12-20", "2027-02-28", "2027-12-31"])) {
  fs.writeFileSync(process.argv[1] + "/" + f.id + "-" + s + ".ics",
    ics.buildCalendar(f, s, { baseUrl: cfg.baseUrl, dtstamp: cfg.dtstamp, uidPrefix: cfg.uidPrefix, alarmTrigger: cfg.alarmTrigger, variant: "file" }));
}' "$tmp"
python3 tools/validate_ics.py "$tmp"
