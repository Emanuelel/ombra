import { useEffect, useState } from 'react'
import { C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import Avatar from '../ui/Avatar'
import { BASE_POINTS } from '../lib/scoring'
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
  const [board, setBoard] = useState<LbRow[] | null>(null)
  const [isFav, setIsFav] = useState(false)
  useEffect(() => {
    let alive = true
    setBoard(null)
    getLeaderboard('terrace', terrace.id, 'week').then((r) => alive && setBoard(r))
    if (token) getFavorites(token).then((fs) => alive && setIsFav(fs.some((f) => f.kind === 'terrace' && f.ref === terrace.id)))
    return () => {
      alive = false
    }
  }, [terrace.id, token])

  async function toggleFav() {
    if (!token) return
    const on = !isFav
    setIsFav(on)
    await toggleFavorite(token, { kind: 'terrace', ref: terrace.id, label: terrace.name, on })
  }
  const points = Math.max(1, Math.round(BASE_POINTS * bonus))
  const shaded = percent >= 50
  const meta = [terrace.barri || 'Barcelona', terrace.tables ? `${terrace.tables} tables outside` : null]
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
          aria-label={isFav ? 'Saved to your bars' : 'Save this bar'}
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
          <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{meta}</div>
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
              {shaded ? 'in the shade right now' : 'in full sun right now'}
            </div>
            <div style={{ fontSize: 12, color: C.muted2 }}>
              {until ? `stays shaded until ${until}` : shaded ? 'shaded for a while yet' : 'find a shadier spot nearby'}
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
                @{board[0].displayName} rules this terrace
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
            <div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>No crown yet — claim it 👑</div>
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, ...mono(12, { color: C.muted2 }) }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: C.green,
              boxShadow: '0 0 0 4px rgba(31,157,85,.2)',
            }}
          />
          GPS-checked · you must be within 25m to check in
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: C.cream,
              border: `2px solid ${C.ink}`,
              borderRadius: 12,
              padding: '9px 14px',
              fontWeight: 800,
              fontSize: 13,
              color: C.ink,
              textDecoration: 'none',
              boxShadow: `3px 3px 0 ${C.ink}`,
            }}
          >
            📍 Open in Google Maps ↗
          </a>
        </div>

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
            <div style={mono(10, { color: C.muted3, letterSpacing: '.1em' })}>THIS CHECK-IN IS WORTH</div>
            <div style={display(28, { color: C.sun })}>+{points} pts</div>
          </div>
          <div style={{ textAlign: 'right', ...mono(11, { color: C.muted3 }) }}>
            {BASE_POINTS} base
            <br />
            <span style={{ color: C.sun }}>×{bonus} shade bonus</span>
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
            style={{
              width: '100%',
              background: C.tomato,
              color: C.cream,
              border: `2.5px solid ${C.ink}`,
              borderRadius: 16,
              padding: 18,
              ...display(18, { textTransform: 'uppercase' }),
              boxShadow: `5px 5px 0 ${C.ink}`,
              cursor: 'pointer',
            }}
          >
            Check in · steal the crown
          </button>
        </div>
      </div>
    </div>
  )
}
