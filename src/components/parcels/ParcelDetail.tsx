'use client'

import Link from 'next/link'
import { ArrowLeft, MapPin, Home, Store, ThumbsUp, ThumbsDown, HelpCircle, Plus, Send } from 'lucide-react'
import type { Parcel, UserRole } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatRatio } from '@/lib/utils'
import { UnitList } from './UnitList'

interface Props {
  parcel: Parcel & { blocks?: { block_no: string }; neighborhoods?: { name: string } }
  userRole: UserRole
  canViewPersonalData: boolean
}

const colorBadgeVariant = {
  green: 'green',
  orange: 'orange',
  grey: 'grey',
} as const

const colorLabel = {
  green: 'Yeşil — %50+ Olumlu',
  orange: 'Turuncu — %50 Altı',
  grey: 'Veri Yok',
} as const

export function ParcelDetail({ parcel, userRole, canViewPersonalData }: Props) {
  const blockNo = (parcel.blocks as { block_no: string } | null)?.block_no ?? '—'
  const neighborhoodName = (parcel.neighborhoods as { name: string } | null)?.name ?? '—'
  const isAdmin = userRole === 'admin'
  const canEdit = userRole === 'admin' || userRole === 'field'

  return (
    <div className="min-h-full bg-secondary/30">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3">
        <Link href="/map">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{neighborhoodName} • Ada {blockNo}</p>
          <h1 className="font-semibold truncate">Parsel {parcel.parcel_no}</h1>
        </div>
        {parcel.is_auto_code && (
          <Badge variant="secondary" className="text-xs shrink-0">Oto. Kod</Badge>
        )}
      </div>

      <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Badge variant={colorBadgeVariant[parcel.color_status]}>
                  {colorLabel[parcel.color_status]}
                </Badge>
                <p className="text-3xl font-bold mt-2">
                  {formatRatio(parcel.positive_ratio)}
                </p>
                <p className="text-sm text-muted-foreground">olumlu oran</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-2xl font-bold">{parcel.total_units}</p>
                <p className="text-xs text-muted-foreground">toplam BB</p>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Home className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Daire</span>
                </div>
                <p className="font-semibold">{parcel.apartment_count}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Dükkan</span>
                </div>
                <p className="font-semibold">{parcel.shop_count}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Çizim</span>
                </div>
                <p className="font-semibold text-xs">{parcel.is_manually_drawn ? 'Manuel' : 'Yok'}</p>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2 rounded-md bg-green-50 px-2 py-1.5">
                <ThumbsUp className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm font-semibold text-green-700">{parcel.positive_count}</span>
                <span className="text-xs text-green-600 hidden sm:block">Olumlu</span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-red-50 px-2 py-1.5">
                <ThumbsDown className="h-4 w-4 text-red-600 shrink-0" />
                <span className="text-sm font-semibold text-red-700">{parcel.negative_count}</span>
                <span className="text-xs text-red-600 hidden sm:block">Olumsuz</span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5">
                <HelpCircle className="h-4 w-4 text-gray-500 shrink-0" />
                <span className="text-sm font-semibold text-gray-700">{parcel.undecided_count}</span>
                <span className="text-xs text-gray-500 hidden sm:block">Kararsız</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {(parcel.address_note || parcel.general_notes) && (
          <Card>
            <CardContent className="pt-4 space-y-2">
              {parcel.address_note && (
                <div>
                  <p className="text-xs text-muted-foreground">Adres</p>
                  <p className="text-sm">{parcel.address_note}</p>
                </div>
              )}
              {parcel.general_notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notlar</p>
                  <p className="text-sm">{parcel.general_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            <Link href={`/parcels/${parcel.id}/photos`}>
              <Button variant="outline" size="sm" className="gap-2">
                Fotoğraflar
              </Button>
            </Link>
            {isAdmin && (
              <Link href={`/parcels/${parcel.id}/notify`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Send className="h-4 w-4" />
                  Firma Bilgilendir
                </Button>
              </Link>
            )}
          </div>
        )}

        <UnitList
          parcelId={parcel.id}
          canViewPersonalData={canViewPersonalData}
          canEdit={canEdit}
          defaultTitleDeedStatus={undefined}
        />
      </div>
    </div>
  )
}
