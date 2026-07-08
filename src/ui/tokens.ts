import type { CSSProperties } from 'react'

export const C = {
  ink: '#17130c',
  cream: '#FFF6E4',
  sun: '#FFD400',
  tomato: '#FF4A31',
  shadeBlue: 'rgba(44,51,85,.30)',
  mapBase: '#EFE6CF',
  mapStreet: '#E3D6B4',
  mapBuilding: '#D9C89E',
  muted: '#a1794a',
  muted2: '#8a7f6d',
  muted3: '#b7ad98',
  green: '#1f9d55',
  greenText: '#1f7a4d',
} as const

/** Archivo Black display type. */
export const display = (size: number, extra?: CSSProperties): CSSProperties => ({
  fontFamily: "'Archivo Black', sans-serif",
  fontSize: size,
  letterSpacing: '-.02em',
  ...extra,
})

/** IBM Plex Mono label type. */
export const mono = (size: number, extra?: CSSProperties): CSSProperties => ({
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: size,
  ...extra,
})

/** Signature loud CTA button (Archivo Black, uppercase, chunky). */
export const btnBlock: CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: 18,
  padding: 19,
  fontFamily: "'Archivo Black', sans-serif",
  fontSize: 18,
  textTransform: 'uppercase',
  cursor: 'pointer',
}
