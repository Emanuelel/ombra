import type { CSSProperties } from 'react'
import { C } from './tokens'

type Tab = 'map' | 'boards' | 'profile'

const navStyle = (active: boolean): CSSProperties => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  fontFamily: "'Archivo', sans-serif",
  fontWeight: 800,
  fontSize: 11,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  color: active ? C.sun : C.muted2,
})

export default function TabBar({
  active,
  onMap,
  onBoards,
  onProfile,
}: {
  active: Tab
  onMap: () => void
  onBoards: () => void
  onProfile: () => void
}) {
  return (
    <div
      style={{
        height: 60,
        flexShrink: 0,
        background: C.ink,
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <button onClick={onMap} style={navStyle(active === 'map')}>
        <span style={{ fontSize: 18 }}>◎</span>Map
      </button>
      <button onClick={onBoards} style={navStyle(active === 'boards')}>
        <span style={{ fontSize: 18 }}>♛</span>Boards
      </button>
      <button onClick={onProfile} style={navStyle(active === 'profile')}>
        <span style={{ fontSize: 18 }}>◍</span>You
      </button>
    </div>
  )
}
