'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Undo2, Check, RotateCcw } from 'lucide-react'
import { GoogleMapsProvider } from '@/lib/map/providers/google'
import { DEFAULT_MAP_OPTIONS } from '@/lib/map/types'
import { Button } from '@/components/ui/button'
import type { LatLng } from '@/types'

interface Props {
  onDrawComplete: (coords: LatLng[]) => void
}

export function DrawMap({ onDrawComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const providerRef = useRef<GoogleMapsProvider | null>(null)
  const [pointCount, setPointCount] = useState(0)
  const [done, setDone] = useState(false)

  const startDraw = useCallback((provider: GoogleMapsProvider) => {
    setPointCount(0)
    setDone(false)
    provider.enableDrawMode(
      (coords) => {
        setDone(true)
        onDrawComplete(coords)
      },
      (count) => setPointCount(count)
    )
  }, [onDrawComplete])

  useEffect(() => {
    if (!containerRef.current) return
    const provider = new GoogleMapsProvider()
    providerRef.current = provider

    provider.initialize(containerRef.current, { ...DEFAULT_MAP_OPTIONS, zoom: 17 }).then(() => {
      // Center on user location
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          provider.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {}
      )
      startDraw(provider)
    })

    return () => {
      provider.destroy()
      providerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = () => providerRef.current?.undoLastDrawPoint()

  const handleFinish = () => providerRef.current?.finishDrawNow()

  const handleReset = () => {
    const provider = providerRef.current
    if (!provider) return
    provider.disableDrawMode()
    startDraw(provider)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          ref={containerRef}
          className="h-64 w-full rounded-lg border overflow-hidden"
        />

        {/* Overlay: point count */}
        {!done && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full shadow pointer-events-none">
            {pointCount === 0 ? 'Köşe noktalarına dokun' : `${pointCount} nokta eklendi`}
          </div>
        )}
        {done && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-1 rounded-full shadow pointer-events-none">
            ✓ Çizim tamamlandı
          </div>
        )}
      </div>

      {/* Mobile-friendly controls */}
      {!done && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={handleUndo}
            disabled={pointCount === 0}
          >
            <Undo2 className="h-4 w-4" />
            Geri Al
          </Button>
          <Button
            type="button"
            className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleFinish}
            disabled={pointCount < 3}
          >
            <Check className="h-4 w-4" />
            Bitir ({pointCount})
          </Button>
        </div>
      )}
      {done && (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-1.5"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4" />
          Yeniden Çiz
        </Button>
      )}
    </div>
  )
}
