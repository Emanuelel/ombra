import {
  point,
  polygon,
  booleanPointInPolygon,
  transformTranslate,
  convex,
  featureCollection,
} from '@turf/turf'
import type { Feature, Polygon } from 'geojson'
import type { Building, ShadeInfo, ShadeStatus, Terrace } from '../types'
import { getSunPos, shadeBonus, distM, type SunPos } from './sun'
import type { BuildingIndex } from './buildingIndex'

// NOTE: this module (and its @turf/rbush deps) is BUILD-TIME ONLY — used by
// scripts/precompute-shade.ts to bake src/data/shade-table.json. The app reads the
// baked table via src/lib/shadeTable.ts and never imports this file at runtime.
const MAX_SHADOW_M = 140 // cap: beyond this the flat-shadow approximation is unreliable
const QUERY_M = MAX_SHADOW_M + 30 // radius of the building lookup around each terrace
const LOW_SUN_DEG = 10
const SAMPLE_RADIUS_M = 6

export interface ShadeResult {
  info: Record<string, ShadeInfo>
  sun: SunPos
  bonus: number
}

function closeRing(ring: [number, number][]): [number, number][] {
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) return [...ring, first]
  return ring
}

// 5 sample points: centre + 4 cardinals across the terrace's seating area.
function samplePoints(lat: number, lon: number): [number, number][] {
  const dLat = SAMPLE_RADIUS_M / 111320
  const dLon = SAMPLE_RADIUS_M / (111320 * Math.cos((lat * Math.PI) / 180))
  return [
    [lon, lat],
    [lon, lat + dLat],
    [lon, lat - dLat],
    [lon + dLon, lat],
    [lon - dLon, lat],
  ]
}

interface SunCtx {
  sun: SunPos
  shadowLen: (b: Building) => number
  hullFor: (b: Building) => Feature<Polygon> | null
}

function buildCtx(date: Date): SunCtx {
  const sun = getSunPos(date)
  const tanAlt = Math.tan((sun.altitudeDeg * Math.PI) / 180)
  const bearing = ((sun.azimuthDeg % 360) + 360) % 360
  const cache = new Map<string, Feature<Polygon> | null>()
  const shadowLen = (b: Building) => Math.min(b.height / tanAlt, MAX_SHADOW_M)
  const hullFor = (b: Building) => {
    const cached = cache.get(b.id)
    if (cached !== undefined) return cached
    let hull: Feature<Polygon> | null = null
    try {
      if (b.ring.length >= 3) {
        const foot = polygon([closeRing(b.ring)])
        const moved = transformTranslate(foot, shadowLen(b) / 1000, bearing)
        hull = (convex(featureCollection([foot, moved])) as Feature<Polygon>) ?? null
      }
    } catch {
      hull = null
    }
    cache.set(b.id, hull)
    return hull
  }
  return { sun, shadowLen, hullFor }
}

function percentForTerrace(ctx: SunCtx, t: Terrace, index: BuildingIndex): number {
  const candidates = index
    .nearby(t.lat, t.lon, QUERY_M)
    .filter((b) => distM(t.lon, t.lat, b.c[0], b.c[1]) <= ctx.shadowLen(b) + 40)
  const samples = samplePoints(t.lat, t.lon)
  let shaded = 0
  for (const [lon, lat] of samples) {
    const pt = point([lon, lat])
    for (const b of candidates) {
      const hull = ctx.hullFor(b)
      if (hull && booleanPointInPolygon(pt, hull)) {
        shaded++
        break
      }
    }
  }
  return Math.round((shaded / samples.length) * 100)
}

function statusFor(percent: number, altitudeDeg: number): ShadeStatus {
  if (altitudeDeg <= 0) return 'night'
  if (percent >= 50) return 'shade'
  return altitudeDeg < LOW_SUN_DEG ? 'low-sun' : 'sun'
}

export function computeShade(date: Date, terraces: Terrace[], index: BuildingIndex): ShadeResult {
  const ctx = buildCtx(date)
  const bonus = shadeBonus(ctx.sun.altitudeDeg)
  const info: Record<string, ShadeInfo> = {}

  if (ctx.sun.altitudeDeg <= 0) {
    for (const t of terraces) info[t.id] = { status: 'night', percent: 100 }
    return { info, sun: ctx.sun, bonus }
  }

  for (const t of terraces) {
    const percent = percentForTerrace(ctx, t, index)
    info[t.id] = { status: statusFor(percent, ctx.sun.altitudeDeg), percent }
  }
  return { info, sun: ctx.sun, bonus }
}

export function terracePercentAt(date: Date, t: Terrace, index: BuildingIndex): number {
  const ctx = buildCtx(date)
  if (ctx.sun.altitudeDeg <= 0) return 100
  return percentForTerrace(ctx, t, index)
}

export function shadedUntil(from: Date, t: Terrace, index: BuildingIndex): string | null {
  if (terracePercentAt(from, t, index) < 50) return null
  const step = new Date(from)
  for (let i = 0; i < 18; i++) {
    step.setMinutes(step.getMinutes() + 20)
    const sun = getSunPos(step)
    if (sun.altitudeDeg <= 0) return null
    if (terracePercentAt(step, t, index) < 50) {
      return `${String(step.getHours()).padStart(2, '0')}:${String(step.getMinutes()).padStart(2, '0')}`
    }
  }
  return null
}
