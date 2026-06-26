'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Search, Undo2, Check, X } from 'lucide-react'
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
  onDrawComplete?: (coords: LatLng[]) => void
  onDrawCancel?: () => void
}

export function MapContainer({ parcels, onParcelClick, drawMode = false, onDrawComplete, onDrawCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const providerRef = useRef<MapProvider | null>(null)
  const [zoom, setZoom] = useState(DEFAULT_MAP_OPTIONS.zoom)
  const [selectedParcel, setSelectedParcel] = useState<ParcelMapFeature | null>(null)
  const [drawPointCount, setDrawPointCount] = useState(0)
  const showParcels = zoom >= PARCEL_ZOOM_THRESHOLD

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return
    const provider = new GoogleMapsProvider()
    providerRef.current = provider

    provider.initialize(containerRef.current, DEFAULT_MAP_OPTIONS).then(() => {
      provider.onZoomChange((z) => setZoom(z))

      // Center on user's location
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          provider.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          provider.setZoom(16)
        },
        () => {} // fall back to default Kağıthane center
      )

      // Address search (Places Autocomplete)
      if (searchInputRef.current) {
        ;(provider as GoogleMapsProvider).initSearchBox(
          searchInputRef.current,
          (latlng) => {
            provider.setCenter(latlng)
            provider.setZoom(17)
          }
        )
      }
    })

    return () => {
      provider.destroy()
      providerRef.current = null
    }
  }, [])

  // Render parcels / block markers
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
  }, [parcels, showParcels, onParcelClick])

  // Draw mode toggle
  useEffect(() => {
    const provider = providerRef.current
    if (!provider) return

    if (drawMode && onDrawComplete) {
      setDrawPointCount(0)
      provider.enableDrawMode(
        (coords) => { onDrawComplete(coords) },
        (count) => setDrawPointCount(count)
      )
    } else {
      provider.disableDrawMode()
      setDrawPointCount(0)
    }
  }, [drawMode, onDrawComplete])

  const handleFinish = useCallback(() => {
    providerRef.current?.finishDrawNow()
  }, [])

  const handleUndo = useCallback(() => {
    providerRef.current?.undoLastDrawPoint()
  }, [])

  const handleCancel = useCallback(() => {
    providerRef.current?.disableDrawMode()
    setDrawPointCount(0)
    onDrawCancel?.()
  }, [onDrawCancel])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="map-container w-full h-full" />

      {/* Address search bar */}
      {!drawMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-72 sm:w-96 max-w-[calc(100%-5rem)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Adres veya yer ara..."
              className="w-full h-10 pl-9 pr-4 rounded-full shadow-lg border bg-white text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* Draw mode controls */}
      {drawMode && (
        <>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-4 py-2 rounded-full shadow-lg z-10 pointer-events-none">
            Haritaya dokunarak köşe ekleyin ({drawPointCount} nokta)
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            <Button
              size="lg"
              variant="outline"
              className="bg-white shadow-lg h-12 px-4 gap-1.5"
              onClick={handleUndo}
              disabled={drawPointCount === 0}
            >
              <Undo2 className="h-4 w-4" />
              <span className="text-sm">Geri Al</span>
            </Button>
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg h-12 px-5 gap-1.5"
              onClick={handleFinish}
              disabled={drawPointCount < 3}
            >
              <Check className="h-4 w-4" />
              <span className="text-sm">Bitir</span>
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="shadow-lg h-12 px-4 gap-1.5"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
              <span className="text-sm">İptal</span>
            </Button>
          </div>
        </>
      )}

      {/* Parcel info card */}
      {selectedParcel && (
        <ParcelInfoCard
          parcel={selectedParcel}
          onClose={() => setSelectedParcel(null)}
        />
      )}
    </div>
  )
}
