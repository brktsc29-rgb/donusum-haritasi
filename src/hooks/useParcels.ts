'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Parcel, ParcelMapFeature, LatLng } from '@/types'

function parseGeometry(wkt: string | null): LatLng[] {
  if (!wkt) return []
  try {
    const geo = typeof wkt === 'string' ? JSON.parse(wkt) : wkt
    if (geo.type === 'Polygon' && geo.coordinates?.[0]) {
      return geo.coordinates[0].map(([lng, lat]: [number, number]) => ({ lat, lng }))
    }
  } catch {
    // not JSON, ignore
  }
  return []
}

function parseCenterPoint(wkt: string | null): LatLng | null {
  if (!wkt) return null
  try {
    const geo = typeof wkt === 'string' ? JSON.parse(wkt) : wkt
    if (geo.type === 'Point' && geo.coordinates) {
      const [lng, lat] = geo.coordinates
      return { lat, lng }
    }
  } catch {
    // ignore
  }
  return null
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
      boundaryGeoJson: string | null
      centerGeoJson: string | null
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('parcels')
        .insert({
          ...payload.parcel,
          boundary: payload.boundaryGeoJson
            ? `SRID=4326;${payload.boundaryGeoJson}`
            : null,
          center_point: payload.centerGeoJson
            ? `SRID=4326;${payload.centerGeoJson}`
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
