import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import Avatar from '../ui/Avatar'
import { BASE_POINTS, PROXIMITY_M, ACCURACY_SLACK_M, MAX_ACCURACY_M } from '../lib/scoring'
import { distM } from '../lib/sun'
import { getFavorites, getLeaderboard, toggleFavorite, type LbRow } from '../lib/api'
import type { Terrace as TerraceT } from '../types'

export default function Terrace({
  terrace,
  percent,
  bonus,
  until,
  token,
  error,
  onBack,
  onCheckIn,
  onUser,
}: {
  terrace: TerraceT
  percent: number
  bonus: number
  until: string | null
  token: string | null
  error: string | null
  onBack: () => void
  onCheckIn: () => void
  onUser: (handle: string) => void
}) {
  const { t } = useTranslation()
  const [board, setBoard] = useState<LbRow[] | null>(null)
  const [isFav, setIsFav] = useState(false)
  // Proactive proximity gate: watch the user's location while this screen is open so the
  // check-in CTA reflects whether they can actually check in - no tap-then-fail surprise.
  const [gate, setGate] = useState<'locating' | 'denied' | 'poor' | 'far' | 'ok'>('locating')
  const [dist, setDist] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    setBoard(null)
    getLeaderboard('terrace', terrace.id, 'week').then((r) => alive && setBoard(r))
    if (token) getFavorites(token).then((fs) => alive && setIsFav(fs.some((f) => f.kind === 'terrace' && f.ref === terrace.id)))
    return () => {
      alive = false
    }
  }, [terrace.id, token])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGate('denied')
      return
    }
    let alive = true
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (!alive) return
        const acc = pos.coords.accuracy
        const d = distM(pos.coords.longitude, pos.coords.latitude, terrace.lon, terrace.lat)
        setDist(d)
        // Same rule the server enforces (api/check-in.ts): forgive up to the device's
        // reported accuracy (capped) around the 25m gate; reject wildly imprecise fixes.
        if (acc > MAX_ACCURACY_M) return setGate('poor')
        setGate(d <= PROXIMITY_M + Math.min(acc, ACCURACY_SLACK_M) ? 'ok' : 'far')
      },
      () => alive && setGate('denied'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => {
      alive = false
      navigator.geolocation.clearWatch(id)
    }
  }, [terrace.id, terrace.lat, terrace.lon])

  async function toggleFav() {
    if (!token) return
    const on = !isFav
    setIsFav(on)
    await toggleFavorite(token, { kind: 'terrace', ref: terrace.id, label: terrace.name, on })
  }
  const points = Math.max(1, Math.round(BASE_POINTS * bonus))
  const shaded = percent >= 50

  const ready = gate === 'ok'
  const ctaLabel =
    gate === 'ok'
      ? t('terrace.ctaReady')
      : gate === 'locating'
        ? t('terrace.ctaLocating')
        : gate === 'denied'
          ? t('terrace.ctaDenied')
          : gate === 'poor'
            ? t('terrace.ctaPoor')
            : dist
              ? t('terrace.ctaFarDist', { dist: Math.round(dist) })
              : t('terrace.ctaFar')
  const meta = [
    terrace.barri || t('common.barcelona'),
    terrace.tables ? t('terrace.tablesOutside', { count: terrace.tables }) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  // Open the real place in Google Maps by searching its name/address, not raw coords
  // (a bare lat,lon just drops a pin). Named venues search by name; the rest by address.
  const mapsQuery = (
    terrace.named
      ? `${terrace.name}, ${terrace.address ?? ''} Barcelona`
      : `${terrace.address ?? terrace.name}, ${terrace.barri ?? ''} Barcelona`
  )
    .replace(/\s+/g, ' ')
    .trim()
  const mapsHref = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : `https://www.google.com/maps/search/?api=1&query=${terrace.lat}%2C${terrace.lon}`

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.cream,
        display: 'flex',
        flexDirection: 'column',
        color: C.ink,
        animation: 'ombraSlideIn .3s both',
      }}
    >
      <div
        style={{
          height: 230,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${C.sun} 0%, ${C.tomato} 100%)`,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ position: 'absolute', top: 20, right: -18, opacity: 0.16, transform: 'rotate(-8deg)' }}>
          <Crown size={200} fill={C.cream} />
        </div>
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 48,
            left: 18,
            width: 38,
            height: 38,
            background: C.cream,
            border: `2.5px solid ${C.ink}`,
            borderRadius: '50%',
            ...display(18),
            cursor: 'pointer',
          }}
        >
          ←
        </button>
        <button
          onClick={toggleFav}
          aria-label={isFav ? t('terrace.savedAria') : t('terrace.saveAria')}
          style={{
            position: 'absolute',
            top: 48,
            right: 18,
            width: 38,
            height: 38,
            background: isFav ? C.sun : C.cream,
            border: `2.5px solid ${C.ink}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 19,
            lineHeight: 1,
            color: C.ink,
            cursor: 'pointer',
          }}
        >
          {isFav ? '★' : '☆'}
        </button>
        <div style={{ width: '100%', padding: 18, background: 'linear-gradient(transparent,rgba(23,19,12,.6))' }}>
          <div style={display(34, { color: C.cream, lineHeight: 0.92 })}>{terrace.name}</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, marginTop: 6 }}>{meta}</div>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: C.cream,
              border: `2px solid ${C.ink}`,
              borderRadius: 999,
              padding: '6px 12px',
              fontWeight: 800,
              fontSize: 12,
              color: C.ink,
              textDecoration: 'none',
              boxShadow: `2px 2px 0 ${C.ink}`,
            }}
          >
            {t('terrace.openInMaps')}
          </a>
        </div>
      </div>

      <div
        className="ombra-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 22px', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={display(58, { lineHeight: 0.82, letterSpacing: '-.03em' })}>
            {percent}
            <span style={{ fontSize: 28 }}>%</span>
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>
              {shaded ? t('terrace.inShade') : t('terrace.inSun')}
            </div>
            <div style={{ fontSize: 12, color: C.muted2 }}>
              {until
                ? t('terrace.shadedUntil', { until })
                : shaded
                  ? t('terrace.shadedAWhile')
                  : t('terrace.findShadier')}
            </div>
          </div>
        </div>

        {board && board.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => onUser(board[0].displayName ?? '')}
              style={{
                width: '100%',
                textAlign: 'left',
                background: C.sun,
                border: `2.5px solid ${C.ink}`,
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
              }}
            >
              <Crown size={20} fill={C.ink} />
              <Avatar name={board[0].displayName ?? '?'} src={board[0].avatarUrl} size={30} />
              <div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>
                {t('terrace.rulesThisTerrace', { name: board[0].displayName })}
              </div>
              <div style={mono(11)}>
                {board[0].checkins} · 7d
              </div>
            </button>
            {board.slice(1, 4).map((r, i) => (
              <button
                key={i}
                onClick={() => onUser(r.displayName ?? '')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: '7px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 14, textAlign: 'center', ...mono(12, { color: C.muted }) }}>{i + 2}</span>
                <Avatar name={r.displayName ?? '?'} src={r.avatarUrl} size={26} />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>@{r.displayName}</span>
                <span style={mono(11, { color: C.muted2 })}>{r.checkins} · 7d</span>
              </button>
            ))}
          </div>
        ) : (
          <div
            style={{
              marginTop: 16,
              background: C.sun,
              border: `2.5px solid ${C.ink}`,
              borderRadius: 14,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Crown size={20} fill={C.ink} />
            <div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>{t('terrace.noCrownYet')}</div>
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            background: C.ink,
            borderRadius: 14,
            padding: 15,
            color: C.cream,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={mono(10, { color: C.muted3, letterSpacing: '.1em' })}>{t('terrace.worth')}</div>
            <div style={display(28, { color: C.sun })}>{t('terrace.points', { points })}</div>
          </div>
          <div style={{ textAlign: 'right', ...mono(11, { color: C.muted3 }) }}>
            {t('terrace.base', { base: BASE_POINTS })}
            <br />
            <span style={{ color: C.sun }}>{t('terrace.shadeBonus', { bonus })}</span>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 18 }}>
          {error && (
            <div
              style={{
                marginBottom: 10,
                background: C.tomato,
                color: C.cream,
                border: `2px solid ${C.ink}`,
                borderRadius: 12,
                padding: '10px 14px',
                fontWeight: 700,
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}
          <button
            onClick={onCheckIn}
            disabled={!ready}
            style={{
              width: '100%',
              background: ready ? C.tomato : '#e4d8c1',
              color: ready ? C.cream : C.muted,
              border: `2.5px solid ${ready ? C.ink : C.muted3}`,
              borderRadius: 16,
              padding: 18,
              ...display(ready ? 18 : 14, { textTransform: 'uppercase' }),
              lineHeight: 1.15,
              boxShadow: ready ? `5px 5px 0 ${C.ink}` : 'none',
              cursor: ready ? 'pointer' : 'not-allowed',
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
