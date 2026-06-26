-- Parcels (Parseller)
CREATE TABLE parcels (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id          UUID NOT NULL REFERENCES blocks(id) ON DELETE RESTRICT,
  neighborhood_id   UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE RESTRICT,
  parcel_no         TEXT NOT NULL,
  is_auto_code      BOOLEAN NOT NULL DEFAULT false,
  boundary          GEOMETRY(POLYGON, 4326),
  center_point      GEOMETRY(POINT, 4326),
  is_manually_drawn BOOLEAN NOT NULL DEFAULT false,
  data_source       TEXT,
  accuracy_note     TEXT,
  total_units       INT NOT NULL DEFAULT 0,
  apartment_count   INT NOT NULL DEFAULT 0,
  shop_count        INT NOT NULL DEFAULT 0,
  positive_count    INT NOT NULL DEFAULT 0,
  negative_count    INT NOT NULL DEFAULT 0,
  undecided_count   INT NOT NULL DEFAULT 0,
  positive_ratio    NUMERIC(5, 4),
  color_status      TEXT NOT NULL DEFAULT 'grey'
                    CHECK (color_status IN ('grey', 'green', 'orange')),
  address_note      TEXT,
  general_notes     TEXT,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(block_id, parcel_no)
);

CREATE INDEX idx_parcels_block ON parcels(block_id);
CREATE INDEX idx_parcels_neighborhood ON parcels(neighborhood_id);
CREATE INDEX idx_parcels_boundary ON parcels USING GIST(boundary);
CREATE INDEX idx_parcels_center ON parcels USING GIST(center_point);
CREATE INDEX idx_parcels_color ON parcels(color_status);
CREATE INDEX idx_parcels_created_by ON parcels(created_by);

CREATE TRIGGER parcels_updated_at
  BEFORE UPDATE ON parcels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
