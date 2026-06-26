'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { unitWithConsentSchema, type UnitInput } from '@/lib/validations'
import { useUpdateUnit, useCreateUnits, useDeleteUnit } from '@/hooks/useUnits'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { Unit, TitleDeedStatus } from '@/types'

const CONSENT_TEXT =
  'Kişiye kentsel dönüşüm ön görüşmesi kapsamında iletişim ve görüş bilgisinin sisteme kaydedileceği sözlü olarak açıklanmış, sözlü onay alınmıştır.'

interface Props {
  unit?: Unit
  parcelId: string
  defaultType?: 'apartment' | 'shop'
  defaultTitleDeedStatus?: TitleDeedStatus
  canViewPersonalData: boolean
  onClose: () => void
}

export function UnitEditModal({
  unit,
  parcelId,
  defaultType = 'apartment',
  defaultTitleDeedStatus,
  canViewPersonalData,
  onClose,
}: Props) {
  const isEdit = !!unit
  const updateUnit = useUpdateUnit()
  const createUnits = useCreateUnits()
  const deleteUnit = useDeleteUnit()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UnitInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(unitWithConsentSchema) as any,
    defaultValues: {
      unit_type: unit?.unit_type ?? defaultType,
      unit_name: unit?.unit_name ?? '',
      floor: unit?.floor ?? null,
      door_no: unit?.door_no ?? null,
      title_deed_status: unit?.title_deed_status ?? defaultTitleDeedStatus ?? 'unknown',
      land_share_numerator: unit?.land_share_numerator ?? null,
      land_share_denominator: unit?.land_share_denominator ?? null,
      decision_status: unit?.decision_status ?? null,
      notes: unit?.notes ?? null,
      owner_name: unit?.owner_name ?? null,
      owner_phone: unit?.owner_phone ?? null,
      contact_name: unit?.contact_name ?? null,
      contact_phone: unit?.contact_phone ?? null,
      contact_role: unit?.contact_role ?? null,
      verbal_consent: unit?.verbal_consent ?? false,
    },
  })

  const verbalConsent = watch('verbal_consent')
  const ownerName = watch('owner_name')
  const ownerPhone = watch('owner_phone')
  const contactName = watch('contact_name')
  const contactPhone = watch('contact_phone')
  const hasPersonalData = !!(ownerName || ownerPhone || contactName || contactPhone)

  const onSubmit = async (data: UnitInput) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const payload: Partial<Unit> = {
      ...data,
      updated_by: user?.id ?? null,
      consent_date: data.verbal_consent ? new Date().toISOString() : unit?.consent_date ?? null,
      consent_given_by: data.verbal_consent ? (user?.id ?? null) : unit?.consent_given_by ?? null,
    }

    if (isEdit) {
      await updateUnit.mutateAsync({ id: unit!.id, updates: payload })
    } else {
      await createUnits.mutateAsync([{ ...payload, parcel_id: parcelId, created_by: user?.id ?? null }])
    }
    onClose()
  }

  const handleDelete = async () => {
    if (!unit || !confirm(`"${unit.unit_name}" silinsin mi?`)) return
    await deleteUnit.mutateAsync({ id: unit.id, parcelId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-card border-b px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-semibold">{isEdit ? 'Bağımsız Bölüm Düzenle' : 'Yeni Bağımsız Bölüm'}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit as any)} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tür *</Label>
              <Select
                defaultValue={unit?.unit_type ?? defaultType}
                onValueChange={(v) => setValue('unit_type', v as 'apartment' | 'shop')}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Daire</SelectItem>
                  <SelectItem value="shop">Dükkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ad *</Label>
              <Input {...register('unit_name')} placeholder="Daire 1" />
              {errors.unit_name && <p className="text-xs text-destructive">{errors.unit_name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kat</Label>
              <Input type="number" {...register('floor', { valueAsNumber: true })} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label>Kapı No</Label>
              <Input {...register('door_no')} placeholder="12" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tapu Durumu</Label>
            <Select
              defaultValue={unit?.title_deed_status ?? defaultTitleDeedStatus ?? 'unknown'}
              onValueChange={(v) => setValue('title_deed_status', v as TitleDeedStatus)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="titled">Tapulu</SelectItem>
                <SelectItem value="untitled">Tapusuz</SelectItem>
                <SelectItem value="unknown">Bilinmiyor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Arsa Payı (Pay)</Label>
              <Input type="number" {...register('land_share_numerator', { valueAsNumber: true })} placeholder="10" />
            </div>
            <div className="space-y-1.5">
              <Label>Arsa Payı (Payda)</Label>
              <Input type="number" {...register('land_share_denominator', { valueAsNumber: true })} placeholder="240" />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Kentsel Dönüşüme Bakış</Label>
            <Select
              defaultValue={unit?.decision_status ?? 'none'}
              onValueChange={(v) => setValue('decision_status', v === 'none' ? null : v as 'positive' | 'negative' | 'undecided')}
            >
              <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Görüş girilmedi</SelectItem>
                <SelectItem value="positive">Olumlu</SelectItem>
                <SelectItem value="negative">Olumsuz</SelectItem>
                <SelectItem value="undecided">Kararsız</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {canViewPersonalData && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Malik / Görüşülen Kişi</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Malik Adı</Label>
                  <Input {...register('owner_name')} placeholder="Ad Soyad" />
                </div>
                <div className="space-y-1.5">
                  <Label>Malik Tel</Label>
                  <Input {...register('owner_phone')} placeholder="05xx..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Görüşülen Kişi</Label>
                  <Input {...register('contact_name')} placeholder="Ad Soyad" />
                </div>
                <div className="space-y-1.5">
                  <Label>Görüşülen Tel</Label>
                  <Input {...register('contact_phone')} placeholder="05xx..." />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Görüşülen Kişi Rolü</Label>
                <Select
                  defaultValue={unit?.contact_role ?? 'none'}
                  onValueChange={(v) => setValue('contact_role', v === 'none' ? null : v as 'owner')}
                >
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    <SelectItem value="owner">Malik</SelectItem>
                    <SelectItem value="tenant">Kiracı</SelectItem>
                    <SelectItem value="relative">Akraba</SelectItem>
                    <SelectItem value="building_manager">Apartman Yöneticisi</SelectItem>
                    <SelectItem value="neighbor">Komşu</SelectItem>
                    <SelectItem value="unknown">Bilinmiyor</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasPersonalData && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">{CONSENT_TEXT}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="verbal_consent"
                      checked={verbalConsent}
                      onCheckedChange={(v) => setValue('verbal_consent', !!v)}
                    />
                    <label htmlFor="verbal_consent" className="text-xs font-medium cursor-pointer">
                      Sözlü onay alındığını onaylıyorum
                    </label>
                  </div>
                  {errors.verbal_consent && (
                    <p className="text-xs text-destructive">{errors.verbal_consent.message}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Not</Label>
            <Textarea {...register('notes')} placeholder="Görüşme notu..." rows={2} />
          </div>

          <div className="flex gap-2 pt-2">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteUnit.isPending}
                className="shrink-0"
              >
                Sil
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">İptal</Button>
            <Button type="submit" disabled={isSubmitting || updateUnit.isPending || createUnits.isPending} className="flex-1 gap-2">
              {(isSubmitting || updateUnit.isPending || createUnits.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
