import { C } from './tokens'

/** The Ombra crown mark (exact polygon from the design handoff). */
export default function Crown({
  size = 22,
  fill = C.sun,
  stroke,
}: {
  size?: number
  fill?: string
  stroke?: string
}) {
  return (
    <svg viewBox="0 0 24 18" width={size} height={(size * 18) / 24} style={{ flexShrink: 0 }}>
      <polygon
        points="2,16 2,5 7,9.5 12,3 17,9.5 22,5 22,16"
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 1 : undefined}
      />
    </svg>
  )
}
