#!/usr/bin/env node
/* The offline proof. Starts headless Chrome with every host name unreachable, opens the page from
   the file system, presses "Try it with a made-up family", and records every request the page
   itself makes through the DevTools protocol. Fails unless:
     - the list shows,
     - every request the page made is a file:// load of one of its own files,
     - the text on screen never uses the words the page promises not to use.
   With --shots <dir> it also saves screenshots at 375 and 1440 px wide.
   Node 22+ (it uses the built-in WebSocket). Needs google-chrome, or set CHROME. */
'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHROME = process.env.CHROME || 'google-chrome';
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
// --docs <dir> runs the proof on another copy of the site (check.sh uses it to prove the proof can fail).
const PAGE = 'file://' + path.join(opt('--docs') || path.join(ROOT, 'docs'), 'index.html');
const OWN = new Set(['index.html', 'style.css', 'gedcom.js', 'tree.js', 'demo-data.js', 'app.js', 'sheet.js', 'print.css']);
const shots = opt('--shots');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wlta-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--host-resolver-rules=MAP * ~NOTFOUND', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'],
  { stdio: 'ignore' });
  try {
    let port;
    for (let i = 0; i < 100 && !port; i++) {
      await sleep(100);
      try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch (e) { /* not yet */ }
    }
    if (!port) throw new Error('Chrome did not start');
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = list.find((t) => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const waiting = new Map(); const requests = []; const events = [];
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); return; }
      if (msg.method === 'Network.requestWillBeSent') requests.push(msg.params.request.url);
      if (msg.method === 'Network.webSocketCreated') requests.push(msg.params.url);
      events.push(msg.method);
    };
    const send = (method, params = {}) => new Promise((r) => { const n = ++id; waiting.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
    const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.result.value;

    await send('Network.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: PAGE });
    for (let i = 0; i < 50 && !(await evaluate('document.readyState === "complete" && !!document.getElementById("demo")')); i++) await sleep(100);
    await evaluate('document.getElementById("demo").click()');
    for (let i = 0; i < 50 && !(await evaluate('document.querySelectorAll(".person").length > 0')); i++) await sleep(100);

    const listed = await evaluate('document.querySelectorAll(".person").length');
    const first = await evaluate('(document.querySelector(".person h3") || {}).textContent || ""');
    const text = await evaluate('document.body.innerText');
    const problems = [];
    if (!listed) problems.push('the list did not show');
    for (const u of requests) {
      const own = u.startsWith('file://') && OWN.has(path.basename(new URL(u).pathname));
      if (!own) problems.push('the page requested ' + u);
    }
    const { wordingProblems } = require(path.join(ROOT, 'test', 'wording.js'));
    problems.push(...wordingProblems(text, 'the page on screen'));

    if (shots) {
      // The list, then the first person's view, at phone and desktop widths, and the list in dark mode.
      // Each is the top of the page as a reader first sees it (two screens tall).
      fs.mkdirSync(shots, { recursive: true });
      const snap = async (name, w) => {
        const h = w === 375 ? 812 : 900;
        await send('Emulation.setDeviceMetricsOverride', { width: w, height: h * 2, deviceScaleFactor: w === 375 ? 2 : 1, mobile: w === 375 });
        await sleep(300);
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(shots, `${name}-${w}.png`), Buffer.from(shot.result.data, 'base64'));
      };
      await evaluate('document.getElementById("status").scrollIntoView()');
      for (const w of [375, 1440]) { await snap('list', w); await evaluate('document.getElementById("status").scrollIntoView()'); }
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
      await evaluate('document.getElementById("status").scrollIntoView()');
      await snap('list-dark', 1440);
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
      await evaluate('document.querySelector(".person button").click()');
      for (const w of [375, 1440]) { await evaluate('document.getElementById("person").scrollIntoView()'); await snap('person', w); }
      const personText = await evaluate('document.body.innerText');
      problems.push(...wordingProblems(personText, 'the person view'));
    }
    ws.close();
    console.log(`offline proof: ${listed} people listed, first "${first}", ${requests.length} page requests, all local: ${problems.length ? 'NO' : 'yes'}`);
    if (problems.length) { problems.forEach((p) => console.error('error: ' + p)); process.exitCode = 1; }
  } finally {
    chrome.kill('SIGKILL');
    await sleep(200);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}
main().catch((e) => { console.error('error: ' + e.message); process.exit(1); });
