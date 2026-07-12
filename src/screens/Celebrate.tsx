import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { btnBlock, C, display, mono } from '../ui/tokens'
import CrownBadge from '../ui/CrownBadge'
import { isIOS, isStandalone } from '../lib/platform'
import { getLeaderboard, subscribeToPush } from '../lib/api'
import { getLang } from '../i18n/lang'

const CONFETTI = [
  { left: '8%', w: 10, h: 16, bg: C.tomato, round: false, dur: 1.7, delay: 0 },
  { left: '20%', w: 12, h: 12, bg: C.ink, round: true, dur: 2.0, delay: 0.15 },
  { left: '33%', w: 9, h: 18, bg: C.cream, round: false, dur: 1.6, delay: 0.05 },
  { left: '46%', w: 12, h: 12, bg: C.tomato, round: false, dur: 2.1, delay: 0.3 },
  { left: '58%', w: 10, h: 16, bg: C.ink, round: false, dur: 1.8, delay: 0.1 },
  { left: '70%', w: 12, h: 12, bg: C.tomato, round: true, dur: 1.9, delay: 0.22 },
  { left: '82%', w: 9, h: 18, bg: C.cream, round: false, dur: 2.2, delay: 0.08 },
  { left: '92%', w: 11, h: 11, bg: C.ink, round: false, dur: 1.7, delay: 0.35 },
  { left: '14%', w: 11, h: 11, bg: C.tomato, round: true, dur: 2.05, delay: 0.42 },
  { left: '64%', w: 10, h: 16, bg: C.cream, round: false, dur: 1.75, delay: 0.5 },
]

