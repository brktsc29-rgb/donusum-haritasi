'use client'

import { useState, useMemo } from 'react'
import { Search, Shield, Eye, EyeOff } from 'lucide-react'
import { useGrantParcelAccess, useRevokeParcelAccess } from '@/hooks/useCompanies'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { CompanyParcelAccess } from '@/types'

interface ParcelSummary {
  id: string
  parcel_no: string
  neighborhood_name: string
  block_no: string
}

interface Props {
  companyId: string
  currentUserId: string
  initialAccess: CompanyParcelAccess[]
  parcels: ParcelSummary[]
}

export function CompanyAccessManager({ companyId, currentUserId, initialAccess, parcels }: Props) {
  const [access, setAccess] = useState<CompanyParcelAccess[]>(initialAccess)
  const [search, setSearch] = useState('')
  const grantAccess = useGrantParcelAccess()
  const revokeAccess = useRevokeParcelAccess()

  const filtered = useMemo(() => {
    if (!search) return parcels
    const q = search.toLowerCase()
    return parcels.filter(
      (p) =>
        p.parcel_no.toLowerCase().includes(q) ||
        p.neighborhood_name.toLowerCase().includes(q) ||
        p.block_no.toLowerCase().includes(q)
    )
  }, [parcels, search])

  const getAccess = (parcelId: string) =>
    access.find((a) => a.parcel_id === parcelId) ?? null

  const handleToggleAccess = async (parcelId: string, currentAccess: CompanyParcelAccess | null) => {
    if (currentAccess) {
      await revokeAccess.mutateAsync({ companyId, parcelId })
      setAccess((prev) => prev.filter((a) => a.parcel_id !== parcelId))
    } else {
      const result = await grantAccess.mutateAsync({
        company_id: companyId,
        parcel_id: parcelId,
        can_view_personal_data: false,
        granted_by: currentUserId,
      })
      setAccess((prev) => [...prev, result as CompanyParcelAccess])
    }
  }

  const handleTogglePersonalData = async (parcelId: string, currentAccess: CompanyParcelAccess) => {
    const result = await grantAccess.mutateAsync({
      company_id: companyId,
      parcel_id: parcelId,
      can_view_personal_data: !currentAccess.can_view_personal_data,
      granted_by: currentUserId,
    })
    setAccess((prev) =>
      prev.map((a) => (a.parcel_id === parcelId ? (result as CompanyParcelAccess) : a))
    )
  }

  const grantedCount = access.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Parsel Erişimi
          </CardTitle>
          <Badge variant="secondary">{grantedCount} parsel</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Parsel, mahalle veya ada ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Parsel bulunamadı.</p>
          )}
          {filtered.map((parcel) => {
            const parcelAccess = getAccess(parcel.id)
            const hasAccess = !!parcelAccess

            return (
              <div
                key={parcel.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  hasAccess ? 'bg-green-50 border-green-200' : 'bg-card'
                }`}
              >
                <Checkbox
                  checked={hasAccess}
                  onCheckedChange={() => handleToggleAccess(parcel.id, parcelAccess)}
                  disabled={grantAccess.isPending || revokeAccess.isPending}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{parcel.parcel_no}</p>
                  <p className="text-xs text-muted-foreground">
                    {parcel.neighborhood_name} • Ada {parcel.block_no}
                  </p>
                </div>
                {hasAccess && (
                  <button
                    onClick={() => handleTogglePersonalData(parcel.id, parcelAccess!)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                      parcelAccess?.can_view_personal_data
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-card border-border text-muted-foreground'
                    }`}
                    disabled={grantAccess.isPending}
                    title={parcelAccess?.can_view_personal_data ? 'Kişisel veri görünür' : 'Kişisel veri gizli'}
                  >
                    {parcelAccess?.can_view_personal_data ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline">
                      {parcelAccess?.can_view_personal_data ? 'Kişisel' : 'Anonim'}
                    </span>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Onay kutusu: firma parsele erişebilir. Göz ikonu: kişisel veri (malik adı/tel) görünürlüğünü kontrol eder.
        </p>
      </CardContent>
    </Card>
  )
}
