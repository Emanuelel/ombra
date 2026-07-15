/**
 * Demo/fixture data for local development: ~60 sample users + a few weeks of check-ins,
 * so the leaderboards, crowns and profiles aren't empty on a fresh dev database. Handy
 * starting point when adapting this repo to a new city, too. Regular signups stack on top.
 *
 * Notes:
 *  - Handles cover a mix of styles (name.surname, gamer tags, in-jokes) across Catalan /
 *    Spanish / expat pools. All match /^[a-z0-9_.]{2,20}$/.
 *  - Activity is power-law: a few regulars dominate (they become the crown holders),
 *    a long tail checks in once or twice.
 *  - Each user has a home barri; ~70% of their check-ins cluster there.
 *  - Points come from the same scorer (scoreCheckIn) as regular check-ins, with daytime
 *    timestamps, so they track the sun the same way.
 *  - Everything is prefixed `seed:` -> isolated from regular users, wipe-and-rebuild safe.
 *
 * Run: npx tsx --env-file=.env.local scripts/seed-community.ts
 *  (or) DATABASE_URL="…" npm run seed-community
 */
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { scoreCheckIn, CROWN_WINDOW_DAYS } from '../src/lib/scoring.js'

const { users, profiles, checkIns, currentCrowns } = schema

// Handles with a generated avatar in public/seed-avatars/<handle>.png (served statically);
// the rest fall back to Avatar.tsx's colored-initial placeholder, which is intended.
const __dirname = dirname(fileURLToPath(import.meta.url))
const avatarHandles = new Set(
  readdirSync(join(__dirname, '../public/seed-avatars'))
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.slice(0, -4)),
)
const avatarUrlFor = (handle: string) => (avatarHandles.has(handle) ? `/seed-avatars/${handle}.png` : null)

// A few central, terrace-dense barris. Sample activity concentrates here rather than
// spreading thin across the whole city.
const CENTRAL_BARRIS = [
  "la Dreta de l'Eixample",
  "l'Antiga Esquerra de l'Eixample",
  'Sant Antoni',
  'la Vila de Gràcia',
  'el Barri Gòtic',
  'Sant Pere, Santa Caterina i la Ribera',
  'el Poble Sec',
  'el Raval',
]

// 60 sample handles covering a mix of styles (anime/gamer tags, random words, in-jokes,
// a handful of name.surname) so the list isn't visibly generated from one template.
// Order doesn't matter; tiers/barris are assigned below.
const HANDLES = [
  // name.surname style — kept rare, most handles below are more casual
  'jordi.serra', 'pau.vidal', 'gemma.sole', 'laia_bcn', 'nuria.p', 'montse_r',
  'marc88', 'quimet', 'arnau_92', 'txell.bcn', 'aleix', 'biel', 'carla.m', 'sergi_p',
  // Anime / gaming handles, usually with numbers
  'kirito92', 'narutobcn', 'gojo_satoru', 'levi_ackerman', 'sasuke99', 'itachi_bcn',
  'tanjiro_x', 'zelda_04', 'geralt_21', 'pikachu77', 'totoro_88', 'sailormoon22',
  'akira2k', 'eren_yeager', 'mikasa_04', 'luffy_d', 'spikeg99', 'cloud_7',
  'link_bcn', 'yasuo_main', 'kenji.x', 'megatron88', 'goku_ssj',
  // Random words / net handles / gamer tags
  'solysombra', 'vermutboy', 'sunchaser', 'elgato', 'potato.exe', 'bcn_nights',
  'cafeconleche', 'noctambul', 'mrshadow', 'la_penya', 'cerveza_fria', 'guiri.vibes',
  'terrasseig', 'xokito', 'ramen_lvl9', 'sk8ordie', 'elmostri', 'shadow_hunter',
  'lobo_solitario', 'donpepe', 'lupita.exe', 'quesito', 'panot.bcn',
]

const HANDLE_RE = /^[a-z0-9_.]{2,20}$/
const rand = (n: number) => Math.floor(Math.random() * n)
const pick = <T,>(arr: T[]): T => arr[rand(arr.length)]
const between = (lo: number, hi: number) => lo + rand(hi - lo + 1)

