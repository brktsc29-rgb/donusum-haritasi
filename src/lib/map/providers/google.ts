'use client'

import type { MapProvider, MapOptions } from '../types'
import type { LatLng, BoundingBox, PolygonStyle } from '@/types'

declare global {
  interface Window {
    google: typeof google
    initGoogleMaps?: () => void
  }
}

let googleMapsLoaded = false
let googleMapsLoading = false
const loadCallbacks: Array<() => void> = []

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve) => {
    if (googleMapsLoaded) { resolve(); return }
    loadCallbacks.push(resolve)
    if (googleMapsLoading) return
    googleMapsLoading = true

    window.initGoogleMaps = () => {
      googleMapsLoaded = true
      googleMapsLoading = false
      loadCallbacks.forEach((cb) => cb())
      loadCallbacks.length = 0
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=geometry&callback=initGoogleMaps&loading=async`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  })
}

export class GoogleMapsProvider implements MapProvider {
  private map: google.maps.Map | null = null
  private polygons: Map<string, google.maps.Polygon> = new Map()
  private markers: Map<string, google.maps.Marker> = new Map()
  private polygonClickListeners: Map<string, google.maps.MapsEventListener> = new Map()
  private mapClickListener: google.maps.MapsEventListener | null = null
  private zoomListener: google.maps.MapsEventListener | null = null

  private isDrawing = false
  private drawPoints: LatLng[] = []
  private drawPolyline: google.maps.Polyline | null = null
  private drawMarkers: google.maps.Marker[] = []
  private drawClickListener: google.maps.MapsEventListener | null = null
  private drawDblClickListener: google.maps.MapsEventListener | null = null
  private onDrawComplete: ((coords: LatLng[]) => void) | null = null
  private onPointsChange: ((count: number) => void) | null = null

  async initialize(container: HTMLElement, options: MapOptions): Promise<void> {
    await loadGoogleMapsScript()
    this.map = new google.maps.Map(container, {
      center: options.center,
      zoom: options.zoom,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE],
        position: google.maps.ControlPosition.TOP_RIGHT,
      },
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      gestureHandling: 'greedy',
      disableDoubleClickZoom: true,
    })
  }

  initSearchBox(input: HTMLInputElement, onPlace: (latlng: LatLng, name: string) => void): void {
    if (!this.map) return
    const geocoder = new google.maps.Geocoder()
    const search = () => {
      const q = input.value.trim()
      if (!q) return
      geocoder.geocode({ address: q, region: 'tr' }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location
          onPlace({ lat: loc.lat(), lng: loc.lng() }, results[0].formatted_address ?? q)
        }
      })
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); search() } })
  }

  destroy(): void {
    this.clearPolygons()
    this.clearMarkers()
    this.disableDrawMode()
    if (this.mapClickListener) google.maps.event.removeListener(this.mapClickListener)
    if (this.zoomListener) google.maps.event.removeListener(this.zoomListener)
    this.map = null
  }

  setCenter(latlng: LatLng): void { this.map?.setCenter(latlng) }
  setZoom(zoom: number): void { this.map?.setZoom(zoom) }

  fitBounds(bounds: BoundingBox): void {
    if (!this.map) return
    this.map.fitBounds(new google.maps.LatLngBounds(
      { lat: bounds.south, lng: bounds.west },
      { lat: bounds.north, lng: bounds.east }
    ))
  }

  fitCoords(coords: LatLng[]): void {
    if (!this.map || coords.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    coords.forEach((c) => bounds.extend(c))
    this.map.fitBounds(bounds)
  }

  addPolygon(id: string, coords: LatLng[], style: PolygonStyle): void {
    if (!this.map) return
    this.removePolygon(id)
    const polygon = new google.maps.Polygon({
      paths: coords,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
      strokeColor: style.strokeColor,
      strokeWeight: style.strokeWeight,
      clickable: true,
    })
    polygon.setMap(this.map)
    this.polygons.set(id, polygon)
  }

  updatePolygon(id: string, style: PolygonStyle): void {
    this.polygons.get(id)?.setOptions(style)
  }

  updatePolygonCoords(id: string, coords: LatLng[]): void {
    this.polygons.get(id)?.setPaths(coords)
  }

  removePolygon(id: string): void {
    const polygon = this.polygons.get(id)
    if (!polygon) return
    const listener = this.polygonClickListeners.get(id)
    if (listener) { google.maps.event.removeListener(listener); this.polygonClickListeners.delete(id) }
    polygon.setMap(null)
    this.polygons.delete(id)
  }

  clearPolygons(): void { this.polygons.forEach((_, id) => this.removePolygon(id)) }

  addMarker(id: string, latlng: LatLng, label?: string, color?: string): void {
    if (!this.map) return
    this.removeMarker(id)
    const marker = new google.maps.Marker({
      position: latlng,
      map: this.map,
      label: label ? { text: label, color: '#fff', fontWeight: 'bold', fontSize: '12px' } : undefined,
      icon: color ? {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 16,
        fillColor: color,
        fillOpacity: 0.9,
        strokeColor: '#fff',
        strokeWeight: 2,
      } : undefined,
    })
    this.markers.set(id, marker)
  }

  updateMarker(id: string, latlng: LatLng, color?: string): void {
    const marker = this.markers.get(id)
    if (!marker) return
    marker.setPosition(latlng)
    if (color) marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 16,
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: '#fff',
      strokeWeight: 2,
    })
  }

  removeMarker(id: string): void {
    const marker = this.markers.get(id)
    if (!marker) return
    marker.setMap(null)
    this.markers.delete(id)
  }

  clearMarkers(): void { this.markers.forEach((_, id) => this.removeMarker(id)) }

  onPolygonClick(id: string, handler: () => void): void {
    const polygon = this.polygons.get(id)
    if (!polygon) return
    const existing = this.polygonClickListeners.get(id)
    if (existing) google.maps.event.removeListener(existing)
    this.polygonClickListeners.set(id, polygon.addListener('click', handler))
  }

  onClick(handler: (latlng: LatLng) => void): void {
    if (!this.map) return
    if (this.mapClickListener) google.maps.event.removeListener(this.mapClickListener)
    this.mapClickListener = this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) handler({ lat: e.latLng.lat(), lng: e.latLng.lng() })
    })
  }

  onZoomChange(handler: (zoom: number) => void): void {
    if (!this.map) return
    if (this.zoomListener) google.maps.event.removeListener(this.zoomListener)
    this.zoomListener = this.map.addListener('zoom_changed', () => {
      const zoom = this.map?.getZoom()
      if (zoom !== undefined) handler(zoom)
    })
  }

  enableDrawMode(onComplete: (coords: LatLng[]) => void, onPointsChange?: (count: number) => void): void {
    if (!this.map) return
    this.onDrawComplete = onComplete
    this.onPointsChange = onPointsChange ?? null
    this.isDrawing = true
    this.drawPoints = []
    this.map.setOptions({ draggableCursor: 'crosshair', disableDoubleClickZoom: true })

    this.drawPolyline = new google.maps.Polyline({
      strokeColor: '#2563eb',
      strokeWeight: 2,
      map: this.map,
    })

    this.drawClickListener = this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!this.isDrawing || !e.latLng) return
      const point: LatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      this.drawPoints.push(point)
      const dot = new google.maps.Marker({
        position: point,
        map: this.map!,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        clickable: false,
      })
      this.drawMarkers.push(dot)
      this.drawPolyline?.setPath(this.drawPoints.map((p) => new google.maps.LatLng(p.lat, p.lng)))
      this.onPointsChange?.(this.drawPoints.length)
    })

    this.drawDblClickListener = this.map.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
      if (!this.isDrawing || this.drawPoints.length < 3) return
      e.stop?.()
      this.finishDraw()
    })
  }

  finishDrawNow(): void {
    if (this.drawPoints.length >= 3) this.finishDraw()
  }

  undoLastDrawPoint(): void {
    if (this.drawPoints.length === 0) return
    this.drawPoints.pop()
    const lastMarker = this.drawMarkers.pop()
    lastMarker?.setMap(null)
    this.drawPolyline?.setPath(this.drawPoints.map((p) => new google.maps.LatLng(p.lat, p.lng)))
    this.onPointsChange?.(this.drawPoints.length)
  }

  private finishDraw(): void {
    const coords = [...this.drawPoints]
    const onComplete = this.onDrawComplete
    this.disableDrawMode()
    if (coords.length >= 3 && onComplete) onComplete(coords)
  }

  disableDrawMode(): void {
    this.isDrawing = false
    this.drawPoints = []
    this.onDrawComplete = null
    this.onPointsChange = null
    if (this.drawClickListener) { google.maps.event.removeListener(this.drawClickListener); this.drawClickListener = null }
    if (this.drawDblClickListener) { google.maps.event.removeListener(this.drawDblClickListener); this.drawDblClickListener = null }
    if (this.drawPolyline) { this.drawPolyline.setMap(null); this.drawPolyline = null }
    this.drawMarkers.forEach((m) => m.setMap(null))
    this.drawMarkers = []
    if (this.map) this.map.setOptions({ draggableCursor: '', disableDoubleClickZoom: false })
  }
}
