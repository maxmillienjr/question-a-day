#!/usr/bin/env node
/* Writes the made-up demo family: demo/made-up-family.ged (the GEDCOM file, for anyone who wants to
   download and open it elsewhere) and docs/demo-data.js (the same text, so the page can load it
   without a network request). Every person here is invented. The surnames were made up for this
   file. Run: node tools/make-demo.js   (tools/check.sh fails if the committed files differ.) */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

// [id, given, surname, sex, birth date, death, extra GEDCOM lines]
// death: null (none recorded), a date string, 'Y' (DEAT Y, no date), or [tag, date] for BURI or CREM.
const P = [
  // Generation 1, born 1868 to 1885
  ['I01', 'Josiah', 'Brindlecott', 'M', '12 MAR 1872', '4 NOV 1941', ['1 NOTE Ran the feed store on Mill Road. Whistled hymns off key.']],
  ['I02', 'Hester', 'Fenwhistle', 'F', 'ABT 1876', 'BEF 1950'],
  ['I03', 'Cornelius', 'Marrowby', 'M', 'EST 1870', '1938'],
  ['I04', 'Ada', 'Quillane', 'F', 'BET 1874 AND 1878', '16 JAN 1959'],
  ['I05', 'Thaddeus', 'Ostervane', 'M', '1880', ['BURI', '1944']],
  ['I06', 'Lovisa', 'Wexcombe', 'F', 'CAL 1883', '1931'],
  ['I07', 'Ezra', 'Quillane', 'M', '1871/72', '1919'],
  ['I08', 'Mercy', 'Dunmarrow', 'F', '1875', 'AFT 1950'],
  // Generation 2, born 1898 to 1913
  ['I10', 'Walter', 'Brindlecott', 'M', '1899', '1975'],
  ['I11', 'Clara', 'Brindlecott', 'F', '1902', '1988'],
  ['I12', 'Silas', 'Brindlecott', 'M', '1905', 'ABT 1971'],
  ['I13', 'Rosalind', 'Marrowby', 'F', '1903', '1994', ['1 OBJE', '2 FILE rosalind-at-the-shore.jpg', '2 TITL Rosalind at the shore']],
  ['I14', 'Edwin', 'Marrowby', 'M', '1907', '1962'],
  ['I15', 'Harold', 'Ostervane', 'M', '1908', '1979'],
  ['I16', 'Pearl', 'Ostervane', 'F', '1911', '2009'],
  ['I17', 'Winnie', 'Quillane', 'F', '1901', 'Y'],
  ['I18', 'Florence', 'Quillane', 'F', '1910', '1999'],
  ['I20', 'Amos', 'Quillane', 'M', '1898', '1966', ['1 SOUR @S1@']],
  ['I36', 'Agnes', 'Brindlecott', 'F', '1913', null],
  ['I33', 'Nora', 'Kettleby', 'F', '1910', '1985'],
  // Generation 3, born 1915 to 1940
  ['I21', 'Dorothy', 'Brindlecott', 'F', '3 JUN 1927', '2015', ['1 NOTE Taught piano in the front room for forty years.']],
  ['I22', 'Raymond', 'Brindlecott', 'M', '1930', null, ['1 OCCU Machinist', '2 DATE FROM 1951 TO 1992']],
  ['I23', 'Margaret', 'Brindlecott', 'F', 'ABT 1933', '2020'],
  ['I24', 'Leonard', 'Brindlecott', 'M', '1936', null],
  ['I25', 'Vernon', 'Quillane', 'M', '1925', '1999', ['1 NOTE Drove a milk truck before dawn, six days a week.']],
  ['I26', 'Ida', 'Quillane', 'F', 'BET 1928 AND 1930', null],
  ['I27', 'Russell', 'Quillane', 'M', '1932', '2011'],
  ['I28', 'Arlene', 'Brindlecott', 'F', '1934', null],
  ['I29', 'Gordon', 'Brindlecott', 'M', '1938', '2004'],
  ['I30', 'Beatrice', 'Ostervane', 'F', '1931', '2018'],
  ['I31', 'Clifford', 'Ostervane', 'M', 'EST 1936', null, ['1 RESI', '2 DATE FROM 1960 TO 1975', '2 PLAC Hollin Ferry']],
  ['I37', 'Lionel', 'Ostervane', 'M', '1918', null],
  ['I34', 'Phyllis', 'Marrowby', 'F', '1936', null],
  ['I35', 'Douglas', 'Marrowby', 'M', '1940', '1997'],
  ['I40', 'Joan', 'Ashwell', 'F', '1933', '2008'],
  ['I43', 'Frank', 'Ellery', 'M', '1924', ['CREM', '1990']],
  ['I46', 'George', 'Penhallow', 'M', '1926', '1983'],
  ['I49', 'Shirley', 'Gantry', 'F', '1940', null],
  ['I52', 'Dale', 'Rockmoor', 'M', '1932', '2001'],
  ['I54', 'Norman', 'Halvering', 'M', '1928', '2016'],
  ['I57', 'Roy', 'Tamsworth', 'M', '1935', '1999'],
  // Generation 4, born 1950 to 1970
  ['I41', 'Steven', 'Brindlecott', 'M', '1958', null],
  ['I42', 'Karen', 'Brindlecott', 'F', '1961', null],
  ['I44', 'Linda', 'Ellery', 'F', '1952', null],
  ['I45', 'Paul', 'Ellery', 'M', '1955', '1977'],
  ['I47', 'Carol', 'Penhallow', 'F', 'the year of the big snow', null],
  ['I48', 'Private', 'Penhallow', 'M', '1957', null],
  ['I50', 'Michael', 'Brindlecott', 'M', '1965', null],
  ['I51', 'Lisa', 'Brindlecott', 'F', '1968', null],
  ['I53', 'Gail', 'Rockmoor', 'F', 'BEF 1960', null],
  ['I55', 'Janet', 'Halvering', 'F', '1956', null],
  ['I56', 'Thomas', 'Halvering', 'M', null, null],
  ['I58', 'Diane', 'Tamsworth', 'F', '14 OKT 1962', null],
  ['I60', 'Michelle', 'Orrin', 'F', '1960', null],
  ['I63', 'Kevin', 'Sallow', 'M', '1950', null],
  // Generation 5, born 1984 to 1995
  ['I61', 'Ryan', 'Brindlecott', 'M', '1988', null],
  ['I62', 'Emily', 'Brindlecott', 'F', '1991', null],
  ['I64', 'Jessica', 'Sallow', 'F', '1984', null],
  ['I65', 'Matthew', 'Sallow', 'M', '1987', null, ['1 RESN privacy']],
  ['I66', 'Tyler', 'Brindlecott', 'M', '1995', null],
  ['I67', 'Olivia', 'Brack', 'F', '2 FEB 1990', null],
];

