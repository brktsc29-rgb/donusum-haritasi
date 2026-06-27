'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Map as MapIcon, PenSquare, X, Loader2 } from 'lucide-react'
import { useMapParcels } from '@/hooks/useParcels'
import { useNeighborhoods, useOrCreateBlock } from '@/hooks/useNeighborhoods'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MapFilterValues } from './MapFilters'
import type { LatLng } from '@/types'

type MapMode = 'view' | 'draw-ada' | 'ada-info' | 'ada-drawn' | 'draw-parcel'

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
  const { data: neighborhoods = [] } = useNeighborhoods()
  const orCreateBlock = useOrCreateBlock()

  const [filters, setFilters] = useState<MapFilterValues>({
    neighborhoodId: null,
    colorStatus: null,
    decisionStatus: null,
  })
  const [mode, setMode] = useState<MapMode>('view')
  const [adaCoords, setAdaCoords] = useState<LatLng[] | null>(null)
  const [adaNeighborhoodId, setAdaNeighborhoodId] = useState('')
  const [adaBlockNo, setAdaBlockNo] = useState('')
  const [adaBlockId, setAdaBlockId] = useState<string | null>(null)
  const [savingAda, setSavingAda] = useState(false)
  const [adaError, setAdaError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return parcels.filter((p) => {
      if (filters.colorStatus && p.color_status !== filters.colorStatus) return false
      return true
    })
  }, [parcels, filters])

  const handleAdaDrawComplete = useCallback((coords: LatLng[]) => {
    setAdaCoords(coords)
    setMode('ada-info')
  }, [])

  const handleSaveAda = useCallback(async () => {
    if (!adaNeighborhoodId || !adaBlockNo.trim()) return
    setSavingAda(true)
    setAdaError(null)
    try {
      const block = await orCreateBlock(adaNeighborhoodId, adaBlockNo.trim())
      setAdaBlockId(block.id)
      setMode('ada-drawn')
    } catch {
      setAdaError('Ada kaydedilemedi, tekrar deneyin.')
    } finally {
      setSavingAda(false)
    }
  }, [adaNeighborhoodId, adaBlockNo, orCreateBlock])

  const handleParcelDrawComplete = useCallback((coords: LatLng[]) => {
    const neighborhood = neighborhoods.find((n) => n.id === adaNeighborhoodId)
    sessionStorage.setItem('pendingParcelDraw', JSON.stringify({
      blockId: adaBlockId,
      blockNo: adaBlockNo,
      neighborhoodId: adaNeighborhoodId,
      neighborhoodName: neighborhood?.name ?? '',
      parcelCoords: coords,
      adaCoords,
    }))
    router.push('/parcels/new?fromMap=1')
  }, [adaBlockId, adaBlockNo, adaNeighborhoodId, adaCoords, neighborhoods, router])

  const handleDrawCancel = useCallback(() => {
    setMode((prev) => (prev === 'draw-ada' ? 'view' : 'ada-drawn'))
  }, [])

  const resetAda = useCallback(() => {
    setAdaCoords(null)
    setAdaBlockId(null)
    setAdaBlockNo('')
    setAdaNeighborhoodId('')
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

      {!isDrawing && mode !== 'ada-info' && (
        <MapFilters value={filters} onChange={setFilters} />
      )}

      {/* Ada bilgisi formu — harita üzerinde alt sheet */}
      {mode === 'ada-info' && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-card border-t rounded-t-2xl p-5 shadow-2xl">
          <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
          <h3 className="font-semibold text-base mb-4">Ada Bilgisi</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Mahalle *</Label>
              <Select value={adaNeighborhoodId} onValueChange={setAdaNeighborhoodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Mahalle seçin" />
                </SelectTrigger>
                <SelectContent>
                  {neighborhoods.map((n) => (
                    <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ada No *</Label>
              <Input
                value={adaBlockNo}
                onChange={(e) => setAdaBlockNo(e.target.value)}
                placeholder="Örn: 123"
                inputMode="numeric"
              />
            </div>
            {adaError && (
              <p className="text-xs text-destructive">{adaError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetAda}
              >
                İptal
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={!adaNeighborhoodId || !adaBlockNo.trim() || savingAda}
                onClick={handleSaveAda}
              >
                {savingAda && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FABs */}
      <div className="absolute bottom-6 right-4 flex flex-col items-end gap-3 z-10">
        {mode === 'view' && (
          <Button size="lg" className="shadow-xl gap-2" onClick={() => setMode('draw-ada')}>
            <MapIcon className="h-5 w-5" />
            Ada Çiz
          </Button>
        )}

        {mode === 'ada-drawn' && (
          <>
            <div className="bg-card border rounded-lg px-3 py-1.5 text-xs text-muted-foreground shadow">
              {neighborhoods.find((n) => n.id === adaNeighborhoodId)?.name} • Ada {adaBlockNo}
            </div>
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
