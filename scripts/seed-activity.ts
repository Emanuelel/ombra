/**
 * Seeds fake hunters + a week of check-ins so the live "All BCN" leaderboard is
 * populated on day one (real users' check-ins then stack on top). Idempotent.
 *
 * Run: DATABASE_URL="…" npm run seed-activity
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inArray } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import type { Terrace } from '../src/types'

const { users, profiles, checkIns } = schema
const here = dirname(fileURLToPath(import.meta.url))

// handle → rough weekly check-in count (drives the ranking).
const HUNTERS: [string, number][] = [
  ['solbandit', 11],
  ['ombravedor', 9],
  ['la_reina', 8],
  ['laies', 6],
  ['pau_ombra', 5],
  ['quimet', 4],
  ['nina.g', 3],
  ['bru', 3],
  ['noa.bcn', 2],
]

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const terraces: Terrace[] = JSON.parse(readFileSync(resolve(here, '../src/data/terraces.json'), 'utf8'))
  const pick = () => terraces[Math.floor(Math.random() * terraces.length)]

  const ids = HUNTERS.map(([h]) => `seed:${h}`)

  console.log('Resetting seed hunters…')
  await db.delete(checkIns).where(inArray(checkIns.userId, ids))
  for (const [h] of HUNTERS) {
    const id = `seed:${h}`
    await db.insert(users).values({ id, name: h }).onConflictDoNothing()
    await db
      .insert(profiles)
      .values({ userId: id, displayName: h, homeBarri: pick().barri ?? null })
      .onConflictDoNothing()
  }

  console.log('Seeding check-ins over the last 7 days…')
  let total = 0
  for (const [h, count] of HUNTERS) {
    const rows = Array.from({ length: count }, () => {
      const t = pick()
      const ageMs = Math.floor(Math.random() * 7 * 24 * 3600 * 1000)
      const points = 30 + Math.floor(Math.random() * 75)
      return {
        userId: `seed:${h}`,
        terraceId: t.id,
        createdAt: new Date(Date.now() - ageMs),
        sunAltitude: 40,
        shadeStatus: 'shade',
        points,
        lat: t.lat,
        lon: t.lon,
      }
    })
    await db.insert(checkIns).values(rows)
    total += rows.length
  }

  console.log(`Done — ${HUNTERS.length} hunters, ${total} check-ins.`)
}

main().catch((e) => {
  console.error('seed-activity failed:', e)
  process.exit(1)
})
