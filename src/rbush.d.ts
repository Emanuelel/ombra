declare module 'rbush' {
  export interface BBox {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  export default class RBush<T = BBox> {
    constructor(maxEntries?: number)
    insert(item: T): this
    load(items: ReadonlyArray<T>): this
    search(bbox: BBox): T[]
    all(): T[]
    clear(): this
    remove(item: T, equals?: (a: T, b: T) => boolean): this
  }
}
