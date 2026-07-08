export type ShadeStatus = 'shade' | 'low-sun' | 'sun' | 'night'

export interface ShadeInfo {
  status: ShadeStatus
  percent: number
}

export interface Terrace {
  /** stable id, e.g. "bcn/123" */
  id: string
  /** confident OSM venue name, or the street address as fallback */
  name: string
  /** bar | restaurant | cafe | pub | terrace */
  amenity: string
  lat: number
  lon: number
  /** neighbourhood (from the city licence dataset) */
  barri?: string
  district?: string
  address?: string
  /** licensed table count outside */
  tables?: number
  /** true when `name` is a confident venue name (vs. address fallback) */
  named?: boolean
}

export interface Building {
  id: string
  /** estimated or tagged height in metres */
  height: number
  /** outer ring as [lon, lat] pairs (closed) */
  ring: [number, number][]
  /** precomputed centroid [lon, lat] for fast proximity filtering */
  c: [number, number]
}
