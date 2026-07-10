import SunCalc from 'suncalc'
import { CENTER } from './barcelona.js'

export interface SunPos {
  azimuthDeg: number
  altitudeDeg: number
}

export function getSunPos(date: Date, lat = CENTER[0], lon = CENTER[1]): SunPos {
  const p = SunCalc.getPosition(date, lat, lon)
  return {
    azimuthDeg: (p.azimuth * 180) / Math.PI,
    altitudeDeg: (p.altitude * 180) / Math.PI,
  }
}

/** Scarcity-based bonus: high sun => hard to find shade => bigger reward. 1×–3×. */
export function shadeBonus(altitudeDeg: number): number {
  if (altitudeDeg <= 0) return 1
  const t = Math.min(altitudeDeg / 60, 1)
  return Math.round((1 + 2 * t) * 10) / 10
}

/** Equirectangular metres between two lon/lat points - fast, good at city scale. */
export function distM(aLon: number, aLat: number, bLon: number, bLat: number): number {
  const R = 6371000
  const rad = Math.PI / 180
  const x = (bLon - aLon) * rad * Math.cos(((aLat + bLat) / 2) * rad)
  const y = (bLat - aLat) * rad
  return Math.sqrt(x * x + y * y) * R
}
