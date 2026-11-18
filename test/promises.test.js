'use strict';
// The two promises the page makes, checked against the files that are served.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DOCS = path.join(__dirname, '..', 'docs');
const pageFiles = fs.readdirSync(DOCS).filter(f => /\.(html|js|css)$/.test(f)).map(f => path.join(DOCS, f));

// The only addresses the page may name: the PureTome link in the footer.
const ALLOWED_URLS = [
  'https://puretome.com/?utm_source=whos-left-to-ask&amp;utm_medium=referral&amp;utm_campaign=whos-left-to-ask',
];

test('the page has files to check', () => {
  assert.ok(pageFiles.some(f => f.endsWith('index.html')));
  assert.ok(pageFiles.some(f => f.endsWith('app.js')));
});

test('promise 1: nothing in the page can reach the network or store anything', () => {
  const banned = ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'localStorage',
    'sessionStorage', 'indexedDB', 'document.cookie', 'import(', 'new Worker', 'serviceWorker', 'new Image', 'RTCPeerConnection'];
  for (const f of pageFiles) {
    const text = fs.readFileSync(f, 'utf8');
    for (const b of banned) assert.ok(!text.includes(b), `${path.basename(f)} contains ${b}`);
    const urls = text.match(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || [];
    for (const u of urls) assert.ok(ALLOWED_URLS.includes(u), `${path.basename(f)} names ${u}`);
    assert.ok(!/@import|url\(/i.test(text) || !f.endsWith('.css'), `${path.basename(f)} loads something in CSS`);
  }
});

test('promise 1: the page forbids connections in its Content-Security-Policy', () => {
  const html = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');
  const m = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
  assert.ok(m, 'no CSP meta tag');
  const csp = m[1];
  for (const d of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "script-src 'self'", "style-src 'self'", "img-src 'self'"]) {
    assert.ok(csp.includes(d), `CSP lacks ${d}`);
  }
  assert.ok(!/https?:|\*|unsafe/.test(csp), 'CSP allows an outside source or unsafe code');
  // Every script and stylesheet is a local relative path.
  for (const src of html.match(/(?:src|href)="[^"]+"/g)) {
    const v = src.split('"')[1];
    assert.ok(/^[a-z-]+\.(js|css)$/.test(v) || ALLOWED_URLS.includes(v), `outside source ${v}`);
  }
  assert.ok(!/<form/i.test(html), 'the page has a form');
});

const { wordingProblems } = require('./wording.js');

test('promise 2: no page file says who is alive', () => {
  const problems = [];
  for (const f of pageFiles) problems.push(...wordingProblems(fs.readFileSync(f, 'utf8'), path.basename(f)));
  for (const f of ['README.md']) {
    const p = path.join(__dirname, '..', f);
    if (fs.existsSync(p)) problems.push(...wordingProblems(fs.readFileSync(p, 'utf8'), f));
  }
  assert.deepEqual(problems, []);
});

