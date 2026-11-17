#!/bin/sh
# Rebuild docs/years.js, check every item against its saved source, then check the sheet rule.
set -eu
cd "$(dirname "$0")/.."
python3 tools/build.py
python3 tools/check.py
node tools/test-sheet.js
# Every offered birth year has its printable PDF (written by tools/make-pdfs.sh).
node -e '
const fs=require("fs"),vm=require("vm"),ctx={window:{}};
vm.runInNewContext(fs.readFileSync("docs/years.js","utf8"),ctx);
const miss=require("./docs/sheet.js").offered(ctx.window.WORLD_AT_TWENTY).filter(y=>!fs.existsSync("docs/print/"+y+".pdf"));
if(miss.length){console.error("error: no PDF in docs/print/ for "+miss.join(", ")+"; run sh tools/make-pdfs.sh");process.exit(1);}
console.log("pdfs: one for every offered birth year");'
