#!/usr/bin/env python3
"""Fetch a source page and save it as plain text under sources/.

Every saved file starts with a header (url, fetched date, revision when known,
licence, credit), then a line '---', then the page text. Tables become one row
per line with cells joined by ' | '. Footnote markers are dropped.

  python3 tools/fetch.py wiki "1948 in the United States" ["Another title" ...]
  python3 tools/fetch.py usps
  python3 tools/fetch.py eia-gasoline

TLS is always verified. The User-Agent is generic on purpose.
"""
import datetime
import html.parser
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "Mozilla/5.0 (compatible; static-site-source-fetcher/1.0)"
WIKI_LICENCE = "CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)"
GOV_LICENCE = "Public domain, a work of the United States government"

GOV = {
    "usps": {
        "url": "https://about.usps.com/who/profile/history/domestic-letter-rates-since-1863.htm",
        "file": "usps-domestic-letter-rates.txt",
        "credit": "United States Postal Service, Rates for Domestic Letters Since 1863",
    },
    "eia-gasoline": {
        "url": "https://www.eia.gov/totalenergy/data/annual/showtext.php?t=ptb0524",
        "file": "eia-retail-gasoline-prices.txt",
        "credit": "U.S. Energy Information Administration, Annual Energy Review 2011, Table 5.24",
    },
}

BLOCK = {"p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "div", "section", "dd", "dt",
         "caption", "br", "ul", "ol", "table", "blockquote", "figcaption", "title"}
VOID = {"br", "img", "link", "meta", "hr", "wbr", "input", "source", "col", "area", "base", "track"}
SKIP_TAGS = {"script", "style", "noscript", "head"}
SKIP_CLASS = re.compile(r"\b(reference|mw-ref|mw-editsection|navbox|metadata|noprint|mw-empty-elt|"
                        r"hatnote|shortdescription|reflist|refbegin|sistersitebox|catlinks)\b")


class Text(html.parser.HTMLParser):
    def __init__(self, loose=False):
        super().__init__(convert_charrefs=True)
        self.stack = []  # (tag, skipping)
        self.out = []
        self.chrome = loose
        self.raw = 0

    def skipping(self):
        if self.chrome:  # loose HTML: skip only script and style bodies
            return self.raw > 0
        return bool(self.stack) and self.stack[-1][1]

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.chrome and tag in ("script", "style"):
            self.raw += 1
            return
        if tag in VOID:
            if tag == "br" and not self.skipping():
                self.out.append("\n")
            return
        skip = self.skipping() or tag in SKIP_TAGS or bool(SKIP_CLASS.search(a.get("class") or "")) \
            or a.get("role") == "navigation" or a.get("typeof") == "mw:Extension/references"
        if not self.chrome:
            self.stack.append((tag, skip))
        if skip and not self.chrome:
            return
        if tag in BLOCK:
            self.out.append("\n")
        elif tag in ("td", "th"):
            self.out.append(" | ")

    def handle_endtag(self, tag):
        if self.chrome and tag in ("script", "style"):
            self.raw = max(0, self.raw - 1)
            return
        if self.chrome:
            if tag in BLOCK:
                self.out.append("\n")
            return
        if tag in VOID:
            return
        # pop to the matching tag (tolerates sloppy HTML)
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                skipped = self.stack[i][1]
                del self.stack[i:]
                if not skipped and tag in BLOCK:
                    self.out.append("\n")
                return

    def handle_data(self, data):
        if not self.skipping():
            self.out.append(data)

    def text(self):
        t = "".join(self.out).replace(" ", " ")
        lines = []
        for line in t.split("\n"):
            line = re.sub(r"[ \t\r\f\v]+", " ", line).strip()
            line = re.sub(r"^\|\s*", "", line)
            if line:
                lines.append(line)
        return "\n".join(lines) + "\n"


def get(url, tries=5):
    import time, urllib.error
    for n in range(tries):
        try:
            return _get(url)
        except urllib.error.HTTPError as e:
            if e.code != 429 or n == tries - 1:
                raise
            time.sleep(10 * (n + 1))


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=60) as r:  # default context verifies TLS
        body = r.read()
        try:
            return body.decode("utf-8"), dict(r.headers)
        except UnicodeDecodeError:
            return body.decode("cp1252", "replace"), dict(r.headers)


def save(path, header, body):
    head = "".join(f"{k}: {v}\n" for k, v in header.items())
    with open(path, "w", encoding="utf-8") as f:
        f.write(head + "---\n" + body)
    print(path, len(body), "chars")


def slug(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def wiki(title):
    t = title.replace(" ", "_")
    api = ("https://en.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2"
           "&prop=text|revid|displaytitle&redirects=1&disableeditsection=1&page=" + urllib.parse.quote(t))
    raw, _ = get(api)
    data = json.loads(raw)
    if "error" in data:
        sys.exit(f"{title}: {data['error'].get('info')}")
    p = data["parse"]
    parser = Text()
    parser.feed(p["text"])
    real = p["title"]
    save(os.path.join(ROOT, "sources", "wikipedia", slug(real) + ".txt"), {
        "url": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(real.replace(" ", "_")),
        "fetched": datetime.date.today().isoformat(),
        "revision": f"{p['revid']} (https://en.wikipedia.org/w/index.php?oldid={p['revid']})",
        "licence": WIKI_LICENCE,
        "credit": f'Wikipedia contributors, "{real}", English Wikipedia',
    }, parser.text())


def gov(key):
    g = GOV[key]
    raw, _ = get(g["url"])
    parser = Text(loose=True)
    parser.feed(raw)
    save(os.path.join(ROOT, "sources", "government", g["file"]), {
        "url": g["url"],
        "fetched": datetime.date.today().isoformat(),
        "licence": GOV_LICENCE,
        "credit": g["credit"],
    }, parser.text())


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == "wiki":
        import time
        for title in sys.argv[2:]:
            wiki(title)
            time.sleep(3)
    else:
        for key in sys.argv[1:]:
            gov(key)
