#!/bin/sh
# Prints the sheet of every person on the made-up family's list with headless Chrome (every host
# unreachable) and fails if any sheet takes more than one US Letter page, names a file path, or uses
# a word the page never uses. With a directory argument, keeps the PDFs there.
# Needs google-chrome (or set CHROME), pdfinfo and pdftotext.
set -eu
cd "$(dirname "$0")/.."
CHROME=${CHROME:-google-chrome}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
out=${1:-$tmp}
mkdir -p "$out"
url="file://$(pwd)/docs/index.html"
n=$(node -e '
global.window = {}; require("./docs/demo-data.js");
const t = require("./docs/gedcom.js").read(window.DEMO_GEDCOM);
console.log(require("./docs/tree.js").analyze(t).list.length);')
bad=0
i=1
while [ "$i" -le "$n" ]; do
  rm -rf "$tmp/profile"
  timeout 60 "$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$tmp/profile" \
    --host-resolver-rules="MAP * ~NOTFOUND" --no-pdf-header-footer --virtual-time-budget=3000 \
    --print-to-pdf="$out/sheet-$i.pdf" "$url#demo/$i" 2>/dev/null
  pages=$(pdfinfo "$out/sheet-$i.pdf" | awk '/^Pages:/{print $2}')
  size=$(pdfinfo "$out/sheet-$i.pdf" | awk '/^Page size:/{print $3"x"$5}')
  [ "$pages" = 1 ] || { echo "error: sheet $i prints on $pages pages"; bad=1; }
  [ "$size" = "612x792" ] || { echo "error: sheet $i is not US Letter ($size)"; bad=1; }
  pdftotext "$out/sheet-$i.pdf" "$tmp/sheet.txt"
  grep -q "Questions for" "$tmp/sheet.txt" || { echo "error: sheet $i has no sheet on it"; bad=1; }
  if grep -q "file:" "$tmp/sheet.txt"; then echo "error: sheet $i names a file path"; bad=1; fi
  node -e 'const w=require("./test/wording.js").wordingProblems(require("fs").readFileSync(process.argv[1],"utf8"),"sheet "+process.argv[2]); if(w.length){console.error("error: "+w.join("; "));process.exit(1)}' "$tmp/sheet.txt" "$i" || bad=1
  i=$((i + 1))
done
echo "print check: $n sheets, each one US Letter page"
exit $bad
