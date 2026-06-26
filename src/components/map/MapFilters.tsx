'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import type { ColorStatus, DecisionStatus } from '@/types'

export interface MapFilterValues {
  neighborhoodId: string | null
  colorStatus: ColorStatus | null
  decisionStatus: DecisionStatus | null
}

interface Props {
  value: MapFilterValues
  onChange: (v: MapFilterValues) => void
}

export function MapFilters({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const { data: neighborhoods = [] } = useNeighborhoods()

  const hasActive =
    value.neighborhoodId !== null ||
    value.colorStatus !== null ||
    value.decisionStatus !== null

  const reset = () =>
    onChange({ neighborhoodId: null, colorStatus: null, decisionStatus: null })

  return (
    <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
      <Button
        size="sm"
        variant={hasActive ? 'default' : 'outline'}
        className="gap-2 shadow"
        onClick={() => setOpen(!open)}
      >
        <Filter className="h-4 w-4" />
        Filtrele
        {hasActive && (
          <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">
            {[value.neighborhoodId, value.colorStatus, value.decisionStatus].filter(Boolean).length}
          </span>
        )}
      </Button>

      {open && (
        <div className="w-56 rounded-xl border bg-card shadow-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Filtreler</p>
            {hasActive && (
              <button
                onClick={reset}
                className="text-xs text-muted-foreground flex items-center gap-1 hover:text-destructive"
              >
                <X className="h-3 w-3" /> Temizle
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Mahalle</p>
            <Select
              value={value.neighborhoodId ?? 'all'}
              onValueChange={(v) =>
                onChange({ ...value, neighborhoodId: v === 'all' ? null : v })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tüm mahalleler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm mahalleler</SelectItem>
                {neighborhoods.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Renk Durumu</p>
            <Select
              value={value.colorStatus ?? 'all'}
              onValueChange={(v) =>
                onChange({ ...value, colorStatus: v === 'all' ? null : (v as ColorStatus) })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="green">🟢 Yeşil (≥%50)</SelectItem>
                <SelectItem value="orange">🟠 Turuncu (&lt;%50)</SelectItem>
                <SelectItem value="grey">⚪ Veri yok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Görüş Durumu</p>
            <Select
              value={value.decisionStatus ?? 'all'}
              onValueChange={(v) =>
                onChange({ ...value, decisionStatus: v === 'all' ? null : (v as DecisionStatus) })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="positive">Olumlu</SelectItem>
                <SelectItem value="negative">Olumsuz</SelectItem>
                <SelectItem value="undecided">Kararsız</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
