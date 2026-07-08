import { btnBlock, C, display, mono } from '../ui/tokens'

const STEPS: [string, string, string][] = [
  ['1', 'Find the shade', 'See which terraces are shaded right now — drag the clock to any hour.'],
  ['2', 'Check in', "Prove you're actually there (within 50m) to bank shade points."],
  ['3', 'Hold the crown', 'Most check-ins this week rules the terrace — until a friend steals it.'],
]

export default function HowItWorks({
  onBack,
  onNext,
}: {
  onBack: () => void
  onNext: () => void
}) {
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
      <button
        onClick={onBack}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', ...display(22), cursor: 'pointer' }}
      >
        ←
      </button>
      <div style={mono(12, { letterSpacing: '.22em', textTransform: 'uppercase', color: C.muted, marginTop: 14 })}>
        How it works
      </div>
      <div style={display(34, { lineHeight: 0.95, marginTop: 8 })}>
        Chase shade.
        <br />
        Steal crowns.
      </div>

      <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {STEPS.map(([n, title, body]) => (
          <div key={n} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div
              style={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: C.sun,
                border: `2.5px solid ${C.ink}`,
                boxShadow: `3px 3px 0 ${C.ink}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...display(20),
              }}
            >
              {n}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.35, color: '#6b5f4c', marginTop: 2 }}>{body}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onNext} style={{ ...btnBlock, marginTop: 'auto', background: C.ink, color: C.cream }}>
        Let's go →
      </button>
    </div>
  )
}
