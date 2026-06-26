'use client'

import { X, ArrowRight, Home, Store, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import type { ParcelMapFeature } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRatio } from '@/lib/utils'

interface Props {
  parcel: ParcelMapFeature
  onClose: () => void
}

export function ParcelInfoCard({ parcel, onClose }: Props) {
  const noData = parcel.positive_count === 0 && parcel.negative_count === 0 && parcel.undecided_count === 0

  return (
    <div className="absolute right-3 top-3 z-20 w-72 rounded-xl border bg-card shadow-xl animate-in slide-in-from-right-2 duration-200">
      <div className="flex items-start justify-between p-4 pb-3 border-b">
        <div>
          <p className="text-xs text-muted-foreground">{parcel.neighborhood_name} • Ada {parcel.block_no}</p>
          <h3 className="font-semibold mt-0.5">Parsel {parcel.parcel_no}</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 hover:bg-secondary text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-1.5 text-sm">
            <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">BB</span>
            <span className="ml-auto font-semibold">{parcel.total_units}</span>
          </div>
        </div>

        {noData ? (
          <div className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground text-center">
            Henüz görüş girilmemiş
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-green-700">
                <ThumbsUp className="h-3.5 w-3.5" /> Olumlu
              </span>
              <Badge variant="green">{parcel.positive_count}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-red-700">
                <ThumbsDown className="h-3.5 w-3.5" /> Olumsuz
              </span>
              <Badge variant="destructive">{parcel.negative_count}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HelpCircle className="h-3.5 w-3.5" /> Kararsız
              </span>
              <Badge variant="secondary">{parcel.undecided_count}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm border-t pt-2 mt-2">
              <span className="font-medium">Olumlu Oran</span>
              <span
                className={`font-bold ${
                  parcel.color_status === 'green'
                    ? 'text-green-600'
                    : parcel.color_status === 'orange'
                    ? 'text-orange-600'
                    : 'text-muted-foreground'
                }`}
              >
                {formatRatio(parcel.positive_ratio)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <Link href={`/parcels/${parcel.id}`}>
          <Button size="sm" className="w-full gap-2">
            Detay Sayfası
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
