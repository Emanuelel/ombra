/**
 * Server-side push copy. Push notifications are sent from Vercel functions, where
 * react-i18next (client-only) isn't available. The copy is inlined here (not read from the
 * locale JSON) on purpose: Vercel's Node ESM runtime rejects JSON imports without an import
 * attribute, so a plain typed object is the robust choice. It is server-only (never used via
 * t() on the client). Null/unknown language falls back to 'es' (the app's fallbackLng).
 * Names (terrace/barri) are passed in as params, never translated. No em-dashes (house rule).
 */
type Lang = 'es' | 'ca' | 'en'
export interface PushCopy {
  title: string
  body: string
}
type Entry = Record<Lang, PushCopy>

const COPY: Record<string, Entry> = {
  'push.crownStolen': {
    es: { title: '👑 ¡Te robaron la corona!', body: '@{{handle}} te robó la corona en {{terrace}}' },
    ca: { title: '👑 T’han robat la corona!', body: '@{{handle}} t’ha robat la corona a {{terrace}}' },
    en: { title: '👑 Crown stolen!', body: '@{{handle}} took your crown at {{terrace}}' },
  },
  'push.test': {
    es: { title: '☀ Prueba de Ombra', body: 'Las notificaciones están activas. La caza te espera.' },
    ca: { title: '☀ Prova d’Ombra', body: 'Les notificacions estan actives. La caça t’espera.' },
    en: { title: '☀ Ombra test', body: 'Notifications are on. The hunt awaits.' },
  },
  'push.fomo.weekdayA': {
    es: { title: '☀ Las terrazas se llenan', body: 'Hay gente sumando puntos cerca de ti. No te quedes al sol.' },
    ca: { title: '☀ Les terrasses s’omplen', body: 'Hi ha gent sumant punts a prop teu. No et quedis al sol.' },
    en: { title: '☀ The terraces are filling up', body: "People are pocketing points near you. Don't get left in the sun." },
  },
  'push.fomo.weekdayB': {
    es: { title: '👑 Las coronas están en juego', body: 'Alguien anda tras tus sitios. Haz check-in y defiéndelos.' },
    ca: { title: '👑 Les corones estan en joc', body: 'Algú va darrere dels teus llocs. Fes check-in i defensa’ls.' },
    en: { title: '👑 Crowns are up for grabs', body: 'Someone is eyeing your spots. Check in and hold your ground.' },
  },
  'push.fomo.weekdayC': {
    es: { title: '☀ ¿Una terraza hoy?', body: 'La sombra está inmejorable. Un café y unos cuantos puntos.' },
    ca: { title: '☀ Una terrassa avui?', body: 'L’ombra està immillorable. Un cafè i uns quants punts.' },
    en: { title: '☀ Fancy a terrace today?', body: 'The shade is prime right now. Grab a coffee, grab some points.' },
  },
  'push.fomo.weekendA': {
    es: { title: '🍹 Empieza la caza del finde', body: 'Terrazas a tope y puntos volando. Sal a por ellos.' },
    ca: { title: '🍹 Comença la caça del cap de setmana', body: 'Terrasses plenes i punts volant. Surt a buscar-los.' },
    en: { title: '🍹 The weekend hunt begins', body: 'Terraces are packed and points are flying. Get out there.' },
  },
  'push.fomo.weekendB': {
    es: { title: '☀ Finde de terrazas', body: 'El mejor día para robar coronas. Tu barrio no se defiende solo.' },
    ca: { title: '☀ Cap de setmana de terrasses', body: 'El millor dia per robar corones. El teu barri no es defensa sol.' },
    en: { title: '☀ Weekend on the terraces', body: "The best day to steal crowns. Your barri won't defend itself." },
  },
}

/**
 * Resolve a `{ title, body }` push copy pair for a language.
 * @param lang  user's language ('es' | 'ca' | 'en'); null/other => 'es'
 * @param key   copy key, e.g. 'push.crownStolen' or 'push.fomo.weekendA'
 * @param params values for `{{var}}` interpolation (e.g. handle, terrace)
 */
export function pushCopy(
  lang: string | null | undefined,
  key: string,
  params: Record<string, string | number> = {},
): PushCopy {
  const l: Lang = lang === 'ca' || lang === 'en' ? lang : 'es'
  const entry = COPY[key]
  const node = entry?.[l] ?? entry?.es ?? { title: '', body: '' }
  const interp = (s: string) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(params[k] ?? ''))
  return { title: interp(node.title), body: interp(node.body) }
}
