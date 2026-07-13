// Geolocation permission helpers.
//
// Key browser rule: the native location prompt can only be *triggered* while the
// permission is still undecided ('prompt'). Once the user has 'denied' it, calling
// getCurrentPosition again does NOT re-prompt on iOS Safari or Android Chrome - it
// returns the denied error immediately, and the only recovery is OS/browser settings.
// So the UI must distinguish 'prompt' (tap to re-request) from 'denied' (send to settings).

export type GeoPerm = 'granted' | 'prompt' | 'denied' | 'unknown'

/**
 * Best-effort read of the geolocation permission state. Uses the Permissions API where
 * available (iOS Safari 16+, Android Chrome). Returns 'unknown' when unsupported (older
 * iOS) or on error - callers treat 'unknown' like 'prompt' (worth a tap to request).
 */
export async function getGeoPermission(): Promise<GeoPerm> {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return status.state as GeoPerm
  } catch {
    return 'unknown'
  }
}

/**
 * Request a single position. Must be called from a user gesture so the native prompt
 * appears reliably. Resolves to null on denial/timeout/no-support (never rejects).
 */
export function requestPosition(opts?: PositionOptions): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      opts ?? { enableHighAccuracy: true, timeout: 12000 },
    )
  })
}
