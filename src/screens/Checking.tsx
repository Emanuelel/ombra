import { C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'

export default function Checking({ terraceName }: { terraceName: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.ink,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: C.cream,
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255,212,0,.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'rgba(255,212,0,.25)',
            animation: 'ombraPing 1.4s ease-out infinite',
          }}
        />
        <span
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'rgba(255,212,0,.25)',
            animation: 'ombraPing 1.4s ease-out infinite .5s',
          }}
        />
        <Crown size={52} fill={C.sun} />
      </div>
      <div style={display(22, { marginTop: 32 })}>Locking you in…</div>
      <div style={mono(12, { color: C.muted3, marginTop: 8 })}>
        confirming you're at {terraceName}
      </div>
    </div>
  )
}
