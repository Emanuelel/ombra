# Ombra 🌳 — *caça la fresca a Barcelona*

An interactive, mobile-first map of Barcelona's terraces that shows which ones are
**in the shade right now** (or at any hour you scrub to) — wrapped in a Strava-style
game where you check in, earn shade points, and **steal your friends' crowns**.

> *"Like Strava, but instead of rewarding you for going fast, it rewards you for
> finding the perfect shaded terrace and not moving."*

## Status

| Layer | State |
|-------|-------|
| Full hi-fi UI — all 9 screens per the design handoff | ✅ Built & verified end-to-end in the mobile preview |
| Map + live shade engine + time scrubber | ✅ Real OSM data, runs with zero cloud accounts |
| Game backend (Neon + Drizzle + Vercel API + Ably + Auth) | 🟡 Code scaffolded; needs your cloud credentials to run (see below) |

## Screens (matches `design_handoff_ombra`)

`welcome → handle → perms` (onboarding) · `map` · `terrace` → `checking` → `celebrate`
(the crown-steal win) · `boards` · `profile`. Base tabs (Map / Boards / You) sit under a
bottom bar with a raised CHECK IN button; onboarding, terrace detail, the GPS loader and
the celebration are full-bleed overlays. State machine + game state live in `src/App.tsx`;
screens are in `src/screens/`, shared primitives (Crown, StatusBar, TabBar, tokens) in
`src/ui/`. Design system: cream/ink/sun/tomato "sticker" palette with hard offset shadows,
Archivo Black + Archivo + IBM Plex Mono.

**Real vs. seed:** the map, per-terrace shade %, the time scrubber, and the check-in
points (`base × shade bonus`) are all really computed. Crown holders, leaderboard rows and
profile stats use the handoff's seed data (see `src/data/boards.ts`) — wire them to
`/api/leaderboard` once the backend is live. The terrace photo is the one intentional
placeholder.

## What works today (no accounts needed)

```bash
npm install
npm run dev        # → http://localhost:5199
```

- **99 real Barcelona terraces** (bars/restaurants/cafés with outdoor seating) across
  Gràcia + Eixample, from OpenStreetMap.
- **Real building-shadow engine**: for the selected time, each of ~6,400 building
  footprints casts a shadow (height ÷ tan(sun altitude), swept along the sun vector);
  a terrace is *shaded* if it falls inside any nearby shadow.
- **Time scrubber**: drag through the day and watch terraces flip green↔orange. Gràcia's
  narrow streets stay shady; the wide Eixample blocks bake at noon.
- **Shade bonus**: a 1×–3× points multiplier that peaks at solar noon when shade is scarcest.

### Refreshing / expanding the OSM data

```bash
npm run fetch-data   # re-queries Overpass, rewrites src/data/*.json
```

Widen the area by editing `BBOX` in [`src/lib/barcelona.ts`](src/lib/barcelona.ts)
(and the copy in [`scripts/fetch-overpass.ts`](scripts/fetch-overpass.ts)).

## Architecture

```
src/
  lib/
    barcelona.ts   bbox, map centre, colours
    sun.ts         sun position + shade bonus + distance (turf-free, shared with API)
    shade.ts       client shadow-casting geometry (turf) → per-terrace status
    scoring.ts     server-side authoritative scoring (proximity/cooldown/points)
    auth-server.ts session → userId (STUB — see "Auth" below)
  components/       MapView, TimeScrubber (in App), Legend
  db/
    schema.ts      Drizzle schema (Postgres)
    client.ts      Neon serverless connection
  data/            committed OSM JSON (terraces, buildings)
api/
  check-in.ts      POST — proximity + cooldown + score + crown recompute + Ably steal event
  leaderboard.ts   GET  — rolling-window ranking (SQL GROUP BY)
scripts/
  fetch-overpass.ts   OSM → src/data
  seed-db.ts          src/data + badges → Neon
```

## Bringing the backend online

You need three accounts (all have free tiers; chosen to avoid runaway cost and to
survive the off-season — Neon scales compute to zero when idle and does **not** pause
the project like Supabase does):

1. **Neon** (Postgres) — easiest via the **Vercel-native integration**: in the Vercel
   project → **Storage → Create Database → Neon**, connect it, and Vercel auto-injects
   `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` into every environment — no manual
   env var needed. (Or create a project at [neon.tech](https://neon.tech) and set
   `DATABASE_URL` yourself.) The db client reads `DATABASE_URL` with `POSTGRES_URL` /
   `DATABASE_URL_UNPOOLED` fallbacks, so either path works.
2. **Ably** (realtime, optional) → [ably.com](https://ably.com). Create an app, copy a
   root API key. If omitted, steal notifications are still saved to the DB, just not
   pushed live.
3. **Vercel** (hosting + serverless `/api`) → deploy this repo; set the env vars there.

Then:

```bash
# Using the Vercel–Neon integration? Pull its injected vars locally:
vercel env pull .env          # writes DATABASE_URL etc. from the linked project
# Otherwise: cp .env.example .env and fill in DATABASE_URL / ABLY_API_KEY / AUTH_SECRET
npm run db:push               # create tables in Neon from src/db/schema.ts
npm run seed                  # load terraces + badges
```

### Auth — the one remaining wiring task

[`src/lib/auth-server.ts`](src/lib/auth-server.ts) is a **stub**. For local testing set
`ALLOW_DEV_AUTH=1` and send an `x-user-id` header; the check-in/leaderboard endpoints
then work end-to-end. For production, wire real sessions (magic-link + Google):

- **Auth.js** (`@auth/core`) in a Vercel function, **or**
- **Better Auth** (framework-agnostic, stores sessions in the same Neon DB via Drizzle)
  — recommended for this Vite SPA, since Auth.js is really built for Next.js.

Replace the body of `getSessionUserId()` with a real session lookup and remove the dev path.

## Deploy

```bash
vercel --prod    # framework auto-detected (Vite); /api becomes serverless functions
```

Set `DATABASE_URL`, `ABLY_API_KEY`, `AUTH_SECRET`, and OAuth creds in the Vercel project.
Do **not** set `ALLOW_DEV_AUTH` in production.

## Notes & limitations

- Shade is a 2D convex-hull approximation of each building's cast shadow; like
  terrasses.cat it ignores trees, awnings (*toldos*) and balconies. Here it only drives a
  bonus multiplier and the map colour, not a correctness-critical claim.
- Times use the viewer's device clock (Barcelona users → Europe/Madrid).
- Neon cold start: the first request after an idle spell waits ~0.5 s while compute wakes.
