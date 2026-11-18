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
    const file = opt('--file');
    const t0 = Date.now();
    if (file) {
      // --file <path>: open a GEDCOM through the page's own file picker, as a reader would, and time it.
      await send('DOM.enable');
      const doc = await send('DOM.getDocument');
      const node = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#file' });
      await send('DOM.setFileInputFiles', { nodeId: node.result.nodeId, files: [path.resolve(file)] });
    } else {
      await evaluate('document.getElementById("demo").click()');
    }
    for (let i = 0; i < 600 && !(await evaluate('document.querySelectorAll(".person").length > 0')); i++) await sleep(100);
    if (file) {
      const t = await evaluate('JSON.stringify(window.__whosLeft || {})');
      console.log(`file: ${path.basename(file)} shown after ${Date.now() - t0} ms (read, list and first cards: ${JSON.parse(t).ms} ms); ` +
        `${await evaluate('document.querySelectorAll(".person").length')} cards drawn of ${JSON.parse(t).listed} listed`);
    }

    const listed = await evaluate('document.querySelectorAll(".person").length');
    const first = await evaluate('(document.querySelector(".person h3") || {}).textContent || ""');
    const text = await evaluate('document.body.innerText');
    const problems = [];
    if (!listed) problems.push('the list did not show');
    for (const u of requests) {
      const own = u.startsWith('file://') && OWN.has(path.basename(new URL(u).pathname));
      if (!own) problems.push('the page requested ' + u);
    }
    // Every control a keyboard or screen-reader user meets has a name, and the headings start at h1.
    const ax = await send('Accessibility.getFullAXTree');
    const unnamed = (ax.result.nodes || []).filter((n) => !n.ignored && ['button', 'link', 'textbox', 'checkbox', 'combobox'].includes(n.role && n.role.value) && !(n.name && n.name.value && n.name.value.trim()));
    unnamed.forEach((n) => problems.push(`a ${n.role.value} has no accessible name`));
    const controls = (ax.result.nodes || []).filter((n) => !n.ignored && ['button', 'link'].includes(n.role && n.role.value)).length;
    if (controls < 3) problems.push('the accessibility tree was not read (' + controls + ' controls)');
    const heads = await evaluate('Array.from(document.querySelectorAll("h1,h2,h3")).filter(h => h.offsetParent).map(h => +h.tagName[1]).join(",")');
    if (!heads.startsWith('1')) problems.push('the first visible heading is not an h1');
    if (/(^|,)1,3|2,4|1,4/.test(heads)) problems.push('a heading level is skipped: ' + heads);
    const { wordingProblems } = require(path.join(ROOT, 'test', 'wording.js'));
    problems.push(...wordingProblems(text, 'the page on screen'));

    const pdf = opt('--pdf');
    if (pdf) {
      // --pdf <path>: open the first person's sheet and print it, as the Print button would.
      await evaluate('document.querySelector(".person button").click()');
      await sleep(200);
      const out = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: false, displayHeaderFooter: false });
      fs.writeFileSync(pdf, Buffer.from(out.result.data, 'base64'));
      await evaluate('document.getElementById("back").click()');
    }
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
    console.log(`offline proof: ${listed} people listed, first "${first}", ${requests.length} page requests, ${controls} named controls, all checks: ${problems.length ? 'NO' : 'yes'}`);
    if (problems.length) { problems.forEach((p) => console.error('error: ' + p)); process.exitCode = 1; }
  } finally {
    chrome.kill('SIGKILL');
    await sleep(200);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}
main().catch((e) => { console.error('error: ' + e.message); process.exit(1); });
