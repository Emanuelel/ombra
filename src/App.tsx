import { useMemo, useRef, useState, useDeferredValue, useEffect, useCallback } from 'react'
import type { Bounds, Camera } from './components/MapView'
import TabBar from './ui/TabBar'
import Welcome from './screens/Welcome'
import HowItWorks from './screens/HowItWorks'
import Handle from './screens/Handle'
import Perms from './screens/Perms'
import Install from './screens/Install'
import { shouldOfferInstall } from './lib/platform'
import MapScreen from './screens/MapScreen'
import Terrace from './screens/Terrace'
import Checking from './screens/Checking'
import Celebrate from './screens/Celebrate'
import Boards from './screens/Boards'
import Profile from './screens/Profile'
import PublicProfile from './screens/PublicProfile'
import { infoAt, bonusFor, shadedUntil } from './lib/shadeTable'
import {
  fetchSession,
  finishProfile,
  googleAuthUrl,
  logout as apiLogout,
  postCheckIn as apiCheckIn,
} from './lib/api'
import { distM } from './lib/sun'
import { CENTER } from './lib/barcelona'
import { BASE_POINTS } from './lib/scoring'
import terracesData from './data/terraces-all.json'
import type { ShadeInfo, Terrace as TerraceT } from './types'

// Every licensed terrace in Barcelona. Shade comes from the baked timetable
// (src/lib/shadeTable.ts) — no building geometry ships to the client.
const terraces = terracesData as TerraceT[]

type Screen =
  | 'welcome'
  | 'howto'
  | 'handle'
  | 'perms'
  | 'install'
  | 'map'
  | 'terrace'
  | 'checking'
  | 'celebrate'
  | 'boards'
  | 'profile'
  | 'user'

const TAB_SCREENS: Screen[] = ['map', 'boards', 'profile']

function nowMinutes(): number {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}
function todayAt(minutes: number): Date {
  const d = new Date()
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return d
}

