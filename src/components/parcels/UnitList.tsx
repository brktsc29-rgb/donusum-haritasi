'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, HelpCircle, Home, Store } from 'lucide-react'
import { useUnits } from '@/hooks/useUnits'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UnitEditModal } from './UnitEditModal'
import type { Unit, UnitPublic, TitleDeedStatus } from '@/types'

interface Props {
  parcelId: string
  canViewPersonalData: boolean
  canEdit: boolean
  defaultTitleDeedStatus: TitleDeedStatus | undefined
}

const decisionBadge = {
  positive: 'green',
  negative: 'destructive',
  undecided: 'secondary',
} as const

const titleDeedLabel = {
  titled: 'Tapulu',
  untitled: 'Tapusuz',
  unknown: 'Bilinmiyor',
}

export function UnitList({ parcelId, canViewPersonalData, canEdit, defaultTitleDeedStatus }: Props) {
  const { data: units = [], isLoading } = useUnits(parcelId, canViewPersonalData)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editUnit, setEditUnit] = useState<Unit | null>(null)
  const [addType, setAddType] = useState<'apartment' | 'shop' | null>(null)

  const apartments = units.filter((u) => u.unit_type === 'apartment')
  const shops = units.filter((u) => u.unit_type === 'shop')

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Yükleniyor...</div>

  const UnitRow = ({ unit }: { unit: Unit | UnitPublic }) => {
    const isExpanded = expandedId === unit.id

    return (
      <div className="border rounded-lg overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : unit.id)}
        >
          <span className="text-sm font-medium flex-1">{unit.unit_name}</span>
          {unit.decision_status ? (
            <Badge variant={decisionBadge[unit.decision_status]} className="text-xs">
              {unit.decision_status === 'positive' ? 'Olumlu' : unit.decision_status === 'negative' ? 'Olumsuz' : 'Kararsız'}
            </Badge>
          ) : (
            <Badge variant="grey" className="text-xs">Görüş Yok</Badge>
          )}
          <Badge variant="outline" className="text-xs hidden sm:flex">
            {titleDeedLabel[unit.title_deed_status]}
          </Badge>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t bg-secondary/20 space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div>
                <span className="text-muted-foreground">Tapu:</span>{' '}
                <span className="font-medium">{titleDeedLabel[unit.title_deed_status]}</span>
              </div>
              {unit.floor !== null && (
                <div><span className="text-muted-foreground">Kat:</span> <span className="font-medium">{unit.floor}</span></div>
              )}
              {unit.door_no && (
                <div><span className="text-muted-foreground">Kapı No:</span> <span className="font-medium">{unit.door_no}</span></div>
              )}
              {unit.land_share_numerator && (
                <div>
                  <span className="text-muted-foreground">Arsa Payı:</span>{' '}
                  <span className="font-medium">{unit.land_share_numerator}/{unit.land_share_denominator}</span>
                </div>
              )}
            </div>

            {canViewPersonalData && (
              <div className="space-y-1 text-xs border-t pt-2">
                {(unit as Unit).owner_name && (
                  <div><span className="text-muted-foreground">Malik:</span> <span className="font-medium">{(unit as Unit).owner_name}</span></div>
                )}
                {(unit as Unit).owner_phone && (
                  <div><span className="text-muted-foreground">Tel:</span> <span className="font-medium">{(unit as Unit).owner_phone}</span></div>
                )}
                {(unit as Unit).contact_name && (
                  <div><span className="text-muted-foreground">Görüşülen:</span> <span className="font-medium">{(unit as Unit).contact_name}</span></div>
                )}
                {(unit as Unit).contact_phone && (
                  <div><span className="text-muted-foreground">Görüşülen Tel:</span> <span className="font-medium">{(unit as Unit).contact_phone}</span></div>
                )}
                {(unit as Unit).notes && (
                  <div><span className="text-muted-foreground">Not:</span> <span>{(unit as Unit).notes}</span></div>
                )}
              </div>
            )}

            {(unit as Unit).verbal_consent && (
              <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                ✓ Sözlü onay alındı
              </div>
            )}

            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2 text-xs"
                onClick={() => setEditUnit(unit as Unit)}
              >
                Düzenle
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" />
              Daireler ({apartments.length})
            </CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setAddType('apartment')}>
                <Plus className="h-3.5 w-3.5" /> Ekle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {apartments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">Daire yok</p>
          ) : (
            apartments.map((u) => <UnitRow key={u.id} unit={u} />)
          )}
        </CardContent>
      </Card>

      {shops.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4" />
                Dükkanlar ({shops.length})
              </CardTitle>
              {canEdit && (
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setAddType('shop')}>
                  <Plus className="h-3.5 w-3.5" /> Ekle
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {shops.map((u) => <UnitRow key={u.id} unit={u} />)}
          </CardContent>
        </Card>
      )}

      {canEdit && shops.length === 0 && (
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setAddType('shop')}>
          <Plus className="h-4 w-4" />
          Dükkan Ekle
        </Button>
      )}

      {(editUnit || addType) && (
        <UnitEditModal
          unit={editUnit ?? undefined}
          parcelId={parcelId}
          defaultType={addType ?? editUnit?.unit_type}
          defaultTitleDeedStatus={defaultTitleDeedStatus}
          canViewPersonalData={canViewPersonalData}
          onClose={() => { setEditUnit(null); setAddType(null) }}
        />
      )}
    </>
  )
}
