/**
 * Prepares the app's data slice for the current coverage box (BBOX in
 * src/lib/barcelona.ts):
 *   1. Fetches building footprints + heights from OSM, rounding coordinates and
 *      simplifying rings to keep the bundle small.
 *   2. Slices the city-wide terraces (src/data/terraces-all.json, produced by
 *      build-terraces.ts) down to the coverage box → src/data/terraces.json.
 *
 * Run: npm run fetch-data   (re-run after changing BBOX or to refresh buildings)
 */
import { writeFileSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { BBOX } from '../src/lib/barcelona'
import type { Terrace } from '../src/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../src/data')
const BBOX_STR = BBOX.join(',')

const SIMPLIFY_M = 2.5 // drop footprint vertices closer than this to the previous kept one

const ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]

async function overpass(query: string): Promise<any> {
  let lastErr: unknown
  for (const url of ENDPOINTS) {
    try {
      console.log(`  → ${url}`)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      console.warn(`  ✗ ${(err as Error).message}`)
      lastErr = err
    }
  }
  throw lastErr
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

const round5 = (x: number) => Math.round(x * 1e5) / 1e5
function distM(aLon: number, aLat: number, bLon: number, bLat: number): number {
  const R = 6371000
  const rad = Math.PI / 180
  const x = (bLon - aLon) * rad * Math.cos(((aLat + bLat) / 2) * rad)
  const y = (bLat - aLat) * rad
  return Math.sqrt(x * x + y * y) * R
}

// Round + distance-decimate a footprint ring; returns null if degenerate.
function simplifyRing(geom: any[]): [number, number][] | null {
  const pts = geom.map((g) => [round5(g.lon), round5(g.lat)] as [number, number])
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

async function main() {
  console.log(`Coverage box: ${BBOX_STR}`)

  console.log('Fetching buildings…')
  const raw = await overpass(`
    [out:json][timeout:180];
    ( way["building"](${BBOX_STR}); );
    out geom;`)

  const buildings = (raw.elements ?? [])
    .map((el: any) => {
      if (!el.geometry || el.geometry.length < 4) return null
      const ring = simplifyRing(el.geometry)
      if (!ring) return null
      return { id: `way/${el.id}`, height: estimateHeight(el.tags), ring, c: centroid(ring) }
    })
    .filter(Boolean)
  writeFileSync(resolve(DATA_DIR, 'buildings.json'), JSON.stringify(buildings))
  console.log(`  ✓ ${buildings.length} buildings`)

  console.log('Slicing terraces to coverage box…')
  const all: Terrace[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'terraces-all.json'), 'utf8'))
  const [s, w, n, e] = BBOX
  const slice = all.filter((t) => t.lat >= s && t.lat <= n && t.lon >= w && t.lon <= e)
  writeFileSync(resolve(DATA_DIR, 'terraces.json'), JSON.stringify(slice))
  console.log(`  ✓ ${slice.length} terraces (of ${all.length} city-wide)`)

  const mb = (p: string) => (statSync(resolve(DATA_DIR, p)).size / 1e6).toFixed(2)
  console.log(`\nbuildings.json ${mb('buildings.json')} MB · terraces.json ${mb('terraces.json')} MB`)
}

main().catch((err) => {
  console.error('\nfetch-data failed:', err)
  process.exit(1)
})
