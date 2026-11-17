#!/bin/sh
# Write docs/print/<birth year>.pdf for every offered birth year with headless Chrome, and fail if
# any sheet takes more than one US Letter page or names a local file path. Re-run after any change
# to data/years/ or docs/. Needs google-chrome (or set CHROME) and pdfinfo.
set -eu
cd "$(dirname "$0")/.."
CHROME=${CHROME:-google-chrome}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
python3 tools/build.py
url="file://$PWD/docs/index.html"
years=$(node -e '
const fs=require("fs"),vm=require("vm"),ctx={window:{}};
vm.runInNewContext(fs.readFileSync("docs/years.js","utf8"),ctx);
console.log(require("./docs/sheet.js").offered(ctx.window.WORLD_AT_TWENTY).join(" "));')
mkdir -p docs/print
rm -f docs/print/*.pdf
bad=0
for y in $years; do
  rm -rf "$tmp/profile"
  timeout 60 "$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$tmp/profile" \
    --no-pdf-header-footer --virtual-time-budget=3000 --print-to-pdf="docs/print/$y.pdf" "$url#$y" 2>/dev/null
  pages=$(pdfinfo "docs/print/$y.pdf" | awk '/^Pages:/{print $2}')
  if [ "$pages" != 1 ]; then echo "error: birth year $y prints on $pages pages"; bad=1; fi
  if pdftotext "docs/print/$y.pdf" - | grep -q "file:"; then echo "error: birth year $y names a file path"; bad=1; fi
done
echo "pdfs: $(ls docs/print/*.pdf | wc -l) written to docs/print/"
exit $bad
