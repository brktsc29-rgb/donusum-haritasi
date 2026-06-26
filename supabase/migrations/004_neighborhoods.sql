-- Neighborhoods (Mahalleler)
CREATE TABLE neighborhoods (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  district   TEXT NOT NULL DEFAULT 'Kağıthane',
  city       TEXT NOT NULL DEFAULT 'İstanbul',
  boundary   GEOMETRY(POLYGON, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_neighborhoods_district ON neighborhoods(district, city);
