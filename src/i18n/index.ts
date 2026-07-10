import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'
import ca from './locales/ca.json'

export const SUPPORTED = ['es', 'ca', 'en'] as const

// Resolve the startup language: a remembered choice wins, otherwise everyone
// defaults to Spanish (the broadest common language for the Barcelona audience).
const stored = (() => {
  try {
    return localStorage.getItem('ombra_lang')
  } catch {
    return null
  }
})()
const lng = stored && (SUPPORTED as readonly string[]).includes(stored) ? stored : 'es'

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
