'use client'

import { useRef, useEffect, useCallback } from 'react'
import { GoogleMapsProvider } from '@/lib/map/providers/google'
import { DEFAULT_MAP_OPTIONS } from '@/lib/map/types'
import type { MapProvider, MapOptions } from '@/lib/map/types'

export function useMap(containerRef: React.RefObject<HTMLDivElement | null>, options?: Partial<MapOptions>) {
  const providerRef = useRef<MapProvider | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const provider = new GoogleMapsProvider()
    providerRef.current = provider

    provider.initialize(containerRef.current, {
      ...DEFAULT_MAP_OPTIONS,
      ...options,
    })

    return () => {
      provider.destroy()
      providerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getProvider = useCallback(() => providerRef.current, [])

  return { getProvider }
}
