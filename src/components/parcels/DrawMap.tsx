'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Undo2, CheckCircle2, RefreshCw } from 'lucide-react'
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

  useEffect(() => {
    if (!containerRef.current) return
    const provider = new GoogleMapsProvider()
    providerRef.current = provider

    provider.initialize(containerRef.current, { ...DEFAULT_MAP_OPTIONS, zoom: 17 }).then(() => {
      startDraw(provider)
    })

    return () => {
      provider.destroy()
      providerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function startDraw(provider: GoogleMapsProvider) {
    setPointCount(0)
    setDone(false)
    provider.enableDrawMode(
      (coords) => {
        setDone(true)
        onDrawComplete(coords)
      },
      (count) => setPointCount(count)
    )
  }

  const handleUndo = useCallback(() => {
    providerRef.current?.undoLastDrawPoint()
  }, [])

  const handleFinish = useCallback(() => {
    providerRef.current?.finishDrawNow()
  }, [])

  const handleReset = useCallback(() => {
    const p = providerRef.current
    if (!p) return
    p.disableDrawMode()
    startDraw(p)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <div className="relative">
        <div ref={containerRef} className="h-64 w-full rounded-lg border overflow-hidden" />

        {/* Overlay status */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow pointer-events-none whitespace-nowrap">
          {done
            ? '✓ Çizim tamamlandı'
            : pointCount > 0
            ? `${pointCount} nokta eklendi`
            : 'Haritaya dokunarak köşe ekleyin'}
        </div>
      </div>

      {/* Mobile controls */}
      {!done && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={handleUndo}
            disabled={pointCount === 0}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Geri Al
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={handleFinish}
            disabled={pointCount < 3}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Bitir ({pointCount})
          </Button>
        </div>
      )}

      {done && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={handleReset}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Yeniden Çiz
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        En az 3 nokta ekleyin, ardından &quot;Bitir&quot; düğmesine basın (veya son noktaya çift dokunun).
      </p>
    </div>
  )
}
