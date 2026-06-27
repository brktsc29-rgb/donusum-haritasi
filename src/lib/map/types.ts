import type { LatLng, BoundingBox, PolygonStyle } from '@/types'

export interface MapOptions {
  center: LatLng
  zoom: number
}

export interface MapProvider {
  initialize(container: HTMLElement, options: MapOptions): Promise<void>
  destroy(): void

  setCenter(latlng: LatLng): void
  setZoom(zoom: number): void
  fitBounds(bounds: BoundingBox): void
  fitCoords(coords: LatLng[]): void

  addPolygon(id: string, coords: LatLng[], style: PolygonStyle): void
  updatePolygon(id: string, style: PolygonStyle): void
  updatePolygonCoords(id: string, coords: LatLng[]): void
  removePolygon(id: string): void
  clearPolygons(): void

  addMarker(id: string, latlng: LatLng, label?: string, color?: string): void
  updateMarker(id: string, latlng: LatLng, color?: string): void
  removeMarker(id: string): void
  clearMarkers(): void

  enableDrawMode(onComplete: (coords: LatLng[]) => void, onPointsChange?: (count: number) => void): void
  disableDrawMode(): void
  finishDrawNow(): void
  undoLastDrawPoint(): void

  onPolygonClick(id: string, handler: () => void): void
  onClick(handler: (latlng: LatLng) => void): void
  onZoomChange(handler: (zoom: number) => void): void

  initSearchBox(input: HTMLInputElement, onPlace: (latlng: LatLng, name: string) => void): void
}

export type MapProviderName = 'google' | 'mapbox' | 'leaflet'

// Default map center: Kağıthane, İstanbul
export const KAGITHANE_CENTER: LatLng = { lat: 41.0769, lng: 28.9764 }

export const DEFAULT_MAP_OPTIONS: MapOptions = {
  center: KAGITHANE_CENTER,
  zoom: 15,
}

export const PARCEL_ZOOM_THRESHOLD = 15

export const POLYGON_STYLES: Record<string, PolygonStyle> = {
  // Parcel styles (zIndex: 2 — renders above block polygons)
  grey: {
    // Default parcel: no data yet → orange
    fillColor: '#f97316',
    fillOpacity: 0.35,
    strokeColor: '#ea580c',
    strokeWeight: 2,
    zIndex: 2,
  },
  green: {
    fillColor: '#22c55e',
    fillOpacity: 0.4,
    strokeColor: '#16a34a',
    strokeWeight: 2,
    zIndex: 2,
  },
  orange: {
    fillColor: '#f97316',
    fillOpacity: 0.4,
    strokeColor: '#ea580c',
    strokeWeight: 2,
    zIndex: 2,
  },

  // Block / Ada styles (zIndex: 1 — renders below parcel polygons)
  block_default: {
    // Default ada: no data yet → lacivert (navy)
    fillColor: '#1E3A8A',
    fillOpacity: 0.12,
    strokeColor: '#1E3A8A',
    strokeWeight: 2,
    zIndex: 1,
  },
  block_green: {
    fillColor: '#22c55e',
    fillOpacity: 0.15,
    strokeColor: '#16a34a',
    strokeWeight: 2,
    zIndex: 1,
  },
  block_orange: {
    fillColor: '#f97316',
    fillOpacity: 0.15,
    strokeColor: '#ea580c',
    strokeWeight: 2,
    zIndex: 1,
  },

  // Misc
  drawing: {
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
    strokeColor: '#2563eb',
    strokeWeight: 2,
    zIndex: 3,
  },
  selected: {
    fillColor: '#8b5cf6',
    fillOpacity: 0.4,
    strokeColor: '#7c3aed',
    strokeWeight: 3,
    zIndex: 4,
  },
  ada: {
    // Active drawing guide for ada boundary
    fillColor: '#3b82f6',
    fillOpacity: 0.15,
    strokeColor: '#2563eb',
    strokeWeight: 3,
    clickable: false,
    zIndex: 5,
  },
}
