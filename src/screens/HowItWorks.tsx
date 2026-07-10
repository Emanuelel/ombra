import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { btnBlock, C, display, mono } from '../ui/tokens'
import CrownBadge from '../ui/CrownBadge'
import GoogleG from '../ui/GoogleG'

// The exact app pin (same markup as MapView's pctIcon), non-interactive for the demo.
function pin(pct: number, bg: string, fg: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid #17130c;box-shadow:2px 2px 0 #17130c;display:flex;align-items:center;justify-content:center;font-family:'Archivo',sans-serif;font-weight:800;font-size:10px;color:${fg};">${pct}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const DEMO_CENTER: [number, number] = [41.4008, 2.165]
const DEMO_PINS: { at: [number, number]; pct: number; bg: string; fg: string }[] = [
  { at: [41.4014, 2.164], pct: 80, bg: C.sun, fg: C.ink },
  { at: [41.4002, 2.1663], pct: 60, bg: C.cream, fg: C.ink },
  { at: [41.4017, 2.1666], pct: 0, bg: C.tomato, fg: C.cream },
  { at: [41.3998, 2.1637], pct: 100, bg: C.sun, fg: C.ink },
  { at: [41.4011, 2.1672], pct: 0, bg: C.tomato, fg: C.cream },
  { at: [41.4, 2.1655], pct: 100, bg: C.sun, fg: C.ink },
]

// Confetti for the crown beat - the same ombraConfetti keyframe the win screen uses.
const CONF = [
  { left: '10%', w: 10, h: 16, bg: C.tomato, round: false, dur: 1.7, delay: 0 },
  { left: '24%', w: 12, h: 12, bg: C.ink, round: true, dur: 2.0, delay: 0.12 },
  { left: '38%', w: 9, h: 18, bg: C.cream, round: false, dur: 1.6, delay: 0.05 },
  { left: '52%', w: 12, h: 12, bg: C.tomato, round: false, dur: 2.1, delay: 0.28 },
  { left: '64%', w: 10, h: 16, bg: C.ink, round: false, dur: 1.8, delay: 0.1 },
  { left: '78%', w: 12, h: 12, bg: C.tomato, round: true, dur: 1.9, delay: 0.2 },
  { left: '90%', w: 9, h: 18, bg: C.cream, round: false, dur: 2.2, delay: 0.08 },
]

// Cumulative beat end-times (ms): see shade → tap → check in → crown, then loop.
const PHASE_ENDS = [2000, 3400, 4900, 8200]
const PERIOD = PHASE_ENDS[PHASE_ENDS.length - 1]

export default function HowItWorks({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { t } = useTranslation()
  const STEPS = t('howItWorks.steps', { returnObjects: true }) as string[]
  const [phase, setPhase] = useState(0)
  const [cycle, setCycle] = useState(0)

  // Time-based beat clock: phase/cycle are derived from elapsed time, so a
  // duplicated effect (StrictMode / Fast Refresh) just recomputes the same
  // values - no racing timer chains.
  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = () => {
      const elapsed = performance.now() - start
      const t = elapsed % PERIOD
      let p = 3
      for (let i = 0; i < PHASE_ENDS.length; i++) {
        if (t < PHASE_ENDS[i]) {
          p = i
          break
        }
      }
      setPhase(p)
      setCycle(Math.floor(elapsed / PERIOD))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.cream,
        padding: '52px 22px 28px',
        display: 'flex',
        flexDirection: 'column',
        color: C.ink,
      }}
    >
      <button
        onClick={onBack}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', ...display(22), cursor: 'pointer' }}
      >
        ←
      </button>

      <div style={mono(11, { letterSpacing: '.22em', textTransform: 'uppercase', color: C.muted, marginTop: 10 })}>
        {t('howItWorks.label')}
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {STEPS.map((s, i) => {
          const active = phase === i
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: active ? 1 : 0.34,
                transition: 'opacity .35s ease',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: C.sun,
                  border: `2px solid ${C.ink}`,
                  ...display(11),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{s}</span>
            </div>
          )
        })}
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 220,
          marginTop: 14,
          border: `2.5px solid ${C.ink}`,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        <MapContainer
          center={DEMO_CENTER}
          zoom={16}
          dragging={false}
          zoomControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
          attributionControl={false}
          style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          <Marker position={DEMO_CENTER} icon={pin(100, C.sun, C.ink)} interactive={false} />
          {DEMO_PINS.map((p, i) => (
            <Marker key={i} position={p.at} icon={pin(p.pct, p.bg, p.fg)} interactive={false} />
          ))}
        </MapContainer>

        {/* Beat overlays, centred on the middle pin. z-index sits above Leaflet's
            panes (tile 200 … popup 700) so the celebration paints over the map. */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 800 }}>
          {/* tap ripple */}
          {phase === 1 && (
            <span
              key={`tap-${cycle}`}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 46,
                height: 46,
                marginLeft: -23,
                marginTop: -23,
                borderRadius: '50%',
                border: `3px solid ${C.ink}`,
                animation: 'ombraPing 1.3s ease-out',
              }}
            />
          )}

          {/* check-in pulse */}
          {phase === 2 && (
            <span
              key={`pulse-${cycle}`}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 46,
                height: 46,
                marginLeft: -23,
                marginTop: -23,
                borderRadius: '50%',
                border: `4px solid ${C.green}`,
                animation: 'ombraPing 1.4s ease-out',
              }}
            />
          )}

          {/* crown win - the real celebration (spinning ray + popped crown + confetti + points) */}
          {phase === 3 && (
            <div
              key={`crown-${cycle}`}
              style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {CONF.map((c, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: c.left,
                    top: 0,
                    width: c.w,
                    height: c.h,
                    background: c.bg,
                    borderRadius: c.round ? '50%' : 0,
                    animation: `ombraConfetti ${c.dur}s ease-in ${c.delay}s forwards`,
                  }}
                />
              ))}
              <CrownBadge size={120} />
              <div
                style={{
                  marginTop: 18,
                  background: C.ink,
                  color: C.sun,
                  ...display(24),
                  borderRadius: 12,
                  padding: '7px 18px',
                  animation: 'ombraFadeUp .5s .35s both',
                }}
              >
                +72 PTS
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onNext}
        style={{
          ...btnBlock,
          marginTop: 14,
          background: C.cream,
          color: C.ink,
          border: `2.5px solid ${C.ink}`,
          boxShadow: `5px 5px 0 ${C.ink}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          fontSize: 16,
          textTransform: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <GoogleG size={20} />
        {t('howItWorks.continueGoogle')}
      </button>
    </div>
  )
}
