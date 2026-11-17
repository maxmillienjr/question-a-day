// Checks the sheet rule over every birth year: shares, no repeats, sombre never
// first, every item linked, and the same input always gives the same sheet.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "docs", "years.js"), "utf8"), ctx);
const data = ctx.window.WORLD_AT_TWENTY;
const S = require(path.join(root, "docs", "sheet.js"));
const share = { 10: 3, 20: 4, 30: 3 };
let errors = 0, full = [];
function fail(msg) { console.log("error:", msg); errors++; }
for (let b = S.FIRST; b <= S.LAST; b++) {
  const a = JSON.stringify(S.sheet(data, b)), again = JSON.stringify(S.sheet(data, b));
  if (a !== again) fail(b + ": sheet differs between two runs");
  const groups = S.sheet(data, b), seen = new Set();
  let count = 0;
  for (const g of groups) {
    if (g.items.length > share[g.age]) fail(`${b} at ${g.age}: ${g.items.length} items`);
    if (g.items.length && g.items[0].sombre) fail(`${b} at ${g.age}: sombre item first`);
    if (g.items.filter((i) => i.sombre).length > 1) fail(`${b} at ${g.age}: two sombre items`);
    for (const it of g.items) {
      if (seen.has(S.key(it))) fail(`${b}: repeated item or price series ${S.key(it)}`);
      seen.add(S.key(it));
      if (!/^https:\/\//.test(it.source_url) || !data.sources[it.source_url]) fail(`${b}: item without a credited source`);
      count++;
    }
  }
  if (count > 10) fail(`${b}: ${count} questions`);
  if (groups.every((g) => g.ready)) full.push(`${b} (${count})`);
}
const offered = S.offered(data);
console.log(`sheet rule: ${offered.length} birth years offered (${offered[0]} to ${offered[offered.length - 1]}), full sheets: ${full.join(", ") || "none"}`);
process.exit(errors ? 1 : 0);
