'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Map as MapIcon, PenSquare, X, Loader2 } from 'lucide-react'
import { useMapParcels } from '@/hooks/useParcels'
import { Button } from '@/components/ui/button'
import type { MapFilterValues } from './MapFilters'
import type { LatLng } from '@/types'

type MapMode = 'view' | 'draw-ada' | 'ada-drawn' | 'draw-parcel'

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
  const router = useRouter()
  const { data: parcels = [], isLoading } = useMapParcels()
  const [filters, setFilters] = useState<MapFilterValues>({
    neighborhoodId: null,
    colorStatus: null,
    decisionStatus: null,
  })
  const [mode, setMode] = useState<MapMode>('view')
  const [adaCoords, setAdaCoords] = useState<LatLng[] | null>(null)

  const filtered = useMemo(() => {
    return parcels.filter((p) => {
      if (filters.colorStatus && p.color_status !== filters.colorStatus) return false
      return true
    })
  }, [parcels, filters])

  const handleAdaDrawComplete = useCallback((coords: LatLng[]) => {
    setAdaCoords(coords)
    setMode('ada-drawn')
  }, [])

  const handleParcelDrawComplete = useCallback((coords: LatLng[]) => {
    sessionStorage.setItem('pendingParcelDraw', JSON.stringify({
      adaCoords,
      parcelCoords: coords,
    }))
    router.push('/parcels/new?fromMap=1')
  }, [adaCoords, router])

  const handleDrawCancel = useCallback(() => {
    setMode((prev) => (prev === 'draw-ada' ? 'view' : 'ada-drawn'))
  }, [])

  const resetAda = useCallback(() => {
    setAdaCoords(null)
    setMode('view')
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isDrawing = mode === 'draw-ada' || mode === 'draw-parcel'

  return (
    <div className="relative h-full w-full">
      <MapContainer
        parcels={filtered}
        adaCoords={adaCoords ?? undefined}
        drawMode={isDrawing}
        drawLabel={
          mode === 'draw-ada'
            ? 'Ada sınırını çizin (4 taraftaki yolları köşe alın)'
            : 'Parsel sınırını çizin'
        }
        onDrawComplete={mode === 'draw-ada' ? handleAdaDrawComplete : handleParcelDrawComplete}
        onDrawCancel={handleDrawCancel}
      />

      {!isDrawing && <MapFilters value={filters} onChange={setFilters} />}

      <div className="absolute bottom-6 right-4 flex flex-col items-end gap-3 z-10">
        {mode === 'view' && (
          <Button size="lg" className="shadow-xl gap-2" onClick={() => setMode('draw-ada')}>
            <MapIcon className="h-5 w-5" />
            Ada Çiz
          </Button>
        )}

        {mode === 'ada-drawn' && (
          <>
            <Button
              size="lg"
              className="shadow-xl gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setMode('draw-parcel')}
            >
              <PenSquare className="h-5 w-5" />
              Parsel Çiz
            </Button>
            <Button size="lg" variant="outline" className="shadow-xl gap-2 bg-white" onClick={resetAda}>
              <X className="h-4 w-4" />
              İptal
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
