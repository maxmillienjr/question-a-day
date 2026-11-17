# Notes: how calendar apps handle these feeds

Checked 2026-11-16 against the vendors' own help pages. None of this has been tested on a real
phone or computer yet. Each line says whether it was read on the vendor's page or is our inference.

## Design decisions

**All-day events, not a timed morning event.** An all-day event is a plain date (`DTSTART;VALUE=DATE`),
so day 3 is day 3 in every time zone and nothing can shift to 3 a.m. or the previous evening. A timed
event would need either a time zone in the file (one set of files per zone) or a "floating" time, and
we found no official page from Google, Apple or Microsoft saying how a subscribed feed's floating
times are shown. The cost: an all-day event does not ring by itself. Each event carries one
`VALARM` at 9 a.m. on its day (`TRIGGER;RELATED=START:PT9H`), and the page says plainly that some
apps drop it.

**Start dates on a static host.** A static `.ics` has fixed dates. So:

- *30 days with Mom or Dad* and *30 days with a veteran*: `build.js` writes one file per start date,
  `docs/feeds/<feed>/<YYYY-MM-DD>.ics`, from `evergreenFirstStart` to `evergreenLastStart` in
  `config.json` (now 2026-11-17 to 2027-06-30). The page reads the visitor's local date and hands
  out tomorrow's file. Every file holds exactly 30 events on 30 consecutive days, and nothing more,
  so the subscription runs dry after day 30. Nothing scheduled has to run: extending the range
  is one edit to `config.json`, `node build.js` and a commit. When the range runs out, the page
  says so and offers only the download.
- *30 days before the holidays*: one fixed file, Thursday 2026-11-26 to Friday 2026-12-25 (30 days).
  Added late, the earlier days are already past; the page says so.
- *Download*, on every feed: the page builds a file in the browser that starts on any date the
  visitor picks (same generator, `docs/ics.js`, that `build.js` uses). Imported into the visitor's
  own calendar, it behaves like their own events, which is the most reliable route to a reminder.

Downloads and subscriptions use different UIDs (`-file` and `-sub`), so doing both never collides.
`DTSTAMP` is a fixed value from `config.json` so rebuilds are byte-identical and git stays quiet.

## Google Calendar

- Adding by URL works only on a computer: Other calendars, +, From URL, paste, Add calendar. Read on the
  vendor's page: https://support.google.com/calendar/answer/37100
- "You can't subscribe to a calendar in the Google Calendar app for Android, iPhone, or iPad. To
  subscribe to a new calendar, you must use a computer web browser." Once added, it "automatically
  appears in the Google Calendar app." Read on the vendor's page:
  https://support.google.com/calendar/answer/37100?hl=en&co=GENIE.Platform%3DAndroid
- How often Google re-reads a subscribed URL: not stated on the current page. Older copies quoted
  elsewhere said "up to 12 hours". Not on the vendor's page today. It does not matter much here:
  each file is complete from the first read and never changes. (My inference.)
- Notifications: calendar-level "Event notifications" and "All-day event notifications" exist, and
  "your calendar-level settings determine your notifications for new events", but the page scopes
  this to "calendars you own". Read on the vendor's page:
  https://support.google.com/calendar/answer/37242 . Whether a URL calendar gets them, and
  whether Google keeps the feed's `VALARM`: not documented. The page does not promise either.
  Importing the downloaded file into a calendar the person owns puts the events under those settings.
  (My inference from the page above, untested.)
- The `https://calendar.google.com/calendar/render?cid=<webcal URL>` button link: undocumented by
  Google; widely used. If it fails, the manual From URL step on the page still works. (My inference.)

## Apple Calendar

- iPhone and iPad: Calendar, Calendars, Add Calendar, Add Subscription Calendar, paste, then choose
  iCloud as the account to see it on all devices; tapping a link to an `.ics` also offers to subscribe.
  Read on the vendor's pages: https://support.apple.com/en-us/102301 and
  https://support.apple.com/guide/iphone/use-multiple-calendars-iph3d1110d4/ios
- iPhone: alerts for a subscribed calendar are switched with the Info button beside it, under Event
  Alerts. The default is not stated. Read on the vendor's page (same iphone guide link above).
