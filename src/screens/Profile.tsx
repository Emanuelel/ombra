import { useEffect, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import Avatar from '../ui/Avatar'
import { getPushDiag, getUser, sendTestPush, subscribeToPush, updateAvatar, type PushDiag, type PushSendResult, type UserProfile } from '../lib/api'
import { fileToDataUrl } from '../lib/image'
import { shouldOfferInstall } from '../lib/platform'
import { getLang, LANGS, setLang } from '../i18n/lang'
import Install from './Install'

function MailIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.ink}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

function sinceLabel(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang, { month: 'short', year: '2-digit' }).replace(' ', " '")
}
function ago(iso: string, t: TFunction): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return t('common.justNow')
  if (h < 24) return t('common.hoursAgo', { count: h })
  return t('common.daysAgo', { count: Math.floor(h / 24) })
}

export default function Profile({
  handle,
  avatar,
  token,
  onAvatarChange,
  onOpenTerrace,
  onLogout,
}: {
  handle: string
  avatar: string | null
  token: string | null
  onAvatarChange: (v: string | null) => void
  onOpenTerrace: (id: string) => void
  onLogout: () => void
}) {
  const { t, i18n } = useTranslation()
  const [u, setU] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [notifMsg, setNotifMsg] = useState<string | null>(null) // an i18n key
  const [notifBusy, setNotifBusy] = useState(false)
  // Whether notifications are already granted on this device. Recomputed each render;
  // setNotifMsg after sendTest() re-renders, so this reflects a fresh grant immediately.
  const notifOn = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  // TEMP: on-device push diagnostics, remove after Android push is fixed.
  const [diag, setDiag] = useState<PushDiag | null>(null)
  const [sendResults, setSendResults] = useState<PushSendResult[] | null>(null)
  useEffect(() => {
    getUser(handle).then(setU)
    getPushDiag().then(setDiag)
  }, [handle])

  // Turn on alerts (subscribe this device) and send a test push in one tap. This also
  // raises FOMO reach, since Profile is reachable by everyone (unlike the Celebrate moment).
  async function sendTest() {
    if (!token || notifBusy) return
    setNotifBusy(true)
    setNotifMsg(null)
    try {
      if (!('Notification' in window)) {
        setNotifMsg('profile.alertsBlocked')
        return
      }
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') {
          setNotifMsg('profile.alertsBlocked')
          return
        }
      } else if (Notification.permission === 'denied') {
        setNotifMsg('profile.alertsBlocked')
        return
      }
      await subscribeToPush(token, getLang())
      getPushDiag().then(setDiag) // TEMP: refresh the debug readout after subscribing
      const { ok, count, results } = await sendTestPush(token)
      setSendResults(results ?? null) // TEMP: per-device push-service delivery status
      setNotifMsg(!ok ? 'profile.testFailed' : count === 0 ? 'profile.testNoDevice' : 'profile.testSent')
    } finally {
      setNotifBusy(false)
    }
  }

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !token) return
    setErr(null)
    const prev = avatar
    const next = await fileToDataUrl(f)
    onAvatarChange(next) // show it immediately
    setSaving(true)
    const ok = await updateAvatar(token, next)
    setSaving(false)
    if (!ok) {
      onAvatarChange(prev ?? null)
      setErr(t('profile.savePhotoError'))
    }
  }

  return (
    <div
      style={{
        animation: 'ombraSlideIn .3s both',
        padding: '6px 18px 20px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <label style={{ position: 'relative', cursor: token ? 'pointer' : 'default', flexShrink: 0, lineHeight: 0 }}>
          <Avatar name={handle} src={avatar ?? u?.avatarUrl ?? null} size={64} ring={C.ink} />
          {token && (
            <span
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: C.ink,
                color: C.sun,
                border: `2px solid ${C.cream}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              {saving ? '…' : '+'}
            </span>
          )}
          {token && <input type="file" accept="image/*" onChange={onPickAvatar} style={{ display: 'none' }} />}
        </label>
        <div>
          <div style={display(24)}>@{handle}</div>
          <div style={mono(11, { color: C.muted })}>
            {u ? t('profile.shadeHunterSince', { since: sinceLabel(u.joinedAt, getLang()) }) : t('profile.shadeHunter')}
            {u?.topBarri ? ` · ${u.topBarri}` : ''}
          </div>
          {err && <div style={mono(10, { color: C.tomato, marginTop: 4 })}>{err}</div>}
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          background: C.ink,
          color: C.cream,
          borderRadius: 18,
          padding: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={display(46, { color: C.sun, lineHeight: 0.85 })}>{u?.crowns ?? 0}</div>
          <div style={mono(11, { color: C.muted3 })}>{t('profile.crownsHeldNow')}</div>
        </div>
        <Crown size={50} fill={C.sun} />
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: C.sun, border: `2.5px solid ${C.ink}`, borderRadius: 14, padding: 13 }}>
          <div style={display(26)}>{u?.points7d ?? 0}</div>
          <div style={{ fontSize: 11 }}>{t('profile.ptsThisWeek')}</div>
        </div>
        <div style={{ flex: 1, background: C.cream, border: `2.5px solid ${C.ink}`, borderRadius: 14, padding: 13 }}>
          <div style={display(26)}>{u?.checkinsAll ?? 0}</div>
          <div style={{ fontSize: 11 }}>{t('profile.checkins')}</div>
        </div>
      </div>

      <div style={mono(11, { letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted2, marginTop: 16 })}>
        {t('profile.recentCheckins')}
      </div>
      <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {u && u.recent.length === 0 && (
          <div style={mono(12, { color: C.muted })}>{t('profile.startStreak')}</div>
        )}
        {u?.recent.map((r, i) => (
          <button
            key={i}
            onClick={() => onOpenTerrace(r.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
              width: '100%',
              background: C.cream,
              border: `2px solid ${C.ink}`,
              borderRadius: 12,
              padding: '10px 13px',
              cursor: 'pointer',
            }}
          >
            <Crown size={16} fill={C.sun} stroke={C.ink} />
            <span style={{ flex: 1, lineHeight: 1.15, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 800, fontSize: 14 }}>{r.terrace}</span>
              <span style={mono(11, { color: C.muted2 })}>
                {r.barri ?? t('common.barcelona')} · {ago(r.createdAt, t)}
              </span>
            </span>
            <span style={display(15, { color: C.greenText })}>+{r.points}</span>
            <span style={{ color: C.muted, fontSize: 16, flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>

      {shouldOfferInstall() && (
        <button
          onClick={() => setShowInstall(true)}
          style={{
            marginTop: 22,
            width: '100%',
            background: C.sun,
            border: `2.5px solid ${C.ink}`,
            borderRadius: 14,
            padding: 14,
            ...display(15, { textTransform: 'uppercase' }),
            boxShadow: `4px 4px 0 ${C.ink}`,
            cursor: 'pointer',
          }}
        >
          {t('profile.addToHome')}
        </button>
      )}

      <div style={mono(11, { letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted2, marginTop: 22 })}>
        {t('profile.language')}
      </div>
      <div style={{ marginTop: 9, display: 'flex', gap: 8 }}>
        {LANGS.map((l) => {
          const active = i18n.resolvedLanguage === l.code
          return (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              aria-pressed={active}
              style={{
                flex: 1,
                background: active ? C.ink : C.cream,
                color: active ? C.sun : C.ink,
                border: `2px solid ${C.ink}`,
                borderRadius: 12,
                padding: '11px 8px',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {l.label}
            </button>
          )
        })}
      </div>

      {token && (
        <>
          <div style={mono(11, { letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted2, marginTop: 22 })}>
            {t('profile.notifications')}
          </div>
          <button
            onClick={sendTest}
            disabled={notifBusy}
            style={{
              marginTop: 9,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: C.cream,
              border: `2px solid ${C.ink}`,
              borderRadius: 12,
              padding: '10px 13px',
              cursor: notifBusy ? 'default' : 'pointer',
              opacity: notifBusy ? 0.6 : 1,
              textAlign: 'left',
            }}
          >
            <Crown size={16} fill={C.sun} stroke={C.ink} />
            <span style={{ flex: 1, lineHeight: 1.15, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 800, fontSize: 14 }}>{t('profile.sendTest')}</span>
              <span style={mono(11, { color: C.muted2 })}>
                {notifOn ? t('profile.notifOn') : t('profile.enableAlertsSub')}
              </span>
            </span>
          </button>
          {notifMsg && <div style={mono(11, { color: C.muted, marginTop: 6 })}>{t(notifMsg)}</div>}
          {/* i18n-ignore: TEMP push-notification debug readout (English-only), remove after Android push is fixed */}
          <div
            style={{
              marginTop: 8,
              background: C.cream,
              border: `1px dashed ${C.muted}`,
              borderRadius: 10,
              padding: '8px 10px',
              ...mono(10.5, { color: C.ink, lineHeight: 1.6 }),
            }}
          >
            <div style={{ fontWeight: 800 }}>{'push debug'}</div>
            <div>{`permission: ${diag?.permission ?? '…'}`}</div>
            <div>{`vapid key set: ${diag ? (diag.vapidSet ? 'yes' : 'NO') : '…'}`}</div>
            <div>{`push supported: ${diag ? (diag.supported ? 'yes' : 'NO') : '…'}`}</div>
            <div>{`service worker: ${diag ? (diag.swScriptURL ? diag.swScriptURL.split('/').pop() : 'none') : '…'}`}</div>
            <div>{`subscribed on this device: ${diag ? (diag.hasSubscription ? 'yes' : 'NO') : '…'}`}</div>
            <div>{`endpoint host: ${diag?.endpointHost ?? (diag ? 'none' : '…')}`}</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{'last send (tap the button above)'}</div>
            {!sendResults && <div>{'— no test sent yet —'}</div>}
            {sendResults?.length === 0 && <div>{'no devices subscribed for this account'}</div>}
            {sendResults?.map((r, i) => (
              <div key={i}>
                {`${r.host}: ${r.ok ? `OK (${r.statusCode})` : `FAIL ${r.statusCode ?? '?'}${r.pruned ? ' (pruned)' : ''}`}`}
                {r.error ? ` — ${r.error}` : ''}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={mono(11, { letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted2, marginTop: 22 })}>
        {t('profile.support')}
      </div>
      <a
        href={`mailto:selene.app.studio@outlook.com?subject=${encodeURIComponent(t('profile.contactSubject'))}`}
        style={{
          marginTop: 9,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          background: C.cream,
          border: `2px solid ${C.ink}`,
          borderRadius: 12,
          padding: '10px 13px',
          textDecoration: 'none',
          color: C.ink,
        }}
      >
        <MailIcon />
        <span style={{ flex: 1, lineHeight: 1.15, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 800, fontSize: 14 }}>{t('profile.contactUs')}</span>
          <span style={mono(11, { color: C.muted2 })}>{t('profile.contactSub')}</span>
        </span>
        <span style={{ color: C.muted, fontSize: 16, flexShrink: 0 }}>›</span>
      </a>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 16, ...mono(12) }}>
        <a href="/privacy" style={{ color: C.muted, textDecoration: 'underline' }}>{t('profile.privacy')}</a>
        <a href="/terms" style={{ color: C.muted, textDecoration: 'underline' }}>{t('profile.terms')}</a>
      </div>

      {showInstall && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
          <Install onDone={() => setShowInstall(false)} />
        </div>
      )}

      <button
        onClick={onLogout}
        style={{
          marginTop: 'auto',
          width: '100%',
          background: C.cream,
          border: `2px solid ${C.ink}`,
          borderRadius: 14,
          padding: 14,
          ...display(15, { textTransform: 'uppercase' }),
          cursor: 'pointer',
        }}
      >
        {t('profile.logout')}
      </button>

      {/* i18n-ignore: data attribution / credit line, kept verbatim across languages */}
      <div style={mono(9.5, { color: C.muted, textAlign: 'center', marginTop: 14, paddingTop: 0, lineHeight: 1.5 })}>
        Terrace & places data © OpenStreetMap contributors, Overture Maps.
        <br />
        Licensed terraces: Ajuntament de Barcelona open data.
      </div>
    </div>
  )
}
