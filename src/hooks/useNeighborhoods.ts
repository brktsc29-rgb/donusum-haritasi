'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Neighborhood, Block } from '@/types'

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

export function useOrCreateBlock() {
  return async (neighborhoodId: string, blockNo: string): Promise<Block> => {
    const supabase = createClient()
    const { data: existing } = await supabase
      .from('blocks')
      .select('*')
      .eq('neighborhood_id', neighborhoodId)
      .eq('block_no', blockNo)
      .single()

    if (existing) return existing as Block

    const { data: created, error } = await supabase
      .from('blocks')
      .insert({ neighborhood_id: neighborhoodId, block_no: blockNo })
      .select()
      .single()

    if (error) throw error
    return created as Block
  }
}