// Suggest a handle from a Google email's local part (kept within the handle rules).
function suggestHandle(email: string): string {
  const base = (email.split('@')[0] ?? '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20)
  return base.length >= 2 ? base : 'hunter'
}
const GOOGLE_ERR: Record<string, string> = {
  google_setup: 'Google sign-in isn’t set up yet.',
  state: 'Google sign-in expired — try again.',
  token: 'Google sign-in failed — try again.',
  userinfo: 'Couldn’t read your Google profile — try again.',
  server: 'Something went wrong — try again.',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [handle, setHandle] = useState('martina')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [minutes, setMinutes] = useState(nowMinutes)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [winPoints, setWinPoints] = useState(84)
  const [wonCrown, setWonCrown] = useState(true)
  const [stolen, setStolen] = useState(false)
  const [checkInError, setCheckInError] = useState<string | null>(null)
  const [viewUser, setViewUser] = useState<string | null>(null)
  const [userReturn, setUserReturn] = useState<Screen>('boards')
  const [terraceReturn, setTerraceReturn] = useState<Screen>('map')
  const timer = useRef<ReturnType<typeof setTimeout>>()
  // Remember the map camera so opening/closing a terrace (which unmounts the map)
  // returns you to where you were panning, not back to your location.
  const mapCamera = useRef<Camera | null>(null)

  const [view, setView] = useState<Bounds>(() => ({
    s: CENTER[0] - 0.006,
    w: CENTER[1] - 0.008,
    n: CENTER[0] + 0.006,
    e: CENTER[1] + 0.008,
  }))
  const deferred = useDeferredValue(minutes)

  // Shade is computed only for terraces in view — keeps it fast and scales to any
  // number of terraces. Panning recomputes for the new neighbourhood.
  const visibleTerraces = useMemo(() => {
    const pad = 0.0015
    const list = terraces.filter(
      (t) => t.lat >= view.s - pad && t.lat <= view.n + pad && t.lon >= view.w - pad && t.lon <= view.e + pad,
    )
    return list.length > 500 ? list.slice(0, 500) : list
  }, [view])

  const shade = useMemo(() => {
    const date = todayAt(deferred)
    const info: Record<string, ShadeInfo> = {}
    for (const t of visibleTerraces) info[t.id] = infoAt(t.id, date)
    return { info, bonus: bonusFor(date) }
  }, [deferred, visibleTerraces])

  const onView = useCallback((b: Bounds) => {
    const r = (x: number) => Math.round(x * 1000) / 1000
    setView((prev) => {
      const nv = { s: r(b.s), w: r(b.w), n: r(b.n), e: r(b.e) }
      return nv.s === prev.s && nv.w === prev.w && nv.n === prev.n && nv.e === prev.e ? prev : nv
    })
  }, [])

  // Suggested spot = shadiest in view; ties broken by nearest to the viewport centre
  // (this is effectively "shadiest near you" as the user pans).
  const featured = useMemo(() => {
    const cLat = (view.s + view.n) / 2
    const cLon = (view.w + view.e) / 2
    let best: TerraceT | null = null
    let bestPct = -1
    let bestDist = Infinity
    for (const t of visibleTerraces) {
      const p = shade.info[t.id]?.percent ?? 0
      const d = distM(t.lon, t.lat, cLon, cLat)
      if (p > bestPct || (p === bestPct && d < bestDist)) {
        bestPct = p
        bestDist = d
        best = t
      }
    }
    return best
  }, [shade, visibleTerraces, view])

  const selected = useMemo(
    () => terraces.find((t) => t.id === selectedId) ?? featured,
    [selectedId, featured],
  )

  const selectedPct = useMemo(
    () => (selected ? (shade.info[selected.id]?.percent ?? infoAt(selected.id, todayAt(deferred)).percent) : 0),
    [selected, shade, deferred],
  )
  const selectedUntil = useMemo(
    () => (selected ? shadedUntil(selected.id, todayAt(deferred)) : null),
    [selected, deferred],
  )
  useEffect(() => () => clearTimeout(timer.current), [])

  // Restore a persisted session on load; also handle returning from Google OAuth, where
  // the token (+ needsHandle) or an error arrive in the URL hash.
  useEffect(() => {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
    const hashToken = hash.get('ombra_token')
    const hashErr = hash.get('authError')
    if (hashToken || hashErr) history.replaceState(null, '', location.pathname + location.search)
    if (hashErr) setGoogleError(GOOGLE_ERR[hashErr] ?? 'Google sign-in failed — try again.')
    if (hashToken) localStorage.setItem('ombra_token', hashToken)

    const t = hashToken ?? localStorage.getItem('ombra_token')
    if (!t) {
      setRestoring(false)
      return
    }
    fetchSession(t).then((r) => {
      if (!r) {
        localStorage.removeItem('ombra_token')
        setRestoring(false)
        return
      }
      setToken(t)
      if (r.user) {
        setHandle(r.user.handle)
        setAvatar(r.user.avatarUrl)
        setScreen('map')
      } else if (r.needsHandle) {
        // Fresh Google account — finish by choosing a handle (avatar/handle pre-filled).
        if (r.google?.picture) setAvatar(r.google.picture)
        if (r.google?.email) setHandle(suggestHandle(r.google.email))
        setScreen('handle')
      } else {
        localStorage.removeItem('ombra_token')
      }
      setRestoring(false)
    })
  }, [])

  // Show a branded "connecting" screen before navigating away, so the Welcome screen
  // doesn't reflow under the browser chrome mid-redirect.
  function startGoogle() {
    setConnectingGoogle(true)
    setTimeout(() => {
      window.location.href = googleAuthUrl()
    }, 60)
  }

  function openTerrace(id: string, from: Screen = 'map') {
    setSelectedId(id)
    setCheckInError(null)
    setTerraceReturn(from)
    setScreen('terrace')
  }

  function openUser(handle: string, from: Screen) {
    setViewUser(handle)
    setUserReturn(from)
    setScreen('user')
  }

  // Finish sign-in: the Google session already exists (everyone authenticates with
  // Google) — the handle step just creates the profile for that account.
  async function doSignup() {
    if (!token) {
      setAuthError('Sign in with Google to continue')
      return
    }
    setBusy(true)
    setAuthError(null)
    const res = await finishProfile(token, handle.toLowerCase(), avatar, null)
    setBusy(false)
    if ('error' in res) {
      setAuthError(res.error === 'handle_taken' ? 'That name is taken — try another' : 'Sign-up failed, try again')
      return
    }
    setHandle(res.user.handle)
    setAvatar(res.user.avatarUrl)
    setScreen('perms')
  }

  async function logout() {
    if (token) apiLogout(token)
    localStorage.removeItem('ombra_token')
    setToken(null)
    setSelectedId(null)
    setAvatar(null)
    setScreen('welcome')
  }

  function startCheckIn() {
    if (!selected) return
    const t = selected
    setCheckInError(null)
    setScreen('checking')
    const started = Date.now()
    void (async () => {
      const result = await doCheckIn(t)
      // hold the "locking you in…" animation for at least a beat
      await new Promise((r) => setTimeout(r, Math.max(0, 1300 - (Date.now() - started))))
      if (result.ok) {
        setWinPoints(result.points)
        setWonCrown(result.youHoldCrown)
        setStolen(result.stolen)
        setScreen('celebrate')
      } else {
        setCheckInError(result.message)
        setScreen('terrace')
      }
    })()
  }

  // Real, strict check-in: needs a genuine GPS fix (no terrace-coord fallback) and
  // only "succeeds" if the server accepts it (proximity/cooldown/anti-gaming all pass).
  async function doCheckIn(
    t: TerraceT,
  ): Promise<{ ok: true; points: number; youHoldCrown: boolean; stolen: boolean } | { ok: false; message: string }> {
    if (!token) return { ok: false, message: 'Sign in to check in.' }
    const pos = await new Promise<GeolocationPosition | null>((res) => {
      if (!('geolocation' in navigator)) return res(null)
      navigator.geolocation.getCurrentPosition(res, () => res(null), {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      })
    })
    if (!pos) return { ok: false, message: 'Turn on location — we need your real spot to check in.' }
    const res = await apiCheckIn(token, {
      terraceId: t.id,
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      shadeStatus: shade.info[t.id]?.status ?? infoAt(t.id, todayAt(deferred)).status,
    })
    if (res.error) {
      const msg: Record<string, string> = {
        too_far: "You're too far — get within 25m of the bar to check in.",
        cooldown: 'You already checked in here recently.',
        slow_down: `Slow down — wait ${res.waitMin ?? 'a few'} min between check-ins.`,
        poor_gps: "Couldn't pin your location precisely — try again in the open.",
        impossible_travel: 'That jump was too fast to be real.',
        unauthenticated: 'Session expired — sign in again.',
        terrace_not_found: 'This bar is not in the game yet.',
      }
      return { ok: false, message: msg[res.error] ?? 'Check-in failed — try again.' }
    }
    return {
      ok: true,
      points: res.points ?? Math.max(1, Math.round(BASE_POINTS * shade.bonus)),
      youHoldCrown: res.youHoldCrown ?? true,
      stolen: res.stolenFromSomeone ?? false,
    }
  }

  const selectedName = selected?.name ?? 'this terrace'

  if (restoring)
    return (
      <Shell>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#FF4A31',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 40,
            letterSpacing: '-.04em',
            color: '#17130c',
          }}
        >
          OMBRA
        </div>
      </Shell>
    )

  if (connectingGoogle)
    return (
      <Shell>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#FF4A31',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            color: '#17130c',
            textAlign: 'center',
            padding: 30,
          }}
        >
          <div
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: 40,
              letterSpacing: '-.04em',
              animation: 'ombraFloat 2s ease-in-out infinite',
            }}
          >
            OMBRA
          </div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Connecting to Google…</div>
        </div>
      </Shell>
    )

  // --- Full-bleed overlays ---
  if (screen === 'welcome')
    return (
      <Shell>
        <Welcome onStart={() => setScreen('howto')} error={googleError} />
      </Shell>
    )
  if (screen === 'howto')
    return (
      <Shell>
        <HowItWorks onBack={() => setScreen('welcome')} onNext={startGoogle} />
      </Shell>
    )
  if (screen === 'handle')
    return (
      <Shell>
        <Handle
          handle={handle}
          setHandle={(v) => {
            setHandle(v)
            if (authError) setAuthError(null)
          }}
          avatar={avatar}
          setAvatar={setAvatar}
          busy={busy}
          error={authError}
          onBack={() => setScreen('welcome')}
          onContinue={doSignup}
        />
      </Shell>
    )
  if (screen === 'perms')
    return (
      <Shell>
        <Perms onBack={() => setScreen('handle')} onDone={() => setScreen(shouldOfferInstall() ? 'install' : 'map')} />
      </Shell>
    )
  if (screen === 'install')
    return <Shell><Install onDone={() => setScreen('map')} /></Shell>
  if (screen === 'terrace' && selected)
    return (
      <Shell>
        <Terrace
          terrace={selected}
          percent={selectedPct}
          bonus={shade.bonus}
          until={selectedUntil}
          token={token}
          error={checkInError}
          onBack={() => setScreen(terraceReturn)}
          onCheckIn={startCheckIn}
          onUser={(h) => openUser(h, 'terrace')}
        />
      </Shell>
    )
  if (screen === 'checking') return <Shell><Checking terraceName={selectedName} /></Shell>
  if (screen === 'celebrate')
    return (
      <Shell>
        <Celebrate
          points={winPoints}
          terraceName={selectedName}
          wonCrown={wonCrown}
          stolen={stolen}
          terraceId={selected?.id ?? ''}
          handle={handle}
          token={token}
          promptAlerts={
            typeof Notification !== 'undefined' &&
            Notification.permission === 'default' &&
            !localStorage.getItem('ombra_notif_asked')
          }
          onSeeBoard={() => setScreen('boards')}
          onBackToMap={() => setScreen('map')}
        />
      </Shell>
    )

  if (screen === 'user' && viewUser)
    return (
      <Shell>
        <PublicProfile
          handle={viewUser}
          onBack={() => setScreen(userReturn)}
          onOpenTerrace={(id) => openTerrace(id, 'user')}
        />
      </Shell>
    )

  // --- Tabbed base layer (map / boards / profile) ---
  const activeTab = (TAB_SCREENS.includes(screen) ? screen : 'map') as 'map' | 'boards' | 'profile'
  return (
    <Shell>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#FFF6E4',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'max(10px, env(safe-area-inset-top))',
        }}
      >
        <div className="ombra-scroll" style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
          {screen === 'map' && (
            <MapScreen
              terraces={visibleTerraces}
              info={shade.info}
              minutes={minutes}
              setMinutes={(m) => setMinutes(m)}
              onSelect={(id) => openTerrace(id)}
              onView={onView}
              initialCamera={mapCamera.current}
              onCamera={(c) => {
                mapCamera.current = c
              }}
            />
          )}
          {screen === 'boards' && (
            <Boards
              handle={handle}
              avatar={avatar}
              token={token}
              onUser={(h) => openUser(h, 'boards')}
              onOpenTerrace={(id) => openTerrace(id, 'boards')}
            />
          )}
          {screen === 'profile' && (
            <Profile
              handle={handle}
              avatar={avatar}
              token={token}
              onAvatarChange={setAvatar}
              onOpenTerrace={(id) => openTerrace(id, 'profile')}
              onLogout={logout}
            />
          )}
        </div>
        <TabBar
          active={activeTab}
          onMap={() => setScreen('map')}
          onBoards={() => setScreen('boards')}
          onProfile={() => setScreen('profile')}
        />
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="app-root">{children}</div>
}
