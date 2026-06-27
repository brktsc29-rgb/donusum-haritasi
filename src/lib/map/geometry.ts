import type { LatLng } from '@/types'

export function parseEwkbHex(hex: string): LatLng[] | LatLng | null {
  if (!hex || typeof hex !== 'string' || hex.length < 18) return null
  try {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
    }
    const view = new DataView(bytes.buffer)
    const le = view.getUint8(0) === 1
    let offset = 1
    const typeFlags = view.getUint32(offset, le)
    offset += 4
    const hasSRID = (typeFlags & 0x20000000) !== 0
    const hasZ = (typeFlags & 0x80000000) !== 0
    const geomType = typeFlags & 0xFFFF
    if (hasSRID) offset += 4

    if (geomType === 1) {
      const lng = view.getFloat64(offset, le); offset += 8
      const lat = view.getFloat64(offset, le)
      return { lat, lng }
    }

    if (geomType === 3) {
      const numRings = view.getUint32(offset, le); offset += 4
      if (numRings === 0) return []
      const numPts = view.getUint32(offset, le); offset += 4
      const coords: LatLng[] = []
      for (let i = 0; i < numPts; i++) {
        const lng = view.getFloat64(offset, le); offset += 8
        const lat = view.getFloat64(offset, le); offset += 8
        if (hasZ) offset += 8
        coords.push({ lat, lng })
      }
      if (coords.length > 1) coords.pop()
      return coords
    }
    return null
  } catch {
    return null
  }
}

export function parseGeometry(raw: string | null): LatLng[] {
  if (!raw) return []
  try {
    const geo = JSON.parse(raw)
    if (geo.type === 'Polygon' && geo.coordinates?.[0]) {
      return geo.coordinates[0].map(([lng, lat]: [number, number]) => ({ lat, lng }))
    }
  } catch { /* not JSON */ }
  const result = parseEwkbHex(raw)
  if (Array.isArray(result)) return result
  return []
}

export function parseCenterPoint(raw: string | null): LatLng | null {
  if (!raw) return null
  try {
    const geo = JSON.parse(raw)
    if (geo.type === 'Point' && geo.coordinates) {
      const [lng, lat] = geo.coordinates
      return { lat, lng }
    }
  } catch { /* not JSON */ }
  const result = parseEwkbHex(raw)
  if (result && !Array.isArray(result)) return result
  return null
}

export function coordsToEwkt(coords: LatLng[]): string {
  const ring = [...coords, coords[0]].map((c) => `${c.lng} ${c.lat}`).join(',')
  return `SRID=4326;POLYGON((${ring}))`
}

export function centerToEwkt(latlng: LatLng): string {
  return `SRID=4326;POINT(${latlng.lng} ${latlng.lat})`
}
