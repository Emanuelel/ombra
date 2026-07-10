import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import Avatar from '../ui/Avatar'
import {
  getFavorites,
  getLeaderboard,
  getUser,
  toggleFavorite,
  type Favorite,
  type LbRow,
} from '../lib/api'
import terracesData from '../data/terraces-all.json'
import type { Terrace } from '../types'

const terraces = terracesData as Terrace[]
type Tab = 'barri' | 'terrace' | 'city' | 'friends'
type Picker = 'barri' | 'terrace' | null

const tabStyle = (active: boolean): CSSProperties => ({
  flex: '0 0 auto',
  maxWidth: 150,
  padding: '9px 15px',
  borderRadius: 11,
  fontFamily: "'Archivo', sans-serif",
  fontWeight: 800,
  fontSize: 13,
  border: `2px solid ${C.ink}`,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  background: active ? C.ink : C.cream,
  color: active ? C.sun : C.ink,
})

function rowStyleFor(crown: boolean, you: boolean): CSSProperties {
  const base: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 13px',
    borderRadius: 13,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    background: 'none',
  }
  if (crown) return { ...base, background: C.sun, border: `2.5px solid ${C.ink}` }
  if (you) return { ...base, border: `2px dashed ${C.ink}` }
  return { ...base, border: '2px solid transparent' }
}

