#!/bin/sh
# Print every offered birth year to PDF with headless Chrome and fail if any sheet
# takes more than one US Letter page. Needs google-chrome (or set CHROME) and pdfinfo.
set -eu
cd "$(dirname "$0")/.."
CHROME=${CHROME:-google-chrome}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
url="file://$PWD/docs/index.html"
years=$(node -e '
const fs=require("fs"),vm=require("vm"),ctx={window:{}};
vm.runInNewContext(fs.readFileSync("docs/years.js","utf8"),ctx);
console.log(require("./docs/sheet.js").offered(ctx.window.WORLD_AT_TWENTY).join(" "));')
bad=0
for y in $years; do
  rm -rf "$tmp/profile"
  timeout 60 "$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$tmp/profile" \
    --no-pdf-header-footer --virtual-time-budget=3000 --print-to-pdf="$tmp/$y.pdf" "$url#$y" 2>/dev/null
  pages=$(pdfinfo "$tmp/$y.pdf" | awk '/^Pages:/{print $2}')
  if [ "$pages" != 1 ]; then echo "error: birth year $y prints on $pages pages"; bad=1; fi
done
echo "print check: $(echo $years | wc -w) birth years printed"
exit $bad
