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
        flexShrink: 0,
        background: C.ink,
        display: 'flex',
        alignItems: 'center',
        // Size to the icons/labels, then reserve the iPhone home-indicator area BELOW them
        // (a fixed height would let the safe-area padding clip the labels on notched phones).
        padding: '10px 10px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
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
