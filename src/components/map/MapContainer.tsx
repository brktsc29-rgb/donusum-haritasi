'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Undo2, CheckCircle2, X } from 'lucide-react'
import { GoogleMapsProvider } from '@/lib/map/providers/google'
import { PARCEL_ZOOM_THRESHOLD, POLYGON_STYLES, DEFAULT_MAP_OPTIONS } from '@/lib/map/types'
import type { MapProvider } from '@/lib/map/types'
import type { ParcelMapFeature, LatLng } from '@/types'
import { colorStatusToHex } from '@/lib/utils'
import { ParcelInfoCard } from './ParcelInfoCard'
import { Button } from '@/components/ui/button'

interface Props {
  parcels: ParcelMapFeature[]
  onParcelClick?: (parcel: ParcelMapFeature) => void
  drawMode?: boolean
  drawLabel?: string
  adaCoords?: LatLng[]
  onDrawComplete?: (coords: LatLng[]) => void
  onDrawCancel?: () => void
}

export function MapContainer({
  parcels,
  onParcelClick,
  drawMode = false,
  drawLabel,
  adaCoords,
  onDrawComplete,
  onDrawCancel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const providerRef = useRef<MapProvider | null>(null)
  const adaFittedRef = useRef(false)
  const [zoom, setZoom] = useState(DEFAULT_MAP_OPTIONS.zoom)
  const [selectedParcel, setSelectedParcel] = useState<ParcelMapFeature | null>(null)
  const [pointCount, setPointCount] = useState(0)
  const showParcels = zoom >= PARCEL_ZOOM_THRESHOLD

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return
    const provider = new GoogleMapsProvider()
    providerRef.current = provider

    provider.initialize(containerRef.current, DEFAULT_MAP_OPTIONS).then(() => {
      provider.onZoomChange((z) => setZoom(z))
      if (searchRef.current) {
        provider.initSearchBox(searchRef.current, (latlng, name) => {
          provider.setCenter(latlng)
          provider.setZoom(17)
          if (searchRef.current) searchRef.current.value = name
        })
      }
    })

    return () => {
      provider.destroy()
      providerRef.current = null
    }
  }, [])

  // Render parcels or block markers
  useEffect(() => {
    const provider = providerRef.current
    if (!provider) return

    provider.clearPolygons()
    provider.clearMarkers()

    if (showParcels) {
      parcels.forEach((parcel) => {
        if (parcel.coordinates.length < 3) {
          if (parcel.center) {
            provider.addMarker(parcel.id, parcel.center, parcel.parcel_no, colorStatusToHex(parcel.color_status))
          }
          return
        }
        const style = POLYGON_STYLES[parcel.color_status] ?? POLYGON_STYLES.grey
        provider.addPolygon(parcel.id, parcel.coordinates, style)
        provider.onPolygonClick(parcel.id, () => {
          setSelectedParcel(parcel)
          if (onParcelClick) onParcelClick(parcel)
        })
      })
    } else {
      const blockMap = new Map<string, ParcelMapFeature[]>()
      parcels.forEach((p) => {
        const key = p.block_no
        if (!blockMap.has(key)) blockMap.set(key, [])
        blockMap.get(key)!.push(p)
      })
      blockMap.forEach((blockParcels, blockNo) => {
        const totalUnits = blockParcels.reduce((s, p) => s + p.total_units, 0)
        const totalPos = blockParcels.reduce((s, p) => s + p.positive_count, 0)
        const ratio = totalUnits > 0 ? totalPos / totalUnits : null
        const color = ratio === null ? '#9ca3af' : ratio >= 0.5 ? '#22c55e' : '#f97316'
        const withCenter = blockParcels.find((p) => p.center)
        if (withCenter?.center) {
          provider.addMarker(`block-${blockNo}`, withCenter.center, blockNo, color)
        }
      })
    }

    // Render ada overlay (non-clickable, so parcel clicks pass through)
    if (adaCoords && adaCoords.length >= 3) {
      provider.addPolygon('__ada__', adaCoords, POLYGON_STYLES.ada)
      if (!adaFittedRef.current) {
        provider.fitCoords(adaCoords)
        adaFittedRef.current = true
      }
    }
  }, [parcels, showParcels, adaCoords, onParcelClick])

  // Reset ada fitted flag when adaCoords changes
  useEffect(() => {
    adaFittedRef.current = false
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

      {/* Search bar — hidden during draw */}
      {!drawMode && (
        <div className="absolute top-3 left-3 right-14 z-10">
          <input
            ref={searchRef}
            type="text"
            placeholder="Adres ara... (Enter)"
            className="w-full h-9 rounded-full border bg-white/95 backdrop-blur px-4 text-sm shadow-md outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Draw mode top label + point count */}
      {drawMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-4 py-2 rounded-full shadow-lg z-10 pointer-events-none whitespace-nowrap">
          {drawLabel ?? 'Haritaya dokunarak köşe ekleyin'}{pointCount > 0 ? ` • ${pointCount} nokta` : ''}
        </div>
      )}

      {/* Mobile draw controls */}
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

      {/* Parcel info card */}
      {selectedParcel && !drawMode && (
        <ParcelInfoCard parcel={selectedParcel} onClose={() => setSelectedParcel(null)} />
      )}
    </div>
  )
}
