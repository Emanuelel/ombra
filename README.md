# Ombra 🌳 — chase the shadow in Barcelona*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/Emanuelel/ombra/actions/workflows/ci.yml/badge.svg)](https://github.com/Emanuelel/ombra/actions/workflows/ci.yml)

An interactive, mobile-first map of Barcelona's terraces that shows which ones are
**in the shade right now** (or at any hour you scrub to) — wrapped in a Strava-style
game where you check in, earn shade points, and **steal your friends' crowns**.

> *"Like Strava, but instead of rewarding you for going fast, it rewards you for
> finding the perfect shaded terrace and not moving."*

Live at [ombra.wtf](https://ombra.wtf). Built for Barcelona, but the whole point of
open-sourcing it is that the shade engine, the game loop, and the PWA/push plumbing
are generic — **see [Adapting Ombra to your city](#adapting-ombra-to-your-city)** if
you want to run this for somewhere else. Several people asked for exactly that after
seeing it on LinkedIn; that section is written so you (or your AI coding agent) can
follow it mechanically.

## What works today (no accounts needed)

```bash
npm install
npm run dev        # → http://localhost:5199
```

- **5,983 real Barcelona terraces** (bars/restaurants/cafés with outdoor seating),
  city-wide across all 10 districts — licensed-terrace records from the Ajuntament de
  Barcelona open data portal, matched to named venues from OpenStreetMap + Overture Maps.
- **Real shade**: for every terrace, a full year of shade is precomputed offline from
  actual building footprints and heights (height ÷ tan(sun altitude), swept along the
  sun vector) and shipped as a compact baked table — the app does no geometry at
  runtime, it just looks up the shade % for the current time.
- **Time scrubber**: drag through the day and watch terraces flip green↔orange. Narrow
  streets stay shady; wide avenues bake at noon.
- **Shade bonus**: a 1×–3× points multiplier that peaks at solar noon when shade is scarcest.
- **Full game loop**: Google sign-in, check-ins with proximity + cooldown checks, a
  live points/crown system, leaderboards (terrace / neighbourhood / city), favourites,
  a public profile you can share, and web push notifications — all wired to a real
  Postgres backend, not seed data.

## Status

| Layer | State |
|---|---|
| Full mobile UI (13 screens) | ✅ Built and used in production |
| Map + shade engine + time scrubber | ✅ Real data, works with zero cloud accounts |
| Game backend (Neon + Drizzle + Vercel API + Ably + Google auth + web push) | ✅ Fully implemented; needs *your own* cloud credentials to run (see below) |

## Architecture

```
src/
  lib/
    barcelona.ts     map center/zoom + the GPS-recenter geofence (see "Adapting…")
    sun.ts            sun position + shade bonus + distance (shared client/server)
    shadeTable.ts     runtime shade lookup against the baked table (client)
    shade.ts          BUILD-TIME ONLY: shadow-casting geometry used to bake the table
    scoring.ts        server-side authoritative scoring (proximity/cooldown/points)
    auth-server.ts    session token → userId
    push-server.ts    web push sending (VAPID)
    push-copy.ts      server-side push notification copy (see "Adapting…")
  components/         MapView (Leaflet), TimeScrubber (inline in App.tsx)
  ui/                 Crown, Avatar, TabBar, ShareButton, Flags, design tokens
  screens/            Welcome, HowItWorks, Handle, Perms, Install, MapScreen, Terrace,
                       Checking, Celebrate, Boards, Profile, PublicProfile, Settings
  db/
    schema.ts         Drizzle schema (Postgres)
    client.ts         Neon serverless connection
  data/               committed, pre-built datasets (see "Data pipeline" below)
api/
  auth.ts, auth-google-start.ts, auth-google-callback.ts   Google OAuth + sessions
  check-in.ts          POST — proximity + cooldown + score + crown recompute + Ably steal event
  leaderboard.ts       GET  — rolling-window ranking (terrace / barri / city)
  favorites.ts, profile.ts, user.ts, push.ts, stats.ts
  cron/daily-fomo.ts   two scheduled push nudges (Hobby plan's 12-function cap → one file, two slots)
scripts/               data pipeline + one-off DB/ops scripts (below)
```

### Data pipeline

The terrace and shade datasets are **already committed** to `src/data/` (`terraces-all.json`,
`shade-table.json`) — `npm run dev` just reads them, no build step required. They were
produced once by:

1. `npm run build-terraces` (`scripts/build-terraces.ts`) — fetches licensed terraces
   from the Barcelona open-data portal, fetches named venues from OpenStreetMap
   (`scripts/fetch-overpass.ts`'s Overpass query) and Overture Maps
   (`npm run fetch-poi`, `scripts/fetch_poi.py`), then spatial-joins each terrace to
   its nearest named venue. Writes `src/data/terraces-all.json`.
2. `npm run precompute-shade` (`scripts/precompute-shade.ts`) — fetches OSM building
   footprints/heights citywide, runs the shadow-casting geometry in `src/lib/shade.ts`
   for every terrace across a representative day of each month, and bakes the result
   into `src/data/shade-table.json`.

You don't need to run either unless you're refreshing the dataset (terrace licenses
change occasionally; buildings essentially never do) or porting to a new city.
`scripts/fetch-overpass.ts` also still supports an older, smaller-area live-geometry
path (`src/lib/barcelona.ts`'s `BBOX` → `src/data/terraces.json` / `buildings.json`,
read by `src/lib/shade.ts`) from before the dataset went city-wide; the shipped app
does **not** use those files at runtime — `shadeTable.ts` + `terraces-all.json` are
the only two the client reads.

## Bringing the backend online

The map/shade/game-UI above needs zero accounts. Check-ins, auth, leaderboards and push
need three free-tier accounts:

1. **Neon** (Postgres) — easiest via the **Vercel-native integration**: in the Vercel
   project → **Storage → Create Database → Neon**, connect it, and Vercel auto-injects
   `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` into every environment. (Or create
   a project at [neon.tech](https://neon.tech) and set `DATABASE_URL` yourself.) Chosen
   because it scales compute to zero when idle rather than pausing the whole project.
2. **Google Cloud** (sign-in) → [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials),
   create an OAuth 2.0 Client ID (Web application), authorized redirect URI
   `<your-origin>/api/auth-google-callback`. Gives you `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
3. **Ably** (realtime, optional) → [ably.com](https://ably.com). Create an app, copy a
   root API key. Without it, "crown stolen" events are still saved to the DB, just not
   pushed live to the person who lost the crown.
4. **Vercel** (hosting + serverless `/api`) → deploy this repo; set the env vars there.

Then:

```bash
cp .env.example .env         # fill in DATABASE_URL, GOOGLE_CLIENT_ID/SECRET, VAPID_*, ...
# Using the Vercel–Neon integration? Pull its injected vars locally instead:
#   vercel env pull .env
npx web-push generate-vapid-keys   # → VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
npm run db:push               # create tables in Neon from src/db/schema.ts
npm run seed                  # load terraces + badges
npm run seed-community         # optional: sample users + check-ins so boards aren't empty on a fresh DB
```

## Environment variables

See [`.env.example`](.env.example) for the full annotated list (where to get each one).
Summary:

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | any backend feature | Neon/Postgres connection string. Falls back to `POSTGRES_URL`, then `DATABASE_URL_UNPOOLED`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | sign-in | OAuth 2.0 Web client. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | web push | Generate with `npx web-push generate-vapid-keys`. |
| `VITE_VAPID_PUBLIC_KEY` | web push (client) | Same value as `VAPID_PUBLIC_KEY`, exposed to the browser. |
| `ABLY_API_KEY` | live "crown stolen" push | Optional — feature degrades gracefully without it. |
| `CRON_SECRET` | `/api/cron/daily-fomo` | Any random string; Vercel Cron sends it automatically once set. |
| `STATS_SECRET` | `/api/stats` | Any random string; gates the internal metrics endpoint. |
| `VITE_API_BASE` | local dev only | Point the Vite dev server at deployed functions; unset = same-origin. |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | analytics | Optional. |

## Deploy

```bash
vercel --prod    # framework auto-detected (Vite); /api becomes serverless functions
```

Set every variable from the table above in the Vercel project (Production + Preview as
needed).

## Adapting Ombra to your city

Everything below is Barcelona-specific and lives outside the generic shade/game engine.
This list is exhaustive and file-anchored on purpose — hand this whole section to an AI
coding agent with "port this to `<your city>`" and it has enough to work from without
guessing.

**1. Get a terrace dataset.** This is the one step with no shortcut — you need a list of
outdoor-seating venues with coordinates for your city. Two paths:
   - *Open-data path* (what Barcelona uses): if your city publishes a licensed-terrace
     dataset, rewrite `scripts/build-terraces.ts` — swap `BCN_RESOURCE`/the CKAN API
     call (line ~20, ~74) for your portal's API, and the `bcn/${id}` id prefix (line
     ~194) for something else. It joins against named venues from OSM/Overture to fill
     in the name your city's open-data likely won't have.
   - *OSM-only path* (simpler, works anywhere): use `scripts/fetch_poi.py` +
     `scripts/fetch-overpass.ts`'s Overpass query directly for named bars/restaurants/cafés
     with `outdoor_seating=yes` — skip `build-terraces.ts`'s join step and adapt its
     output shape (`src/types.ts`'s `Terrace`) by hand.

**2. Point the pipeline at your city's bounding box.** There are, awkwardly, **three
   separate `CITY_BBOX` constants** to update in sync (a known wrinkle, not by
   design): `scripts/build-terraces.ts`, `scripts/precompute-shade.ts`, and
   `scripts/fetch_poi.py`'s `BBOX`. Once data is fetched, update `BBOX`/`CENTER` in
   `src/lib/barcelona.ts` too — that one drives the map's initial view and the
   GPS-recenter geofence, decoupled from the data-fetch boxes.

**3. Run the pipeline**: `npm run build-terraces && npm run precompute-shade` (see
   "Data pipeline" above) to produce your city's `src/data/terraces-all.json` and
   `src/data/shade-table.json`.

**4. Decide what to do with `barri`.** The domain model calls neighbourhoods "`barri`"
   (Catalan) as a first-class concept throughout: `src/db/schema.ts` (`homeBarri`,
   `terraces.barri`), `src/lib/api.ts`, every `api/*.ts` handler, and the `'barri'` tab
   in `src/screens/Boards.tsx`. This is the single biggest structural rename if you want
   one — but the simplest port keeps the field/column name `barri` internally and just
   populates it with your city's neighbourhood/district/ward/arrondissement names
   (whatever your dataset gives you); nothing forces it to say "barri" in the UI, since
   all user-facing labels already go through `t()` per the i18n rules below.

**5. Rewrite the localized copy.** Two different places, don't miss the second one:
   - `src/i18n/locales/{en,es,ca}.json` — the normal i18next strings. Swap the
     language set for whatever your city needs (see `CLAUDE.md` for the project's i18n
     conventions: every user-facing string goes through `t()`, all locale files must
     stay in key-parity, `npm run check:i18n` enforces it).
   - `src/lib/push-copy.ts` — server-side push notification text is **inlined here on
     purpose** (Vercel's Node runtime can't `import` the locale JSON without extra
     config), so it bypasses i18next entirely and hardcodes cultural references
     ("vermut o'clock", "tu barrio") alongside the translations. Rewrite this file's
     copy for your city/language, independent of step above.

**6. Update seed/demo data.** `scripts/seed-community.ts`'s `CENTRAL_BARRIS` array
   (hardcoded Barcelona neighbourhood names) and its `HANDLES` list (fine to reuse, but
   a couple bake in `bcn`); `scripts/seed-db.ts`'s badge copy (e.g. `rei-de-barri`,
   "king of the neighbourhood" in Catalan).

**7. Update branding & legal.** `index.html` (title/meta/OG tags, currently
   Barcelona-specific), `src/screens/Terrace.tsx`'s Google Maps search query (hardcodes
   `, Barcelona`), `src/screens/Settings.tsx`'s data-attribution line (credits
   OpenStreetMap/Overture — keep — and "Ajuntament de Barcelona open data" — swap for
   your source), and `public/privacy.html` / `public/terms.html` (operating entity,
   jurisdiction, regulator reference — these are real legal pages, have them reviewed
   for your jurisdiction, don't just find-and-replace).

**8. Timezone.** There's no central timezone constant — `api/cron/daily-fomo.ts` picks
   its morning/evening push slot off a hardcoded UTC-hour comparison (`getUTCHours() >= 15`)
   with comments assuming Barcelona/CEST. Adjust the hour math for your target timezone.
   Client-side, times just use the viewer's device clock, which needs no change.

**9. License note.** The code is MIT (see [LICENSE](LICENSE)), but the *data* you ship
   is not yours to relicense — OpenStreetMap is ODbL, Overture Maps is
   CDLA-Permissive-2.0, and your city's open-data portal will have its own terms. Check
   what each requires (usually attribution, which `Settings.tsx` already does) before
   shipping.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Notes & limitations

- Shade is a 2D convex-hull approximation of each building's cast shadow; like
  terrasses.cat it ignores trees, awnings (*toldos*) and balconies. It drives a bonus
  multiplier and the map colour, not a correctness-critical claim.
- Times use the viewer's device clock (Barcelona users → Europe/Madrid). There's no
  server-side timezone handling beyond the push-cron UTC-hour comparison noted above.
- Neon cold start: the first request after an idle spell waits ~0.5s while compute wakes.

## License

MIT — see [LICENSE](LICENSE). Terrace/building data has its own licenses; see
[Adapting Ombra to your city §9](#adapting-ombra-to-your-city) above.
