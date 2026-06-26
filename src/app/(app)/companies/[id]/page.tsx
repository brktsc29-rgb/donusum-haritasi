import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CompanyAccessManager } from '@/components/companies/CompanyAccessManager'
import type { Company } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') notFound()

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !company) notFound()

  const { data: parcels } = await supabase
    .from('parcels')
    .select('id, parcel_no, neighborhood_id, neighborhoods(name), blocks(block_no)')
    .order('parcel_no')

  const { data: access } = await supabase
    .from('company_parcel_access')
    .select('*')
    .eq('company_id', id)

  return (
    <div className="min-h-full bg-secondary/30">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3">
        <Link href="/companies">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{(company as Company).name}</h1>
        </div>
        <Link href={`/companies/${id}/edit`}>
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <Edit2 className="h-4 w-4" /> Düzenle
          </Button>
        </Link>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-5">
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{(company as Company).name}</p>
              <Badge variant={(company as Company).is_active ? 'green' : 'secondary'}>
                {(company as Company).is_active ? 'Aktif' : 'Pasif'}
              </Badge>
            </div>
            {(company as Company).contact_person && (
              <div>
                <p className="text-xs text-muted-foreground">İletişim Kişisi</p>
                <p className="text-sm">{(company as Company).contact_person}</p>
              </div>
            )}
            {(company as Company).email && (
              <div>
                <p className="text-xs text-muted-foreground">E-posta</p>
                <p className="text-sm">{(company as Company).email}</p>
              </div>
            )}
            {(company as Company).phone && (
              <div>
                <p className="text-xs text-muted-foreground">Telefon</p>
                <p className="text-sm">{(company as Company).phone}</p>
              </div>
            )}
            {(company as Company).notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Notlar</p>
                  <p className="text-sm">{(company as Company).notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <CompanyAccessManager
          companyId={id}
          currentUserId={user!.id}
          initialAccess={access ?? []}
          parcels={(parcels ?? []).map((p) => ({
            id: p.id,
            parcel_no: p.parcel_no,
            neighborhood_name: (p.neighborhoods as unknown as { name: string } | null)?.name ?? '',
            block_no: (p.blocks as unknown as { block_no: string } | null)?.block_no ?? '',
          }))}
        />
      </div>
    </div>
  )
}
