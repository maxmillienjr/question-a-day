#!/usr/bin/env python3
"""Check .ics files against the RFC 5545 rules these feeds rely on.

Usage: python3 tools/validate_ics.py [FILE_OR_DIR ...]   (default: docs/feeds)

Standard library only. Exits 1 if any file fails. Checks, per file:
  - valid UTF-8, every line ends in CRLF, no bare CR or LF
  - no physical line longer than 75 octets; continuation lines start with a space
  - BEGIN/END properly nested, one VCALENDAR with VERSION:2.0, PRODID and a name
  - every VEVENT has UID, DTSTAMP (UTC form), DTSTART;VALUE=DATE and DTEND one day later
  - TEXT values escape commas, semicolons, backslashes and newlines correctly
  - exactly 30 events on 30 consecutive dates
  - every VALARM has ACTION and TRIGGER
Across all files: every UID is unique.
"""
import datetime as dt
import pathlib
import re
import sys

TEXT_PROPS = {"SUMMARY", "DESCRIPTION", "NAME", "X-WR-CALNAME", "X-WR-CALDESC", "LOCATION", "COMMENT"}
DTSTAMP_RE = re.compile(r"^\d{8}T\d{6}Z$")
DATE_RE = re.compile(r"^\d{8}$")


def split_prop(line):
    """Return (name, params, value) for an unfolded content line."""
    # The value starts at the first colon that is not inside a quoted param.
    in_q = False
    for i, ch in enumerate(line):
        if ch == '"':
            in_q = not in_q
        elif ch == ":" and not in_q:
            head, value = line[:i], line[i + 1:]
            parts = head.split(";")
            return parts[0].upper(), parts[1:], value
    raise ValueError("no colon")


def check_text(value):
    """Escaped TEXT: only \\\\ \\; \\, \\n \\N escapes; no bare , or ;."""
    i = 0
    while i < len(value):
        ch = value[i]
        if ch == "\\":
            if i + 1 >= len(value) or value[i + 1] not in "\\;,nN":
                return "bad escape at %d" % i
            i += 2
            continue
        if ch in ",;":
            return "unescaped %r at %d" % (ch, i)
        i += 1
    return None


def validate(path, seen_uids):
    errs = []
    raw = path.read_bytes()
    try:
        raw.decode("utf-8")
    except UnicodeDecodeError as e:
        return ["not UTF-8: %s" % e]
    if not raw.endswith(b"\r\n"):
        errs.append("file does not end with CRLF")
    phys = raw.split(b"\r\n")[:-1]
    for n, line in enumerate(phys, 1):
        if b"\n" in line or b"\r" in line:
            errs.append("line %d: bare CR or LF" % n)
        if len(line) > 75:
            errs.append("line %d: %d octets (max 75)" % (n, len(line)))
        if not line:
            errs.append("line %d: empty line" % n)
    # Unfold.
    lines = []
    for n, line in enumerate(phys, 1):
        s = line.decode("utf-8")
        if s[:1] in (" ", "\t"):
            if not lines:
                errs.append("line %d: continuation with nothing before it" % n)
                continue
            lines[-1] += s[1:]
        else:
            lines.append(s)

    stack, cal, events, cur, alarm = [], {}, [], None, None
    for s in lines:
        try:
            name, params, value = split_prop(s)
        except ValueError:
            errs.append("no colon in: %s" % s[:60])
            continue
        if name == "BEGIN":
            stack.append(value)
            if value == "VEVENT":
                cur = {}
            elif value == "VALARM":
                alarm = {}
            continue
        if name == "END":
            if not stack or stack[-1] != value:
                errs.append("END:%s does not match BEGIN:%s" % (value, stack[-1] if stack else None))
            else:
                stack.pop()
            if value == "VEVENT":
                events.append(cur)
                cur = None
            elif value == "VALARM":
                for req in ("ACTION", "TRIGGER"):
                    if req not in alarm:
                        errs.append("VALARM missing %s" % req)
                alarm = None
            continue
        if name in TEXT_PROPS:
            bad = check_text(value)
            if bad:
                errs.append("%s: %s" % (name, bad))
        target = alarm if alarm is not None else cur if cur is not None else cal
        target[name] = (params, value)
    if stack:
        errs.append("unclosed: %s" % stack)

    if cal.get("VERSION", (None, ""))[1] != "2.0":
        errs.append("VERSION:2.0 missing")
    if "PRODID" not in cal:
        errs.append("PRODID missing")
    if "X-WR-CALNAME" not in cal and "NAME" not in cal:
        errs.append("calendar name missing")

    dates = []
    for i, ev in enumerate(events, 1):
        for req in ("UID", "DTSTAMP", "DTSTART", "DTEND", "SUMMARY"):
            if req not in ev:
                errs.append("event %d: %s missing" % (i, req))
        if "UID" in ev:
            uid = ev["UID"][1]
            if uid in seen_uids:
                errs.append("event %d: UID %s also in %s" % (i, uid, seen_uids[uid]))
            seen_uids[uid] = path.name
        if "DTSTAMP" in ev and not DTSTAMP_RE.match(ev["DTSTAMP"][1]):
            errs.append("event %d: DTSTAMP not UTC date-time" % i)
        if "DTSTART" in ev:
            params, value = ev["DTSTART"]
            if "VALUE=DATE" not in params or not DATE_RE.match(value):
                errs.append("event %d: DTSTART is not an all-day DATE" % i)
                continue
            start = dt.datetime.strptime(value, "%Y%m%d").date()
            dates.append(start)
            if "DTEND" in ev:
                end = dt.datetime.strptime(ev["DTEND"][1], "%Y%m%d").date()
                if end != start + dt.timedelta(days=1):
                    errs.append("event %d: DTEND is not the next day" % i)
    if len(events) != 30:
        errs.append("%d events, expected 30" % len(events))
    ds = sorted(dates)
    if len(set(ds)) != len(ds):
        errs.append("two events on the same date")
    if ds and any(ds[k + 1] - ds[k] != dt.timedelta(days=1) for k in range(len(ds) - 1)):
        errs.append("dates are not consecutive")
    return errs


def main(argv):
    root = pathlib.Path(__file__).resolve().parent.parent
    targets = [pathlib.Path(a) for a in argv] or [root / "docs" / "feeds"]
    files = []
    for t in targets:
        files += sorted(t.rglob("*.ics")) if t.is_dir() else [t]
    if not files:
        print("no .ics files found")
        return 1
    seen, failed = {}, 0
    for f in files:
        errs = validate(f, seen)
        if errs:
            failed += 1
            print("FAIL %s" % f)
            for e in errs[:20]:
                print("  " + e)
    print("%d files checked, %d failed, %d unique UIDs" % (len(files), failed, len(seen)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
