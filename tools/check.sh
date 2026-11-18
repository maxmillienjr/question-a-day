#!/bin/sh
# Every check: the demo file is current, the unit tests (dates, the reader, the overlap and ranking
# rules on a hand-worked tree, the network and wording promises), the offline proof in headless
# Chrome, a proof that the offline proof can fail, and no long dashes anywhere.
# Needs Node 22+ and google-chrome (or set CHROME).
set -eu
cd "$(dirname "$0")/.."
node tools/make-demo.js --check
node --test test/*.test.js
node tools/offline-proof.js
# The offline proof must fail on a copy of the page that loads an outside image with no CSP.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp -r docs "$tmp/docs"
sed -i 's#<meta http-equiv="Content-Security-Policy"[^>]*>##; s#</main>#<img src="https://example.com/x.png" alt=""></main>#' "$tmp/docs/index.html"
if node tools/offline-proof.js --docs "$tmp/docs" >/dev/null 2>&1; then
  echo "error: the offline proof passed a page that loads an outside image"; exit 1
fi
echo "offline proof: fails as it should on a page that reaches out"
if grep -rnP '[\x{2013}\x{2014}]' --exclude-dir=.git . ; then echo "error: long dashes above"; exit 1; fi
echo "dashes: none"
echo "all checks passed"