export default function Celebrate({
  points,
  terraceName,
  wonCrown,
  stolen,
  terraceId,
  handle,
  token,
  onSeeBoard,
  onBackToMap,
}: {
  points: number
  terraceName: string
  wonCrown: boolean
  stolen: boolean
  terraceId: string
  handle: string
  token?: string | null
  onSeeBoard: () => void
  onBackToMap: () => void
}) {
  const { t } = useTranslation()
  const [disp, setDisp] = useState(0)
  // First-crown nudge. On iOS, web push only works from the home-screen PWA, so we
  // nudge install there; everywhere else we can request notifications straight away.
  const [nudge, setNudge] = useState<'install' | 'alerts' | null>(() => {
    try {
      if (isIOS() && !isStandalone()) return localStorage.getItem('ombra_install_asked') ? null : 'install'
      if ('Notification' in window && Notification.permission === 'default' && !localStorage.getItem('ombra_notif_asked'))
        return 'alerts'
    } catch {
      /* ignore */
    }
    return null
  })
  const [standing, setStanding] = useState<{ holder: string; holderN: number; mine: number } | null>(null)

  // Count the points up.
  useEffect(() => {
    const step = Math.max(1, Math.ceil(points / 21))
    let n = 0
    const id = setInterval(() => {
      n += step
      if (n >= points) {
        n = points
        clearInterval(id)
      }
      setDisp(n)
    }, 24)
    return () => clearInterval(id)
  }, [points])

  // When you DIDN'T take the crown, fetch the terrace board to show how far you are.
  useEffect(() => {
    if (wonCrown || !terraceId) return
    let alive = true
    getLeaderboard('terrace', terraceId, 'week').then((rows) => {
      if (!alive || !rows.length) return
      const top = rows[0]
      const mine = rows.find((r) => r.displayName === handle)
      setStanding({ holder: top.displayName ?? 'someone', holderN: top.checkins, mine: mine?.checkins ?? 0 })
    })
    return () => {
      alive = false
    }
  }, [wonCrown, terraceId, handle])

  function markAsked() {
    try {
      localStorage.setItem('ombra_notif_asked', '1')
    } catch {
      /* ignore */
    }
    setNudge(null)
  }
  function dismissInstall() {
    try {
      localStorage.setItem('ombra_install_asked', '1')
    } catch {
      /* ignore */
    }
    setNudge(null)
  }
  function enableAlerts() {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted' && token) void subscribeToPush(token, getLang())
        markAsked()
      }, markAsked)
    } else markAsked()
  }

  // Shared bottom section (alerts opt-in + navigation) - works on either background.
  const bottom = (
    <div style={{ marginTop: 'auto', width: '100%', animation: 'ombraFadeUp .5s .55s both' }}>
      {nudge === 'alerts' && (
        <div style={{ background: C.ink, color: C.cream, borderRadius: 14, padding: '13px 15px', marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{t('celebrate.guardTitle')}</div>
          <div style={{ fontSize: 12, color: C.muted3, marginTop: 3, lineHeight: 1.35 }}>
            {t('celebrate.guardBody')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11 }}>
            <button
              onClick={enableAlerts}
              style={{ flex: 1, background: C.sun, border: `2px solid ${C.cream}`, borderRadius: 10, padding: '9px', fontWeight: 800, fontSize: 13, color: C.ink, cursor: 'pointer' }}
            >
              {t('celebrate.turnOnAlerts')}
            </button>
            <button onClick={markAsked} style={{ background: 'none', border: 'none', color: C.muted3, fontSize: 12, cursor: 'pointer', padding: '9px 6px' }}>
              {t('celebrate.notNow')}
            </button>
          </div>
        </div>
      )}
      {nudge === 'install' && (
        <div style={{ background: C.ink, color: C.cream, borderRadius: 14, padding: '13px 15px', marginBottom: 12, textAlign: 'left' }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{t('celebrate.installTitle')}</div>
          <div style={{ fontSize: 12, color: C.muted3, marginTop: 3, lineHeight: 1.35 }}>{t('celebrate.installBody')}</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 11,
              background: 'rgba(255,246,228,.08)',
              borderRadius: 10,
              padding: '9px 11px',
            }}
          >
            <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: C.sun, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="17" viewBox="0 0 24 26" fill="none" stroke="#1A1408" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v13" />
                <path d="M8 7l4-4 4 4" />
                <path d="M6 12H4v12h16V12h-2" />
              </svg>
            </span>
            <div style={{ fontSize: 12.5, lineHeight: 1.3 }}>
              <Trans i18nKey="install.ios" components={{ hl: <span style={{ color: C.sun, fontWeight: 800 }} /> }} />
            </div>
          </div>
          <button
            onClick={dismissInstall}
            style={{ width: '100%', marginTop: 11, background: C.sun, border: 'none', borderRadius: 10, padding: '9px', fontWeight: 800, fontSize: 13, color: C.ink, cursor: 'pointer' }}
          >
            {t('celebrate.installGot')}
          </button>
        </div>
      )}
      <button
        onClick={onSeeBoard}
        style={{ ...btnBlock, borderRadius: 16, padding: 17, fontSize: 17, background: C.ink, color: C.cream }}
      >
        {t('celebrate.seeLeaderboard')}
      </button>
      <button
        onClick={onBackToMap}
        style={{ background: 'none', border: 'none', width: '100%', marginTop: 8, ...mono(12, { color: C.muted }), cursor: 'pointer' }}
      >
        {t('celebrate.backToMap')}
      </button>
    </div>
  )

  // --- Checked in, but not #1: calmer "banked" result with the live standing ---
  if (!wonCrown) {
    const gap = standing ? Math.max(1, standing.holderN - standing.mine) : null
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: C.cream,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: C.ink,
          padding: '0 30px 34px',
        }}
      >
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: 118,
              height: 118,
              borderRadius: '50%',
              background: C.sun,
              border: `4px solid ${C.ink}`,
              boxShadow: `6px 6px 0 ${C.ink}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'ombraPop .5s cubic-bezier(.2,1.3,.4,1) both',
            }}
          >
            <span style={display(52, { lineHeight: 1 })}>✓</span>
          </div>
          <div style={mono(12, { letterSpacing: '.24em', textTransform: 'uppercase', marginTop: 22, color: C.muted })}>
            {t('celebrate.checkedIn')}
          </div>
          <div style={display(40, { marginTop: 8, letterSpacing: '-.02em' })}>
            +{disp} <span style={{ fontSize: 22 }}>pts</span>
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.45, marginTop: 14, maxWidth: 310, color: C.muted2 }}>
            {standing ? (
              <Trans
                i18nKey="celebrate.standing"
                count={standing.holderN}
                values={{ holder: standing.holder, terrace: terraceName, mine: standing.mine, gap }}
                components={{ b: <span style={{ fontWeight: 800, color: C.ink }} /> }}
              />
            ) : (
              <>{t('celebrate.someoneHolds', { terrace: terraceName })}</>
            )}
          </div>
        </div>
        {bottom}
      </div>
    )
  }

  // --- Crown win: full gold celebration, copy tailored to steal vs first-claim ---
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.sun,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: C.ink,
        padding: '0 30px 34px',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: c.left,
              top: 0,
              width: c.w,
              height: c.h,
              background: c.bg,
              borderRadius: c.round ? '50%' : 0,
              animation: `ombraConfetti ${c.dur}s ease-in ${c.delay}s forwards`,
            }}
          />
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
        <CrownBadge size={140} />
        <div style={mono(12, { letterSpacing: '.24em', textTransform: 'uppercase', marginTop: 22, animation: 'ombraFadeUp .5s .2s both' })}>
          {stolen ? t('celebrate.crownStolen') : t('celebrate.crownClaimed')}
        </div>
        <div
          style={display(50, {
            lineHeight: 0.86,
            letterSpacing: '-.03em',
            textTransform: 'uppercase',
            marginTop: 10,
            animation: 'ombraFadeUp .5s .3s both',
          })}
        >
          {stolen ? (
            <>
              {t('celebrate.youStole1')}
              <br />
              {t('celebrate.youStole2')}
            </>
          ) : (
            <>
              {t('celebrate.youClaimed1')}
              <br />
              {t('celebrate.youClaimed2')}
            </>
          )}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 10, animation: 'ombraFadeUp .5s .4s both' }}>
          {t('celebrate.terraceYours', { terrace: terraceName })}
        </div>
        <div
          style={{
            marginTop: 20,
            background: C.ink,
            color: C.sun,
            ...display(40),
            borderRadius: 16,
            padding: '12px 30px',
            animation: 'ombraFadeUp .5s .45s both',
          }}
        >
          {t('celebrate.ptsCaps', { points: disp })}
        </div>
      </div>

      {bottom}
    </div>
  )
}
