'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { parseGeometry, parseCenterPoint, coordsToEwkt, centerToEwkt } from '@/lib/map/geometry'
import type { Parcel, ParcelMapFeature, LatLng } from '@/types'

export function useMapParcels() {
  return useQuery<ParcelMapFeature[]>({
    queryKey: ['parcels', 'map'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('parcels')
        .select(`
          id, parcel_no, block_id, color_status,
          total_units, apartment_count, shop_count,
          positive_count, negative_count, undecided_count, positive_ratio,
          boundary, center_point,
          blocks(block_no),
          neighborhoods(name)
        `)

      if (error) throw error

      return (data ?? []).map((p) => ({
        id: p.id,
        parcel_no: p.parcel_no,
        block_id: p.block_id ?? '',
        block_no: (p.blocks as unknown as { block_no: string } | null)?.block_no ?? '',
        neighborhood_name: (p.neighborhoods as unknown as { name: string } | null)?.name ?? '',
        color_status: p.color_status,
        total_units: p.total_units,
        apartment_count: p.apartment_count,
        shop_count: p.shop_count,
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
