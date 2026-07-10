import i18n, { SUPPORTED } from './index'

export type LangCode = (typeof SUPPORTED)[number]

export const LANG_KEY = 'ombra_lang'

// Order shown in the switcher: Spanish (default) first, then Catalan, then English.
export const LANGS: { code: LangCode; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'ca', label: 'Català' },
  { code: 'en', label: 'English' },
]

export function getLang(): LangCode {
  const l = i18n.resolvedLanguage || i18n.language || 'es'
  return (SUPPORTED as readonly string[]).includes(l) ? (l as LangCode) : 'es'
}

export function setLang(code: LangCode): void {
  i18n.changeLanguage(code)
  try {
    localStorage.setItem(LANG_KEY, code)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = code
}
