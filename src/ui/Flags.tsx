import type { LangCode } from '../i18n/lang'

/**
 * Circular flag artwork for the Land-screen language switcher (design handoff LS2a).
 * Each flag is authored at viewBox="0 0 30 30" and rendered small (19px) inside a
 * round, clipped container. Senyera (not a state flag) is used for Catalan.
 */

/** Catalan — Senyera: 4 red bars on yellow. */
function Senyera() {
  return (
    <svg viewBox="0 0 30 30" width="100%" height="100%">
      <rect width="30" height="30" fill="#FCDD09" />
      {[3.3, 9.9, 16.5, 23.1].map((y) => (
        <rect key={y} y={y} width="30" height="3.3" fill="#DA121A" />
      ))}
    </svg>
  )
}

/** Spain — red field with a central gold band. */
function Spain() {
  return (
    <svg viewBox="0 0 30 30" width="100%" height="100%">
      <rect width="30" height="30" fill="#AA151B" />
      <rect y="7.5" width="30" height="15" fill="#F1BF00" />
    </svg>
  )
}

/** United Kingdom — Union Jack. */
function UK() {
  return (
    <svg viewBox="0 0 30 30" width="100%" height="100%">
      <rect width="30" height="30" fill="#012169" />
      <path d="M0 0l30 30M30 0L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0l30 30M30 0L0 30" stroke="#C8102E" strokeWidth="3" />
      <path d="M15 0v30M0 15h30" stroke="#fff" strokeWidth="10" />
      <path d="M15 0v30M0 15h30" stroke="#C8102E" strokeWidth="6" />
    </svg>
  )
}

const FLAGS: Record<LangCode, () => JSX.Element> = {
  ca: Senyera,
  es: Spain,
  en: UK,
}

export default function Flag({ code }: { code: LangCode }) {
  const F = FLAGS[code]
  return <F />
}
