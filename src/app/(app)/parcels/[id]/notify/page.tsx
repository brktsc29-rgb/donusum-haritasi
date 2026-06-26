import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { NotifyForm } from '@/components/parcels/NotifyForm'
import type { Parcel } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NotifyPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') notFound()

  const { data: parcel, error } = await supabase
    .from('parcels')
    .select('*, neighborhoods(name), blocks(block_no)')
    .eq('id', id)
    .single()

  if (error || !parcel) notFound()

  const { data: accessList } = await supabase
    .from('company_parcel_access')
    .select('*, companies(id, name, email, contact_person)')
    .eq('parcel_id', id)

  const companies = (accessList ?? [])
    .map((a) => a.companies as { id: string; name: string; email: string | null; contact_person: string | null } | null)
    .filter((c): c is { id: string; name: string; email: string; contact_person: string | null } => !!c && !!c.email)

  const neighborhoodName = (parcel.neighborhoods as unknown as { name: string } | null)?.name ?? ''
  const blockNo = (parcel.blocks as unknown as { block_no: string } | null)?.block_no ?? ''

  return (
    <div className="min-h-full bg-secondary/30">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3">
        <Link href={`/parcels/${id}`}>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{neighborhoodName} • Ada {blockNo}</p>
          <h1 className="font-semibold">Firma Bilgilendir</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <NotifyForm
          parcel={parcel as Parcel}
          parcelId={id}
          neighborhoodName={neighborhoodName}
          blockNo={blockNo}
          companies={companies}
          sentById={user!.id}
        />
      </div>
    </div>
  )
}
