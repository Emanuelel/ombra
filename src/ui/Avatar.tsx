import { C } from './tokens'

const PALETTE = ['#FF4A31', '#e0851f', '#1f9d55', '#2563eb', '#7c3aed', '#db2777', '#0d9488']

function colorFor(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** Circular avatar - shows an uploaded photo if `src` is set, else a colour + initial. */
export default function Avatar({
  name,
  src,
  size = 44,
  ring,
}: {
  name: string
  src?: string | null
  size?: number
  ring?: string
}) {
  const initial = (name.replace(/^@/, '')[0] ?? '?').toUpperCase()
  const border = `${ring ? 2.5 : 2}px solid ${ring ?? C.ink}`
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ borderRadius: '50%', objectFit: 'cover', border, flexShrink: 0, display: 'block' }}
      />
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colorFor(name),
        border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: C.cream,
        fontFamily: "'Archivo Black', sans-serif",
        fontSize: Math.round(size * 0.42),
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  )
}
