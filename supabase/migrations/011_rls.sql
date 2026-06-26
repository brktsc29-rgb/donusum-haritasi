-- Row Level Security Policies

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION company_can_access_parcel(p_parcel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_parcel_access
    WHERE company_id = get_my_company_id()
      AND parcel_id = p_parcel_id
  );
$$;

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_my_role() IN ('admin', 'field'));
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (get_my_role() = 'admin');

-- neighborhoods
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "neighborhoods_read_all" ON neighborhoods
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "neighborhoods_admin_write" ON neighborhoods
  FOR ALL USING (get_my_role() = 'admin');

-- blocks
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_read_all" ON blocks
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "blocks_admin_field_write" ON blocks
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'field'));
CREATE POLICY "blocks_admin_update_delete" ON blocks
  FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "blocks_admin_delete" ON blocks
  FOR DELETE USING (get_my_role() = 'admin');

-- parcels
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parcels_admin_field_read" ON parcels
  FOR SELECT USING (get_my_role() IN ('admin', 'field'));
CREATE POLICY "parcels_company_read" ON parcels
  FOR SELECT USING (
    get_my_role() = 'company'
    AND company_can_access_parcel(id)
  );
CREATE POLICY "parcels_admin_field_insert" ON parcels
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'field'));
CREATE POLICY "parcels_admin_field_update" ON parcels
  FOR UPDATE USING (get_my_role() IN ('admin', 'field'));
CREATE POLICY "parcels_admin_delete" ON parcels
  FOR DELETE USING (get_my_role() = 'admin');

-- units
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_admin_field_read" ON units
  FOR SELECT USING (get_my_role() IN ('admin', 'field'));
CREATE POLICY "units_company_read" ON units
  FOR SELECT USING (
    get_my_role() = 'company'
    AND company_can_access_parcel(parcel_id)
  );
CREATE POLICY "units_admin_field_insert" ON units
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'field'));
CREATE POLICY "units_admin_field_update" ON units
  FOR UPDATE USING (get_my_role() IN ('admin', 'field'));
CREATE POLICY "units_admin_delete" ON units
  FOR DELETE USING (get_my_role() = 'admin');

-- companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_admin_all" ON companies
  FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "companies_self_read" ON companies
  FOR SELECT USING (
    get_my_role() = 'company'
    AND id = get_my_company_id()
  );

-- company_parcel_access
ALTER TABLE company_parcel_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpa_admin_all" ON company_parcel_access
  FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "cpa_company_read" ON company_parcel_access
  FOR SELECT USING (
    get_my_role() = 'company'
    AND company_id = get_my_company_id()
  );

-- company_notifications
ALTER TABLE company_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_admin_all" ON company_notifications
  FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "notif_field_read" ON company_notifications
  FOR SELECT USING (get_my_role() = 'field');

-- photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_admin_field_read" ON photos
  FOR SELECT USING (get_my_role() IN ('admin', 'field'));
CREATE POLICY "photos_company_read" ON photos
  FOR SELECT USING (
    get_my_role() = 'company'
    AND parcel_id IS NOT NULL
    AND company_can_access_parcel(parcel_id)
  );
CREATE POLICY "photos_admin_field_insert" ON photos
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'field'));
CREATE POLICY "photos_admin_delete" ON photos
  FOR DELETE USING (get_my_role() = 'admin');

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON audit_logs
  FOR SELECT USING (get_my_role() = 'admin');
