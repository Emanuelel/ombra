import Crown from './Crown'
import { C } from './tokens'

/**
 * The crown-win celebration mark - a spinning tomato "ray" burst behind a
 * popped-in tomato disc holding the cream crown. This is the exact visual the
 * Celebrate screen plays on a check-in win; it's shared so the how-it-works
 * demo shows the identical animation rather than a look-alike.
 *
 * The pop (`ombraPop`) and spin (`ombraSpin`) are the real keyframes. Callers
 * that want the pop to replay (e.g. the looping demo) remount via a changing
 * `key`.
 */
export default function CrownBadge({ size = 140, ray = true }: { size?: number; ray?: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {ray && (
        <span
          style={{
            position: 'absolute',
            width: size * 2,
            height: size * 2,
            background: 'repeating-conic-gradient(#FF4A31 0 11deg, transparent 11deg 24deg)',
            opacity: 0.22,
            borderRadius: '50%',
            animation: 'ombraSpin 10s linear infinite',
          }}
        />
      )}
      <span
        style={{
          position: 'relative',
          width: size,
          height: size,
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
        <Crown size={Math.round(size * 0.53)} fill={C.cream} />
      </span>
    </div>
  )
}