- iPhone default alert for all-day events: Settings, Apps, Calendar, Default Alert Times, All-Day
  Events. Default value not stated. Read on the vendor's page:
  https://support.apple.com/guide/iphone/change-calendar-settings-iphc37be2016/ios
- Mac: File, New Calendar Subscription; the dialog has "Remove" tick boxes for alerts and
  attachments ("Unselect the appropriate Remove tick boxes" to keep them), an Auto-refresh menu and
  a location (iCloud or On My Mac). Read on the vendor's page:
  https://support.apple.com/guide/calendar/icl1022/mac . That "Remove alerts" is ticked by default is
  implied by the wording, not stated. (My inference.)
- Mac refresh: "Subscribed calendars can be refreshed automatically" via Get Info, Auto-refresh; no
  intervals listed. Read on the vendor's page: https://support.apple.com/guide/calendar/icl1024/mac
- A `webcal://` link opens the subscribe step in Apple Calendar on iPhone and Mac. (My inference,
  standard behaviour, untested here.) On Android a `webcal://` link usually does nothing, which is
  why the page sends Android users to Google on a computer. (My inference.)

## Outlook

- Outlook.com and Outlook on the web: Add calendar, Subscribe from web, paste, Import. "Your calendar
  will automatically refresh if the other calendar is updated. This can sometimes take more than 24
  hours." Outlook.com "approximately every 3 hours", Outlook on the web "approximately every 6
  hours". Read on the vendor's page:
  https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web-cff1429c-5af6-41ec-a5b4-74f2c278e98c
- New Outlook for Windows: Add Calendar, Subscribe from web; it can fail without an error on some
  hosts, and the workaround is Outlook on the web. Read on the vendor's page:
  https://learn.microsoft.com/en-us/troubleshoot/outlook/calendaring/cannot-add-an-internet-calendar
- Outlook phone app: no official page on adding a calendar by URL; community answers say add it on
  the web and it syncs to the app. Not on the vendor's page.
- Reminders on subscribed calendars: not documented. Community threads say reminders on subscribed
  events cannot be changed. Not on the vendor's page; the page promises nothing.
- The `https://outlook.live.com/calendar/0/addfromweb?url=...&name=...` button link: undocumented by
  Microsoft. (My inference that it works; untested.) Work and school accounts use outlook.office.com.

## Not verified

- No device test: nothing here has been added to a real iPhone, Android phone, Mac, Google account or
  Outlook account, because the feeds are not hosted yet (the base URL is a placeholder).
- Whether the 9 a.m. `VALARM` fires anywhere for a subscription.
- The two undocumented button links (Google `cid=`, Outlook `addfromweb`).

## Memory-loss feed: dropped

The spec allowed a fourth feed for a parent with memory loss only if every line could be sourced to
published caregiver guidance. It cannot, so it was not built:

- The guidance argues against this format. NIA: don't "ask the person whether they remember
  something or someone"; "try to ask questions with a yes or no answer"
  (https://www.nia.nih.gov/health/alzheimers-changes-behavior-and-communication/dos-and-donts-communicating-person-who-has ,
  https://www.nia.nih.gov/health/alzheimers-changes-behavior-and-communication/communicating-someone-who-has-alzheimers ).
  Alzheimer's Association: "Ask one question at a time", "Ask yes or no questions"
  (https://www.alz.org/help-support/caregiving/daily-care/communications ). Dementia Australia:
  don't ask for "detailed memory responses"
  (https://www.dementia.org.au/living-dementia/staying-connected/talking-someone-dementia ).
- Life-story sources (Alzheimer's Society, Dementia UK's life story template) give topics, not
  question wording or follow-ups, so 30 days of questions would be our words with a citation pinned
  on, which is not what "sourced" means.

## Veterans History Project

`https://www.loc.gov/vets/kit-generalquestions.html` now redirects (301) to
https://www.loc.gov/programs/veterans-history-project/how-to-participate/sample-interview-questions/
("Sample Interview Questions"), which the page credits. It sits behind a bot wall that blocks scripted
fetches; it was read through loc.gov's JSON view and its sample questions PDF. The veteran feed
follows its outline (joining, training, daily life, people, home, coming back, reflection) in our own
wording, with no branch, rank, unit or war named.
