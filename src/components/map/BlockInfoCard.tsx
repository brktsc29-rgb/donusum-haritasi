'use client'

import { X, ArrowRight, MapPin, Home, Store, ThumbsUp, ThumbsDown, HelpCircle, Layers } from 'lucide-react'
import type { BlockMapFeature } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRatio } from '@/lib/utils'

interface Props {
  block: BlockMapFeature
  onClose: () => void
}

export function BlockInfoCard({ block, onClose }: Props) {
  const noData = block.total_units === 0

  return (
    <div className="absolute left-3 top-16 z-20 w-72 rounded-xl border bg-card shadow-xl animate-in slide-in-from-left-2 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3 border-b">
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {block.neighborhood_name}
            {block.district && block.district !== block.neighborhood_name ? ` • ${block.district}` : ''}
          </p>
          <h3 className="font-semibold mt-0.5">Ada {block.block_no}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <Layers className="h-3 w-3 inline mr-1" />
            {block.parcel_count} parsel
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 hover:bg-secondary text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-1.5 text-sm">
            <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Daire</span>
            <span className="ml-auto font-semibold">{block.apartment_count}</span>
          </div>
          <div className="flex-1 flex items-center gap-1.5 text-sm">
            <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Dükkan</span>
            <span className="ml-auto font-semibold">{block.shop_count}</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Toplam BB: <span className="font-medium text-foreground">{block.total_units}</span>
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
              <Badge variant="green">{block.positive_count}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-red-700">
                <ThumbsDown className="h-3.5 w-3.5" /> Olumsuz
              </span>
              <Badge variant="destructive">{block.negative_count}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HelpCircle className="h-3.5 w-3.5" /> Kararsız
              </span>
              <Badge variant="secondary">{block.undecided_count}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm border-t pt-2 mt-2">
              <span className="font-medium">Ada Olumlu Oranı</span>
              <span
                className={`font-bold ${
                  block.color_status === 'green'
                    ? 'text-green-600'
                    : block.color_status === 'orange'
                    ? 'text-orange-600'
                    : 'text-blue-900'
                }`}
              >
                {formatRatio(block.positive_ratio)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="px-4 pb-4">
        <Button size="sm" className="w-full gap-2" disabled>
          Ada Detayı
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-1.5">Ada detay sayfası yakında</p>
      </div>
    </div>
  )
}
