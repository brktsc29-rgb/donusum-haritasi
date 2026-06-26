export default function MapPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b bg-card px-4 shrink-0">
        <h1 className="font-semibold">Harita</h1>
        <p className="ml-3 text-sm text-muted-foreground hidden md:block">
          Kağıthane kentsel dönüşüm parsel haritası
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center bg-secondary">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Harita bileşeni</p>
          <p className="text-sm mt-1">Faz 2'de Google Maps entegrasyonu ile gelecek</p>
        </div>
      </div>
    </div>
  )
}
