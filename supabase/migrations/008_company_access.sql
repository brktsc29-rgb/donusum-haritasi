-- Company <-> Parcel access permissions
CREATE TABLE company_parcel_access (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id             UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parcel_id              UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  can_view_personal_data BOOLEAN NOT NULL DEFAULT false,
  granted_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  granted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, parcel_id)
);

CREATE INDEX idx_cpa_company ON company_parcel_access(company_id);
CREATE INDEX idx_cpa_parcel ON company_parcel_access(parcel_id);
