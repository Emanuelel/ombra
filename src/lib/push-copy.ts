import en from '../i18n/locales/en.json'
import es from '../i18n/locales/es.json'
import ca from '../i18n/locales/ca.json'

/**
 * Server-side push copy. Push notifications are sent from Vercel functions, where
 * react-i18next (client-only) isn't available, so we read the SAME locale JSON directly
 * and interpolate `{{vars}}`. Keys live under the `push.*` namespace and are kept in sync
 * across en/es/ca by `scripts/check-i18n.mjs`. Null/unknown language falls back to 'es'
 * (the app's fallbackLng). Names (terrace/barri) are passed in as params, never translated.
 */
type Lang = 'es' | 'ca' | 'en'
const DICTS: Record<Lang, unknown> = { es, ca, en }

function resolve(dict: unknown, path: string): { title?: string; body?: string } | undefined {
  const node = path.split('.').reduce<unknown>((o, k) => {
    if (o && typeof o === 'object') return (o as Record<string, unknown>)[k]
    return undefined
  }, dict)
  return node && typeof node === 'object' ? (node as { title?: string; body?: string }) : undefined
}

export interface PushCopy {
  title: string
  body: string
}

/**
 * Resolve a `{ title, body }` push copy pair for a language.
 * @param lang  user's language ('es' | 'ca' | 'en'); null/other => 'es'
 * @param key   dotted key of an object with `title` + `body`, e.g. 'push.crownStolen'
 * @param params values for `{{var}}` interpolation (e.g. handle, terrace)
 */
export function pushCopy(
  lang: string | null | undefined,
  key: string,
  params: Record<string, string | number> = {},
): PushCopy {
  const l: Lang = lang === 'ca' || lang === 'en' ? lang : 'es'
  const node = resolve(DICTS[l], key) ?? resolve(DICTS.es, key) ?? {}
  const interp = (s: string) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(params[k] ?? ''))
  return { title: interp(node.title ?? ''), body: interp(node.body ?? '') }
}
