'use client'

import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin, Pencil, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'
import { parcelSchema, type ParcelInput } from '@/lib/validations'
import { generateAutoParcelCode } from '@/lib/utils'
import { useNeighborhoods, useBlocks, useOrCreateBlock } from '@/hooks/useNeighborhoods'
import { useCreateParcel } from '@/hooks/useParcels'
import { useCreateUnits } from '@/hooks/useUnits'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import type { LatLng } from '@/types'

const DrawMap = dynamic(() => import('./DrawMap').then((m) => m.DrawMap), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-lg border bg-secondary flex items-center justify-center text-sm text-muted-foreground">
      Harita yükleniyor...
    </div>
  ),
})

function coordsToGeoJsonPolygon(coords: LatLng[]): string {
  const ring = [...coords, coords[0]].map((c) => [c.lng, c.lat])
  return JSON.stringify({ type: 'Polygon', coordinates: [ring] })
}

function coordsToCentroid(coords: LatLng[]): LatLng {
  const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length
  const lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length
  return { lat, lng }
}

export function ParcelForm() {
  const router = useRouter()
  const [drawnCoords, setDrawnCoords] = useState<LatLng[]>([])
  const [drawActive, setDrawActive] = useState(false)
  const [autoCode, setAutoCode] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: neighborhoods = [] } = useNeighborhoods()
  const createParcel = useCreateParcel()
  const createUnits = useCreateUnits()
  const orCreateBlock = useOrCreateBlock()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ParcelInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(parcelSchema) as any,
    defaultValues: {
      apartment_count: 0,
      shop_count: 0,
      is_auto_code: false,
    },
  })

  const neighborhoodId = watch('neighborhood_id')
  const { data: blocks = [] } = useBlocks(neighborhoodId ?? null)

  const selectedNeighborhood = neighborhoods.find((n) => n.id === neighborhoodId)

  const generateCode = useCallback(async () => {
    if (!selectedNeighborhood) return
    const supabase = createClient()
    const { count } = await supabase
      .from('parcels')
      .select('*', { count: 'exact', head: true })
      .eq('neighborhood_id', neighborhoodId)
      .eq('is_auto_code', true)
    const seq = (count ?? 0) + 1
    const code = generateAutoParcelCode(selectedNeighborhood.name, seq)
    setValue('parcel_no', code)
    setValue('is_auto_code', true)
    setAutoCode(true)
  }, [selectedNeighborhood, neighborhoodId, setValue])

  const onSubmit = async (data: ParcelInput) => {
    setServerError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const block = await orCreateBlock(data.neighborhood_id, data.block_id)

      const boundaryGeoJson = drawnCoords.length >= 3
        ? coordsToGeoJsonPolygon(drawnCoords)
        : null
      const center = drawnCoords.length >= 3 ? coordsToCentroid(drawnCoords) : null
      const centerGeoJson = center
        ? JSON.stringify({ type: 'Point', coordinates: [center.lng, center.lat] })
        : null

      const parcel = await createParcel.mutateAsync({
        parcel: {
          block_id: block.id,
          neighborhood_id: data.neighborhood_id,
          parcel_no: data.parcel_no,
          is_auto_code: data.is_auto_code,
          is_manually_drawn: drawnCoords.length >= 3,
          data_source: drawnCoords.length >= 3 ? 'manuel' : null,
          address_note: data.address_note ?? null,
          general_notes: data.general_notes ?? null,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        },
        boundaryGeoJson,
        centerGeoJson,
      })

      const units: Array<{
        parcel_id: string
        unit_type: 'apartment' | 'shop'
        unit_name: string
        title_deed_status: 'titled' | 'untitled' | 'unknown'
        created_by: string | null
      }> = []

      for (let i = 1; i <= (data.apartment_count ?? 0); i++) {
        units.push({
          parcel_id: parcel.id,
          unit_type: 'apartment',
          unit_name: `Daire ${i}`,
          title_deed_status: 'unknown',
          created_by: user?.id ?? null,
        })
      }
      for (let i = 1; i <= (data.shop_count ?? 0); i++) {
        units.push({
          parcel_id: parcel.id,
          unit_type: 'shop',
          unit_name: `Dükkan ${i}`,
          title_deed_status: 'unknown',
          created_by: user?.id ?? null,
        })
      }

      if (units.length > 0) {
        await createUnits.mutateAsync(units)
      }

      router.push(`/parcels/${parcel.id}`)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Bir hata oluştu')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 max-w-2xl mx-auto p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Yeni Parsel</h1>
        <p className="text-sm text-muted-foreground mt-1">Mahalle, ada ve parsel bilgilerini girin</p>
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Mahalle *</Label>
            <Select onValueChange={(v) => { setValue('neighborhood_id', v); setValue('block_id', '') }}>
              <SelectTrigger>
                <SelectValue placeholder="Mahalle seçin" />
              </SelectTrigger>
              <SelectContent>
                {neighborhoods.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.neighborhood_id && <p className="text-xs text-destructive">{errors.neighborhood_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Ada No *</Label>
            <div className="flex gap-2">
              {blocks.length > 0 ? (
                <Select onValueChange={(v) => setValue('block_id', v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Ada seçin veya yenisini girin" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((b) => (
                      <SelectItem key={b.id} value={b.block_no}>{b.block_no}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="flex-1"
                  placeholder="Ada numarası"
                  {...register('block_id')}
                />
              )}
            </div>
            {errors.block_id && <p className="text-xs text-destructive">{errors.block_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Parsel No *</Label>
              {selectedNeighborhood && (
                <button
                  type="button"
                  onClick={generateCode}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" /> Otomatik kod
                </button>
              )}
            </div>
            <Input {...register('parcel_no')} placeholder="Parsel numarası veya kodu" />
            {errors.parcel_no && <p className="text-xs text-destructive">{errors.parcel_no.message}</p>}
            {autoCode && (
              <p className="text-xs text-muted-foreground">Otomatik kod oluşturuldu</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bağımsız Bölümler</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Daire Sayısı</Label>
            <Input type="number" min={0} {...register('apartment_count', { valueAsNumber: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Dükkan Sayısı</Label>
            <Input type="number" min={0} {...register('shop_count', { valueAsNumber: true })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Parsel Sınırı
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!drawActive ? (
            <div className="space-y-3">
              {drawnCoords.length >= 3 ? (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <span>✓ {drawnCoords.length} nokta çizildi</span>
                  <button
                    type="button"
                    onClick={() => { setDrawnCoords([]); setDrawActive(true) }}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Yeniden çiz
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Opsiyonel — parsel sınırı harita üzerinde çizilebilir.</p>
              )}
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setDrawActive(true)}>
                <Pencil className="h-4 w-4" />
                {drawnCoords.length >= 3 ? 'Yeniden Çiz' : 'Çiz'}
              </Button>
            </div>
          ) : (
            <DrawMap
              onDrawComplete={(coords) => {
                setDrawnCoords(coords)
                setDrawActive(false)
              }}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Adres Notu</Label>
            <Input {...register('address_note')} placeholder="Sokak, bina tarifi..." />
          </div>
          <div className="space-y-1.5">
            <Label>Genel Notlar</Label>
            <Textarea {...register('general_notes')} placeholder="Parsel hakkında notlar..." rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 pb-8">
        <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting || createParcel.isPending} className="flex-1 gap-2">
          {(isSubmitting || createParcel.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
          Parsel Oluştur
        </Button>
      </div>
    </form>
  )
}
