import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParcelDetail } from '@/components/parcels/ParcelDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ParcelDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: parcel, error } = await supabase
    .from('parcels')
    .select('*, blocks(*), neighborhoods(*)')
    .eq('id', id)
    .single()

  if (error || !parcel) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user!.id)
    .single()

  let canViewPersonalData = profile?.role !== 'company'
  if (profile?.role === 'company' && profile.company_id) {
    const { data: access } = await supabase
      .from('company_parcel_access')
      .select('can_view_personal_data')
      .eq('company_id', profile.company_id)
      .eq('parcel_id', id)
      .single()
    canViewPersonalData = access?.can_view_personal_data ?? false
  }

  return (
    <ParcelDetail
      parcel={parcel}
      userRole={profile?.role ?? 'field'}
      canViewPersonalData={canViewPersonalData}
    />
  )
}
