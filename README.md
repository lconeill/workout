# Lift

A personal workout and nutrition tracker. Installable PWA for Android (and anything else with a browser). Local-only: all data lives on the device in IndexedDB, with JSON/CSV export for backups.

## Features

- **Workout logging** – routines prefilled from your last session, set types (warm-up / working / drop / failure), rest timer with vibration + notification, plate calculator and warm-up ramp, supersets, notes, live PR detection.
- **Progression coaching** – double progression by default (hit the top of the rep range on every set → add weight), linear mode for 5×5-style programs, automatic deload suggestions after repeated misses. "Ready to progress" list on Home.
- **Programs & routines** – Push/Pull/Legs, Upper/Lower, Full Body 3×, 5×5 built in; build your own.
- **Progress** – per-exercise charts (est. 1RM, top weight, volume), weekly volume, sets-per-muscle, bodyweight trend, all-time bests.
- **Strength standards** – Beginner → Elite rating per lift at your bodyweight, plus a DOTS score.
- **Nutrition** – daily calories/protein (carbs/fat optional) vs targets, quick-add favourites, 7/30-day averages, charts. Protein target can be derived from bodyweight. Daily creatine tick (with streak) and water tracker (ml or oz, configurable glass size and target).
- **Dark / light theme, lb or kg, offline.**

## Develop

```sh
npm install
npm run dev -- --host     # open http://<this-machine-ip>:5173 on your phone (same Wi-Fi)
npm test                  # unit tests (progression, records, plates, standards, nutrition, db)
npm run build && npm run preview -- --host
```

`VITE_BASE` controls the deploy base path (defaults to `/workout/`). For local preview at the root use `VITE_BASE=/ npm run build`.

## Deploy (GitHub Pages)

1. Create a GitHub repo and push `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`. The app will be at `https://<user>.github.io/<repo>/`.

## Install on Android

Open the URL in Chrome → menu (⋮) → **Add to Home screen** (or "Install app"). It launches full-screen and works offline. Allow notifications when asked so the rest timer can alert you with the screen off.

## Backups

Settings → Backup → Export JSON. Import on any device to restore or merge. CSV export has one row per set for spreadsheets.
