import RBush from 'rbush'
import type { Building } from '../types'

interface Item {
  minX: number
  minY: number
  maxX: number
  maxY: number
  b: Building
}

const M_PER_DEG = 111320

/** R-tree over building footprints for fast "buildings near this point" queries. */
export class BuildingIndex {
  private tree = new RBush<Item>()

  constructor(buildings: Building[]) {
    const items: Item[] = buildings.map((b) => {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const [lon, lat] of b.ring) {
        if (lon < minX) minX = lon
        if (lon > maxX) maxX = lon
        if (lat < minY) minY = lat
        if (lat > maxY) maxY = lat
      }
      return { minX, minY, maxX, maxY, b }
    })
    this.tree.load(items)
  }

  nearby(lat: number, lon: number, radiusM: number): Building[] {
    const dLat = radiusM / M_PER_DEG
    const dLon = radiusM / (M_PER_DEG * Math.cos((lat * Math.PI) / 180))
    return this.tree
      .search({ minX: lon - dLon, minY: lat - dLat, maxX: lon + dLon, maxY: lat + dLat })
      .map((i) => i.b)
  }
}
