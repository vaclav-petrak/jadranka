---
name: verify
description: How to run and verify the Jadranka static site (no build system)
---

# Verifying the Jadranka site

Static HTML/CSS/vanilla-JS site — no build, no deps.

## Launch

```bash
python3 -m http.server 8741 --bind 127.0.0.1   # from repo root, run in background
```

## Drive

Playwright with system Chrome works (no browser download needed):

```js
const browser = await chromium.launch({ channel: 'chrome', headless: true });
```

Install `playwright` npm package into the scratchpad dir, not the repo.

## Flows worth driving

- `index.html` + `apartman-1.html` both mount the reservation calendar via
  `[data-calendar]` divs (`calendar.js` auto-init). Wait for
  `#kalendar .cal-grid .cal-day` before interacting.
- Calendar: month nav clamps to May–Oct of `SEASON.year` (see `calendar.js`),
  range-select two available days → summary + `.res-form-wrap` appears,
  submit is demo-only (no network call, logs payload to console).
- Day cells carry `data-date="YYYY-MM-DD"` — click via
  `.cal-day[data-date="…"]`.

## Gotchas

- Demo data is pinned to the 2026 season; months before "today" render as
  `.past` (all-sand, disabled) — don't expect available cells in past months.
- Element screenshots of `#kalendar`: the sticky nav bar scrolls into the
  captured band mid-element; it's a capture artifact, not a page bug.
- `/favicon.ico` 404s in the console — pre-existing, ignore.
