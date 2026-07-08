import { C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import MapView, { type Bounds } from '../components/MapView'
import type { ShadeInfo, Terrace } from '../types'

function fmt(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export default function MapScreen({
  terraces,
  info,
  minutes,
  setMinutes,
  featured,
  featuredPercent,
  featuredUntil,
  onSelect,
  onView,
}: {
  terraces: Terrace[]
  info: Record<string, ShadeInfo>
  minutes: number
  setMinutes: (m: number) => void
  featured: Terrace | null
  featuredPercent: number
  featuredUntil: string | null
  onSelect: (id: string) => void
  onView: (b: Bounds) => void
}) {
  return (
    <div
      style={{
        animation: 'ombraSlideIn .3s both',
        padding: '4px 18px 18px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={display(34, { lineHeight: 0.85 })}>OMBRA</div>
        <div style={mono(11, { color: C.muted, paddingBottom: 5 })}>shade near you</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div
          style={{
            background: C.ink,
            color: C.sun,
            borderRadius: 12,
            padding: '9px 13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <span>◐ SHADE AT {fmt(minutes)}</span>
          <span style={mono(11, { color: C.cream })}>drag time →</span>
        </div>
        <input
          className="time-slider"
          type="range"
          min={0}
          max={1439}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          aria-label="Time of day"
          style={{
            background: `linear-gradient(90deg, ${C.sun} ${(minutes / 1439) * 100}%, ${C.mapBase} ${(minutes / 1439) * 100}%)`,
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 340,
          marginTop: 12,
          border: `2px solid ${C.ink}`,
          borderRadius: 18,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <MapView terraces={terraces} info={info} onSelect={onSelect} onView={onView} />
      </div>

      {featured && (
        <button
          onClick={() => onSelect(featured.id)}
          style={{
            marginTop: 12,
            width: '100%',
            textAlign: 'left',
            background: C.ink,
            color: C.cream,
            border: 'none',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
          }}
        >
          <Crown size={22} fill={C.sun} />
          <span style={{ flex: 1, lineHeight: 1.25 }}>
            <span style={mono(9.5, { color: C.sun, letterSpacing: '.14em', textTransform: 'uppercase' })}>
              ◑ shadiest right now
            </span>
            <span style={{ display: 'block', fontWeight: 800, fontSize: 15 }}>{featured.name}</span>
            <span style={{ display: 'block', fontSize: 12, color: C.muted3 }}>
              {featuredPercent}% shade{featuredUntil ? ` till ${featuredUntil}` : ''} · tap to check in
            </span>
          </span>
          <span style={display(22, { color: C.sun })}>→</span>
        </button>
      )}
    </div>
  )
}
