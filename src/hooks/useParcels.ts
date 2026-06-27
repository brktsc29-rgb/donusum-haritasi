'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Parcel, ParcelMapFeature, LatLng } from '@/types'

// Supabase/PostgREST returns GEOMETRY columns as EWKB hex strings.
// This parser handles EWKB (little-endian) for POINT and POLYGON.
function parseEwkbHex(hex: string): LatLng[] | LatLng | null {
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
    const hasZ   = (typeFlags & 0x80000000) !== 0
    const geomType = typeFlags & 0xFFFF
    if (hasSRID) offset += 4

    if (geomType === 1) {
      // POINT
      const lng = view.getFloat64(offset, le); offset += 8
      const lat = view.getFloat64(offset, le)
      return { lat, lng }
    }

    if (geomType === 3) {
      // POLYGON — read exterior ring only
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
      if (coords.length > 1) coords.pop() // remove closing duplicate
      return coords
    }
    return null
  } catch {
    return null
  }
}

function parseGeometry(raw: string | null): LatLng[] {
  if (!raw) return []
  // Try GeoJSON (legacy / TEXT column case)
  try {
    const geo = JSON.parse(raw)
    if (geo.type === 'Polygon' && geo.coordinates?.[0]) {
      return geo.coordinates[0].map(([lng, lat]: [number, number]) => ({ lat, lng }))
    }
  } catch { /* not JSON */ }
  // Try EWKB hex
  const result = parseEwkbHex(raw)
  if (Array.isArray(result)) return result
  return []
}

function parseCenterPoint(raw: string | null): LatLng | null {
  if (!raw) return null
  // Try GeoJSON
  try {
    const geo = JSON.parse(raw)
    if (geo.type === 'Point' && geo.coordinates) {
      const [lng, lat] = geo.coordinates
      return { lat, lng }
    }
  } catch { /* not JSON */ }
  // Try EWKB hex
  const result = parseEwkbHex(raw)
  if (result && !Array.isArray(result)) return result
  return null
}

// Convert coords to EWKT for PostGIS insert
function coordsToEwkt(coords: LatLng[]): string {
  const ring = [...coords, coords[0]].map((c) => `${c.lng} ${c.lat}`).join(',')
  return `SRID=4326;POLYGON((${ring}))`
}

function centerToEwkt(latlng: LatLng): string {
  return `SRID=4326;POINT(${latlng.lng} ${latlng.lat})`
}

export function useMapParcels() {
  return useQuery<ParcelMapFeature[]>({
    queryKey: ['parcels', 'map'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('parcels')
        .select(`
          id, parcel_no, color_status,
          total_units, positive_count, negative_count, undecided_count, positive_ratio,
          boundary, center_point,
          blocks(block_no),
          neighborhoods(name)
        `)

      if (error) throw error

      return (data ?? []).map((p) => ({
        id: p.id,
        parcel_no: p.parcel_no,
        block_no: (p.blocks as unknown as { block_no: string } | null)?.block_no ?? '',
        neighborhood_name: (p.neighborhoods as unknown as { name: string } | null)?.name ?? '',
        color_status: p.color_status,
        total_units: p.total_units,
        positive_count: p.positive_count,
        negative_count: p.negative_count,
        undecided_count: p.undecided_count,
        positive_ratio: p.positive_ratio,
        coordinates: parseGeometry(p.boundary),
        center: parseCenterPoint(p.center_point),
      }))
    },
    staleTime: 30_000,
  })
}

export function useParcel(id: string) {
  return useQuery<Parcel>({
    queryKey: ['parcels', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('parcels')
        .select('*, blocks(*), neighborhoods(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Parcel
    },
    enabled: !!id,
  })
}

export function useCreateParcel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      parcel: Record<string, unknown>
      boundaryCoords: LatLng[] | null
      centerCoord: LatLng | null
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('parcels')
        .insert({
          ...payload.parcel,
          boundary: payload.boundaryCoords && payload.boundaryCoords.length >= 3
            ? coordsToEwkt(payload.boundaryCoords)
            : null,
          center_point: payload.centerCoord
            ? centerToEwkt(payload.centerCoord)
            : null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
    },
  })
}

export function useUpdateParcel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('parcels')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['parcels', id] })
      queryClient.invalidateQueries({ queryKey: ['parcels', 'map'] })
    },
  })
}
