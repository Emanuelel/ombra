import { C } from './tokens'

/** Faux status bar shown on the tabbed (non-immersive) screens. */
export default function StatusBar() {
  return (
    <div
      style={{
        height: 44,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 26px',
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      <span>14:07</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        34° ☀
        <span
          style={{
            display: 'inline-block',
            width: 22,
            height: 11,
            border: `2px solid ${C.ink}`,
            borderRadius: 3,
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              inset: 1.5,
              right: 6,
              background: C.ink,
              borderRadius: 1,
            }}
          />
        </span>
      </span>
    </div>
  )
}
