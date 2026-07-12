import { useTranslation } from 'react-i18next'
import { btnBlock, C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import LangFlags from '../ui/LangFlags'

export default function Welcome({
  onStart,
  error,
}: {
  onStart: () => void
  error?: string | null
}) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.brand,
        padding: '56px 30px 34px',
        display: 'flex',
        flexDirection: 'column',
        color: C.ink,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={mono(12, { letterSpacing: '.22em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginTop: 6 })}>
          {t('welcome.season')}
        </div>
        <LangFlags />
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div style={{ animation: 'ombraFloat 3.4s ease-in-out infinite', width: 72 }}>
          <Crown size={72} fill={C.sun} stroke={C.ink} />
        </div>
        <div style={display(74, { lineHeight: 0.82, letterSpacing: '-.04em', marginTop: 14 })}>
          OMBRA
        </div>
        <div style={display(22, { lineHeight: 1.02, marginTop: 16, maxWidth: 280 })}>
          {t('welcome.tagline')}
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.4, color: '#3a1a12', marginTop: 12, maxWidth: 290 }}>
          {t('welcome.sub')}
        </div>
      </div>
      <button onClick={onStart} style={{ ...btnBlock, marginTop: 34, background: C.ink, color: C.cream }}>
        {t('welcome.start')}
      </button>
      {error && <div style={mono(11, { textAlign: 'center', marginTop: 10, color: C.ink })}>{error}</div>}
      <div style={mono(11, { textAlign: 'center', marginTop: 14, color: '#3a1a12' })}>
        {t('welcome.footer')}
      </div>
    </div>
  )
}