// [id, husband, wife, children, marriage date]
const F = [
  ['F01', 'I01', 'I02', ['I10', 'I11', 'I12', 'I36'], '1897'],
  ['F02', 'I03', 'I04', ['I13', 'I14'], 'ABT 1901'],
  ['F03', 'I05', 'I06', ['I15', 'I16', 'I37'], '1906'],
  ['F04', 'I07', 'I08', ['I20', 'I17', 'I18'], '1896'],
  ['F05', 'I10', 'I13', ['I21', 'I22', 'I23', 'I24'], '1925'],
  ['F06', 'I20', 'I11', ['I25', 'I26', 'I27'], '1923'],
  ['F07', 'I12', 'I16', ['I28', 'I29'], '1932'],
  ['F08', 'I15', 'I18', ['I30', 'I31'], '1929'],
  ['F09', 'I14', 'I33', ['I34', 'I35'], '1934'],
  ['F10', 'I22', 'I40', ['I41', 'I42'], '1956'],
  ['F11', 'I43', 'I21', ['I44', 'I45'], '1950'],
  ['F12', 'I46', 'I26', ['I47', 'I48'], '1952'],
  ['F13', 'I24', 'I49', ['I50', 'I51'], '1963'],
  ['F14', 'I52', 'I28', ['I53'], '1956'],
  ['F15', 'I54', 'I30', ['I55', 'I56'], '1954'],
  ['F16', 'I57', 'I34', ['I58'], '1960'],
  ['F17', 'I41', 'I60', ['I61', 'I62'], '1986'],
  ['F18', 'I63', 'I44', ['I64', 'I65'], '1982'],
  ['F19', 'I50', null, ['I66'], null],
  ['F20', null, 'I55', ['I67'], null],
];

