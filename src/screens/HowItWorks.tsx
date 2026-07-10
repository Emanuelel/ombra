// i18n-exempt — the animated demo's venue data ("Cal David", "@solbandit", "+105", "1 · 7d")
// is illustrative mock content, not translatable UI copy. The real strings (beat titles, the
// bar-page shade/CTA labels, the win copy) all go through t().
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import CrownBadge from '../ui/CrownBadge'
import GoogleG from '../ui/GoogleG'

// The exact app pin (same markup as MapView's pctIcon), non-interactive for the demo.
function pin(pct: number, bg: string, fg: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid ${C.ink};box-shadow:2px 2px 0 ${C.ink};display:flex;align-items:center;justify-content:center;font-family:'Archivo',sans-serif;font-weight:800;font-size:10px;color:${fg};">${pct}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const DEMO_CENTER: [number, number] = [41.4008, 2.165]
const DEMO_PINS: { at: [number, number]; pct: number; bg: string; fg: string }[] = [
  { at: [41.4014, 2.164], pct: 80, bg: C.sun, fg: C.ink },
  { at: [41.4002, 2.1663], pct: 60, bg: '#FBF3E0', fg: C.ink },
  { at: [41.4017, 2.1666], pct: 0, bg: C.tomato, fg: C.cream },
  { at: [41.3998, 2.1637], pct: 100, bg: C.sun, fg: C.ink },
  { at: [41.4011, 2.1672], pct: 0, bg: C.tomato, fg: C.cream },
  { at: [41.4, 2.1655], pct: 100, bg: C.sun, fg: C.ink },
  { at: [41.4019, 2.1643], pct: 100, bg: C.sun, fg: C.ink },
  { at: [41.4005, 2.1668], pct: 40, bg: '#FBF3E0', fg: C.ink },
  { at: [41.3995, 2.1659], pct: 0, bg: C.tomato, fg: C.cream },
  { at: [41.4022, 2.1656], pct: 70, bg: C.sun, fg: C.ink },
  { at: [41.3992, 2.1648], pct: 60, bg: '#FBF3E0', fg: C.ink },
  { at: [41.401, 2.1636], pct: 100, bg: C.sun, fg: C.ink },
  { at: [41.3999, 2.1646], pct: 90, bg: C.sun, fg: C.ink }, // the bar the finger taps (near "you")
]

// Confetti for the crown beat — the same ombraConfetti keyframe the win screen uses.
const CONF = [
  { left: '14%', w: 8, h: 14, bg: C.tomato, round: false, dur: 1.6, delay: 0 },
  { left: '34%', w: 10, h: 10, bg: C.ink, round: true, dur: 1.9, delay: 0.2 },
  { left: '56%', w: 8, h: 15, bg: C.cream, round: false, dur: 1.7, delay: 0.1 },
  { left: '78%', w: 10, h: 10, bg: C.tomato, round: false, dur: 2.0, delay: 0.28 },
]

// Four beats, ~2.8s each (loop ~11s) — the 2s spec read too fast.
const BEAT_MS = 2800
const PERIOD = BEAT_MS * 4

// A mobile-demo finger-press circle that taps a target (position via left/top %).
function Finger({ left, top }: { left: string; top: string }) {
  return (
    <span
      style={{
        position: 'absolute',
        left,
        top,
        width: 42,
        height: 42,
        borderRadius: '50%',
        background: 'rgba(26,20,8,.18)',
        border: '2.5px solid rgba(26,20,8,.55)',
        boxShadow: 'inset 0 0 0 5px rgba(255,255,255,.28)',
        zIndex: 4,
        animation: 'htFinger 2s ease-in-out infinite',
      }}
    />
  )
}

// The blue "you are here" dot + expanding ping (map beat).
function LocDot() {
  return (
    <>
      <span
        style={{
          position: 'absolute',
          left: '44%',
          top: '54%',
          width: 20,
          height: 20,
          marginLeft: -10,
          marginTop: -10,
          borderRadius: '50%',
          background: 'rgba(41,121,242,.35)',
          animation: 'ombraPing 2.2s ease-out infinite',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: '44%',
          top: '54%',
          width: 20,
          height: 20,
          marginLeft: -10,
          marginTop: -10,
          borderRadius: '50%',
          background: C.blue,
          border: '3px solid #fff',
          boxShadow: '0 2px 6px rgba(0,0,0,.35)',
        }}
      />
    </>
  )
}

function LbAvatar({ initial, bg }: { initial: string; bg: string }) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        flexShrink: 0,
        borderRadius: '50%',
        background: bg,
        color: C.cream,
        border: `2px solid ${C.ink}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...display(13),
      }}
    >
      {initial}
    </div>
  )
}

export default function HowItWorks({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { t } = useTranslation()
  const BEATS = t('howItWorks.beats', { returnObjects: true }) as string[]
  const [beat, setBeat] = useState(0)
  const [cycle, setCycle] = useState(0)

  // Time-based beat clock. Only setState when the value actually changes, so we
  // re-render ~4×/cycle (not every frame) — otherwise the beat/card fade-in
  // animations restart every frame and never become visible.
  useEffect(() => {
    const start = performance.now()
    let raf = 0
    let lastBeat = -1
    let lastCycle = -1
    const tick = () => {
      const elapsed = performance.now() - start
      const b = Math.min(3, Math.floor((elapsed % PERIOD) / BEAT_MS))
      const c = Math.floor(elapsed / PERIOD)
      if (b !== lastBeat) {
        lastBeat = b
        setBeat(b)
      }
      if (c !== lastCycle) {
        lastCycle = c
        setCycle(c)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.cream, display: 'flex', flexDirection: 'column', color: C.ink }}>
      {/* brand red band behind the OS status bar + back */}
      <div style={{ flexShrink: 0, background: C.brand, height: 'max(52px, env(safe-area-inset-top))', display: 'flex', alignItems: 'flex-end' }}>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.cream, padding: '2px 16px 6px', ...display(22) }}
        >
          ←
        </button>
      </div>

      {/* swapping beat title */}
      <div style={{ flexShrink: 0, padding: '12px 20px 8px', textAlign: 'center', minHeight: 48 }}>
        <div key={`bt-${beat}`} style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-.01em', animation: 'ombraFadeUp .4s ease both' }}>
          {BEATS[beat]}
        </div>
      </div>

      {/* content card — a persistent real map, with the bar page / win / leaderboard overlaid per beat */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          margin: '0 14px',
          position: 'relative',
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
          {DEMO_PINS.map((p, i) => (
            <Marker key={i} position={p.at} icon={pin(p.pct, p.bg, p.fg)} interactive={false} />
          ))}
        </MapContainer>

        {/* BEAT 1 · see the shade near you — location dot, recenter, and a finger tapping a nearby bar */}
        {beat === 0 && (
          <div key={`b0-${cycle}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 800, animation: 'ombraFadeUp .4s ease both' }}>
            <LocDot />
            {/* a bar pin right next to you, with the finger pressing it */}
            <div
              style={{
                position: 'absolute',
                left: '54%',
                top: '51%',
                transform: 'translate(-50%,-50%)',
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: C.sun,
                color: C.ink,
                border: `2.5px solid ${C.ink}`,
                boxShadow: '0 3px 4px rgba(0,0,0,.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
                ...display(11),
              }}
            >
              85
            </div>
            <Finger left="54%" top="51%" />
            <div
              style={{
                position: 'absolute',
                right: 12,
                bottom: 12,
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#fff',
                border: `2.5px solid ${C.ink}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 6px rgba(0,0,0,.25)',
              }}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={C.blue} strokeWidth={2}>
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          </div>
        )}

        {/* BEAT 2 · tap a bar — the real bar page, overlaid opaque, finger tapping the check-in CTA */}
        {beat === 1 && (
          <div
            key={`bar-${cycle}`}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 810,
              pointerEvents: 'none',
              background: C.creamCard,
              display: 'flex',
              flexDirection: 'column',
              animation: 'ombraFadeUp .4s ease both',
            }}
          >
            <div style={{ height: 96, flexShrink: 0, position: 'relative', background: 'linear-gradient(135deg,#F2A03C,#DE6E24)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -14, top: 8, opacity: 0.16 }}>
                <Crown size={130} fill={C.ink} />
              </div>
              <div style={{ position: 'relative', padding: '10px 13px', width: '100%' }}>
                <div style={{ ...display(22), color: '#fff', lineHeight: 0.95 }}>Cal David</div>
                <div style={{ fontWeight: 700, fontSize: 11, color: '#FBE8CF', marginTop: 2 }}>
                  el Baix Guinardó · {t('terrace.tablesOutside', { count: 3 })}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, padding: '16px 14px 14px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ ...display(48), lineHeight: 0.78 }}>
                  100<span style={{ fontSize: 22 }}>%</span>
                </div>
                <div style={{ lineHeight: 1.25 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{t('terrace.inShade')}</div>
                  <div style={mono(11, { color: C.muted })}>{t('terrace.shadedAWhile')}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, background: C.sun, border: `2.5px solid ${C.ink}`, borderRadius: 13, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Crown size={18} fill={C.ink} />
                <LbAvatar initial="S" bg="#C77A22" />
                <div style={{ flex: 1, fontWeight: 800, fontSize: 12.5, color: C.blue }}>{t('terrace.rulesThisTerrace', { name: 'solbandit' })}</div>
                <div style={mono(10, { color: '#5f4410' })}>1 · 7d</div>
              </div>
              <div
                style={{
                  position: 'relative',
                  marginTop: 'auto',
                  background: C.tomato,
                  color: '#fff',
                  borderRadius: 14,
                  padding: 13,
                  ...display(13),
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {t('terrace.ctaReady')}
                <span style={{ background: C.sun, color: C.ink, padding: '3px 8px', borderRadius: 8, fontSize: 13 }}>+105</span>
                <Finger left="50%" top="50%" />
              </div>
            </div>
          </div>
        )}

        {/* BEAT 3 · check in & win — the real crown celebration, finger tapping "see the leaderboard" */}
        {beat === 2 && (
          <div
            key={`win-${cycle}`}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 810,
              pointerEvents: 'none',
              background: C.sun,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 18px 14px',
              overflow: 'hidden',
              animation: 'ombraFadeUp .4s ease both',
            }}
          >
            {CONF.map((c, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: c.left,
                  top: -8,
                  width: c.w,
                  height: c.h,
                  background: c.bg,
                  borderRadius: c.round ? '50%' : 0,
                  animation: `ombraConfetti ${c.dur}s ease-in ${c.delay}s forwards`,
                }}
              />
            ))}
            {/* fixed-height wrapper reserves room for the ray so it isn't clipped at the top */}
            <div style={{ height: 128, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CrownBadge size={62} />
            </div>
            <div style={mono(10, { letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 4 })}>{t('celebrate.crownClaimed')}</div>
            <div style={display(26, { lineHeight: 0.9, letterSpacing: '-.03em', textTransform: 'uppercase', textAlign: 'center', marginTop: 8 })}>
              {t('celebrate.youClaimed1')}
              <br />
              {t('celebrate.youClaimed2')}
            </div>
            <div style={{ fontWeight: 800, fontSize: 13, marginTop: 8 }}>{t('celebrate.terraceYours', { terrace: 'Cal David' })}</div>
            <div style={{ marginTop: 8, background: C.ink, color: C.sun, ...display(20), borderRadius: 11, padding: '6px 18px' }}>
              {t('celebrate.ptsCaps', { points: 84 })}
            </div>
            <div style={{ position: 'relative', marginTop: 'auto', width: '100%', background: C.ink, color: C.cream, borderRadius: 13, padding: 12, ...display(13), textTransform: 'uppercase', textAlign: 'center' }}>
              {t('celebrate.seeLeaderboard')}
              <Finger left="50%" top="50%" />
            </div>
          </div>
        )}

        {/* BEAT 4 · hold your crown — the Cal David leaderboard with you on top */}
        {beat === 3 && (
          <div
            key={`lb-${cycle}`}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 810,
              pointerEvents: 'none',
              background: C.creamCard,
              display: 'flex',
              flexDirection: 'column',
              animation: 'ombraFadeUp .4s ease both',
            }}
          >
            <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: `2px solid rgba(26,20,8,.1)` }}>
              <div style={display(22, { lineHeight: 0.9 })}>Cal David</div>
              <div style={mono(10, { color: C.green, paddingBottom: 3 })}>{t('boards.liveTag')}</div>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* #1 — you, holding the crown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.sun, border: `2.5px solid ${C.ink}`, borderRadius: 13, padding: '8px 11px', boxShadow: `0 4px 0 ${C.ink}` }}>
                <span style={{ width: 14, textAlign: 'center', ...display(14) }}>1</span>
                <LbAvatar initial="M" bg="#F0912E" />
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 14 }}>
                    <Crown size={15} fill={C.ink} />
                    {t('boards.you', { handle: 'martina' })}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted2 }}>{t('boards.checkinsWeek', { count: 3 })}</div>
                </div>
                <span style={display(16)}>264</span>
              </div>
              {/* #2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `2px solid rgba(26,20,8,.14)`, borderRadius: 13, padding: '8px 11px' }}>
                <span style={{ width: 14, textAlign: 'center', ...display(14, { color: C.muted }) }}>2</span>
                <LbAvatar initial="S" bg="#C77A22" />
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.blue }}>@solbandit</div>
                  <div style={{ fontSize: 11, color: C.muted2 }}>{t('boards.checkinsWeek', { count: 2 })}</div>
                </div>
                <span style={display(16, { color: C.muted })}>176</span>
              </div>
              {/* #3 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `2px solid rgba(26,20,8,.14)`, borderRadius: 13, padding: '8px 11px' }}>
                <span style={{ width: 14, textAlign: 'center', ...display(14, { color: C.muted }) }}>3</span>
                <LbAvatar initial="L" bg="#9C6B3B" />
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.blue }}>@laia</div>
                  <div style={{ fontSize: 11, color: C.muted2 }}>{t('boards.checkinsWeek', { count: 1 })}</div>
                </div>
                <span style={display(16, { color: C.muted })}>88</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* progress dots */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 16px 10px' }}>
        {BEATS.map((_, i) => (
          <span
            key={i}
            style={{
              width: i === beat ? 22 : 7,
              height: 7,
              borderRadius: 99,
              transition: 'width .3s ease, background .3s ease',
              background: i === beat ? C.tomato : '#D8CFB8',
            }}
          />
        ))}
      </div>

      {/* sign-in, pinned the whole time */}
      <div style={{ flexShrink: 0, padding: '0 16px calc(24px + env(safe-area-inset-bottom))' }}>
        <button
          onClick={onNext}
          style={{
            width: '100%',
            background: C.creamCard,
            color: C.ink,
            border: `3px solid ${C.ink}`,
            borderRadius: 15,
            padding: 14,
            boxShadow: `0 5px 0 ${C.ink}`,
            fontFamily: "'Archivo', sans-serif",
            fontWeight: 900,
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 11,
            whiteSpace: 'nowrap',
          }}
        >
          <GoogleG size={20} />
          {t('howItWorks.continueGoogle')}
        </button>
      </div>
    </div>
  )
}
