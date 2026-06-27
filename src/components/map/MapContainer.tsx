'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Undo2, CheckCircle2, X, Loader2 } from 'lucide-react'
import { GoogleMapsProvider } from '@/lib/map/providers/google'
import { PARCEL_ZOOM_THRESHOLD, POLYGON_STYLES, DEFAULT_MAP_OPTIONS } from '@/lib/map/types'
import type { MapProvider } from '@/lib/map/types'
import type { ParcelMapFeature, BlockMapFeature, LatLng } from '@/types'
import { colorStatusToHex } from '@/lib/utils'
import { ParcelInfoCard } from './ParcelInfoCard'
import { BlockInfoCard } from './BlockInfoCard'
import { Button } from '@/components/ui/button'

interface Props {
  parcels: ParcelMapFeature[]
  blocks?: BlockMapFeature[]
  onParcelClick?: (parcel: ParcelMapFeature) => void
  onBlockClick?: (block: BlockMapFeature) => void
  drawMode?: boolean
  drawLabel?: string
  adaCoords?: LatLng[]
  onDrawComplete?: (coords: LatLng[]) => void
  onDrawCancel?: () => void
}

export function MapContainer({
  parcels,
  blocks = [],
  onParcelClick,
  onBlockClick,
  drawMode = false,
  drawLabel,
  adaCoords,
  onDrawComplete,
  onDrawCancel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const providerRef = useRef<MapProvider | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const adaFittedRef = useRef(false)
  const adaCoordsRef = useRef(adaCoords)
  adaCoordsRef.current = adaCoords

  const [zoom, setZoom] = useState(DEFAULT_MAP_OPTIONS.zoom)
  const [selectedParcel, setSelectedParcel] = useState<ParcelMapFeature | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<BlockMapFeature | null>(null)
  const [pointCount, setPointCount] = useState(0)
  const [searching, setSearching] = useState(false)
  const [searchMsg, setSearchMsg] = useState<string | null>(null)
  const showParcels = zoom >= PARCEL_ZOOM_THRESHOLD

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return
    const provider = new GoogleMapsProvider()
    providerRef.current = provider

    provider.initialize(containerRef.current, DEFAULT_MAP_OPTIONS).then(() => {
      provider.onZoomChange((z) => setZoom(z))
      if (typeof window !== 'undefined' && window.google?.maps) {
        geocoderRef.current = new window.google.maps.Geocoder()
      }
    })

    return () => {
      provider.destroy()
      providerRef.current = null
      geocoderRef.current = null
    }
  }, [])

  // Address search
  const handleSearch = useCallback(() => {
    const q = searchRef.current?.value.trim()
    if (!q) return
    if (!providerRef.current) return
    if (!geocoderRef.current) {
      setSearchMsg('Harita henüz yüklenmedi, lütfen bekleyin')
      setTimeout(() => setSearchMsg(null), 3000)
      return
    }
    setSearching(true)
    setSearchMsg(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(geocoderRef.current as any).geocode(
      { address: q, region: 'tr' },
      (results: google.maps.GeocoderResult[] | null, status: string) => {
        setSearching(false)
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location
          providerRef.current?.setCenter({ lat: loc.lat(), lng: loc.lng() })
          providerRef.current?.setZoom(17)
          if (searchRef.current) searchRef.current.value = results[0].formatted_address ?? q
        } else if (status === 'REQUEST_DENIED') {
          setSearchMsg('Geocoding API aktif değil — Google Cloud Console\'dan etkinleştirin')
          setTimeout(() => setSearchMsg(null), 8000)
        } else {
          setSearchMsg(`Adres bulunamadı (${status})`)
          setTimeout(() => setSearchMsg(null), 3000)
        }
      }
    )
  }, [])

  // Parcel click → reverse geocode → fill search bar
  useEffect(() => {
    if (!selectedParcel?.center || !searchRef.current) return
    if (!geocoderRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(geocoderRef.current as any).geocode(
      { location: selectedParcel.center, region: 'tr' },
      (results: google.maps.GeocoderResult[] | null, status: string) => {
        if (status === 'OK' && results?.[0] && searchRef.current) {
          searchRef.current.value = results[0].formatted_address
        }
      }
    )
  }, [selectedParcel])

  // Render blocks and parcels
  useEffect(() => {
    const provider = providerRef.current
    if (!provider) return

    provider.clearPolygons()
    provider.clearMarkers()

    // 1. Block polygons (ada layer — zIndex 1, always shown)
    blocks.forEach((block) => {
      if (block.coordinates.length >= 3) {
        const styleKey =
          block.color_status === 'green' ? 'block_green'
          : block.color_status === 'orange' ? 'block_orange'
          : 'block_default'
        provider.addPolygon(`block-${block.id}`, block.coordinates, POLYGON_STYLES[styleKey])
        provider.onPolygonClick(`block-${block.id}`, () => {
          setSelectedBlock(block)
          setSelectedParcel(null)
          if (onBlockClick) onBlockClick(block)
        })
      } else if (block.center && !showParcels) {
        // Fallback marker when no boundary data and zoomed out
        const color =
          block.color_status === 'green' ? '#22c55e'
          : block.color_status === 'orange' ? '#f97316'
          : '#1E3A8A'
        provider.addMarker(`block-m-${block.id}`, block.center, block.block_no, color)
      }
    })

    // 2. Parcel polygons (parcel layer — zIndex 2, shown when zoomed in)
    if (showParcels) {
      parcels.forEach((parcel) => {
        if (parcel.coordinates.length < 3) {
          if (parcel.center) {
            provider.addMarker(parcel.id, parcel.center, parcel.parcel_no, colorStatusToHex(parcel.color_status))
          }
          return
        }
        const styleKey = parcel.color_status === 'grey' ? 'grey'
          : parcel.color_status === 'green' ? 'green'
          : 'orange'
        provider.addPolygon(parcel.id, parcel.coordinates, POLYGON_STYLES[styleKey])
        provider.onPolygonClick(parcel.id, () => {
          setSelectedParcel(parcel)
          setSelectedBlock(null)
          if (onParcelClick) onParcelClick(parcel)
        })
      })
    } else {
      // Zoomed out: block-level summary markers (only for blocks without boundary)
      const blocksWithBoundary = new Set(blocks.filter(b => b.coordinates.length >= 3).map(b => b.id))
      const blockMap = new Map<string, ParcelMapFeature[]>()
      parcels.forEach((p) => {
        if (blocksWithBoundary.has(p.block_id)) return
        const key = p.block_id || p.block_no
        if (!blockMap.has(key)) blockMap.set(key, [])
        blockMap.get(key)!.push(p)
      })
      blockMap.forEach((blockParcels) => {
        const totalUnits = blockParcels.reduce((s, p) => s + p.total_units, 0)
        const totalPos = blockParcels.reduce((s, p) => s + p.positive_count, 0)
        const ratio = totalUnits > 0 ? totalPos / totalUnits : null
        const color = ratio === null ? '#1E3A8A' : ratio >= 0.5 ? '#22c55e' : '#f97316'
        const withCenter = blockParcels.find((p) => p.center)
        if (withCenter?.center) {
          provider.addMarker(`bm-${withCenter.block_id}`, withCenter.center, withCenter.block_no, color)
        }
      })
    }

    // 3. Re-add ada drawing guide polygon on top
    const ada = adaCoordsRef.current
    if (ada && ada.length >= 3) {
      provider.addPolygon('__ada__', ada, POLYGON_STYLES.ada)
    }
  }, [blocks, parcels, showParcels, onParcelClick, onBlockClick])

  // Ada drawing guide managed separately so it updates independently
  useEffect(() => {
    const provider = providerRef.current
    if (!provider) return
    provider.removePolygon('__ada__')
    if (adaCoords && adaCoords.length >= 3) {
      provider.addPolygon('__ada__', adaCoords, POLYGON_STYLES.ada)
      if (!adaFittedRef.current) {
        provider.fitCoords(adaCoords)
      }
      adaFittedRef.current = true
    } else {
      adaFittedRef.current = false
    }
  }, [adaCoords])

  // Draw mode toggle
  useEffect(() => {
    const provider = providerRef.current
    if (!provider) return

    if (drawMode && onDrawComplete) {
      setPointCount(0)
      provider.enableDrawMode(
        (coords) => { onDrawComplete(coords) },
        (count) => setPointCount(count)
      )
    } else {
      provider.disableDrawMode()
      setPointCount(0)
    }
  }, [drawMode, onDrawComplete])

  const handleUndo = useCallback(() => {
    providerRef.current?.undoLastDrawPoint()
  }, [])

  const handleFinish = useCallback(() => {
    providerRef.current?.finishDrawNow()
  }, [])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="map-container w-full h-full" />

      {/* Search bar */}
      {!drawMode && (
        <div className="absolute top-3 left-3 right-14 z-10">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              placeholder="Adres ara..."
              className="w-full h-9 rounded-full border bg-white/95 backdrop-blur px-4 pr-20 text-sm shadow-md outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                }
              }}
            />
            <button
              onClick={handleSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
              disabled={searching}
            >
              {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ara'}
            </button>
          </div>
          {searchMsg && (
            <p className="mt-1 ml-4 text-xs text-destructive bg-white/95 rounded-full px-3 py-0.5 shadow w-fit">
              {searchMsg}
            </p>
          )}
        </div>
      )}

      {/* Draw mode label */}
      {drawMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-4 py-2 rounded-full shadow-lg z-10 pointer-events-none whitespace-nowrap">
          {drawLabel ?? 'Haritaya dokunarak köşe ekleyin'}{pointCount > 0 ? ` • ${pointCount} nokta` : ''}
        </div>
      )}

      {/* Draw controls */}
      {drawMode && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-10 px-4">
          <Button
            size="lg"
            variant="outline"
            className="bg-white/95 backdrop-blur shadow-lg gap-2 flex-1 max-w-[120px]"
            onClick={handleUndo}
            disabled={pointCount === 0}
          >
            <Undo2 className="h-4 w-4" />
            Geri Al
          </Button>
          <Button
            size="lg"
            className="shadow-lg gap-2 flex-1 max-w-[160px] bg-green-600 hover:bg-green-700"
            onClick={handleFinish}
            disabled={pointCount < 3}
          >
            <CheckCircle2 className="h-4 w-4" />
            Bitir ({pointCount})
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-white/95 backdrop-blur shadow-lg gap-2 flex-1 max-w-[100px]"
            onClick={onDrawCancel}
          >
            <X className="h-4 w-4" />
            İptal
          </Button>
        </div>
      )}

      {/* Block info card (left side) */}
      {selectedBlock && !drawMode && (
        <BlockInfoCard block={selectedBlock} onClose={() => setSelectedBlock(null)} />
      )}

      {/* Parcel info card (right side) */}
      {selectedParcel && !drawMode && (
        <ParcelInfoCard parcel={selectedParcel} onClose={() => setSelectedParcel(null)} />
      )}
    </div>
  )
}
