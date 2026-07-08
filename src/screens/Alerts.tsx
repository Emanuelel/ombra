import { btnBlock, C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import { subscribeToPush } from '../lib/api'

export default function Alerts({
  token,
  onBack,
  onDone,
}: {
  token: string | null
  onBack: () => void
  onDone: () => void
}) {
  function allow() {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted' && token) void subscribeToPush(token) // best-effort
        onDone()
      }, () => onDone())
    } else {
      onDone()
    }
  }

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
      <button
        onClick={onBack}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', ...display(22), cursor: 'pointer' }}
      >
        ←
      </button>
      <div style={mono(12, { letterSpacing: '.22em', textTransform: 'uppercase', marginTop: 14 })}>
        Last thing
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
          <Crown size={56} fill={C.sun} />
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: C.sun,
              border: `3px solid ${C.tomato}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...display(16),
            }}
          >
            !
          </span>
        </div>
        <div style={display(32, { lineHeight: 0.98, marginTop: 26 })}>
          Don't lose it
          <br />
          in silence
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.45, marginTop: 12, maxWidth: 285, marginLeft: 'auto', marginRight: 'auto', color: '#3a1a12' }}>
          Get a ping the moment a friend steals one of your crowns — so you can race back and take
          it right off them.
        </div>
      </div>

      <button onClick={allow} style={{ ...btnBlock, background: C.ink, color: C.cream }}>
        Allow notifications
      </button>
      <button
        onClick={onDone}
        style={{ background: 'none', border: 'none', width: '100%', marginTop: 8, ...mono(12, { color: '#5f1c10' }), cursor: 'pointer' }}
      >
        maybe later
      </button>
    </div>
  )
}
