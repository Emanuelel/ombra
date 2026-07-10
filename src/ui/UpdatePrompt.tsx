import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from 'react-i18next'
import { C } from './tokens'

// Shows a banner when a new deploy has been fetched by the service worker, so the
// user can reload into it immediately (registerType: 'prompt' in vite.config).
export default function UpdatePrompt() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        zIndex: 5000,
        background: C.ink,
        color: C.cream,
        border: `2.5px solid ${C.sun}`,
        borderRadius: 14,
        padding: '11px 12px 11px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '4px 4px 0 rgba(0,0,0,.35)',
        animation: 'ombraFadeUp .3s both',
      }}
    >
      <span style={{ flex: 1, fontWeight: 800, fontSize: 14, lineHeight: 1.25 }}>{t('update.available')}</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          flexShrink: 0,
          background: C.sun,
          color: C.ink,
          border: 'none',
          borderRadius: 10,
          padding: '8px 15px',
          fontWeight: 800,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {t('update.reload')}
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label={t('update.dismiss')}
        style={{ flexShrink: 0, background: 'none', border: 'none', color: C.muted3, fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: '0 4px' }}
      >
        ×
      </button>
    </div>
  )
}
