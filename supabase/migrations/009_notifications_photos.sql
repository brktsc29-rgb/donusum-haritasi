-- Company notification log
CREATE TABLE company_notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parcel_id     UUID REFERENCES parcels(id) ON DELETE SET NULL,
  block_id      UUID REFERENCES blocks(id) ON DELETE SET NULL,
  sent_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email_to      TEXT NOT NULL,
  email_subject TEXT,
  email_body    TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        TEXT NOT NULL DEFAULT 'sent'
                CHECK (status IN ('sent', 'failed', 'draft'))
);

CREATE INDEX idx_notif_company ON company_notifications(company_id);
CREATE INDEX idx_notif_parcel ON company_notifications(parcel_id);
CREATE INDEX idx_notif_sent_at ON company_notifications(sent_at DESC);

-- Photos
CREATE TABLE photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id     UUID REFERENCES parcels(id) ON DELETE CASCADE,
  unit_id       UUID REFERENCES units(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  category      TEXT CHECK (category IN ('facade','entrance','door','street','general','other')),
  caption       TEXT,
  uploaded_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_parcel ON photos(parcel_id);
CREATE INDEX idx_photos_unit ON photos(unit_id);
