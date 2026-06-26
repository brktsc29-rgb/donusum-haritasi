'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Company, CompanyParcelAccess } from '@/types'

export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })
}

export function useCompany(id: string) {
  return useQuery<Company>({
    queryKey: ['companies', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Company
    },
    enabled: !!id,
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (company: Partial<Company>) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single()
      if (error) throw error
      return data as Company
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Company> }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Company
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies', data.id] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useCompanyParcelAccess(companyId: string) {
  return useQuery<CompanyParcelAccess[]>({
    queryKey: ['company-access', companyId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('company_parcel_access')
        .select('*, parcels(parcel_no, neighborhood_id, neighborhoods(name))')
        .eq('company_id', companyId)
      if (error) throw error
      return (data ?? []) as CompanyParcelAccess[]
    },
    enabled: !!companyId,
  })
}

export function useGrantParcelAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      company_id: string
      parcel_id: string
      can_view_personal_data: boolean
      granted_by: string | null
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('company_parcel_access')
        .upsert(payload, { onConflict: 'company_id,parcel_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['company-access', vars.company_id] })
    },
  })
}

export function useRevokeParcelAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ companyId, parcelId }: { companyId: string; parcelId: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('company_parcel_access')
        .delete()
        .eq('company_id', companyId)
        .eq('parcel_id', parcelId)
      if (error) throw error
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['company-access', companyId] })
    },
  })
}
