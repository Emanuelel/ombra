import { btnBlock, C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import { installMode, promptInstall } from '../lib/platform'

function AppIcon() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 14,
          background: C.tomato,
          border: `3px solid ${C.sun}`,
          boxShadow: '0 4px 10px -3px rgba(0,0,0,.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'ombraPop .6s cubic-bezier(.2,1.3,.4,1) both',
        }}
      >
        <Crown size={30} fill={C.cream} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700 }}>Ombra</span>
    </div>
  )
}

function ShareGlyph() {
  return (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 10,
        background: C.sun,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="20" height="22" viewBox="0 0 24 26" fill="none" stroke="#17130c" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v13" />
        <path d="M8 7l4-4 4 4" />
        <path d="M6 12H4v12h16V12h-2" />
      </svg>
    </div>
  )
}

export default function Install({ onDone }: { onDone: () => void }) {
  const mode = installMode()

  async function androidInstall() {
    await promptInstall()
    onDone()
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.cream,
        padding: '56px 30px 34px',
        display: 'flex',
        flexDirection: 'column',
        color: C.ink,
      }}
    >
      <div style={mono(12, { letterSpacing: '.22em', textTransform: 'uppercase', color: C.muted })}>
        One last thing
      </div>
      <div style={display(34, { lineHeight: 0.98, marginTop: 8 })}>
        Give the crown
        <br />a home screen
      </div>

      {/* home-screen mock */}
      <div
        style={{
          marginTop: 24,
          background: '#EFE6CF',
          border: `2.5px solid ${C.ink}`,
          borderRadius: 20,
          padding: '18px 16px 14px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 54px)', justifyContent: 'center', gap: 14 }}>
          {Array.from({ length: 8 }).map((_, i) =>
            i === 1 ? (
              <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
                <AppIcon />
              </div>
            ) : (
              <div key={i} style={{ width: 54, height: 54, borderRadius: 14, background: '#D9C89E' }} />
            ),
          )}
        </div>
      </div>

      {/* instruction card */}
      <div
        style={{
          marginTop: 18,
          background: C.ink,
          color: C.cream,
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {mode === 'ios' && <ShareGlyph />}
        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.35 }}>
          {mode === 'ios' ? (
            <>
              Tap <span style={{ color: C.sun }}>Share</span>, then{' '}
              <span style={{ color: C.sun }}>“Add to Home Screen.”</span>
            </>
          ) : mode === 'android-prompt' ? (
            <>
              Tap the button below — <span style={{ color: C.sun }}>Ombra installs in a tap.</span>
            </>
          ) : (
            <>
              Tap <span style={{ color: C.sun }}>⋮</span>, then{' '}
              <span style={{ color: C.sun }}>“Add to Home screen.”</span>
            </>
          )}
        </div>
      </div>

      <div style={mono(12, { textAlign: 'center', color: C.muted, marginTop: 14 })}>
        no app store · no download · it just shows up
      </div>

      {mode === 'android-prompt' ? (
        <button
          onClick={androidInstall}
          style={{ ...btnBlock, marginTop: 'auto', background: C.tomato, color: C.cream, border: `2.5px solid ${C.ink}`, boxShadow: `5px 5px 0 ${C.ink}` }}
        >
          Add to home screen
        </button>
      ) : (
        <button
          onClick={onDone}
          style={{ ...btnBlock, marginTop: 'auto', background: C.tomato, color: C.cream, border: `2.5px solid ${C.ink}`, boxShadow: `5px 5px 0 ${C.ink}` }}
        >
          Done · I added it
        </button>
      )}
      <button
        onClick={onDone}
        style={{ background: 'none', border: 'none', width: '100%', marginTop: 10, ...mono(12, { color: C.muted }), cursor: 'pointer' }}
      >
        maybe later
      </button>
    </div>
  )
}
