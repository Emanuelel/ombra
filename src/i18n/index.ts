import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'
import ca from './locales/ca.json'

export const SUPPORTED = ['es', 'ca', 'en'] as const

// Resolve the startup language: a remembered choice wins; on first run we
// auto-detect from the browser (ca → Catalan, en → English, es and everything
// else → Spanish, the broadest common language for the Barcelona audience).
const stored = (() => {
  try {
    return localStorage.getItem('ombra_lang')
  } catch {
    return null
  }
})()

function detectLang(): (typeof SUPPORTED)[number] {
  const candidates =
    typeof navigator !== 'undefined'
      ? [...(navigator.languages ?? []), navigator.language].filter(Boolean)
      : []
  for (const tag of candidates) {
    const prefix = tag.toLowerCase().split('-')[0]
    if (prefix === 'ca') return 'ca'
    if (prefix === 'en') return 'en'
    if (prefix === 'es') return 'es'
  }
  return 'es'
}

const lng =
  stored && (SUPPORTED as readonly string[]).includes(stored)
    ? (stored as (typeof SUPPORTED)[number])
    : detectLang()

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    ca: { translation: ca },
  },
  lng,
  fallbackLng: 'es',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
})

// Keep the document language in sync with the resolved app language (index.html
// ships a static lang="ca" that this supersedes at runtime).
if (typeof document !== 'undefined') document.documentElement.lang = lng

export default i18n
