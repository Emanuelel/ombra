// Shade-coverage area: Eixample + Gràcia (S) + Ciutat Vella (N) + Sant Antoni.
// bbox = [south, west, north, east] (Overpass order).
export const BBOX: [number, number, number, number] = [41.375, 2.15, 41.415, 2.19]

// Map centre (Gràcia / Eixample border - dense terrace core).
export const CENTER: [number, number] = [41.4025, 2.1635]
export const DEFAULT_ZOOM = 16

export const SHADE_COLORS: Record<string, string> = {
  shade: '#16a34a', // green - you want this
  'low-sun': '#f59e0b', // amber - sun low on the horizon
  sun: '#f97316', // orange - full sun
  night: '#64748b', // slate - sun below horizon
}
