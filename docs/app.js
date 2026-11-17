/* A Question a Day: page behaviour. Vanilla JS, no network calls. MIT licence. */
(function () {
  "use strict";
  var Q = window.QAD;
  var ics = window.QADics;
  if (!Q || !ics) return;

  function localIso(d) {
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function pretty(iso) {
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  var today = localIso(new Date());
  var tomorrow = ics.addDays(today, 1);

  function setLinks(section, abs, name) {
    var webcal = abs.replace(/^https?:/, "webcal:");
    section.querySelector('[data-link="apple"]').href = webcal;
    section.querySelector('[data-link="google"]').href =
      "https://calendar.google.com/calendar/render?cid=" + encodeURIComponent(webcal);
    section.querySelector('[data-link="outlook"]').href =
      "https://outlook.live.com/calendar/0/addfromweb?url=" + encodeURIComponent(abs) + "&name=" + encodeURIComponent(name);
    section.querySelector("[data-copy]").setAttribute("data-copy", abs);
  }

  Q.feeds.forEach(function (feed) {
    var section = document.querySelector('[data-feed="' + feed.id + '"]');
    if (!section) return;
    var buttons = section.querySelector("[data-sub-buttons]");

    if (feed.kind === "evergreen") {
      var when = section.querySelector("[data-when]");
      if (tomorrow >= Q.evergreenFirstStart && tomorrow <= Q.evergreenLastStart) {
        setLinks(section, Q.baseUrl + "feeds/" + feed.id + "/" + tomorrow + ".ics", feed.calendarName);
        buttons.hidden = false;
        when.textContent = "Add it today and it starts tomorrow, " + pretty(tomorrow) +
          ", and ends " + pretty(ics.addDays(tomorrow, 29)) + ".";
      } else {
        when.textContent = "The add-by-link version is not available for this date yet. The download below works for any start date.";
      }
    } else {
      var end = ics.addDays(feed.start, 29);
      var past = section.querySelector("[data-past-note]");
      if (today > end) {
        buttons.hidden = true;
        past.textContent = "This one has finished for the year. The download below starts it on any date you like.";
      } else if (today > feed.start) {
        past.textContent = "It has already started, so the days before today are behind you.";
      }
    }

    var form = section.querySelector("[data-download]");
    var input = form.querySelector("input[type=date]");
    input.value = feed.kind === "fixed" && today < feed.start ? feed.start : tomorrow;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var start = input.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return;
      var text = ics.buildCalendar(feed, start, {
        baseUrl: Q.baseUrl, dtstamp: Q.dtstamp, uidPrefix: Q.uidPrefix,
        alarmTrigger: Q.alarmTrigger, variant: "file"
      });
      var blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "question-a-day-" + feed.id + "-" + start + ".ics";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    });
  });

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var url = btn.getAttribute("data-copy");
      var out = btn.closest(".feed").querySelector("[data-copied]");
      function shown(msg) { out.textContent = msg; }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function () { shown("Copied: " + url); },
          function () { shown(url); });
      } else {
        shown(url);
      }
    });
  });
})();
