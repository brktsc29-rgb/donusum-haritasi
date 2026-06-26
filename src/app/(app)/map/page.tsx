import { MapView } from '@/components/map/MapView'

export default function MapPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b bg-card px-4 shrink-0 justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold">Harita</h1>
          <span className="text-sm text-muted-foreground hidden md:block">
            Kağıthane kentsel dönüşüm parsel haritası
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <MapView />
      </div>
    </div>
  )
}
