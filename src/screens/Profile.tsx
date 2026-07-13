import { useEffect, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import Avatar from '../ui/Avatar'
import { getUser, updateAvatar, type UserProfile } from '../lib/api'
import { fileToDataUrl } from '../lib/image'
import { getLang } from '../i18n/lang'

// Solid 8-point cog (approved reference). Rendered ~22px inside the outlined gear button.
function GearIcon() {
  return (
    <svg viewBox="0 0 48 48" width={22} height={22} fill={C.ink}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.4 2.4A2 2 0 0 1 22.4 1h3.2a2 2 0 0 1 2 1.4l1.5 5.2c1 .3 1.9.7 2.8 1.2l4.8-2.6a2 2 0 0 1 2.4.3l2.3 2.3a2 2 0 0 1 .3 2.4l-2.6 4.8c.5.9.9 1.8 1.2 2.8l5.2 1.5a2 2 0 0 1 1.4 2v3.2a2 2 0 0 1-1.4 2l-5.2 1.5c-.3 1-.7 1.9-1.2 2.8l2.6 4.8a2 2 0 0 1-.3 2.4l-2.3 2.3a2 2 0 0 1-2.4.3l-4.8-2.6c-.9.5-1.8.9-2.8 1.2l-1.5 5.2a2 2 0 0 1-2 1.4h-3.2a2 2 0 0 1-2-1.4l-1.5-5.2c-1-.3-1.9-.7-2.8-1.2l-4.8 2.6a2 2 0 0 1-2.4-.3l-2.3-2.3a2 2 0 0 1-.3-2.4l2.6-4.8c-.5-.9-.9-1.8-1.2-2.8l-5.2-1.5A2 2 0 0 1 1 25.6v-3.2a2 2 0 0 1 1.4-2l5.2-1.5c.3-1 .7-1.9 1.2-2.8L6.2 11.3a2 2 0 0 1 .3-2.4l2.3-2.3a2 2 0 0 1 2.4-.3l4.8 2.6c.9-.5 1.8-.9 2.8-1.2l1.5-5.2ZM24 33a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
      />
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

/**
 * Profile = the trophy case: identity + achievement only. Everything cold
 * (language, support, legal, logout) lives behind the gear, in Settings.
 */
export default function Profile({
  handle,
  avatar,
  token,
  onAvatarChange,
  onOpenTerrace,
  onOpenSettings,
}: {
  handle: string
  avatar: string | null
  token: string | null
  onAvatarChange: (v: string | null) => void
  onOpenTerrace: (id: string) => void
  onOpenSettings: () => void
}) {
  const { t } = useTranslation()
  const [u, setU] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    getUser(handle).then(setU)
  }, [handle])

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

  const crowns = u?.crowns ?? 0

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
      {/* Header: avatar · identity · gear → Settings */}
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={display(24)}>@{handle}</div>
          <div style={mono(11, { color: C.muted })}>
            {u ? t('profile.shadeHunterSince', { since: sinceLabel(u.joinedAt, getLang()) }) : t('profile.shadeHunter')}
            {u?.topBarri ? ` · ${u.topBarri}` : ''}
          </div>
          {err && <div style={mono(10, { color: C.tomato, marginTop: 4 })}>{err}</div>}
        </div>
        <button
          onClick={onOpenSettings}
          aria-label={t('profile.openSettings')}
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            margin: -3,
            padding: 0,
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: `2px solid ${C.ink}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GearIcon />
          </span>
        </button>
      </div>

      {/* Crowns hero — the headline number, or a first-run nudge for new hunters. */}
      <div
        style={{
          marginTop: 18,
          background: C.ink,
          color: C.cream,
          borderRadius: 18,
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {crowns > 0 ? (
          <div>
            <div style={display(46, { color: C.sun, lineHeight: 0.85 })}>{crowns}</div>
            <div style={mono(11, { color: C.muted3 })}>{t('profile.crownsHeldNow')}</div>
          </div>
        ) : (
          <div style={{ maxWidth: 210 }}>
            <div style={display(19, { color: C.sun, lineHeight: 1.05 })}>{t('profile.firstCrownTitle')}</div>
            <div style={mono(11, { color: C.muted3, marginTop: 6, lineHeight: 1.4 })}>{t('profile.firstCrownSub')}</div>
          </div>
        )}
        <Crown size={50} fill={C.sun} />
      </div>

      {/* Stat pair */}
      <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, background: C.sun, border: `2.5px solid ${C.ink}`, borderRadius: 14, padding: 14 }}>
          <div style={display(28, { lineHeight: 0.85 })}>{u?.points7d ?? 0}</div>
          <div style={{ fontSize: 11, marginTop: 5 }}>{t('profile.ptsThisWeek')}</div>
        </div>
        <div style={{ flex: 1, background: C.creamCard, border: `2.5px solid ${C.ink}`, borderRadius: 14, padding: 14 }}>
          <div style={display(28, { lineHeight: 0.85 })}>{u?.checkinsAll ?? 0}</div>
          <div style={{ fontSize: 11, marginTop: 5 }}>{t('profile.checkins')}</div>
        </div>
      </div>

      {/* Your terraces — the places you've been hunting. */}
      <div style={mono(11, { letterSpacing: '.14em', textTransform: 'uppercase', color: C.muted2, marginTop: 20 })}>
        {t('profile.yourTerraces')}
      </div>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {u && u.recent.length === 0 && <div style={mono(12, { color: C.muted })}>{t('profile.startStreak')}</div>}
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
              background: C.creamCard,
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
    </div>
  )
}
