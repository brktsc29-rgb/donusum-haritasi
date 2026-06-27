'use client'

import { useState, useCallback, useEffect } from 'react'
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

interface FromMapData {
  blockId: string
  blockNo: string
  neighborhoodId: string
  neighborhoodName: string
  parcelCoords: LatLng[]
}

export function ParcelForm() {
  const router = useRouter()
  const [drawnCoords, setDrawnCoords] = useState<LatLng[]>([])
  const [drawActive, setDrawActive] = useState(false)
  const [autoCode, setAutoCode] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [fromMap, setFromMap] = useState<FromMapData | null>(null)

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

  // Load fromMap data from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingParcelDraw')
    if (!raw) return
    sessionStorage.removeItem('pendingParcelDraw')
    try {
      const data: FromMapData = JSON.parse(raw)
      setFromMap(data)
      setDrawnCoords(data.parcelCoords)
      setValue('neighborhood_id', data.neighborhoodId)
      setValue('block_id', data.blockId)
    } catch {
      // ignore parse errors
    }
  }, [setValue])

  const neighborhoodId = watch('neighborhood_id')
  const { data: blocks = [] } = useBlocks(fromMap ? null : neighborhoodId ?? null)

  const selectedNeighborhood = neighborhoods.find((n) => n.id === neighborhoodId)

  const generateCode = useCallback(async () => {
    const neighId = fromMap?.neighborhoodId ?? neighborhoodId
    const neigh = fromMap
      ? { name: fromMap.neighborhoodName }
      : selectedNeighborhood
    if (!neigh || !neighId) return
    const supabase = createClient()
    const { count } = await supabase
      .from('parcels')
      .select('*', { count: 'exact', head: true })
      .eq('neighborhood_id', neighId)
      .eq('is_auto_code', true)

    const seq = (count ?? 0) + 1
    const code = generateAutoParcelCode(neigh.name, seq)
    setValue('parcel_no', code)
    setValue('is_auto_code', true)
    setAutoCode(true)
  }, [fromMap, selectedNeighborhood, neighborhoodId, setValue])

  const onSubmit = async (data: ParcelInput) => {
    setServerError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const block = fromMap
        ? { id: fromMap.blockId }
        : await orCreateBlock(data.neighborhood_id, data.block_id)

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
        created_by: string | null
      }> = []

      for (let i = 1; i <= data.apartment_count; i++) {
        units.push({ parcel_id: parcel.id, unit_type: 'apartment', unit_name: `Daire ${i}`, created_by: user?.id ?? null })
      }
      for (let i = 1; i <= data.shop_count; i++) {
        units.push({ parcel_id: parcel.id, unit_type: 'shop', unit_name: `Dükkan ${i}`, created_by: user?.id ?? null })
      }

      if (units.length > 0) await createUnits.mutateAsync(units)

      router.push(`/parcels/${parcel.id}`)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Bir hata oluştu')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="space-y-6 max-w-2xl mx-auto p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Yeni Parsel</h1>
        <p className="text-sm text-muted-foreground mt-1">Mahalle, ada ve parsel bilgilerini girin</p>
      </div>

      {/* Konum */}
      <Card>
        <CardHeader><CardTitle className="text-base">Konum</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {fromMap ? (
            <div className="flex items-center gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="font-medium">{fromMap.neighborhoodName} • Ada {fromMap.blockNo}</span>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Mahalle *</Label>
                <Select
                  onValueChange={(v) => {
                    setValue('neighborhood_id', v)
                    setValue('block_id', '')
                    setAutoCode(false)
                  }}
                >
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
                  <Select onValueChange={(v) => setValue('block_id', v)} disabled={!neighborhoodId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={neighborhoodId ? 'Ada seçin veya yazın' : 'Önce mahalle seçin'} />
                    </SelectTrigger>
                    <SelectContent>
                      {blocks.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.block_no}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Yeni ada no"
                    className="w-28"
                    disabled={!neighborhoodId}
                    onBlur={(e) => { if (e.target.value) setValue('block_id', e.target.value) }}
                  />
                </div>
                {errors.block_id && <p className="text-xs text-destructive">{errors.block_id.message}</p>}
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Parsel No *</Label>
            <div className="flex gap-2">
              <Input
                {...register('parcel_no')}
                placeholder="Örn: 5"
                className="flex-1"
                onChange={() => {
                  setAutoCode(false)
                  setValue('is_auto_code', false)
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!fromMap && !selectedNeighborhood}
                onClick={generateCode}
                className="gap-1.5 shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Otomatik
              </Button>
            </div>
            {autoCode && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                Otomatik geçici kod oluşturuldu
              </p>
            )}
            {errors.parcel_no && <p className="text-xs text-destructive">{errors.parcel_no.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Adres / Sokak Notu</Label>
            <Input {...register('address_note')} placeholder="Örn: Bahçe Sok. No:12" />
          </div>
        </CardContent>
      </Card>

      {/* Bağımsız Bölümler */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bağımsız Bölümler</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sayıyı girin; sistem otomatik olarak bağımsız bölüm kayıtları oluşturur.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Daire Sayısı</Label>
              <Input type="number" min={0} {...register('apartment_count', { valueAsNumber: true })} />
              {errors.apartment_count && <p className="text-xs text-destructive">{errors.apartment_count.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Dükkan Sayısı</Label>
              <Input type="number" min={0} {...register('shop_count', { valueAsNumber: true })} />
              {errors.shop_count && <p className="text-xs text-destructive">{errors.shop_count.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Harita / Poligon */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Parsel Sınırı
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {drawnCoords.length >= 3 ? (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <span>✓ {drawnCoords.length} noktalı poligon çizildi</span>
              {!fromMap && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 text-xs"
                  onClick={() => { setDrawnCoords([]); setDrawActive(false) }}
                >
                  Yeniden çiz
                </Button>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-secondary rounded-md px-3 py-2">
              Poligon çizilmedi — parsel nokta işareti olarak kaydedilecek.
            </div>
          )}

          {!fromMap && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setDrawActive(!drawActive)}
            >
              <Pencil className="h-3.5 w-3.5" />
              {drawActive ? 'Çizimi İptal Et' : 'Haritada Çiz'}
            </Button>
          )}

          {drawActive && !fromMap && (
            <DrawMap
              onDrawComplete={(coords) => {
                setDrawnCoords(coords)
                setDrawActive(false)
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Notlar */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notlar</CardTitle></CardHeader>
        <CardContent>
          <Textarea {...register('general_notes')} placeholder="Parselle ilgili genel notlar..." rows={3} />
        </CardContent>
      </Card>

      {serverError && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1 gap-2">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</> : 'Parseli Kaydet'}
        </Button>
      </div>
    </form>
  )
}
