'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { companySchema, type CompanyInput } from '@/lib/validations'
import { useCreateCompany, useUpdateCompany } from '@/hooks/useCompanies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Company } from '@/types'

interface Props {
  company?: Company
}

export function CompanyForm({ company }: Props) {
  const router = useRouter()
  const isEdit = !!company
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompanyInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(companySchema) as any,
    defaultValues: {
      name: company?.name ?? '',
      contact_person: company?.contact_person ?? null,
      email: company?.email ?? null,
      phone: company?.phone ?? null,
      notes: company?.notes ?? null,
      is_active: company?.is_active ?? true,
    },
  })

  const isActive = watch('is_active')

  const onSubmit = async (data: CompanyInput) => {
    if (isEdit) {
      await updateCompany.mutateAsync({ id: company!.id, updates: data })
      router.push(`/companies/${company!.id}`)
    } else {
      const created = await createCompany.mutateAsync(data)
      router.push(`/companies/${created.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 max-w-2xl mx-auto p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{isEdit ? 'Firma Düzenle' : 'Yeni Firma'}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Firma Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Firma Adı *</Label>
            <Input {...register('name')} placeholder="ABC İnşaat A.Ş." />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>İletişim Kişisi</Label>
              <Input {...register('contact_person')} placeholder="Ad Soyad" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input {...register('phone')} placeholder="05xx..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>E-posta</Label>
            <Input {...register('email')} type="email" placeholder="firma@ornek.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Textarea {...register('notes')} placeholder="Firma hakkında notlar..." rows={3} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={isActive}
              onCheckedChange={(v) => setValue('is_active', !!v)}
            />
            <label htmlFor="is_active" className="text-sm cursor-pointer">Aktif firma</label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 pb-8">
        <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
          İptal
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || createCompany.isPending || updateCompany.isPending}
          className="flex-1 gap-2"
        >
          {(isSubmitting || createCompany.isPending || updateCompany.isPending) && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {isEdit ? 'Güncelle' : 'Firma Oluştur'}
        </Button>
      </div>
    </form>
  )
}
