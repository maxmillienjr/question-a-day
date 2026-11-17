#!/bin/sh
# Write ../docs/twenty/print/<birth year>.pdf for every offered birth year with headless Chrome, and fail if
# any sheet takes more than one US Letter page or names a local file path. Re-run after any change
# to data/years/ or ../docs/twenty/. Needs google-chrome (or set CHROME) and pdfinfo.
set -eu
cd "$(dirname "$0")/.."
CHROME=${CHROME:-google-chrome}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
python3 tools/build.py
url="file://$(cd ../docs/twenty && pwd)/index.html"
years=$(node -e '
const fs=require("fs"),vm=require("vm"),ctx={window:{}};
vm.runInNewContext(fs.readFileSync("../docs/twenty/years.js","utf8"),ctx);
console.log(require("../docs/twenty/sheet.js").offered(ctx.window.WORLD_AT_TWENTY).join(" "));')
mkdir -p ../docs/twenty/print
rm -f ../docs/twenty/print/*.pdf
bad=0
for y in $years; do
  rm -rf "$tmp/profile"
  timeout 60 "$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$tmp/profile" \
    --no-pdf-header-footer --virtual-time-budget=3000 --print-to-pdf="../docs/twenty/print/$y.pdf" "$url#$y" 2>/dev/null
  pages=$(pdfinfo "../docs/twenty/print/$y.pdf" | awk '/^Pages:/{print $2}')
  if [ "$pages" != 1 ]; then echo "error: birth year $y prints on $pages pages"; bad=1; fi
  if pdftotext "../docs/twenty/print/$y.pdf" - | grep -q "file:"; then echo "error: birth year $y names a file path"; bad=1; fi
done
echo "pdfs: $(ls ../docs/twenty/print/*.pdf | wc -l) written to ../docs/twenty/print/"
exit $bad