// Activity tiers by index: 8 regulars (crown holders), 22 mids, 30 casuals.
function tierCount(i: number): number {
  if (i < 8) return between(14, 22)
  if (i < 30) return between(6, 11)
  return between(1, 5)
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')

  const bad = HANDLES.filter((h) => !HANDLE_RE.test(h))
  if (bad.length) throw new Error(`Invalid handles (must match ${HANDLE_RE}): ${bad.join(', ')}`)
  if (new Set(HANDLES).size !== HANDLES.length) throw new Error('Duplicate handle in list')

  // Terraces in the central barris, grouped by barri (id + coords for scoring).
  const rows = await db
    .select({ id: schema.terraces.id, lat: schema.terraces.lat, lon: schema.terraces.lon, barri: schema.terraces.barri })
    .from(schema.terraces)
    .where(inArray(schema.terraces.barri, CENTRAL_BARRIS))
  const byBarri = new Map<string, typeof rows>()
  for (const b of CENTRAL_BARRIS) byBarri.set(b, [])
  for (const r of rows) byBarri.get(r.barri!)?.push(r)
  const allCentral = rows
  if (!allCentral.length) throw new Error('No terraces found in the chosen central barris')

  const ids = HANDLES.map((h) => `seed:${h}`)

  // Fully wipe every seed:* user (cascades to their profiles + check-ins) so handles
  // that were renamed or dropped don't linger as orphan profiles. Then rebuild.
  console.log(`Resetting all seed:* users and rebuilding ${ids.length} hunters…`)
  await db.delete(users).where(sql`${users.id} like 'seed:%'`)

  console.log('Seeding profiles + daytime check-ins over the last ~3 weeks…')
  const totals = new Map<string, number>() // userId -> points sum
  const homeBarris = new Map<string, string>()
  const allRows: (typeof checkIns.$inferInsert)[] = []

  HANDLES.forEach((handle, i) => {
    const id = `seed:${handle}`
    const home = pick(CENTRAL_BARRIS)
    homeBarris.set(id, home)
    const homeTerraces = byBarri.get(home)!.length ? byBarri.get(home)! : allCentral

    let sum = 0
    const count = tierCount(i)
    for (let k = 0; k < count; k++) {
      // ~70% at the home barri, ~30% roaming the other central barris.
      const t = Math.random() < 0.7 ? pick(homeTerraces) : pick(allCentral)
      // 85% inside the crown window (drives the live leaderboard); 15% older for
      // all-time depth. Daytime hours only so the sun bonus is real (BCN ~ UTC+2).
      const recent = Math.random() < 0.85
      const dayAgo = recent ? rand(CROWN_WINDOW_DAYS) : between(CROWN_WINDOW_DAYS, 21)
      const utcHour = between(9, 18) // ~11:00–20:00 local
      const min = rand(60)
      const when = new Date()
      when.setUTCDate(when.getUTCDate() - dayAgo)
      when.setUTCHours(utcHour, min, rand(60), 0)

      const { sunAltitude, points } = scoreCheckIn(when, t.lat, t.lon)
      sum += points
      allRows.push({
        userId: id,
        terraceId: t.id,
        createdAt: when,
        sunAltitude,
        shadeStatus: Math.random() < 0.5 ? 'sun' : 'shade',
        points,
        lat: t.lat,
        lon: t.lon,
      })
    }
    totals.set(id, sum)
  })

  // Upsert users + profiles, then set totals/home barri (works on first run and re-runs).
  for (const handle of HANDLES) {
    const id = `seed:${handle}`
    await db.insert(users).values({ id, name: handle }).onConflictDoNothing()
    await db
      .insert(profiles)
      .values({
        userId: id,
        displayName: handle,
        avatarUrl: avatarUrlFor(handle),
        homeBarri: homeBarris.get(id) ?? null,
        pointsTotal: totals.get(id) ?? 0,
      })
      .onConflictDoNothing()
    await db
      .update(profiles)
      .set({ avatarUrl: avatarUrlFor(handle), homeBarri: homeBarris.get(id) ?? null, pointsTotal: totals.get(id) ?? 0 })
      .where(eq(profiles.userId, id))
  }

  // Insert check-ins in chunks (Postgres param limit safety).
  for (let i = 0; i < allRows.length; i += 500) {
    await db.insert(checkIns).values(allRows.slice(i, i + 500))
  }

  // Recompute terrace crowns (points-based) for every terrace touched in the window,
  // so the seeded regulars actually hold crowns on their profiles.
  console.log('Recomputing crowns…')
  const touched = await db
    .selectDistinct({ terraceId: checkIns.terraceId })
    .from(checkIns)
    .where(gt(checkIns.createdAt, sql`now() - interval '${sql.raw(String(CROWN_WINDOW_DAYS))} days'`))

  let crowns = 0
  for (const { terraceId } of touched) {
    const [top] = await db
      .select({ userId: checkIns.userId, pts: sql<number>`sum(${checkIns.points})::int` })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.terraceId, terraceId),
          gt(checkIns.createdAt, sql`now() - interval '${sql.raw(String(CROWN_WINDOW_DAYS))} days'`),
        ),
      )
      .groupBy(checkIns.userId)
      .orderBy(desc(sql`sum(${checkIns.points})`))
      .limit(1)
    if (!top?.userId) continue
    await db
      .insert(currentCrowns)
      .values({ scope: 'terrace', scopeId: terraceId, holderUserId: top.userId })
      .onConflictDoUpdate({
        target: [currentCrowns.scope, currentCrowns.scopeId],
        set: { holderUserId: top.userId },
      })
    crowns++
  }

  const totalCheckins = allRows.length
  console.log(
    `Done — ${HANDLES.length} hunters, ${totalCheckins} check-ins across ${CENTRAL_BARRIS.length} barris, ${crowns} crowns assigned.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('seed-community failed:', e)
    process.exit(1)
  })
