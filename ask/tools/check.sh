#!/bin/sh
# Every check: the demo file is current, the unit tests (dates, the reader, the overlap and ranking
# rules on a hand-worked tree, the network and wording promises), the offline proof in headless
# Chrome, every demo sheet printed to one US Letter page, a proof that the offline proof can fail,
# and no long dashes anywhere. Needs Node 22+, google-chrome (or set CHROME), pdfinfo and pdftotext.
set -eu
cd "$(dirname "$0")/.."
node tools/make-demo.js --check
node --test test/*.test.js
node tools/offline-proof.js
sh tools/print-check.sh
# A sheet for a family with very long names, opened through the file picker, still prints on one page.
tmp0=$(mktemp -d)
node tools/offline-proof.js --file test/fixtures/long-names.ged --pdf "$tmp0/long.pdf" >/dev/null
pages=$(pdfinfo "$tmp0/long.pdf" | awk '/^Pages:/{print $2}')
rm -rf "$tmp0"
[ "$pages" = 1 ] || { echo "error: the long-names sheet prints on $pages pages"; exit 1; }
echo "long names: the sheet prints on one page"
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
