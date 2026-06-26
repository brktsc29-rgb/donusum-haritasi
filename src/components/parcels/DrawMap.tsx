'use client'

import { useRef, useEffect } from 'react'
import { GoogleMapsProvider } from '@/lib/map/providers/google'
import { DEFAULT_MAP_OPTIONS } from '@/lib/map/types'
import type { LatLng } from '@/types'

interface Props {
  onDrawComplete: (coords: LatLng[]) => void
}

export function DrawMap({ onDrawComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const provider = new GoogleMapsProvider()

    provider.initialize(containerRef.current, {
      ...DEFAULT_MAP_OPTIONS,
      zoom: 17,
    }).then(() => {
      provider.enableDrawMode((coords) => {
        onDrawComplete(coords)
        provider.destroy()
      })
    })

    return () => provider.destroy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-64 w-full rounded-lg border overflow-hidden"
      />
      <p className="text-xs text-muted-foreground">
        Haritaya tıklayarak köşe noktaları ekleyin. Bitirmek için son noktaya çift tıklayın (en az 3 nokta).
      </p>
    </div>
  )
}
