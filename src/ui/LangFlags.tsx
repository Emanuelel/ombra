import { useTranslation } from 'react-i18next'
import { getLang, LANGS, setLang } from '../i18n/lang'
import { C } from './tokens'
import Flag from './Flags'

/**
 * Land-screen language switcher (design handoff LS2a): three circular flag icons
 * in the top-right utility corner. One-tap segmented choice, no dropdown. The
 * active flag gets a dark selection ring; the others sit at reduced opacity.
 * Only shown on the Land screen; downstream screens inherit the chosen language.
 */
export default function LangFlags() {
  const { t } = useTranslation()
  const active = getLang()
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      {LANGS.map((l) => {
        const selected = l.code === active
        return (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            aria-pressed={selected}
            aria-label={t('welcome.switchTo', { lang: l.label })}
            style={{
              // ≥44px tappable target with the visible circle centered inside.
              width: 44,
              height: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              margin: -12.5, // collapse the transparent padding so flags stay tight
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 19,
                height: 19,
                borderRadius: '50%',
                overflow: 'hidden',
                opacity: selected ? 1 : 0.5,
                boxShadow: selected
                  ? `0 0 0 2px ${C.ink}, 0 1px 3px rgba(0,0,0,.25)`
                  : '0 1px 3px rgba(0,0,0,.25)',
                transition: 'opacity .15s ease, box-shadow .15s ease',
                display: 'block',
              }}
            >
              <Flag code={l.code} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