export default function Boards({
  handle,
  avatar,
  token,
  onUser,
  onOpenTerrace,
}: {
  handle: string
  avatar: string | null
  token: string | null
  onUser: (handle: string) => void
  onOpenTerrace: (id: string) => void
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('city')
  const [barri, setBarri] = useState<string | null>(null)
  const [terrace, setTerrace] = useState<{ id: string; name: string } | null>(null)
  const [picker, setPicker] = useState<Picker>(null)
  const [rows, setRows] = useState<LbRow[] | null>(null)
  const [favs, setFavs] = useState<Favorite[]>([])

  useEffect(() => {
    if (token) getFavorites(token).then(setFavs)
  }, [token])

  function openFav(f: Favorite) {
    if (f.kind === 'barri') {
      setBarri(f.ref)
      setTab('barri')
    } else {
      setTerrace({ id: f.ref, name: f.label })
      setTab('terrace')
    }
  }

  const currentFav: Favorite | null =
    tab === 'barri' && barri
      ? { kind: 'barri', ref: barri, label: barri }
      : tab === 'terrace' && terrace
        ? { kind: 'terrace', ref: terrace.id, label: terrace.name }
        : null
  const isFav = !!currentFav && favs.some((f) => f.kind === currentFav.kind && f.ref === currentFav.ref)

  async function toggleCurrent() {
    if (!currentFav || !token) return
    const on = !isFav
    setFavs((prev) =>
      on ? [currentFav, ...prev] : prev.filter((f) => !(f.kind === currentFav.kind && f.ref === currentFav.ref)),
    )
    await toggleFavorite(token, { ...currentFav, on })
  }

  const barris = useMemo(() => {
    const set = new Set<string>()
    for (const t of terraces) if (t.barri) set.add(t.barri)
    return [...set].sort()
  }, [])

  useEffect(() => {
    if (!handle) return
    getUser(handle).then((u) => {
      if (u?.topBarri) {
        setBarri(u.topBarri)
        setTab('barri')
      } else setBarri((b) => b ?? barris[0] ?? null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle])

  useEffect(() => {
    if (tab === 'friends') return
    let scope: string
    let id: string | undefined
    if (tab === 'city') scope = 'city'
    else if (tab === 'barri') {
      if (!barri) return setRows([])
      scope = 'barri'
      id = barri
    } else {
      if (!terrace) return setRows([])
      scope = 'terrace'
      id = terrace.id
    }
    let alive = true
    setRows(null)
    getLeaderboard(scope, id, 'week').then((r) => alive && setRows(r))
    return () => {
      alive = false
    }
  }, [tab, barri, terrace, token])

  const title =
    tab === 'city'
      ? t('boards.titleCity')
      : tab === 'barri'
        ? (barri ?? t('boards.titleBarri'))
        : tab === 'terrace'
          ? (terrace?.name ?? t('boards.titleBar'))
          : t('boards.titleFriends')

  return (
    <div style={{ animation: 'ombraSlideIn .3s both', padding: '16px 18px 20px' }}>
      <div style={display(30, { lineHeight: 0.9 })}>{t('boards.title')}</div>

      <div className="ombra-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '20px -18px 0', padding: '0 18px 4px' }}>
        <button
          onClick={() => (tab === 'barri' ? setPicker('barri') : setTab('barri'))}
          style={tabStyle(tab === 'barri')}
        >
          {tab === 'barri' && barri ? t('boards.barriPick', { barri }) : t('boards.myBarri')}
        </button>
        <button
          onClick={() => (terrace && tab !== 'terrace' ? setTab('terrace') : setPicker('terrace'))}
          style={tabStyle(tab === 'terrace')}
        >
          {tab === 'terrace' && terrace ? t('boards.barPick', { name: terrace.name }) : t('boards.aBar')}
        </button>
        <button onClick={() => setTab('city')} style={tabStyle(tab === 'city')}>
          {t('boards.allBcn')}
        </button>
        <button onClick={() => setTab('friends')} style={tabStyle(tab === 'friends')}>
          {t('boards.friends')}
        </button>
        {favs.map((f) => {
          const active =
            (f.kind === 'barri' && tab === 'barri' && barri === f.ref) ||
            (f.kind === 'terrace' && tab === 'terrace' && terrace?.id === f.ref)
          return (
            <button key={f.kind + f.ref} onClick={() => openFav(f)} style={tabStyle(active)}>
              {f.kind === 'barri' ? '★ 🏘 ' : '★ 📍 '}
              {f.label}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {tab === 'terrace' && terrace ? (
          <button
            onClick={() => onOpenTerrace(terrace.id)}
            aria-label={`Open ${terrace.name}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: C.ink,
              ...display(20),
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
            <span style={{ flexShrink: 0, fontSize: 15 }}>↗</span>
          </button>
        ) : (
          <div style={{ ...display(20), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {title}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {currentFav && (
            <button
              onClick={toggleCurrent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: isFav ? C.sun : C.cream,
                border: `2px solid ${C.ink}`,
                borderRadius: 999,
                padding: '5px 11px',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {isFav ? t('boards.saved') : t('boards.save')}
            </button>
          )}
          <div style={mono(10, { letterSpacing: '.1em', textTransform: 'uppercase', color: C.greenText })}>
            {t('boards.liveTag')}
          </div>
        </div>
      </div>

      {tab === 'friends' ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: C.muted }}>
          <Crown size={44} fill={C.sun} stroke={C.ink} />
          <div style={{ ...display(20), color: C.ink, marginTop: 14 }}>{t('boards.friendsSoon')}</div>
          <div style={{ fontSize: 14, lineHeight: 1.4, marginTop: 8, maxWidth: 260, marginInline: 'auto' }}>
            {t('boards.friendsSoonBody')}
          </div>
        </div>
      ) : rows === null ? (
        <div style={mono(12, { color: C.muted, textAlign: 'center', marginTop: 24 })}>{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        <div style={mono(12, { color: C.muted, textAlign: 'center', marginTop: 24 })}>
          {t('boards.noCheckins')}
        </div>
      ) : (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rows.map((r, i) => {
            const name = r.displayName ?? 'hunter'
            const you = name === handle
            return (
              <button key={i} onClick={() => onUser(name)} style={rowStyleFor(i === 0, you)}>
                <span style={{ width: 14, textAlign: 'center', ...display(14, { color: i === 0 ? C.ink : C.muted }) }}>
                  {i + 1}
                </span>
                <Avatar name={you ? handle : name} src={you ? avatar : r.avatarUrl} size={34} />
                <span style={{ flex: 1, lineHeight: 1.15, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 14 }}>
                    {i === 0 && <Crown size={15} fill={C.ink} />}
                    {you ? t('boards.you', { handle }) : t('boards.handle', { name })}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: C.muted2 }}>
                    {t('boards.checkinsWeek', { count: r.checkins })}
                  </span>
                </span>
                <span style={display(16)}>{r.points}</span>
              </button>
            )
          })}
        </div>
      )}

      {picker === 'barri' && (
        <PickerSheet
          title={t('boards.pickBarri')}
          placeholder={t('boards.searchBarri')}
          items={barris.map((b) => ({ key: b, primary: b }))}
          onPick={(k) => {
            setBarri(k)
            setTab('barri')
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'terrace' && (
        <PickerSheet
          title={t('boards.findBar')}
          placeholder={t('boards.searchBar')}
          items={terraces.map((tr) => ({
            key: tr.id,
            primary: tr.name,
            secondary: `${tr.barri ?? t('common.barcelona')}${tr.address ? ` · ${tr.address}` : ''}`,
          }))}
          onPick={(id, primary) => {
            setTerrace({ id, name: primary })
            setTab('terrace')
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}

interface PickerItem {
  key: string
  primary: string
  secondary?: string
}

function PickerSheet({
  title,
  placeholder,
  items,
  onPick,
  onClose,
}: {
  title: string
  placeholder: string
  items: PickerItem[]
  onPick: (key: string, primary: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const filtered = s
      ? items.filter((it) => it.primary.toLowerCase().includes(s) || (it.secondary ?? '').toLowerCase().includes(s))
      : items
    return filtered.slice(0, 50)
  }, [q, items])

  // Pin the sheet to the visible viewport so the results list stays above the on-screen
  // keyboard (iOS doesn't shrink a fixed inset:0 element when the keyboard opens).
  const [vp, setVp] = useState<{ top: number; height: number } | null>(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setVp({ top: vv.offsetTop, height: vv.height })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: vp ? vp.top : 0,
        height: vp ? vp.height : '100%',
        background: C.cream,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        padding: 'max(52px, calc(env(safe-area-inset-top) + 36px)) 18px 18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', ...display(22), cursor: 'pointer' }}>
          ←
        </button>
        <div style={display(22)}>{title}</div>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoFocus
        style={{
          marginTop: 14,
          width: '100%',
          background: '#fff',
          border: `2.5px solid ${C.ink}`,
          borderRadius: 12,
          padding: '13px 15px',
          fontSize: 16,
          fontWeight: 700,
          outline: 'none',
          boxShadow: `4px 4px 0 ${C.ink}`,
        }}
      />
      <div className="ombra-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
        {list.length === 0 && <div style={mono(12, { color: C.muted })}>{t('boards.nothingFound')}</div>}
        {list.map((it) => (
          <button
            key={it.key}
            onClick={() => onPick(it.key, it.primary)}
            style={{
              textAlign: 'left',
              background: C.cream,
              border: `2px solid ${C.ink}`,
              borderRadius: 12,
              padding: '11px 14px',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 14 }}>{it.primary}</div>
            {it.secondary && <div style={mono(11, { color: C.muted2 })}>{it.secondary}</div>}
          </button>
        ))}
      </div>
    </div>
  )
}
