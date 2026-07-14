// Local screenshot harness: mounts the REAL app screens with mock data so we can
// capture them without a live backend or Google auth. Dev-only.
import { useState, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import 'leaflet/dist/leaflet.css'
import i18n from './i18n'
import './index.css'

import MapScreen from './screens/MapScreen'
import Terrace from './screens/Terrace'
import Checking from './screens/Checking'
import Celebrate from './screens/Celebrate'
import Boards, { type BoardsView } from './screens/Boards'
import Install from './screens/Install'
import TabBar from './ui/TabBar'
import { C } from './ui/tokens'
import { infoAt } from './lib/shadeTable'
import terracesData from './data/terraces-all.json'
import type { Terrace as TerraceT, ShadeInfo } from './types'

// Language: ?lang=en|ca|es (default en)
const lang = new URLSearchParams(location.search).get('lang') || 'en'
i18n.changeLanguage(lang)

// Suppress the first-crown notification/install nudge on the Celebrate screen for a clean capture.
try {
  localStorage.setItem('ombra_notif_asked', '1')
  localStorage.setItem('ombra_install_asked', '1')
} catch {
  /* ignore */
}

// ---- mock geolocation (so the "location blocked" CTA doesn't appear) ----
const MOCK_POS = { coords: { latitude: 41.4036, longitude: 2.1571, accuracy: 8 }, timestamp: Date.now() }
try {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: (p: unknown) => void) => ok(MOCK_POS),
      watchPosition: (ok: (p: unknown) => void) => {
        ok(MOCK_POS)
        return 1
      },
      clearWatch: () => {},
    },
  })
} catch {
  /* ignore */
}

// ---- mock backend (intercept fetch, no real network / auth) ----
// A deliberate MIX: real photos across ages/genders + illustrated avatars, so the
// leaderboard reads like a real, varied user base (not eight identical headshots).
const photo = (n: number) => `https://i.pravatar.cc/200?img=${n}`
const draw = (style: string, seed: string, bg: string) =>
  `https://api.dicebear.com/7.x/${style}/png?seed=${seed}&size=200&radius=50&backgroundColor=${bg}`
const MY_AVATAR = photo(13)
const MOCK_ROWS = [
  { userId: '1', displayName: 'martina', avatarUrl: photo(45), points: 264, checkins: 8 },
  { userId: '2', displayName: 'jordi', avatarUrl: draw('avataaars', 'jordi', 'ffd5dc'), points: 231, checkins: 7 },
  { userId: '3', displayName: 'solbandit', avatarUrl: photo(59), points: 176, checkins: 5 },
  { userId: '4', displayName: 'laia', avatarUrl: draw('notionists', 'laia', 'c0aede'), points: 152, checkins: 5 },
  { userId: '5', displayName: 'pau', avatarUrl: photo(68), points: 133, checkins: 4 },
  { userId: '6', displayName: 'nuria', avatarUrl: draw('personas', 'nuria', 'b6e3f4'), points: 118, checkins: 4 },
  { userId: '7', displayName: 'marc', avatarUrl: photo(51), points: 95, checkins: 3 },
  { userId: '8', displayName: 'emanuele', avatarUrl: MY_AVATAR, points: 42, checkins: 2 },
]
const realFetch = window.fetch.bind(window)
window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const json = (data: unknown) =>
    new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
  if (url.includes('/api/leaderboard')) return json({ rows: MOCK_ROWS })
  if (url.includes('/api/favorites')) return json({ favorites: [] })
  if (url.includes('/api/')) return json({})
  return realFetch(input, init)
}) as typeof window.fetch

const mockTerrace = {
  id: 'bcn/1',
  name: 'La Terrasseta',
  amenity: 'bar',
  lat: 41.4036,
  lon: 2.1571,
  barri: 'Gràcia',
  district: 'Gràcia',
  address: 'Carrer de Verdi, 32',
  tables: 10,
  named: true,
  ambiguous: false,
} as unknown as TerraceT

// terraces around Gràcia for the map, with real shade computed for a summer afternoon
const allTerraces = terracesData as unknown as TerraceT[]
const nearby = allTerraces
  .filter((t) => Math.abs(t.lat - 41.4036) < 0.011 && Math.abs(t.lon - 2.1571) < 0.013)
  .slice(0, 90)
const WHEN = new Date('2026-07-15T17:30:00')
const mapInfo: Record<string, ShadeInfo> = {}
for (const t of nearby) mapInfo[t.id] = infoAt(t.id, WHEN)

const noop = () => {}
const params = new URLSearchParams(location.search)
const screen = params.get('screen') || 'celebrate'

// For the install screen, force the platform user-agent so we can preview each branch:
// ?screen=install&mode=ios-safari | ios-other | android-manual
if (screen === 'install') {
  const UAS: Record<string, string> = {
    'ios-safari':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'ios-other':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  }
  const ua = UAS[params.get('mode') || 'ios-safari']
  if (ua) {
    try {
      Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ua })
    } catch {
      /* ignore */
    }
  }
}

// Replicates App.tsx's tabbed layout: a scroll area with the bottom TabBar.
function TabShell({ active, children }: { active: 'map' | 'boards'; children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: active === 'map' ? '#F84A2C' : '#FBF1DB',
        paddingTop: 10,
      }}
    >
      <div className="ombra-scroll" style={{ flex: 1, position: 'relative', overflowY: 'auto', background: '#FBF1DB' }}>
        {children}
      </div>
      <TabBar active={active} onMap={noop} onBoards={noop} onProfile={noop} />
    </div>
  )
}

function MapDemo() {
  const [minutes, setMinutes] = useState(1050) // 17:30
  return (
    <TabShell active="map">
      <MapScreen
        terraces={nearby}
        info={mapInfo}
        minutes={minutes}
        setMinutes={setMinutes}
        onSelect={noop}
        onView={noop}
        initialCamera={{ center: [41.4036, 2.1571], zoom: 15 }}
        onCamera={noop}
      />
    </TabShell>
  )
}

function BoardsDemo() {
  const [view, setView] = useState<BoardsView | null>({ tab: 'city', barri: null, terrace: null })
  return (
    <TabShell active="boards">
      <Boards
        handle="emanuele"
        avatar={MY_AVATAR}
        token="mock"
        view={view}
        setView={setView}
        onUser={noop}
        onOpenTerrace={noop}
      />
    </TabShell>
  )
}

function Screen() {
  if (screen === 'install') return <Install onDone={noop} />
  if (screen === 'map') return <MapDemo />
  if (screen === 'boards') return <BoardsDemo />
  if (screen === 'terrace')
    return (
      <Terrace
        terrace={mockTerrace}
        percent={95}
        bonus={20}
        until={'19:30'}
        token={'mock'}
        error={null}
        onBack={noop}
        onCheckIn={noop}
        onUser={noop}
      />
    )
  if (screen === 'checking') return <Checking terraceName={'La Terrasseta'} />
  return (
    <Celebrate
      points={120}
      terraceName={'La Terrasseta'}
      wonCrown
      stolen
      terraceId={'bcn/1'}
      handle={'emanuele'}
      token={null}
      onSeeBoard={noop}
      onBackToMap={noop}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <div style={{ position: 'relative', width: 390, height: 844, overflow: 'hidden', background: C.cream }}>
      <Screen />
    </div>
  </I18nextProvider>,
)
