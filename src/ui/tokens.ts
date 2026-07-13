import type { CSSProperties } from 'react'

export const C = {
  ink: '#1A1408',
  cream: '#FBF1DB', // app background
  creamCard: '#FBF6E9', // cards, Google button (slightly lighter than the bg)
  sun: '#FFC800',
  tomato: '#F4432B', // action red: CTAs, pins, crown medallion, caret
  brand: '#F84A2C', // background red: Land screen, status bands
  logout: '#D8452E', // logout / destructive outline
  blue: '#2979F2', // handles, location dot, links, photo-add badge
  shadeBlue: 'rgba(44,51,85,.30)',
  mapBase: '#FBF4DD',
  mapStreet: '#F4E6B0',
  mapBuilding: '#D9C89E',
  muted: '#a1794a',
  muted2: '#8a7f6d',
  muted3: '#b7ad98',
  muted3b: '#a99e88', // attribution / fine-print mono
  green: '#1E8A48',
  greenText: '#1E8A48',
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
