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
  grey: {
    fillColor: '#9ca3af',
    fillOpacity: 0.35,
    strokeColor: '#6b7280',
    strokeWeight: 2,
  },
  green: {
    fillColor: '#22c55e',
    fillOpacity: 0.4,
    strokeColor: '#16a34a',
    strokeWeight: 2,
  },
  orange: {
    fillColor: '#f97316',
    fillOpacity: 0.4,
    strokeColor: '#ea580c',
    strokeWeight: 2,
  },
  drawing: {
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
    strokeColor: '#2563eb',
    strokeWeight: 2,
  },
  selected: {
    fillColor: '#8b5cf6',
    fillOpacity: 0.4,
    strokeColor: '#7c3aed',
    strokeWeight: 3,
  },
  ada: {
    fillColor: '#3b82f6',
    fillOpacity: 0.08,
    strokeColor: '#2563eb',
    strokeWeight: 3,
    clickable: false,
  },
}
