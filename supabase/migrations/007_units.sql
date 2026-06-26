-- Units / Bağımsız Bölümler
CREATE TABLE units (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id                UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  unit_type                TEXT NOT NULL CHECK (unit_type IN ('apartment', 'shop')),
  unit_name                TEXT NOT NULL,
  floor                    INT,
  door_no                  TEXT,
  title_deed_status        TEXT NOT NULL DEFAULT 'unknown'
                           CHECK (title_deed_status IN ('titled', 'untitled', 'unknown')),
  land_share_numerator     INT CHECK (land_share_numerator > 0),
  land_share_denominator   INT CHECK (land_share_denominator > 0),
  decision_status          TEXT
                           CHECK (decision_status IN ('positive', 'negative', 'undecided')
                                  OR decision_status IS NULL),
  notes                    TEXT,
  owner_name               TEXT,
  owner_phone              TEXT,
  contact_name             TEXT,
  contact_phone            TEXT,
  contact_role             TEXT CHECK (contact_role IN
                           ('owner','tenant','relative','building_manager',
                            'neighbor','unknown','other')
                           OR contact_role IS NULL),
  verbal_consent           BOOLEAN NOT NULL DEFAULT false,
  consent_date             TIMESTAMPTZ,
  consent_given_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by               UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by               UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_units_parcel ON units(parcel_id);
CREATE INDEX idx_units_decision ON units(decision_status);
CREATE INDEX idx_units_type ON units(unit_type);
CREATE INDEX idx_units_created_by ON units(created_by);

CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION update_parcel_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_parcel_id UUID;
  v_total     INT;
  v_apt       INT;
  v_shop      INT;
  v_pos       INT;
  v_neg       INT;
  v_und       INT;
  v_ratio     NUMERIC(5, 4);
  v_color     TEXT;
BEGIN
  v_parcel_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.parcel_id
    ELSE NEW.parcel_id
  END;

  SELECT
    COUNT(*)                                          AS total,
    COUNT(*) FILTER (WHERE unit_type = 'apartment')  AS apt,
    COUNT(*) FILTER (WHERE unit_type = 'shop')       AS shop,
    COUNT(*) FILTER (WHERE decision_status = 'positive')  AS pos,
    COUNT(*) FILTER (WHERE decision_status = 'negative')  AS neg,
    COUNT(*) FILTER (WHERE decision_status = 'undecided') AS und
  INTO v_total, v_apt, v_shop, v_pos, v_neg, v_und
  FROM units
  WHERE parcel_id = v_parcel_id;

  IF v_total = 0 THEN
    v_ratio := NULL;
    v_color := 'grey';
  ELSE
    v_ratio := ROUND(v_pos::NUMERIC / v_total, 4);
    v_color := CASE WHEN v_ratio >= 0.5 THEN 'green' ELSE 'orange' END;
    IF v_pos = 0 AND v_neg = 0 AND v_und = 0 THEN
      v_color := 'grey';
      v_ratio := NULL;
    END IF;
  END IF;

  UPDATE parcels SET
    total_units     = v_total,
    apartment_count = v_apt,
    shop_count      = v_shop,
    positive_count  = v_pos,
    negative_count  = v_neg,
    undecided_count = v_und,
    positive_ratio  = v_ratio,
    color_status    = v_color,
    updated_at      = now()
  WHERE id = v_parcel_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER units_score_update
  AFTER INSERT OR UPDATE OR DELETE ON units
  FOR EACH ROW EXECUTE FUNCTION update_parcel_scores();
