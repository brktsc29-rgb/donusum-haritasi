-- Blocks (Adalar)
CREATE TABLE blocks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  neighborhood_id  UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE RESTRICT,
  block_no         TEXT NOT NULL,
  boundary         GEOMETRY(POLYGON, 4326),
  center_point     GEOMETRY(POINT, 4326),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(neighborhood_id, block_no)
);

CREATE INDEX idx_blocks_neighborhood ON blocks(neighborhood_id);
CREATE INDEX idx_blocks_boundary ON blocks USING GIST(boundary);
CREATE INDEX idx_blocks_center ON blocks USING GIST(center_point);

CREATE TRIGGER blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
