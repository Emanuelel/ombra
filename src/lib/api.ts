// Client-side API calls. In production the app is same-origin with /api; the local
// dev preview points VITE_API_BASE at the deployed functions (see .env.development).
const API = ((import.meta as any).env?.VITE_API_BASE as string | undefined) ?? ''
const VAPID_PUBLIC = ((import.meta as any).env?.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

export interface AuthUser {
  userId: string
  handle: string
  avatarUrl: string | null
  barri: string | null
}

export interface LbRow {
  userId: string
  displayName: string | null
  avatarUrl: string | null
  points: number
  checkins: number
}

export async function checkHandle(handle: string): Promise<boolean> {
  try {
    const r = await fetch(`${API}/api/auth?handle=${encodeURIComponent(handle)}`)
    const j = await r.json()
    return !!j.available
  } catch {
    return true // don't block onboarding if the check is unreachable
  }
}

export async function signup(
  handle: string,
  avatarUrl: string | null,
  barri: string | null,
): Promise<{ token: string; user: AuthUser } | { error: string }> {
  try {
    const r = await fetch(`${API}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signup', handle, avatarUrl, barri }),
    })
    if (r.status === 409) return { error: 'handle_taken' }
    if (!r.ok) return { error: 'signup_failed' }
    return await r.json()
  } catch {
    return { error: 'network' }
  }
}

export async function getSession(token: string): Promise<AuthUser | null> {
  try {
    const r = await fetch(`${API}/api/auth`, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) return null
    const j = await r.json()
    return j.user ?? null
  } catch {
    return null
  }
}

export interface GooglePrefill {
  name: string | null
  picture: string | null
  email: string | null
}
export interface SessionResult {
  user: AuthUser | null
  needsHandle: boolean
  google?: GooglePrefill
}

/** Full session state: a live user, or an authenticated Google user who still needs a handle. */
export async function fetchSession(token: string): Promise<SessionResult | null> {
  try {
    const r = await fetch(`${API}/api/auth`, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) return null
    const j = await r.json()
    return { user: j.user ?? null, needsHandle: !!j.needsHandle, google: j.google ?? undefined }
  } catch {
    return null
  }
}

/** Full-page redirect target that starts the Google OAuth flow. */
export function googleAuthUrl(): string {
  return `${API}/api/auth-google-start`
}

/** Finish a Google sign-in by creating the profile for the already-authenticated user. */
export async function finishProfile(
  token: string,
  handle: string,
  avatarUrl: string | null,
  barri: string | null,
): Promise<{ token: string; user: AuthUser } | { error: string }> {
  try {
    const r = await fetch(`${API}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'create-profile', handle, avatarUrl, barri }),
    })
    if (r.status === 409) return { error: 'handle_taken' }
    if (!r.ok) return { error: 'signup_failed' }
    return await r.json()
  } catch {
    return { error: 'network' }
  }
}

export async function logout(token: string): Promise<void> {
  try {
    await fetch(`${API}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'logout' }),
    })
  } catch {
    /* best effort */
  }
}

export async function postCheckIn(
  token: string,
  body: { terraceId: string; lat: number; lon: number; accuracy?: number; shadeStatus?: string },
): Promise<{ points?: number; youHoldCrown?: boolean; stolenFromSomeone?: boolean; error?: string; waitMin?: number }> {
  try {
    const r = await fetch(`${API}/api/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    return await r.json()
  } catch {
    return { error: 'network' }
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

/** Subscribe this device to web push and register it server-side. Best-effort. */
export async function subscribeToPush(token: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC) return false
    // Don't hang if no service worker is active (e.g. in the Vite dev preview).
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((res) => setTimeout(() => res(null), 3000)),
    ])
    if (!reg) return false
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
      })
    }
    const r = await fetch(`${API}/api/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    })
    return r.ok
  } catch {
    return false
  }
}

export interface UserProfile {
  handle: string
  avatarUrl: string | null
  joinedAt: string
  points7d: number
  pointsAll: number
  checkinsAll: number
  crowns: number
  topBarri: string | null
  recent: { id: string; terrace: string; barri: string | null; points: number; createdAt: string }[]
}

export async function getUser(handle: string): Promise<UserProfile | null> {
  try {
    const r = await fetch(`${API}/api/user?handle=${encodeURIComponent(handle)}`)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export interface Favorite {
  kind: 'terrace' | 'barri'
  ref: string
  label: string
}

export async function getFavorites(token: string): Promise<Favorite[]> {
  try {
    const r = await fetch(`${API}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) return []
    const j = await r.json()
    return j.favorites ?? []
  } catch {
    return []
  }
}

export async function toggleFavorite(
  token: string,
  fav: Favorite & { on: boolean },
): Promise<boolean> {
  try {
    const r = await fetch(`${API}/api/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(fav),
    })
    return r.ok
  } catch {
    return false
  }
}

/** Set/replace the signed-in user's avatar. Returns false on failure (e.g. too large). */
export async function updateAvatar(token: string, avatarUrl: string): Promise<boolean> {
  try {
    const r = await fetch(`${API}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatarUrl }),
    })
    return r.ok
  } catch {
    return false
  }
}

export async function getLeaderboard(scope: string, id?: string, window = 'week'): Promise<LbRow[]> {
  try {
    const q = new URLSearchParams({ scope, window })
    if (id) q.set('id', id)
    const r = await fetch(`${API}/api/leaderboard?${q.toString()}`)
    if (!r.ok) return []
    const j = await r.json()
    return j.rows ?? []
  } catch {
    return []
  }
}
