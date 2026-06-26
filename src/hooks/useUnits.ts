'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Unit, UnitPublic } from '@/types'

function stripPersonalData(unit: Unit): UnitPublic {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { owner_name, owner_phone, contact_name, contact_phone, notes, consent_given_by, ...pub } = unit
  return pub
}

export function useUnits(parcelId: string, canViewPersonalData: boolean) {
  return useQuery<Unit[] | UnitPublic[]>({
    queryKey: ['units', parcelId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('parcel_id', parcelId)
        .order('unit_type')
        .order('unit_name')
      if (error) throw error
      const units = (data ?? []) as Unit[]
      if (!canViewPersonalData) return units.map(stripPersonalData)
      return units
    },
    enabled: !!parcelId,
  })
}

export function useUnit(unitId: string) {
  return useQuery<Unit>({
    queryKey: ['unit', unitId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', unitId)
        .single()
      if (error) throw error
      return data as Unit
    },
    enabled: !!unitId,
  })
}

export function useCreateUnits() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (units: Partial<Unit>[]) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('units')
        .insert(units)
        .select()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data?.[0]?.parcel_id) {
        queryClient.invalidateQueries({ queryKey: ['units', data[0].parcel_id] })
        queryClient.invalidateQueries({ queryKey: ['parcels', data[0].parcel_id] })
        queryClient.invalidateQueries({ queryKey: ['parcels', 'map'] })
      }
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Unit> }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Unit
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unit', data.id] })
      queryClient.invalidateQueries({ queryKey: ['units', data.parcel_id] })
      queryClient.invalidateQueries({ queryKey: ['parcels', data.parcel_id] })
      queryClient.invalidateQueries({ queryKey: ['parcels', 'map'] })
    },
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, parcelId }: { id: string; parcelId: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('units').delete().eq('id', id)
      if (error) throw error
      return parcelId
    },
    onSuccess: (parcelId) => {
      queryClient.invalidateQueries({ queryKey: ['units', parcelId] })
      queryClient.invalidateQueries({ queryKey: ['parcels', parcelId] })
      queryClient.invalidateQueries({ queryKey: ['parcels', 'map'] })
    },
  })
}
