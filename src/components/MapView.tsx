import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { BBOX, CENTER, DEFAULT_ZOOM } from '../lib/barcelona'
import { pinColors } from '../lib/shadeTable'
import type { ShadeInfo, Terrace } from '../types'

export interface Bounds {
  s: number
  w: number
  n: number
  e: number
}

function pctIcon(percent: number): L.DivIcon {
  const { bg, fg } = pinColors(percent)
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid #17130c;box-shadow:2px 2px 0 #17130c;display:flex;align-items:center;justify-content:center;font-family:'Archivo',sans-serif;font-weight:800;font-size:10px;color:${fg};">${percent}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// "You are here" location dot (blue = standard location convention; distinct from
// the shade % pins). Pinned to a geo-coordinate so it stays put while you pan.
const youIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:20px;height:20px;">
    <span style="position:absolute;inset:-9px;border-radius:50%;background:rgba(37,99,235,.25);animation:ombraPing 2s ease-out infinite;"></span>
    <span style="position:absolute;inset:0;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function toBounds(b: L.LatLngBounds): Bounds {
  return { s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() }
}

function distMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const rad = Math.PI / 180
  const x = (b[1] - a[1]) * rad * Math.cos(((a[0] + b[0]) / 2) * rad)
  const y = (b[0] - a[0]) * rad
  return Math.sqrt(x * x + y * y) * R
}

function LocateButton({ onFix }: { onFix: (p: [number, number]) => void }) {
  const map = useMap()
  return (
    <button
      onClick={() => {
        // Always pull a fresh fix so "centre on me" is truly current.
        navigator.geolocation?.getCurrentPosition(
          (p) => {
            const pos: [number, number] = [p.coords.latitude, p.coords.longitude]
            onFix(pos)
            map.setView(pos, 16)
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        )
      }}
      title="Centre on me"
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        zIndex: 1000,
        width: 42,
        height: 42,
        borderRadius: '50%',
        background: '#FFF6E4',
        border: '2px solid #17130c',
        boxShadow: '2px 2px 0 #17130c',
        cursor: 'pointer',
        fontSize: 19,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      ◎
    </button>
  )
}

function MapEvents({
  onView,
  onUserPos,
  onCamera,
  restored,
}: {
  onView: (b: Bounds) => void
  onUserPos: (p: [number, number]) => void
  onCamera: (center: [number, number], zoom: number) => void
  restored: boolean
}) {
  // Once the user drags/zooms, never auto-recentre — don't fight their panning.
  const userMoved = useRef(false)
  const reportCamera = () => {
    const c = map.getCenter()
    onCamera([c.lat, c.lng], map.getZoom())
  }
  const map = useMapEvents({
    dragstart: () => {
      userMoved.current = true
    },
    zoomstart: () => {
      userMoved.current = true
    },
    moveend: () => {
      onView(toBounds(map.getBounds()))
      reportCamera()
    },
    zoomend: () => {
      onView(toBounds(map.getBounds()))
      reportCamera()
    },
  })
  // If we restored a saved camera, treat the map as already positioned so the first
  // GPS fix doesn't yank it back to the user's location.
  const didCenter = useRef(restored)
  const lastPos = useRef<[number, number] | null>(null)
  useEffect(() => {
    map.invalidateSize()
    onView(toBounds(map.getBounds()))
    if (!('geolocation' in navigator)) return
    // Live-track the user while the Map tab is open; the watch is cleared on unmount
    // (i.e. when you leave the tab), so we don't drain battery in the background.
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        if (lastPos.current && distMeters(lastPos.current, p) < 4) return // ignore GPS jitter
        lastPos.current = p
        onUserPos(p) // move the "you are here" dot
        // Centre on the user only on the FIRST fix, and only if they haven't panned yet.
        if (didCenter.current || userMoved.current) return
        const [s, w, n, e] = BBOX
        const pad = 0.02
        if (p[0] >= s - pad && p[0] <= n + pad && p[1] >= w - pad && p[1] <= e + pad) {
          map.setView(p, 16)
          didCenter.current = true
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 },
    )
    return () => navigator.geolocation.clearWatch(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])
  return null
}

export interface Camera {
  center: [number, number]
  zoom: number
}

export default function MapView({
  terraces,
  info,
  onSelect,
  onView,
  initialCamera,
  onCamera,
}: {
  terraces: Terrace[]
  info: Record<string, ShadeInfo>
  onSelect: (id: string) => void
  onView: (b: Bounds) => void
  initialCamera?: Camera | null
  onCamera?: (c: Camera) => void
}) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  // Cache icons by shade % so panning doesn't rebuild every marker.
  const iconCache = useMemo(() => new Map<number, L.DivIcon>(), [])
  const iconFor = (percent: number) => {
    let icon = iconCache.get(percent)
    if (!icon) {
      icon = pctIcon(percent)
      iconCache.set(percent, icon)
    }
    return icon
  }

  return (
    <MapContainer
      center={initialCamera?.center ?? CENTER}
      zoom={initialCamera?.zoom ?? DEFAULT_ZOOM}
      zoomControl={false}
      attributionControl={false}
    >
      <MapEvents
        onView={onView}
        onUserPos={setUserPos}
        onCamera={(center, zoom) => onCamera?.({ center, zoom })}
        restored={!!initialCamera}
      />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      {terraces.map((t) => {
        const percent = info[t.id]?.percent ?? 0
        return (
          <Marker
            key={t.id}
            position={[t.lat, t.lon]}
            icon={iconFor(percent)}
            eventHandlers={{ click: () => onSelect(t.id) }}
          />
        )
      })}
      {userPos && <Marker position={userPos} icon={youIcon} interactive={false} zIndexOffset={2000} />}
      <LocateButton onFix={setUserPos} />
    </MapContainer>
  )
}
