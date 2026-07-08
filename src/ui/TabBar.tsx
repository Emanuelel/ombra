import type { CSSProperties } from 'react'
import { C } from './tokens'

type Tab = 'map' | 'boards' | 'profile'

const navStyle = (active: boolean): CSSProperties => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 0',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  color: active ? C.sun : C.muted2,
})

const svg = {
  width: 27,
  height: 27,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function MapIcon() {
  return (
    <svg {...svg}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}
function CrownIcon() {
  return (
    <svg {...svg}>
      <path d="M3 16.5V6l5 4 4-5 4 5 5-4v10.5Z" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

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
        // Size to the icons, then reserve the iPhone home-indicator area below them.
        padding: '12px 10px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
      }}
    >
      <button onClick={onMap} style={navStyle(active === 'map')} aria-label="Map">
        <MapIcon />
      </button>
      <button onClick={onBoards} style={navStyle(active === 'boards')} aria-label="Boards">
        <CrownIcon />
      </button>
      <button onClick={onProfile} style={navStyle(active === 'profile')} aria-label="You">
        <PersonIcon />
      </button>
    </div>
  )
}
