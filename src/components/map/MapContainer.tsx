'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { GoogleMapsProvider } from '@/lib/map/providers/google'
import { PARCEL_ZOOM_THRESHOLD, POLYGON_STYLES, DEFAULT_MAP_OPTIONS } from '@/lib/map/types'
import type { MapProvider } from '@/lib/map/types'
import type { ParcelMapFeature, LatLng } from '@/types'
import { colorStatusToHex } from '@/lib/utils'
import { ParcelInfoCard } from './ParcelInfoCard'

interface Props {
  parcels: ParcelMapFeature[]
  onParcelClick?: (parcel: ParcelMapFeature) => void
  drawMode?: boolean
  onDrawComplete?: (coords: LatLng[]) => void
}

export function MapContainer({ parcels, onParcelClick, drawMode = false, onDrawComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const providerRef = useRef<MapProvider | null>(null)
  const [zoom, setZoom] = useState(DEFAULT_MAP_OPTIONS.zoom)
  const [selectedParcel, setSelectedParcel] = useState<ParcelMapFeature | null>(null)
  const showParcels = zoom >= PARCEL_ZOOM_THRESHOLD

  useEffect(() => {
    if (!containerRef.current) return
    const provider = new GoogleMapsProvider()
    providerRef.current = provider

    provider.initialize(containerRef.current, DEFAULT_MAP_OPTIONS).then(() => {
      provider.onZoomChange((z) => setZoom(z))
    })

    return () => {
      provider.destroy()
      providerRef.current = null
    }
  }, [])

  useEffect(() => {
    const provider = providerRef.current
    if (!provider) return

    provider.clearPolygons()
    provider.clearMarkers()

    if (showParcels) {
      parcels.forEach((parcel) => {
        if (parcel.coordinates.length < 3) {
          if (parcel.center) {
            provider.addMarker(
              parcel.id,
              parcel.center,
              parcel.parcel_no,
              colorStatusToHex(parcel.color_status)
            )
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
        const color =
          ratio === null ? '#9ca3af' : ratio >= 0.5 ? '#22c55e' : '#f97316'

        const withCenter = blockParcels.find((p) => p.center)
        if (withCenter?.center) {
          provider.addMarker(
            `block-${blockNo}`,
            withCenter.center,
            blockNo,
            color
          )
        }
      })
    }
  }, [parcels, showParcels, onParcelClick])

  useEffect(() => {
    const provider = providerRef.current
    if (!provider) return

    if (drawMode && onDrawComplete) {
      provider.enableDrawMode((coords) => {
        onDrawComplete(coords)
      })
    } else {
      provider.disableDrawMode()
    }
  }, [drawMode, onDrawComplete])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="map-container w-full h-full" />

      {drawMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-lg z-10 pointer-events-none">
          Haritaya tıklayarak köşe ekleyin • Bitirmek için çift tıklayın
        </div>
      )}

      {selectedParcel && (
        <ParcelInfoCard
          parcel={selectedParcel}
          onClose={() => setSelectedParcel(null)}
        />
      )}
    </div>
  )
}
