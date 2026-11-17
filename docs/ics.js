/*
 * A Question a Day: the one .ics generator.
 * Used by build.js (Node) to write the subscribable feeds, and by the page
 * (browser) to make a download that starts on a date the visitor picks.
 * RFC 5545: CRLF line endings, lines folded at 75 octets, escaped TEXT.
 * MIT licence, see LICENSE.
 */
(function (root) {
  "use strict";

  var encoder = new TextEncoder();

  function addDays(iso, n) {
    var p = iso.split("-").map(Number);
    var t = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return t.toISOString().slice(0, 10);
  }

  function compact(iso) {
    return iso.replace(/-/g, "");
  }

  // RFC 5545 3.3.11: backslash, semicolon, comma and newlines are escaped.
  function escapeText(s) {
    return String(s)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r\n|\r|\n/g, "\\n");
  }

  // RFC 5545 3.1: no line longer than 75 octets; continuation lines begin
  // with one space. Never split a multi-byte UTF-8 character.
  function fold(line) {
    var out = [];
    var cur = "";
    var curBytes = 0;
    var limit = 75;
    for (var ch of line) {
      var b = encoder.encode(ch).length;
      if (curBytes + b > limit) {
        out.push(cur);
        cur = " ";
        curBytes = 1;
      }
      cur += ch;
      curBytes += b;
    }
    out.push(cur);
    return out.join("\r\n");
  }

  function dayText(feed, i, pageUrl) {
    var d = feed.days[i];
    var lines = [
      "Day " + (i + 1) + " of " + feed.days.length + ", " + feed.name + ".",
      "",
      "Ask: " + d.q,
      "",
      "Then: " + d.follow,
      "",
      "Tip: " + d.tip
    ];
    if (i === 0 && feed.note) {
      lines.push("", feed.note);
    }
    if (pageUrl) {
      lines.push("", "All thirty questions, printable: " + pageUrl);
    }
    lines.push("", "From PureTome. No sign-up, nothing to unsubscribe from.");
    return lines.join("\n");
  }

  /*
   * feed: one entry of questions.json feeds[]
   * start: "YYYY-MM-DD", the date of day 1
   * opts: { baseUrl, dtstamp, uidPrefix, alarmTrigger, variant, feedUrl }
   *   variant: "sub" for the hosted feeds, "file" for downloads (different
   *   UIDs, so a download never collides with a subscription).
   */
  function buildCalendar(feed, start, opts) {
    var pageUrl = opts.baseUrl ? opts.baseUrl + "print/" + feed.id + ".html" : "";
    var variant = opts.variant || "sub";
    var L = [];
    L.push("BEGIN:VCALENDAR");
    L.push("VERSION:2.0");
    L.push("PRODID:-//PureTome//A Question a Day//EN");
    L.push("CALSCALE:GREGORIAN");
    L.push("METHOD:PUBLISH");
    L.push("NAME:" + escapeText(feed.calendarName));
    L.push("X-WR-CALNAME:" + escapeText(feed.calendarName));
    L.push("DESCRIPTION:" + escapeText(feed.blurb));
    L.push("X-WR-CALDESC:" + escapeText(feed.blurb));
    if (variant === "sub") {
      L.push("REFRESH-INTERVAL;VALUE=DURATION:P1D");
      L.push("X-PUBLISHED-TTL:P1D");
      if (opts.feedUrl) L.push("SOURCE;VALUE=URI:" + opts.feedUrl);
    }
    for (var i = 0; i < feed.days.length; i++) {
      var date = addDays(start, i);
      var n = String(i + 1).padStart(2, "0");
      L.push("BEGIN:VEVENT");
      L.push("UID:" + opts.uidPrefix + "-" + feed.id + "-" + compact(start) + "-d" + n + "-" + variant);
      L.push("DTSTAMP:" + opts.dtstamp);
      L.push("DTSTART;VALUE=DATE:" + compact(date));
      L.push("DTEND;VALUE=DATE:" + compact(addDays(date, 1)));
      L.push("SUMMARY:" + escapeText(feed.days[i].q));
      L.push("DESCRIPTION:" + escapeText(dayText(feed, i, pageUrl)));
      if (pageUrl) L.push("URL;VALUE=URI:" + pageUrl);
      L.push("TRANSP:TRANSPARENT");
      L.push("CLASS:PUBLIC");
      if (opts.alarmTrigger) {
        L.push("BEGIN:VALARM");
        L.push("ACTION:DISPLAY");
        L.push("DESCRIPTION:" + escapeText("Today's question: " + feed.days[i].q));
        L.push("TRIGGER;RELATED=START:" + opts.alarmTrigger);
        L.push("END:VALARM");
      }
      L.push("END:VEVENT");
    }
    L.push("END:VCALENDAR");
    return L.map(fold).join("\r\n") + "\r\n";
  }

  var api = { buildCalendar: buildCalendar, addDays: addDays, escapeText: escapeText, fold: fold };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.QADics = api;
  }
})(this);
