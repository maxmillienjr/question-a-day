#!/usr/bin/env node
/* Writes a large synthetic GEDCOM (default 50,000 people, all invented, names like "Person 123")
   to the path given, for timing the reader and the list on a big tree. Not committed output.
   Usage: node tools/big-tree.js /tmp/big.ged [people] */
'use strict';
const fs = require('node:fs');
const out = process.argv[2];
const N = +(process.argv[3] || 50000);
if (!out) { console.error('usage: node tools/big-tree.js <out.ged> [people]'); process.exit(2); }
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const L = ['0 HEAD', '1 GEDC', '2 VERS 5.5.1', '1 CHAR UTF-8', '1 NOTE Synthetic test tree. Every person is invented.'];
const fams = [];
// Generations of couples; each couple has 0 to 5 children who pair up in the next generation.
let gen = [], id = 0;
const person = (born, sex) => {
  const x = ++id;
  const lines = [`0 @I${x}@ INDI`, `1 NAME Person${x} /Fam${Math.floor(x / 40)}/`, `1 SEX ${sex}`, '1 BIRT', `2 DATE ${born}`];
  if (born < 1940 || (born < 1990 && rnd() < 0.3)) lines.push('1 DEAT', `2 DATE ${Math.min(2025, born + 40 + Math.floor(rnd() * 50))}`);
  if (rnd() < 0.1) lines.push('1 NOTE A short note.');
  L.push(...lines);
  return { x, born };
};
for (let i = 0; i < 400; i++) gen.push([person(1820 + Math.floor(rnd() * 10), 'M'), person(1822 + Math.floor(rnd() * 10), 'F')]);
while (id < N) {
  const next = [];
  for (const [h, w] of gen) {
    if (id >= N) break;
    const f = `F${fams.length + 1}`, kids = [];
    const n = Math.floor(rnd() * 6);
    for (let k = 0; k < n && id < N; k++) kids.push(person(Math.max(h.born, w.born) + 20 + Math.floor(rnd() * 15), k % 2 ? 'F' : 'M'));
    fams.push([f, h.x, w.x, kids.map((k) => k.x)]);
    for (const k of kids) if (id < N) next.push([k, person(k.born + Math.floor(rnd() * 6) - 3, 'U')]);
  }
  gen = next.length ? next : gen;
}
for (const [f, h, w, kids] of fams) { L.push(`0 @${f}@ FAM`, `1 HUSB @I${h}@`, `1 WIFE @I${w}@`); for (const k of kids) L.push(`1 CHIL @I${k}@`); }
L.push('0 TRLR');
fs.writeFileSync(out, L.join('\n') + '\n');
console.log(`${id} people, ${fams.length} families, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
