import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { C, display, mono } from '../ui/tokens'
import Avatar from '../ui/Avatar'
import Crown from '../ui/Crown'
import { getUser, type UserProfile } from '../lib/api'
import { getLang } from '../i18n/lang'

function sinceLabel(iso: string, lang: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(lang, { month: 'short', year: '2-digit' }).replace(' ', " '")
}
function ago(iso: string, t: TFunction): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3_600_000)
  if (h < 1) return t('common.justNow')
  if (h < 24) return t('common.hoursAgo', { count: h })
  return t('common.daysAgo', { count: Math.floor(h / 24) })
}

function Tile({ big, label, sun }: { big: string; label: string; sun?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        background: sun ? C.sun : C.cream,
        border: `2.5px solid ${C.ink}`,
        borderRadius: 14,
        padding: 13,
      }}
    >
      <div style={display(24)}>{big}</div>
      <div style={{ fontSize: 11 }}>{label}</div>
    </div>
  )
}

export default function PublicProfile({
  handle,
  onBack,
  onOpenTerrace,
}: {
  handle: string
  onBack: () => void
  onOpenTerrace: (id: string) => void
}) {
  const { t } = useTranslation()
  const [u, setU] = useState<UserProfile | null | 'loading'>('loading')

  useEffect(() => {
    setU('loading')
    getUser(handle).then((r) => setU(r))
  }, [handle])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.cream,
        color: C.ink,
        display: 'flex',
        flexDirection: 'column',
        padding: 'max(56px, calc(env(safe-area-inset-top) + 40px)) 22px 24px',
        animation: 'ombraSlideIn .3s both',
      }}
    >
      <button
        onClick={onBack}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', ...display(22), cursor: 'pointer' }}
      >
        ←
      </button>

      {u === 'loading' && <div style={mono(12, { color: C.muted, marginTop: 24 })}>{t('common.loading')}</div>}
      {u === null && <div style={mono(13, { color: C.muted, marginTop: 24 })}>{t('profile.notFound')}</div>}

      {u && u !== 'loading' && (
        <div className="ombra-scroll" style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
            <Avatar name={u.handle} src={u.avatarUrl} size={68} ring={C.ink} />
            <div>
              <div style={display(26)}>@{u.handle}</div>
              <div style={mono(11, { color: C.muted })}>
                {t('profile.shadeHunterSince', { since: sinceLabel(u.joinedAt, getLang()) })}
                {u.topBarri ? ` · ${u.topBarri}` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <Tile big={String(u.crowns)} label={t('profile.crownsNow')} sun />
            <Tile big={String(u.points7d)} label={t('profile.ptsThisWeek')} />
            <Tile big={String(u.checkinsAll)} label={t('profile.checkins')} />
          </div>

          <div style={mono(11, { letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted2, marginTop: 22 })}>
            {t('profile.recentCheckins')}
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {u.recent.length === 0 && <div style={mono(12, { color: C.muted })}>{t('profile.noCheckinsYet')}</div>}
            {u.recent.map((r, i) => (
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
                <Crown size={15} fill={C.sun} stroke={C.ink} />
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
      )}
    </div>
  )
}
