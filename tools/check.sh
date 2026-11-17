#!/bin/sh
# Rebuild docs/years.js, check every item against its saved source, then check the sheet rule.
set -eu
cd "$(dirname "$0")/.."
python3 tools/build.py
python3 tools/check.py
node tools/test-sheet.js
