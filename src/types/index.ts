export type UserRole = 'admin' | 'field' | 'company'

export type ColorStatus = 'grey' | 'green' | 'orange'

export type DecisionStatus = 'positive' | 'negative' | 'undecided'

export type UnitType = 'apartment' | 'shop'

export type TitleDeedStatus = 'titled' | 'untitled' | 'unknown'

export type ContactRole =
  | 'owner'
  | 'tenant'
  | 'relative'
  | 'building_manager'
  | 'neighbor'
  | 'unknown'
  | 'other'

export type PhotoCategory = 'facade' | 'entrance' | 'door' | 'street' | 'general' | 'other'

export type NotificationStatus = 'sent' | 'failed' | 'draft'

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  company_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Neighborhood {
  id: string
  name: string
  district: string
  city: string
  boundary: string | null
  created_at: string
}

export interface Block {
  id: string
  neighborhood_id: string
  block_no: string
  boundary: string | null
  center_point: string | null
  notes: string | null
  created_at: string
  updated_at: string
  neighborhood?: Neighborhood
}

export interface Parcel {
  id: string
  block_id: string
  neighborhood_id: string
  parcel_no: string
  is_auto_code: boolean
  boundary: string | null
  center_point: string | null
  is_manually_drawn: boolean
  data_source: string | null
  accuracy_note: string | null
  total_units: number
  apartment_count: number
  shop_count: number
  positive_count: number
  negative_count: number
  undecided_count: number
  positive_ratio: number | null
  color_status: ColorStatus
  address_note: string | null
  general_notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  block?: Block
  neighborhood?: Neighborhood
}

export interface Unit {
  id: string
  parcel_id: string
  unit_type: UnitType
  unit_name: string
  floor: number | null
  door_no: string | null
  title_deed_status: TitleDeedStatus
  land_share_numerator: number | null
  land_share_denominator: number | null
  decision_status: DecisionStatus | null
  notes: string | null
  owner_name: string | null
  owner_phone: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_role: ContactRole | null
  verbal_consent: boolean
  consent_date: string | null
  consent_given_by: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type UnitPublic = Omit<
  Unit,
  'owner_name' | 'owner_phone' | 'contact_name' | 'contact_phone' | 'notes' | 'consent_given_by'
>

export interface Company {
  id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CompanyParcelAccess {
  id: string
  company_id: string
  parcel_id: string
  can_view_personal_data: boolean
  granted_by: string | null
  granted_at: string
  company?: Company
  parcel?: Parcel
}

export interface CompanyNotification {
  id: string
  company_id: string
  parcel_id: string | null
  block_id: string | null
  sent_by: string | null
  email_to: string
  email_subject: string | null
  email_body: string | null
  sent_at: string
  status: NotificationStatus
  company?: Company
}

export interface Photo {
  id: string
  parcel_id: string | null
  unit_id: string | null
  storage_path: string
  category: PhotoCategory | null
  caption: string | null
  uploaded_by: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: AuditAction
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  performed_by: string | null
  performed_at: string
  profile?: Profile
}

export interface LatLng {
  lat: number
  lng: number
}

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

export interface PolygonStyle {
  fillColor: string
  fillOpacity: number
  strokeColor: string
  strokeWeight: number
  clickable?: boolean
}

export interface ParcelMapFeature {
  id: string
  parcel_no: string
  block_no: string
  neighborhood_name: string
  color_status: ColorStatus
  total_units: number
  positive_count: number
  negative_count: number
  undecided_count: number
  positive_ratio: number | null
  coordinates: LatLng[]
  center: LatLng | null
}
