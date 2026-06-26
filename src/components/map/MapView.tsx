'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useMapParcels } from '@/hooks/useParcels'
import { Button } from '@/components/ui/button'
import type { MapFilterValues } from './MapFilters'

const MapContainer = dynamic(
  () => import('./MapContainer').then((m) => m.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

const MapFilters = dynamic(() => import('./MapFilters').then((m) => m.MapFilters), { ssr: false })

export function MapView() {
  const { data: parcels = [], isLoading } = useMapParcels()
  const [filters, setFilters] = useState<MapFilterValues>({
    neighborhoodId: null,
    colorStatus: null,
    decisionStatus: null,
  })

  const filtered = useMemo(() => {
    return parcels.filter((p) => {
      if (filters.colorStatus && p.color_status !== filters.colorStatus) return false
      return true
    })
  }, [parcels, filters])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer parcels={filtered} />
      <MapFilters value={filters} onChange={setFilters} />

      <Link href="/parcels/new">
        <Button
          size="lg"
          className="absolute bottom-6 right-4 shadow-xl gap-2 md:bottom-8 md:right-6"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Yeni Parsel</span>
        </Button>
      </Link>
    </div>
  )
}
