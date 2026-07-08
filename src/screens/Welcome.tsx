import { btnBlock, C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'

export default function Welcome({
  onGoogle,
  error,
}: {
  onGoogle: () => void
  error?: string | null
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.tomato,
        padding: '56px 30px 34px',
        display: 'flex',
        flexDirection: 'column',
        color: C.ink,
      }}
    >
      <div style={mono(12, { letterSpacing: '.22em', textTransform: 'uppercase' })}>
        Barcelona · summer '26
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div style={{ animation: 'ombraFloat 3.4s ease-in-out infinite', width: 72 }}>
          <Crown size={72} fill={C.sun} stroke={C.ink} />
        </div>
        <div style={display(74, { lineHeight: 0.82, letterSpacing: '-.04em', marginTop: 14 })}>
          OMBRA
        </div>
        <div style={display(22, { lineHeight: 1.02, marginTop: 16, maxWidth: 280 })}>
          The shade-hunting game for Barcelona terraces.
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.4, color: '#3a1a12', marginTop: 12, maxWidth: 290 }}>
          Find the shadiest terrace. Check in. Hold the crown — until a friend comes to steal it.
        </div>
      </div>
      <button
        onClick={onGoogle}
        style={{
          ...btnBlock,
          marginTop: 34,
          background: C.cream,
          color: C.ink,
          border: `2.5px solid ${C.ink}`,
          boxShadow: `5px 5px 0 ${C.ink}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <span style={display(18, { color: '#4285F4' })}>G</span>
        Continue with Google
      </button>
      {error && <div style={mono(11, { textAlign: 'center', marginTop: 10, color: C.ink })}>{error}</div>}
      <div style={mono(11, { textAlign: 'center', marginTop: 14, color: '#3a1a12' })}>
        the sun is not your friend ☀
      </div>
    </div>
  )
}
