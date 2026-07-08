import { useEffect, useState } from 'react'
import { btnBlock, C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'

const CONFETTI = [
  { left: '8%', w: 10, h: 16, bg: C.tomato, round: false, dur: 1.7, delay: 0 },
  { left: '20%', w: 12, h: 12, bg: C.ink, round: true, dur: 2.0, delay: 0.15 },
  { left: '33%', w: 9, h: 18, bg: C.cream, round: false, dur: 1.6, delay: 0.05 },
  { left: '46%', w: 12, h: 12, bg: C.tomato, round: false, dur: 2.1, delay: 0.3 },
  { left: '58%', w: 10, h: 16, bg: C.ink, round: false, dur: 1.8, delay: 0.1 },
  { left: '70%', w: 12, h: 12, bg: C.tomato, round: true, dur: 1.9, delay: 0.22 },
  { left: '82%', w: 9, h: 18, bg: C.cream, round: false, dur: 2.2, delay: 0.08 },
  { left: '92%', w: 11, h: 11, bg: C.ink, round: false, dur: 1.7, delay: 0.35 },
  { left: '14%', w: 11, h: 11, bg: C.tomato, round: true, dur: 2.05, delay: 0.42 },
  { left: '64%', w: 10, h: 16, bg: C.cream, round: false, dur: 1.75, delay: 0.5 },
]

export default function Celebrate({
  points,
  terraceName,
  onSeeBoard,
  onBackToMap,
}: {
  points: number
  terraceName: string
  onSeeBoard: () => void
  onBackToMap: () => void
}) {
  const [disp, setDisp] = useState(0)

  useEffect(() => {
    const step = Math.max(1, Math.ceil(points / 21))
    let n = 0
    const id = setInterval(() => {
      n += step
      if (n >= points) {
        n = points
        clearInterval(id)
      }
      setDisp(n)
    }, 24)
    return () => clearInterval(id)
  }, [points])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.sun,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: C.ink,
        padding: '0 30px 34px',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {CONFETTI.map((c, i) => (
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
      </div>

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -30,
            width: 280,
            height: 280,
            background: 'repeating-conic-gradient(#FF4A31 0 11deg, transparent 11deg 24deg)',
            opacity: 0.22,
            borderRadius: '50%',
            animation: 'ombraSpin 10s linear infinite',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: 140,
            height: 140,
            background: C.tomato,
            border: `4px solid ${C.ink}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `8px 8px 0 ${C.ink}`,
            animation: 'ombraPop .6s cubic-bezier(.2,1.3,.4,1) both',
          }}
        >
          <Crown size={74} fill={C.cream} />
        </div>
        <div
          style={mono(12, {
            letterSpacing: '.24em',
            textTransform: 'uppercase',
            marginTop: 22,
            animation: 'ombraFadeUp .5s .2s both',
          })}
        >
          checked in · crown taken
        </div>
        <div
          style={display(50, {
            lineHeight: 0.86,
            letterSpacing: '-.03em',
            textTransform: 'uppercase',
            marginTop: 10,
            animation: 'ombraFadeUp .5s .3s both',
          })}
        >
          You're the
          <br />
          king now
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 10, animation: 'ombraFadeUp .5s .4s both' }}>
          {terraceName} is yours 👑
        </div>
        <div
          style={{
            marginTop: 20,
            background: C.ink,
            color: C.sun,
            ...display(40),
            borderRadius: 16,
            padding: '12px 30px',
            animation: 'ombraFadeUp .5s .45s both',
          }}
        >
          +{disp} PTS
        </div>
      </div>

      <div style={{ marginTop: 'auto', width: '100%', animation: 'ombraFadeUp .5s .55s both' }}>
        <button
          onClick={onSeeBoard}
          style={{ ...btnBlock, borderRadius: 16, padding: 17, fontSize: 17, background: C.ink, color: C.cream }}
        >
          See the leaderboard →
        </button>
        <button
          onClick={onBackToMap}
          style={{ background: 'none', border: 'none', width: '100%', marginTop: 8, ...mono(12, { color: '#5f4410' }), cursor: 'pointer' }}
        >
          back to the map
        </button>
      </div>
    </div>
  )
}
