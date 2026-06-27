'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { parseGeometry, parseCenterPoint } from '@/lib/map/geometry'
import type { Neighborhood, Block, BlockMapFeature, ColorStatus } from '@/types'

export function useNeighborhoods() {
  return useQuery<Neighborhood[]>({
    queryKey: ['neighborhoods'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('neighborhoods')
        .select('*')
        .order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

export function useBlocks(neighborhoodId: string | null) {
  return useQuery<Block[]>({
    queryKey: ['blocks', neighborhoodId],
    queryFn: async () => {
      if (!neighborhoodId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('neighborhood_id', neighborhoodId)
        .order('block_no')
      if (error) throw error
      return data ?? []
    },
    enabled: !!neighborhoodId,
    staleTime: 60_000,
  })
}

export function useMapBlocks() {
  return useQuery<BlockMapFeature[]>({
    queryKey: ['blocks', 'map'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('blocks')
        .select(`
          id, block_no, boundary, center_point, neighborhood_id,
          neighborhoods(name, district),
          parcels(id, total_units, apartment_count, shop_count, positive_count, negative_count, undecided_count)
        `)

      if (error) throw error

      return (data ?? []).map((b) => {
        const neighborhood = b.neighborhoods as unknown as { name: string; district: string } | null
        const parcels = (b.parcels as unknown as Array<{
          id: string
          total_units: number
          apartment_count: number
          shop_count: number
          positive_count: number
          negative_count: number
          undecided_count: number
        }>) ?? []

        const parcel_count = parcels.length
        const total_units = parcels.reduce((s, p) => s + (p.total_units ?? 0), 0)
        const apartment_count = parcels.reduce((s, p) => s + (p.apartment_count ?? 0), 0)
        const shop_count = parcels.reduce((s, p) => s + (p.shop_count ?? 0), 0)
        const positive_count = parcels.reduce((s, p) => s + (p.positive_count ?? 0), 0)
        const negative_count = parcels.reduce((s, p) => s + (p.negative_count ?? 0), 0)
        const undecided_count = parcels.reduce((s, p) => s + (p.undecided_count ?? 0), 0)
        const positive_ratio = total_units > 0 ? positive_count / total_units : null

        let color_status: ColorStatus = 'grey'
        if (total_units > 0) {
          color_status = positive_ratio! >= 0.5 ? 'green' : 'orange'
        }

        return {
          id: b.id,
          block_no: b.block_no,
          neighborhood_id: b.neighborhood_id,
          neighborhood_name: neighborhood?.name ?? '',
          district: neighborhood?.district ?? 'Kağıthane',
          coordinates: parseGeometry(b.boundary as string | null),
          center: parseCenterPoint(b.center_point as string | null),
          parcel_count,
          total_units,
          apartment_count,
          shop_count,
          positive_count,
          negative_count,
          undecided_count,
          positive_ratio,
          color_status,
        }
      })
    },
    staleTime: 30_000,
  })
}

export function useOrCreateBlock() {
  return async (neighborhoodId: string, blockNo: string): Promise<Block> => {
    const supabase = createClient()

    // Get district for this neighborhood
    const { data: neighborhood } = await supabase
      .from('neighborhoods')
      .select('district')
      .eq('id', neighborhoodId)
      .single()
    const district = (neighborhood as { district?: string } | null)?.district ?? 'Kağıthane'

    // Get all neighborhoods in the same district
    const { data: districtNeighborhoods } = await supabase
      .from('neighborhoods')
      .select('id')
      .eq('district', district)
    const neighborhoodIds = (districtNeighborhoods ?? []).map((n: { id: string }) => n.id)

    // Check if block_no already exists anywhere in this district
    const { data: existing } = await supabase
      .from('blocks')
      .select('*')
      .in('neighborhood_id', neighborhoodIds)
      .eq('block_no', blockNo)
      .maybeSingle()

    if (existing) {
      if ((existing as Block).neighborhood_id !== neighborhoodId) {
        throw new Error(
          `Bu ada numarası (${blockNo}) ${district} ilçesinde zaten kayıtlı. ` +
          `Lütfen mevcut adayı seçin veya farklı ada numarası girin.`
        )
      }
      return existing as Block
    }

    const { data: created, error } = await supabase
      .from('blocks')
      .insert({ neighborhood_id: neighborhoodId, block_no: blockNo })
      .select()
      .single()

    if (error) throw error
    return created as Block
  }
}
