import { btnBlock, C, display, mono } from '../ui/tokens'

export default function Perms({
  onBack,
  onDone,
}: {
  onBack: () => void
  onDone: () => void
}) {
  function allow() {
    if ('geolocation' in navigator) {
      // Trigger the real permission prompt; proceed regardless of the outcome.
      navigator.geolocation.getCurrentPosition(
        () => onDone(),
        () => onDone(),
        { enableHighAccuracy: true, timeout: 8000 },
      )
    } else {
      onDone()
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.sun,
        padding: '56px 30px 34px',
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
      <div style={mono(12, { letterSpacing: '.22em', textTransform: 'uppercase', marginTop: 14 })}>
        Step 2 of 2
      </div>

      <div style={{ margin: 'auto', textAlign: 'center' }}>
        <div
          style={{
            width: 110,
            height: 110,
            margin: '0 auto',
            borderRadius: '50%',
            background: C.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              width: 110,
              height: 110,
              borderRadius: '50%',
              background: 'rgba(23,19,12,.35)',
              animation: 'ombraPing 2s ease-out infinite',
            }}
          />
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: C.tomato,
              border: `4px solid ${C.sun}`,
            }}
          />
        </div>
        <div style={display(32, { lineHeight: 0.98, marginTop: 26 })}>
          Turn on
          <br />
          location
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.45, marginTop: 12, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
          We check you're <em>actually</em> at the terrace — no crowns from your couch. You must be
          within 50m to check in.
        </div>
      </div>

      <button onClick={allow} style={{ ...btnBlock, background: C.ink, color: C.cream }}>
        Allow location
      </button>
      <button
        onClick={onDone}
        style={{
          background: 'none',
          border: 'none',
          width: '100%',
          marginTop: 8,
          ...mono(12, { color: '#5f4410' }),
          cursor: 'pointer',
        }}
      >
        not now
      </button>
    </div>
  )
}
