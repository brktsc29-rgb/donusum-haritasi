'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Loader2, Pencil, X, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMapParcels } from '@/hooks/useParcels'
import { useNeighborhoods, useMapBlocks, useOrCreateBlock } from '@/hooks/useNeighborhoods'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MapFilterValues } from './MapFilters'
import type { LatLng } from '@/types'

type MapMode = 'view' | 'draw-ada' | 'ada-info' | 'ada-drawn' | 'draw-parcel'

async function reverseGeocodeNeighborhood(latlng: { lat: number; lng: number }): Promise<string | null> {
  if (typeof window === 'undefined' || !window.google?.maps) return null
  return new Promise((resolve) => {
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: latlng, region: 'tr' }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) { resolve(null); return }
      const comps = results[0].address_components ?? []
      const n = comps.find((c: google.maps.GeocoderAddressComponent) =>
        c.types.includes('sublocality_level_1') ||
        c.types.includes('neighborhood') ||
        c.types.includes('sublocality')
      )
      resolve(n?.long_name ?? null)
    })
  })
}

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
  const { data: parcels = [], isLoading: parcelsLoading } = useMapParcels()
  const { data: blocks = [], isLoading: blocksLoading } = useMapBlocks()
  const { data: neighborhoods = [] } = useNeighborhoods()
  const isLoading = parcelsLoading || blocksLoading
  const orCreateBlock = useOrCreateBlock()

  const [filters, setFilters] = useState<MapFilterValues>({
    neighborhoodId: null,
    colorStatus: null,
    decisionStatus: null,
  })

  // Restore ada session state so returning from /parcels/new keeps the ada polygon
  const [mode, setMode] = useState<MapMode>(() => {
    try {
      const s = sessionStorage.getItem('activeAdaSession')
      if (s) { const p = JSON.parse(s); return p.mode ?? 'view' }
    } catch { /* ignore */ }
    return 'view'
  })
  const [adaCoords, setAdaCoords] = useState<LatLng[] | undefined>(() => {
    try {
      const s = sessionStorage.getItem('activeAdaSession')
      if (s) { const p = JSON.parse(s); return p.adaCoords ?? undefined }
    } catch { /* ignore */ }
    return undefined
  })
  const [adaNeighborhoodId, setAdaNeighborhoodId] = useState(() => {
    try {
      const s = sessionStorage.getItem('activeAdaSession')
      if (s) { const p = JSON.parse(s); return p.adaNeighborhoodId ?? '' }
    } catch { /* ignore */ }
    return ''
  })
  const [adaBlockNo, setAdaBlockNo] = useState(() => {
    try {
      const s = sessionStorage.getItem('activeAdaSession')
      if (s) { const p = JSON.parse(s); return p.adaBlockNo ?? '' }
    } catch { /* ignore */ }
    return ''
  })
  const [adaBlockId, setAdaBlockId] = useState<string | null>(() => {
    try {
      const s = sessionStorage.getItem('activeAdaSession')
      if (s) { const p = JSON.parse(s); return p.adaBlockId ?? null }
    } catch { /* ignore */ }
    return null
  })
  const [savingAda, setSavingAda] = useState(false)
  const [adaError, setAdaError] = useState<string | null>(null)

  // Persist active ada session so navigation to /parcels/new doesn't lose it
  const saveAdaSession = useCallback((patch: Record<string, unknown>) => {
    try {
      const existing = JSON.parse(sessionStorage.getItem('activeAdaSession') ?? '{}')
      sessionStorage.setItem('activeAdaSession', JSON.stringify({ ...existing, ...patch }))
    } catch { /* ignore */ }
  }, [])

  const filtered = useMemo(() => {
    return parcels.filter((p) => {
      if (filters.colorStatus && p.color_status !== filters.colorStatus) return false
      return true
    })
  }, [parcels, filters])

  const handleAdaDrawComplete = useCallback(async (coords: LatLng[]) => {
    setAdaCoords(coords)
    setMode('ada-info')
    saveAdaSession({ adaCoords: coords, mode: 'ada-info' })
    // Auto-detect neighborhood from drawn location
    const centroid = {
      lat: coords.reduce((s, c) => s + c.lat, 0) / coords.length,
      lng: coords.reduce((s, c) => s + c.lng, 0) / coords.length,
    }
    try {
      const name = await reverseGeocodeNeighborhood(centroid)
      if (name) {
        const matched = neighborhoods.find((n) =>
          n.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(n.name.toLowerCase())
        )
        if (matched) setAdaNeighborhoodId(matched.id)
      }
    } catch { /* ignore */ }
  }, [neighborhoods, saveAdaSession])

  const handleAdaDrawCancel = useCallback(() => {
    setAdaCoords(undefined)
    setMode('view')
    sessionStorage.removeItem('activeAdaSession')
  }, [])

  const handleSaveAda = useCallback(async () => {
    if (!adaNeighborhoodId || !adaBlockNo.trim()) {
      setAdaError('Mahalle ve ada no zorunludur')
      return
    }
    setSavingAda(true)
    setAdaError(null)
    try {
      const block = await orCreateBlock(adaNeighborhoodId, adaBlockNo.trim())
      setAdaBlockId(block.id)
      setMode('ada-drawn')
      saveAdaSession({ adaBlockId: block.id, adaNeighborhoodId, adaBlockNo: adaBlockNo.trim(), mode: 'ada-drawn' })
    } catch (err) {
      setAdaError(err instanceof Error ? err.message : 'Kayıt hatası')
    } finally {
      setSavingAda(false)
    }
  }, [adaNeighborhoodId, adaBlockNo, orCreateBlock, saveAdaSession])

  const handleParcelDrawComplete = useCallback((coords: LatLng[]) => {
    const neighborhood = neighborhoods.find((n) => n.id === adaNeighborhoodId)
    sessionStorage.setItem('pendingParcelDraw', JSON.stringify({
      blockId: adaBlockId,
      blockNo: adaBlockNo,
      neighborhoodId: adaNeighborhoodId,
      neighborhoodName: neighborhood?.name ?? '',
      parcelCoords: coords,
      adaCoords: adaCoords ?? [],
    }))
    router.push('/parcels/new?fromMap=1')
  }, [adaBlockId, adaBlockNo, adaNeighborhoodId, adaCoords, neighborhoods, router])

  const handleParcelDrawCancel = useCallback(() => {
    setMode('ada-drawn')
  }, [])

  const handleResetAda = useCallback(() => {
    setAdaCoords(undefined)
    setAdaBlockId(null)
    setAdaNeighborhoodId('')
    setAdaBlockNo('')
    setMode('view')
    sessionStorage.removeItem('activeAdaSession')
  }, [])

  const selectedNeighborhoodName = neighborhoods.find((n) => n.id === adaNeighborhoodId)?.name

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        parcels={filtered}
        blocks={blocks}
        adaCoords={adaCoords}
        drawMode={mode === 'draw-ada' || mode === 'draw-parcel'}
        drawLabel={mode === 'draw-ada' ? 'Ada sınırını çizin' : 'Parsel sınırını çizin'}
        onDrawComplete={mode === 'draw-ada' ? handleAdaDrawComplete : handleParcelDrawComplete}
        onDrawCancel={mode === 'draw-ada' ? handleAdaDrawCancel : handleParcelDrawCancel}
      />

      {/* Filters — hidden during draw */}
      {mode === 'view' && <MapFilters value={filters} onChange={setFilters} />}

      {/* view mode FAB area */}
      {mode === 'view' && (
        <div className="absolute bottom-6 right-4 flex flex-col gap-2 md:bottom-8 md:right-6">
          <Button
            size="lg"
            variant="outline"
            className="shadow-xl gap-2 bg-white"
            onClick={() => setMode('draw-ada')}
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Ada Çiz</span>
          </Button>
          <Button
            size="lg"
            className="shadow-xl gap-2"
            onClick={() => router.push('/parcels/new')}
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Yeni Parsel</span>
          </Button>
        </div>
      )}

      {/* ada-info bottom sheet: ask neighborhood + ada no */}
      {mode === 'ada-info' && (
        <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl z-20 p-5 space-y-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
          <h2 className="font-semibold text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            Ada Bilgileri
          </h2>

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
              placeholder="Örn: 245"
            />
          </div>

          {adaError && (
            <p className="text-sm text-destructive">{adaError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleAdaDrawCancel}>
              <X className="h-4 w-4 mr-1" />
              İptal
            </Button>
            <Button className="flex-1" onClick={handleSaveAda} disabled={savingAda}>
              {savingAda ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Kaydet
            </Button>
          </div>
        </div>
      )}

      {/* ada-drawn state: show badge + draw parcel button */}
      {mode === 'ada-drawn' && (
        <div className="absolute bottom-6 left-4 right-4 flex flex-col gap-2 md:bottom-8 md:left-6 md:right-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800 flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="font-medium">{selectedNeighborhoodName} • Ada {adaBlockNo}</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="lg"
              className="flex-1 shadow-xl gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => setMode('draw-parcel')}
            >
              <Pencil className="h-4 w-4" />
              Parsel Çiz
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="shadow-xl bg-white"
              onClick={handleResetAda}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
