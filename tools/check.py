#!/usr/bin/env python3
"""Check every year file in data/years/ against its saved sources.

Fails (exit 1) when:
- a required field is missing or has the wrong type, or a category is unknown;
- a source_file does not exist under sources/, or its url header differs from source_url;
- any source_quote is not found verbatim in its source_file (runs of whitespace,
  including line breaks, count as one space; nothing else is relaxed);
- a year has fewer than three items, or more than one sombre item, or a sombre item first;
- a question does not end in a question mark;
- an em-dash, en-dash or other long dash, or an emoji, appears in an item's text or
  question, or in any site, data or docs file (quotes are copied from the source as they
  are and are exempt, but never shown on the page).
Warns (does not fail) when a year has fewer than four items or fewer than three categories.
Standard library only.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATEGORIES = {"news", "song", "price", "technology"}
FIELDS = {"category": str, "text": str, "question": str, "source_url": str,
          "source_file": str, "source_quote": (str, list), "checked": str, "sombre": bool}
DASH = re.compile("[\u2012\u2013\u2014\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]")
EMOJI = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200D\u2B00-\u2BFF]")
SITE_FILES = ["docs/*.html", "docs/*.js", "docs/*.css", "README.md", "NOTES.md", "data/*.json"]

errors, warnings = [], []
_cache = {}


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def source(path):
    if path not in _cache:
        full = os.path.join(ROOT, path)
        with open(full, encoding="utf-8") as f:
            raw = f.read()
        head, _, body = raw.partition("\n---\n")
        meta = dict(line.split(": ", 1) for line in head.splitlines() if ": " in line)
        _cache[path] = (meta, norm(body))
    return _cache[path]


def check_year(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    name = os.path.basename(path)
    year = data.get("year")
    if f"{year}.json" != name:
        errors.append(f"{name}: year field {year!r} does not match the file name")
    items = data.get("items")
    if not isinstance(items, list):
        errors.append(f"{name}: no items list")
        return
    sombre = 0
    for i, it in enumerate(items):
        where = f"{name} item {i + 1}"
        for k, t in FIELDS.items():
            if k not in it or not isinstance(it[k], t) or (isinstance(it[k], str) and not it[k].strip()):
                errors.append(f"{where}: field {k} missing or wrong type")
        extra = set(it) - set(FIELDS)
        if extra:
            errors.append(f"{where}: unknown fields {sorted(extra)}")
        if it.get("category") not in CATEGORIES:
            errors.append(f"{where}: unknown category {it.get('category')!r}")
        for k in ("text", "question"):
            v = it.get(k, "")
            if DASH.search(v):
                errors.append(f"{where}: a dash in {k}")
            if EMOJI.search(v):
                errors.append(f"{where}: an emoji in {k}")
        if not it.get("question", "").rstrip().endswith("?"):
            errors.append(f"{where}: question does not end in a question mark")
        if it.get("sombre"):
            sombre += 1
            if i == 0:
                errors.append(f"{where}: a sombre item is first")
        sf = it.get("source_file", "")
        if not sf.startswith("sources/") or not os.path.isfile(os.path.join(ROOT, sf)):
            errors.append(f"{where}: source_file {sf!r} not found under sources/")
            continue
        meta, body = source(sf)
        if meta.get("url") != it.get("source_url"):
            errors.append(f"{where}: source_url differs from the url saved in {sf}")
        quotes = it.get("source_quote")
        quotes = [quotes] if isinstance(quotes, str) else (quotes or [])
        if not quotes:
            errors.append(f"{where}: empty source_quote")
        for q in quotes:
            if not isinstance(q, str) or not norm(q) or norm(q) not in body:
                errors.append(f"{where}: quote not found verbatim in {sf}: {str(q)[:80]!r}")
    if sombre > 1:
        errors.append(f"{name}: {sombre} sombre items (at most one)")
    if len(items) < 3:
        errors.append(f"{name}: {len(items)} items (at least three)")
    elif len(items) < 4:
        warnings.append(f"{name}: only {len(items)} items")
    cats = {it.get("category") for it in items}
    if len(cats) < 3:
        warnings.append(f"{name}: only {len(cats)} categories")


def check_site():
    for pattern in SITE_FILES:
        for p in glob.glob(os.path.join(ROOT, pattern)):
            with open(p, encoding="utf-8") as f:
                text = f.read()
            if p.endswith(".json") or p.endswith("years.js"):
                # data: quotes are exempt, so only look at what the page shows
                continue
            for n, line in enumerate(text.splitlines(), 1):
                if DASH.search(line):
                    errors.append(f"{os.path.relpath(p, ROOT)}:{n}: a dash")
                if EMOJI.search(line):
                    errors.append(f"{os.path.relpath(p, ROOT)}:{n}: an emoji")


def main():
    files = sorted(glob.glob(os.path.join(ROOT, "data", "years", "*.json")))
    if not files:
        errors.append("no year files in data/years/")
    for p in files:
        check_year(p)
    check_site()
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("error:", e)
    total = sum(len(json.load(open(p, encoding="utf-8"))["items"]) for p in files) if files else 0
    print(f"{len(files)} years, {total} items, {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
