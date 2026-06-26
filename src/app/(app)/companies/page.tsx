import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Company } from '@/types'

export default async function CompaniesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'admin') notFound()

  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('name')

  return (
    <div className="min-h-full bg-secondary/30">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold">Firmalar</h1>
        <Link href="/companies/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Firma Ekle
          </Button>
        </Link>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {(!companies || companies.length === 0) ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Henüz firma eklenmedi.</p>
            <Link href="/companies/new">
              <Button variant="outline" size="sm" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> İlk Firmayı Ekle
              </Button>
            </Link>
          </div>
        ) : (
          (companies as Company[]).map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.contact_person && (
                        <p className="text-sm text-muted-foreground mt-0.5">{c.contact_person}</p>
                      )}
                      {c.email && (
                        <p className="text-xs text-muted-foreground mt-0.5">{c.email}</p>
                      )}
                    </div>
                    <Badge variant={c.is_active ? 'green' : 'secondary'} className="text-xs shrink-0">
                      {c.is_active ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
