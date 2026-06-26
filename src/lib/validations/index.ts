import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
})

export const neighborhoodSchema = z.object({
  name: z.string().min(1, 'Mahalle adı zorunludur'),
  district: z.string().default('Kağıthane'),
  city: z.string().default('İstanbul'),
})

export const blockSchema = z.object({
  neighborhood_id: z.string().uuid('Geçerli bir mahalle seçiniz'),
  block_no: z.string().min(1, 'Ada numarası zorunludur'),
  notes: z.string().optional(),
})

export const parcelSchema = z.object({
  block_id: z.string().uuid('Geçerli bir ada seçiniz'),
  neighborhood_id: z.string().uuid('Geçerli bir mahalle seçiniz'),
  parcel_no: z.string().min(1, 'Parsel numarası zorunludur'),
  is_auto_code: z.boolean().default(false),
  apartment_count: z.number().int().min(0, 'Daire sayısı 0 veya üzeri olmalıdır').default(0),
  shop_count: z.number().int().min(0, 'Dükkan sayısı 0 veya üzeri olmalıdır').default(0),
  address_note: z.string().optional(),
  general_notes: z.string().optional(),
  data_source: z.string().optional(),
  accuracy_note: z.string().optional(),
})

export const unitSchema = z.object({
  unit_type: z.enum(['apartment', 'shop']),
  unit_name: z.string().min(1, 'Bağımsız bölüm adı zorunludur'),
  floor: z.number().int().optional().nullable(),
  door_no: z.string().optional().nullable(),
  title_deed_status: z.enum(['titled', 'untitled', 'unknown']).default('unknown'),
  land_share_numerator: z.number().int().positive().optional().nullable(),
  land_share_denominator: z.number().int().positive().optional().nullable(),
  decision_status: z.enum(['positive', 'negative', 'undecided']).optional().nullable(),
  notes: z.string().optional().nullable(),
  owner_name: z.string().optional().nullable(),
  owner_phone: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_role: z
    .enum(['owner', 'tenant', 'relative', 'building_manager', 'neighbor', 'unknown', 'other'])
    .optional()
    .nullable(),
  verbal_consent: z.boolean().default(false),
})

export const unitWithConsentSchema = unitSchema.refine(
  (data) => {
    const hasPersonalData =
      data.owner_name || data.owner_phone || data.contact_name || data.contact_phone
    if (hasPersonalData && !data.verbal_consent) return false
    return true
  },
  {
    message: 'Kişisel veri girildiğinde sözlü onay zorunludur',
    path: ['verbal_consent'],
  }
)

export const companySchema = z.object({
  name: z.string().min(1, 'Firma adı zorunludur'),
  contact_person: z.string().optional().nullable(),
  email: z.string().email('Geçerli bir e-posta giriniz').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Ad soyad zorunludur'),
  role: z.enum(['admin', 'field', 'company']),
  company_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ParcelInput = z.infer<typeof parcelSchema>
export type UnitInput = z.infer<typeof unitWithConsentSchema>
export type CompanyInput = z.infer<typeof companySchema>
export type ProfileInput = z.infer<typeof profileSchema>
