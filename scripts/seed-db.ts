/**
 * Seeds the Neon database with terraces (from the committed OSM JSON) and the
 * badge catalogue. Idempotent — safe to re-run.
 *
 * Run: DATABASE_URL="postgres://…" npm run seed
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { db, schema } from '../src/db/client'
import type { Terrace } from '../src/types'

const { terraces, badges } = schema
const here = dirname(fileURLToPath(import.meta.url))

const BADGES = [
  { key: 'matinador', name: 'Matinador', description: "Check-in a l'ombra abans del migdia" },
  { key: 'kamikaze', name: 'Kamikaze', description: 'Check-in a ple sol, valent' },
  { key: 'fidel', name: 'Fidel', description: '7 dies seguits a la mateixa terrassa' },
  { key: 'explorador', name: 'Explorador', description: '10 terrasses diferents' },
  { key: 'rei-de-barri', name: 'Rei de Barri', description: 'Corona de tot un barri' },
]

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')

  const data: Terrace[] = JSON.parse(
    readFileSync(resolve(here, '../src/data/terraces-all.json'), 'utf8'),
  )

  console.log(`Seeding ${data.length} terraces…`)
  for (let i = 0; i < data.length; i += 500) {
    const chunk = data.slice(i, i + 500).map((t) => ({
      id: t.id,
      name: t.name,
      amenity: t.amenity,
      lat: t.lat,
      lon: t.lon,
      barri: t.barri ?? null,
    }))
    // Upsert so re-runs refresh names/barris on existing rows (can't delete —
    // check_ins reference terraces with ON DELETE CASCADE).
    await db
      .insert(terraces)
      .values(chunk)
      .onConflictDoUpdate({
        target: terraces.id,
        set: { name: sql`excluded.name`, amenity: sql`excluded.amenity`, barri: sql`excluded.barri` },
      })
  }

  console.log(`Seeding ${BADGES.length} badges…`)
  await db.insert(badges).values(BADGES).onConflictDoNothing()

  console.log('Seed complete.')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
