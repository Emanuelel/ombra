import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { C } from './tokens'
import { subscribeToPush } from '../lib/api'
import { getLang } from '../i18n/lang'
import { isIOS, isStandalone } from '../lib/platform'
import { track } from '../lib/analytics'
import Install from '../screens/Install'

// A once-a-day nudge on the map to enable crown-steal alerts. Two modes because iOS web
// push only works from the home-screen PWA: 'install' asks to add Ombra first (there the
// alert permission doesn't even exist yet), 'alerts' fires the real permission prompt.
// We only ever show while the permission is still decidable - never re-nag a hard denial
// (browsers won't re-prompt) and never once it's granted.

const CAP = 5 // stop after this many day-shows, so it never becomes nagware
const today = () => new Date().toISOString().slice(0, 10)

type Mode = 'alerts' | 'install'

function decideMode(): Mode | null {
  try {
    if ('Notification' in window && Notification.permission === 'granted') return null // already on
    if ('Notification' in window && Notification.permission === 'denied') return null // can't re-prompt
    if (isIOS() && !isStandalone()) return 'install' // push impossible until installed
    if ('Notification' in window && Notification.permission === 'default') return 'alerts'
  } catch {
    /* ignore */
  }
  return null
}

function withinFrequency(): boolean {
  try {
    if (localStorage.getItem('ombra_notify_snooze') === today()) return false // shown/dismissed today
    if (Number(localStorage.getItem('ombra_notify_count') || 0) >= CAP) return false
  } catch {
    /* ignore */
  }
  return true
}

export default function NotifyPrompt({ token }: { token: string | null }) {
  const { t } = useTranslation()
  const [mode] = useState<Mode | null>(() => (token && withinFrequency() ? decideMode() : null))
  const [open, setOpen] = useState<boolean>(!!mode)
  const [showInstall, setShowInstall] = useState(false)

  // Stamp the once-a-day snooze + bump the lifetime cap the moment it's shown.
  useEffect(() => {
    if (!mode) return
    try {
      localStorage.setItem('ombra_notify_snooze', today())
      localStorage.setItem('ombra_notify_count', String(Number(localStorage.getItem('ombra_notify_count') || 0) + 1))
    } catch {
      /* ignore */
    }
    track('notify_prompt_shown', { mode })
  }, [mode])

  function dismiss() {
    track('notify_dismissed', { mode })
    setOpen(false)
  }

  function enableAlerts() {
    if (!('Notification' in window)) return setOpen(false)
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        track('notify_enabled')
        if (token) void subscribeToPush(token, getLang())
      } else {
        track('notify_denied')
      }
      setOpen(false)
    }, () => setOpen(false))
  }

  function openInstall() {
    track('notify_install_open')
    setShowInstall(true)
    setOpen(false)
  }

  if (showInstall) return <Install onDone={() => setShowInstall(false)} />
  if (!mode || !open) return null

  const isInstall = mode === 'install'
  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(84px + env(safe-area-inset-bottom))',
        zIndex: 4000,
        background: C.ink,
        color: C.cream,
        border: `2.5px solid ${C.sun}`,
        borderRadius: 16,
        padding: '13px 12px 13px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '4px 4px 0 rgba(0,0,0,.35)',
        animation: 'ombraDropDown .3s both',
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }} aria-hidden>
        👑
      </span>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, lineHeight: 1.3 }}>
        {isInstall ? t('notify.installText') : t('notify.alertsText')}
      </span>
      <button
        onClick={isInstall ? openInstall : enableAlerts}
        style={{
          flexShrink: 0,
          background: C.sun,
          color: C.ink,
          border: 'none',
          borderRadius: 11,
          padding: '9px 14px',
          fontWeight: 800,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {isInstall ? t('notify.installCta') : t('notify.alertsCta')}
      </button>
      <button
        onClick={dismiss}
        aria-label={t('notify.dismiss')}
        style={{ flexShrink: 0, background: 'none', border: 'none', color: C.muted3, fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}
      >
        ×
      </button>
    </div>
  )
}
