// Runtime shade lookups against the baked timetable (src/data/shade-table.json).
// The heavy sun+building geometry is precomputed offline by scripts/precompute-shade.ts,
// so the app ships NO building footprints and never recomputes shade - it just reads
// this table. Sun altitude (for day/night status + the points bonus) is still derived
// live via SunCalc, which is cheap and needs no buildings.
import shadeTableData from '../data/shade-table.json'
import { getSunPos, shadeBonus } from './sun'
import type { ShadeInfo, ShadeStatus } from '../types'

interface ShadeTable {
  meta: { startMin: number; stepMin: number; nSamples: number; months: number }
  data: Record<string, string>
}

const table = shadeTableData as ShadeTable
const { startMin, stepMin, nSamples } = table.meta

// 64-level quantisation: char index → percent (0..100).
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const LEVELS = ALPHABET.length - 1 // 63
const pctByChar: Record<string, number> = {}
for (let i = 0; i < ALPHABET.length; i++) pctByChar[ALPHABET[i]] = Math.round((i / LEVELS) * 100)

const LOW_SUN_DEG = 10

function sampleAt(id: string, monthIdx: number, sampleIdx: number): number {
  const s = table.data[id]
  if (!s) return 0
  const ch = s[monthIdx * nSamples + sampleIdx]
  return ch === undefined ? 0 : (pctByChar[ch] ?? 0)
}

function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** Shade % for a terrace at the given date+time, interpolated between 30-min samples. */
export function percentAt(id: string, date: Date): number {
  const m = date.getMonth()
  const x = (minutesOf(date) - startMin) / stepMin
  if (x <= 0) return sampleAt(id, m, 0)
  if (x >= nSamples - 1) return sampleAt(id, m, nSamples - 1)
  const i = Math.floor(x)
  const frac = x - i
  const a = sampleAt(id, m, i)
  const b = sampleAt(id, m, i + 1)
  return Math.round(a + (b - a) * frac)
}

function statusFor(percent: number, altitudeDeg: number): ShadeStatus {
  if (altitudeDeg <= 0) return 'night'
  if (percent >= 50) return 'shade'
  return altitudeDeg < LOW_SUN_DEG ? 'low-sun' : 'sun'
}

/** Combined {percent,status} for a terrace - drop-in for the old computeShade info entry. */
export function infoAt(id: string, date: Date): ShadeInfo {
  const altitudeDeg = getSunPos(date).altitudeDeg
  if (altitudeDeg <= 0) return { status: 'night', percent: 100 }
  const percent = percentAt(id, date)
  return { status: statusFor(percent, altitudeDeg), percent }
}

/** Points scarcity bonus (1×–3×) from the sun's altitude - no buildings needed. */
export function bonusFor(date: Date): number {
  return shadeBonus(getSunPos(date).altitudeDeg)
}

function fmt(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** Next clock time today when the terrace drops out of shade (<50%), or null. */
export function shadedUntil(id: string, date: Date): string | null {
  const cur = infoAt(id, date)
  if (cur.status === 'night' || cur.percent < 50) return null
  const m = date.getMonth()
  const now = minutesOf(date)
  for (let i = 0; i < nSamples; i++) {
    const t = startMin + i * stepMin
    if (t <= now) continue
    if (sampleAt(id, m, i) < 50) return fmt(t)
  }
  return null
}

export function pinColors(percent: number): { bg: string; fg: string } {
  // Intuitive traffic-light scale (matches the Legend): more shade = greener.
  if (percent >= 65) return { bg: '#16a34a', fg: '#FBF1DB' } // green - shaded
  if (percent >= 40) return { bg: '#FFC800', fg: '#1A1408' } // yellow - partial
  return { bg: '#F4432B', fg: '#FBF1DB' } // red - full sun
}