function build() {
  const L = [
    '0 HEAD',
    '1 SOUR WHOS_LEFT_TO_ASK_DEMO',
    '2 NAME Who\'s Left to Ask demo',
    '1 GEDC', '2 VERS 5.5.1', '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8',
    '1 NOTE A made-up family for trying Who\'s Left to Ask. Every person, place and story in this',
    '2 CONC  file is invented; the surnames were made up for it. Any likeness to a real family is chance.',
    '2 CONT Several dates are deliberately odd or missing, to show how the page handles them.',
  ];
  const famsOf = {}, famcOf = {};
  for (const [fid, h, w, kids] of F) {
    for (const x of [h, w]) if (x) (famsOf[x] = famsOf[x] || []).push(fid);
    for (const k of kids) (famcOf[k] = famcOf[k] || []).push(fid);
  }
  for (const [id, given, sur, sex, birth, death, extra] of P) {
    L.push(`0 @${id}@ INDI`, `1 NAME ${given} /${sur}/`, `2 GIVN ${given}`, `2 SURN ${sur}`, `1 SEX ${sex}`);
    if (birth) L.push('1 BIRT', `2 DATE ${birth}`);
    if (death === 'Y') L.push('1 DEAT Y');
    else if (Array.isArray(death)) L.push(`1 ${death[0]}`, `2 DATE ${death[1]}`);
    else if (death) L.push('1 DEAT', `2 DATE ${death}`);
    for (const e of extra || []) L.push(e);
    for (const f of famcOf[id] || []) L.push(`1 FAMC @${f}@`);
    for (const f of famsOf[id] || []) L.push(`1 FAMS @${f}@`);
  }
  for (const [fid, h, w, kids, marr] of F) {
    L.push(`0 @${fid}@ FAM`);
    if (h) L.push(`1 HUSB @${h}@`);
    if (w) L.push(`1 WIFE @${w}@`);
    for (const k of kids) L.push(`1 CHIL @${k}@`);
    if (marr) L.push('1 MARR', `2 DATE ${marr}`);
  }
  L.push('0 @S1@ SOUR', '1 TITL Letter from Amos to his sister, 1931',
    '1 TEXT We got the roof on before the rain and the boys slept in the barn for the fun of it.', '0 TRLR');
  return L.join('\n') + '\n';
}

const ged = build();
const root = path.join(__dirname, '..');
const js = '/* The made-up demo family, written by tools/make-demo.js. Every person in it is invented. */\n' +
  'window.DEMO_GEDCOM = ' + JSON.stringify(ged) + ';\n';
if (process.argv[2] === '--check') {
  const same = fs.readFileSync(path.join(root, 'demo/made-up-family.ged'), 'utf8') === ged &&
    fs.readFileSync(path.join(root, 'docs/demo-data.js'), 'utf8') === js;
  if (!same) { console.error('error: demo files are out of date; run node tools/make-demo.js'); process.exit(1); }
  console.log(`demo: ${P.length} people, ${F.length} families, files current`);
} else {
  fs.writeFileSync(path.join(root, 'demo/made-up-family.ged'), ged);
  fs.writeFileSync(path.join(root, 'docs/demo-data.js'), js);
  console.log(`demo: ${P.length} people, ${F.length} families written`);
}
