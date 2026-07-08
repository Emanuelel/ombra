import { getSunPos, shadeBonus } from './sun.js'

export const PROXIMITY_M = 25 // must be within this distance of the terrace to check in
// GPS in dense streets ("urban canyon") is often 15–30m off, so we forgive up to this
// much of the device's own reported accuracy to avoid rejecting people who are truly there.
export const ACCURACY_SLACK_M = 30
export const COOLDOWN_MS = 3 * 60 * 60 * 1000 // one scoring check-in per terrace per 3h

// --- anti-gaming ---
export const GLOBAL_COOLDOWN_MS = 20 * 60 * 1000 // min gap between ANY two check-ins by a user
export const MAX_ACCURACY_M = 120 // reject check-ins whose GPS is too imprecise to trust
export const MAX_SPEED_KMH = 45 // reject "teleport" check-ins implying impossible travel speed
export const BASE_POINTS = 35
export const CROWN_WINDOW_DAYS = 7

/**
 * Authoritative, server-side score for a check-in. Points depend only on the sun's
 * altitude (scarcity bonus), never on client-supplied values, so points can't be inflated.
 */
export function scoreCheckIn(date: Date, lat: number, lon: number, streak = 1) {
  const sun = getSunPos(date, lat, lon)
  const bonus = shadeBonus(sun.altitudeDeg)
  const points = Math.max(1, Math.round(BASE_POINTS * bonus * streak))
  return { sunAltitude: sun.altitudeDeg, bonus, points }
}
