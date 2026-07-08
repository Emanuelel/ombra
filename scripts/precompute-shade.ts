/**
 * Bakes the shade timetable the app ships (src/data/shade-table.json).
 *
 * The sun's position for a given lat/lon/date/time repeats every year and building
 * footprints essentially never change, so shade is a fixed function we precompute ONCE
 * here instead of recomputing live on every phone. The app then ships no building
 * geometry — it just reads this table (see src/lib/shadeTable.ts).
 *
 * For every city-wide terrace we sample shade every 30 min across daylight (06:00–22:00)
 * for a representative day of each month, quantise the % to a 64-level char, and pack the
 * 12×33 grid into one string per terrace.
 *
 * Citywide building footprints are fetched from OSM (tiled to avoid Overpass limits) and
 * cached to src/data/buildings-all.json (build-only, gitignored). Pass --refetch-buildings
 * to force a refresh.
 *
 * Run: npm run precompute-shade   (re-run yearly, or when terraces/buildings change)
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { computeShade } from '../src/lib/shade'
import { BuildingIndex } from '../src/lib/buildingIndex'
import type { Building, Terrace } from '../src/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../src/data')

const CITY_BBOX = [41.32, 2.08, 41.47, 2.23] as const // S,W,N,E — all of Barcelona
const TILES = 6 // split the city bbox into TILES×TILES Overpass queries

// Timetable resolution (must match src/lib/shadeTable.ts).
const START_MIN = 360 // 06:00
const STEP_MIN = 30
const N_SAMPLES = 33 // 06:00 … 22:00
const MONTHS = 12
const BAKE_YEAR = 2025 // non-leap representative year

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const LEVELS = ALPHABET.length - 1 // 63
const charForPct = (pct: number) => ALPHABET[Math.round((Math.max(0, Math.min(100, pct)) / 100) * LEVELS)]

const ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]

const SIMPLIFY_M = 2.5
const round5 = (x: number) => Math.round(x * 1e5) / 1e5
function distM(aLon: number, aLat: number, bLon: number, bLat: number): number {
  const R = 6371000
  const rad = Math.PI / 180
  const x = (bLon - aLon) * rad * Math.cos(((aLat + bLat) / 2) * rad)
  const y = (bLat - aLat) * rad
  return Math.sqrt(x * x + y * y) * R
}
function estimateHeight(tags: Record<string, string> = {}): number {
  if (tags.height) {
    const m = parseFloat(tags.height.replace(/[^0-9.]/g, ''))
    if (!isNaN(m) && m > 0) return Math.round(m)
  }
  if (tags['building:levels']) {
    const lvls = parseFloat(tags['building:levels'])
    if (!isNaN(lvls) && lvls > 0) return Math.round(lvls * 3.1 + 1)
  }
  return 12
}
function simplifyRing(geom: any[]): [number, number][] | null {
  const pts = geom.map((g) => [round5(g.lon), round5(g.lat)] as [number, number])
  if (pts.length < 3) return null
  const kept: [number, number][] = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const last = kept[kept.length - 1]
    if (distM(pts[i][0], pts[i][1], last[0], last[1]) > SIMPLIFY_M) kept.push(pts[i])
  }
  if (kept.length < 3) return null
  const first = kept[0]
  const last = kept[kept.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) kept.push(first)
  return kept
}
function centroid(ring: [number, number][]): [number, number] {
  let x = 0
  let y = 0
  for (const [lon, lat] of ring) {
    x += lon
    y += lat
  }
  return [round5(x / ring.length), round5(y / ring.length)]
}

async function overpass(query: string): Promise<any> {
  let lastErr: unknown
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

async function fetchCityBuildings(): Promise<Building[]> {
  const [S, W, N, E] = CITY_BBOX
  const dLat = (N - S) / TILES
  const dLon = (E - W) / TILES
  const byId = new Map<string, Building>()
  let tile = 0
  for (let ty = 0; ty < TILES; ty++) {
    for (let tx = 0; tx < TILES; tx++) {
      tile++
      const s = S + ty * dLat
      const n = s + dLat
      const w = W + tx * dLon
      const e = w + dLon
      process.stdout.write(`  buildings tile ${tile}/${TILES * TILES} …`)
      const raw = await overpass(`[out:json][timeout:180];( way["building"](${s},${w},${n},${e}); );out geom;`)
      let added = 0
      for (const el of raw.elements ?? []) {
        if (!el.geometry || el.geometry.length < 4) continue
        const id = `way/${el.id}`
        if (byId.has(id)) continue
        const ring = simplifyRing(el.geometry)
        if (!ring) continue
        byId.set(id, { id, height: estimateHeight(el.tags), ring, c: centroid(ring) })
        added++
      }
      console.log(` ${added} (total ${byId.size})`)
    }
  }
  return [...byId.values()]
}

async function main() {
  const terraces: Terrace[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'terraces-all.json'), 'utf8'))
  console.log(`Terraces: ${terraces.length} city-wide`)

  const buildingsPath = resolve(DATA_DIR, 'buildings-all.json')
  let buildings: Building[]
  if (existsSync(buildingsPath) && !process.argv.includes('--refetch-buildings')) {
    buildings = JSON.parse(readFileSync(buildingsPath, 'utf8'))
    console.log(`Buildings: ${buildings.length} (cached; --refetch-buildings to refresh)`)
  } else {
    console.log('Fetching city-wide buildings (tiled)…')
    buildings = await fetchCityBuildings()
    writeFileSync(buildingsPath, JSON.stringify(buildings))
    console.log(`  ✓ wrote buildings-all.json (${buildings.length} buildings, build-only)`)
  }

  const index = new BuildingIndex(buildings)

  // Accumulate MONTHS×N_SAMPLES chars per terrace (month-major).
  const buf: Record<string, string[]> = {}
  for (const t of terraces) buf[t.id] = new Array(MONTHS * N_SAMPLES)

  const t0 = Date.now()
  for (let m = 0; m < MONTHS; m++) {
    for (let si = 0; si < N_SAMPLES; si++) {
      const min = START_MIN + si * STEP_MIN
      const date = new Date(BAKE_YEAR, m, 15, Math.floor(min / 60), min % 60, 0, 0)
      const { info } = computeShade(date, terraces, index)
      const pos = m * N_SAMPLES + si
      for (const t of terraces) buf[t.id][pos] = charForPct(info[t.id]?.percent ?? 0)
    }
    process.stdout.write(`  baked month ${m + 1}/${MONTHS} (${Math.round((Date.now() - t0) / 1000)}s)\r`)
  }
  console.log('')

  const data: Record<string, string> = {}
  for (const t of terraces) data[t.id] = buf[t.id].join('')

  const out = { meta: { startMin: START_MIN, stepMin: STEP_MIN, nSamples: N_SAMPLES, months: MONTHS }, data }
  writeFileSync(resolve(DATA_DIR, 'shade-table.json'), JSON.stringify(out))
  const kb = (readFileSync(resolve(DATA_DIR, 'shade-table.json')).length / 1024).toFixed(0)
  console.log(`✓ wrote shade-table.json (${terraces.length} terraces × ${MONTHS}×${N_SAMPLES} samples, ${kb} KB raw)`)
}

main().catch((e) => {
  console.error('precompute-shade failed:', e)
  process.exit(1)
})
