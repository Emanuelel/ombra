/**
 * One-time data pipeline (terrace authorisations change rarely):
 *   1. Fetch every in-force licensed terrace from Barcelona open data
 *      (location, barri, district, address, tables/chairs) — but NO venue name.
 *   2. Fetch named food/drink venues from OpenStreetMap.
 *   3. Spatial-join each terrace to the nearest OSM venue to borrow its name.
 *   4. Print a match-quality report (matched / unmatched / ambiguous / duplicates)
 *      and write the enriched dataset to src/data/terraces.json.
 *
 * Run: npm run build-terraces
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../src/data')

// Current "ordinary terraces in force" resource (terrasses-comercos-vigents, 2026 1S).
const BCN_RESOURCE = 'ca298802-c798-4750-b078-021af11ce46b'
const CITY_BBOX = [41.32, 2.08, 41.47, 2.23] as const // S,W,N,E — all of Barcelona

const MATCH_M = 30 // borrow a venue name only within this distance
const AMBIG_M = 12 // a rival name this close can make the match ambiguous
const CLEAR_MARGIN_M = 6 // …but only if it's within this margin of the nearest (else clear winner)
const DEDUPE_M = 5 // collapse terrace rows this close into one venue

const OVERPASS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]

function distM(aLon: number, aLat: number, bLon: number, bLat: number): number {
  const R = 6371000
  const rad = Math.PI / 180
  const x = (bLon - aLon) * rad * Math.cos(((aLat + bLat) / 2) * rad)
  const y = (bLat - aLat) * rad
  return Math.sqrt(x * x + y * y) * R
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bDe\b|\bDel\b|\bLa\b|\bI\b/g, (w) => w.toLowerCase())
}

interface OsmVenue {
  name: string
  amenity: string
  lat: number
  lon: number
}
interface Enriched {
  id: string
  name: string
  amenity: string
  lat: number
  lon: number
  barri: string
  district: string
  address: string
  tables: number
  named: boolean // a confident OSM venue name is being shown
  ambiguous: boolean // an OSM name was near but 2+ competed — not trusted
}

async function fetchBcnTerraces(): Promise<any[]> {
  const rows: any[] = []
  let offset = 0
  const limit = 1000
  for (;;) {
    const url = `https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search?resource_id=${BCN_RESOURCE}&limit=${limit}&offset=${offset}`
    const j: any = await (await fetch(url)).json()
    const batch = j.result.records as any[]
    rows.push(...batch)
    if (rows.length >= j.result.total || batch.length === 0) break
    offset += limit
  }
  return rows
}

async function fetchOsmVenues(): Promise<OsmVenue[]> {
  const q = `
    [out:json][timeout:180];
    ( nwr["amenity"~"^(bar|restaurant|cafe|pub|fast_food|ice_cream|biergarten)$"]["name"](${CITY_BBOX.join(',')}); );
    out center tags;`
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(q),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j: any = await res.json()
      return (j.elements ?? [])
        .map((el: any) => {
          const lat = el.lat ?? el.center?.lat
          const lon = el.lon ?? el.center?.lon
          if (lat == null || lon == null || !el.tags?.name) return null
          return { name: el.tags.name, amenity: el.tags.amenity ?? 'bar', lat, lon }
        })
        .filter(Boolean) as OsmVenue[]
    } catch (e) {
      console.warn(`  osm endpoint failed: ${(e as Error).message}`)
    }
  }
  throw new Error('all Overpass endpoints failed')
}

// Load an open-data POI file (Overture / FSQ OS) if present — a build-only input written
// by scripts/fetch_poi.py. Both are permissively licensed (CDLA / Apache-2.0), so their
// names can be baked into terraces-all.json and shipped.
function loadPoiFile(name: string): OsmVenue[] {
  const p = resolve(DATA_DIR, name)
  if (!existsSync(p)) {
    console.log(`  (no ${name} — skipping)`)
    return []
  }
  try {
    const arr = JSON.parse(readFileSync(p, 'utf8')) as any[]
    return arr
      .filter((v) => v && typeof v.name === 'string' && isFinite(v.lat) && isFinite(v.lon))
      .map((v) => ({ name: v.name, amenity: v.amenity ?? 'bar', lat: v.lat, lon: v.lon }))
  } catch {
    return []
  }
}

// Normalise a venue name so the same place from different sources isn't treated as a rival.
function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Simple grid index (~40m cells) for fast nearest-venue lookups.
function gridKey(lat: number, lon: number): string {
  return `${Math.round(lat / 0.0004)}:${Math.round(lon / 0.0004)}`
}
function buildGrid(venues: OsmVenue[]): Map<string, OsmVenue[]> {
  const g = new Map<string, OsmVenue[]>()
  for (const v of venues) {
    const k = gridKey(v.lat, v.lon)
    ;(g.get(k) ?? g.set(k, []).get(k)!).push(v)
  }
  return g
}
function nearbyVenues(g: Map<string, OsmVenue[]>, lat: number, lon: number): OsmVenue[] {
  const clat = Math.round(lat / 0.0004)
  const clon = Math.round(lon / 0.0004)
  const out: OsmVenue[] = []
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cell = g.get(`${clat + dy}:${clon + dx}`)
      if (cell) out.push(...cell)
    }
  return out
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true })

  console.log('Fetching Barcelona licensed terraces…')
  const raw = await fetchBcnTerraces()
  console.log(`  ✓ ${raw.length} terrace authorisations`)

  console.log('Fetching OSM named venues…')
  const osm = await fetchOsmVenues()
  console.log(`  ✓ ${osm.length} named OSM venues`)
  // Union with open-data POIs (Overture + FSQ OS) for far better name coverage.
  const overture = loadPoiFile('poi-overture.json')
  const fsq = loadPoiFile('poi-fsq.json')
  if (overture.length) console.log(`  ✓ ${overture.length} Overture venues`)
  if (fsq.length) console.log(`  ✓ ${fsq.length} FSQ OS venues`)
  const venues = [...osm, ...overture, ...fsq]
  console.log(`  = ${venues.length} venues total`)
  const grid = buildGrid(venues)

  // Parse + dedupe terraces by proximity, summing tables.
  type T = { lat: number; lon: number; barri: string; district: string; address: string; tables: number; id: string }
  const parsed: T[] = []
  for (const r of raw) {
    const lat = parseFloat(r.LATITUD)
    const lon = parseFloat(r.LONGITUD)
    if (!isFinite(lat) || !isFinite(lon) || lat === 0) continue
    parsed.push({
      lat,
      lon,
      barri: r.NOM_BARRI ?? '',
      district: r.NOM_DISTRICTE ?? '',
      address: titleCase(r.EMPLACAMENT ?? ''),
      tables: parseInt(r.TAULES ?? '0', 10) || 0,
      id: `bcn/${r._id}`,
    })
  }

  const tGrid = buildGrid(parsed.map((p) => ({ name: p.id, amenity: '', lat: p.lat, lon: p.lon })))
  const merged: T[] = []
  const consumed = new Set<string>()
  let dupCount = 0
  for (const t of parsed) {
    if (consumed.has(t.id)) continue
    let tables = t.tables
    for (const near of nearbyVenues(tGrid, t.lat, t.lon)) {
      if (near.name === t.id || consumed.has(near.name)) continue
      if (distM(t.lon, t.lat, near.lon, near.lat) <= DEDUPE_M) {
        consumed.add(near.name)
        const other = parsed.find((p) => p.id === near.name)
        if (other) tables += other.tables
        dupCount++
      }
    }
    merged.push({ ...t, tables })
  }

  // Join to OSM names.
  const out: Enriched[] = []
  let matched = 0
  let ambiguous = 0
  const buckets = [0, 0, 0, 0] // 0-5,5-10,10-20,20-30
  for (const t of merged) {
    const cands = nearbyVenues(grid, t.lat, t.lon)
      .map((v) => ({ v, d: distM(t.lon, t.lat, v.lon, v.lat) }))
      .sort((a, b) => a.d - b.d)
    const best = cands[0]
    const isMatch = !!best && best.d <= MATCH_M
    let isAmbiguous = false
    if (isMatch) {
      matched++
      if (best.d < 5) buckets[0]++
      else if (best.d < 10) buckets[1]++
      else if (best.d < 20) buckets[2]++
      else buckets[3]++
      // Decide if the nearest name is trustworthy. With several open-data sources most
      // real venues appear more than once, so:
      //   • a very close match (≤ TRUST_M) is trusted outright (terraces sit at their venue);
      //   • a name corroborated by a second source nearby is trusted;
      //   • otherwise it's ambiguous only if a *different* venue is essentially as close.
      const TRUST_M = 6
      const bestNorm = normName(best.v.name)
      const nearBest = cands.filter((c) => c.d <= AMBIG_M)
      const corroborated = nearBest.filter((c) => normName(c.v.name) === bestNorm).length >= 2
      const rival = cands.find((c) => normName(c.v.name) !== bestNorm)
      const genuineTie = !!rival && rival.d <= AMBIG_M && rival.d - best.d <= CLEAR_MARGIN_M
      isAmbiguous = genuineTie && best.d > TRUST_M && !corroborated
      if (isAmbiguous) ambiguous++
    }
    // Only trust an OSM name when it is unambiguous; otherwise show the address.
    const confident = isMatch && !isAmbiguous
    out.push({
      id: t.id,
      name: confident ? best!.v.name : t.address || `Terrassa · ${t.barri}`,
      amenity: confident ? best!.v.amenity : 'terrace',
      lat: t.lat,
      lon: t.lon,
      barri: t.barri,
      district: t.district,
      address: t.address,
      tables: t.tables,
      named: confident,
      ambiguous: isAmbiguous,
    })
  }

  const n = merged.length
  const pct = (x: number) => `${((x / n) * 100).toFixed(1)}%`
  console.log('\n──────── MATCH-QUALITY REPORT ────────')
  console.log(`Raw authorisations:        ${parsed.length}`)
  console.log(`Duplicates merged (<${DEDUPE_M}m):   ${dupCount}`)
  console.log(`Distinct terraces:         ${n}`)
  console.log(`Named via OSM (<${MATCH_M}m):     ${matched}  (${pct(matched)})`)
  console.log(`  ├ within 5m:             ${buckets[0]}`)
  console.log(`  ├ 5–10m:                 ${buckets[1]}`)
  console.log(`  ├ 10–20m:                ${buckets[2]}`)
  console.log(`  └ 20–30m:                ${buckets[3]}`)
  console.log(`Ambiguous (≥2 names <${AMBIG_M}m):  ${ambiguous}  (${pct(ambiguous)})  ← name dropped, using address`)
  console.log(`\nCONFIDENT names shown:     ${matched - ambiguous}  (${pct(matched - ambiguous)})`)
  console.log(`Address fallback shown:    ${n - (matched - ambiguous)}  (${pct(n - (matched - ambiguous))})`)
  console.log('──────────────────────────────────────\n')

  writeFileSync(resolve(DATA_DIR, 'terraces-all.json'), JSON.stringify(out))
  console.log(`Wrote src/data/terraces-all.json (${out.length} terraces, city-wide)`)
}

main().catch((e) => {
  console.error('build-terraces failed:', e)
  process.exit(1)
})
