#!/usr/bin/env python3
"""Add the price items to every year file, from the saved government tables.

Idempotent: removes any existing price items, then inserts the letter rate as the
second item and the gasoline price (1949 onward) as the fourth (or last). The
figures are read from the saved tables, never typed in.
"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USPS = "sources/government/usps-domestic-letter-rates.txt"
EIA = "sources/government/eia-retail-gasoline-prices.txt"
CHECKED = "2026-11-17"
WORDS = {2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 8: "eight", 10: "ten",
         13: "thirteen", 15: "fifteen", 18: "eighteen", 20: "twenty", 22: "twenty-two"}


def load(path):
    raw = open(os.path.join(ROOT, path), encoding="utf-8").read()
    head, _, body = raw.partition("\n---\n")
    url = re.search(r"^url: (.+)$", head, re.M).group(1)
    return url, body.splitlines()


def letter_item(year):
    url, lines = load(USPS)
    start = lines.index("Postage in Cents, per Ounce[1]")
    rows = [(lines[i], int(lines[i + 1])) for i in range(start + 1, len(lines) - 1, 2)
            if re.fullmatch(r"[A-Z][a-z]+ \d{1,2}, \d{4}", lines[i]) and lines[i + 1].isdigit()]
    for (d0, c0), (d1, c1) in zip(rows, rows[1:]):
        y0, y1 = int(d0[-4:]), int(d1[-4:])
        if y0 < year < y1:  # in force for the whole calendar year
            first = year >= 1976  # the table's footnote 1: later rates are for the first ounce
            unit = "for the first ounce" if first else "an ounce"
            quotes = ["Rates for Domestic Letters Since 1863", "Postage in Cents, per Ounce", f"{d0} {c0} {d1} {c1}"]
            if first:
                quotes.append("the prices listed in this table are for the first ounce")
            return {
                "category": "price",
                "text": f"Postage for a domestic letter was {c0} cents {unit}.",
                "question": f"Where were you living when a stamp for a letter cost {WORDS.get(c0, c0)} cents, and who did you write to?",
                "source_url": url,
                "source_file": USPS,
                "source_quote": quotes,
                "checked": CHECKED,
                "sombre": False,
            }
    return None


def gas_item(year):
    url, lines = load(EIA)
    try:
        i = lines.index(str(year))
    except ValueError:
        return None
    value, real = lines[i + 1], lines[i + 2]
    if not re.fullmatch(r"0?\.\d{3}", value):
        return None
    cents = float(value) * 100
    return {
        "category": "price",
        "text": f"The retail price of a gallon of regular leaded gasoline was {cents:.1f} cents.",
        "question": f"What car was in your family when gas was about {round(cents)} cents a gallon, and who did the driving?",
        "source_url": url,
        "source_file": EIA,
        "source_quote": ["Retail Motor Gasoline and On-Highway Diesel Fuel Prices, 1949-2011 (Dollars per Gallon)",
                         "Leaded Regular", f"{year} {value} {real}"],
        "checked": CHECKED,
        "sombre": False,
    }


def main():
    for p in sorted(glob.glob(os.path.join(ROOT, "data", "years", "*.json"))):
        data = json.load(open(p, encoding="utf-8"))
        items = [it for it in data["items"] if it.get("category") != "price"]
        letter, gas = letter_item(data["year"]), gas_item(data["year"])
        if letter:
            items.insert(min(1, len(items)), letter)
        if gas:
            items.insert(min(3, len(items)), gas)
        data["items"] = items
        with open(p, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(os.path.basename(p), len(items), "items")


if __name__ == "__main__":
    main()
