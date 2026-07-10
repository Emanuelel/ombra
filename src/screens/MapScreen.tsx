import { useTranslation } from 'react-i18next'
import { C, display, mono } from '../ui/tokens'
import MapView, { type Bounds, type Camera } from '../components/MapView'
import type { ShadeInfo, Terrace } from '../types'

function fmt(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export default function MapScreen({
  terraces,
  info,
  minutes,
  setMinutes,
  onSelect,
  onView,
  initialCamera,
  onCamera,
}: {
  terraces: Terrace[]
  info: Record<string, ShadeInfo>
  minutes: number
  setMinutes: (m: number) => void
  onSelect: (id: string) => void
  onView: (b: Bounds) => void
  initialCamera?: Camera | null
  onCamera?: (c: Camera) => void
}) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        animation: 'ombraSlideIn .3s both',
        padding: '4px 18px 18px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={display(34, { lineHeight: 0.85 })}>OMBRA</div>
        <div style={mono(11, { color: C.muted, paddingBottom: 5 })}>{t('map.shadeNearYou')}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div
          style={{
            background: C.ink,
            color: C.sun,
            borderRadius: 12,
            padding: '9px 13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <span>{t('map.shadeAt', { time: fmt(minutes) })}</span>
          <span style={mono(11, { color: C.cream })}>{t('map.dragTime')}</span>
        </div>
        <input
          className="time-slider"
          type="range"
          min={0}
          max={1439}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          aria-label={t('map.timeOfDay')}
          style={{
            background: `linear-gradient(90deg, ${C.sun} ${(minutes / 1439) * 100}%, ${C.mapBase} ${(minutes / 1439) * 100}%)`,
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 340,
          marginTop: 12,
          border: `2px solid ${C.ink}`,
          borderRadius: 18,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <MapView
          terraces={terraces}
          info={info}
          onSelect={onSelect}
          onView={onView}
          initialCamera={initialCamera}
          onCamera={onCamera}
        />
      </div>
    </div>
  )
}
