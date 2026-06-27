-- Migration 012: Ada numarası ilçe içinde unique olsun
-- Mevcut unique constraint (neighborhood_id, block_no) yerine (district, block_no) ekleniyor.
--
-- Dikkat: Bu migrasyon mevcut verilerle çakışabilir.
-- Önce çakışan kayıtları kontrol edin:
--   SELECT b.block_no, n.district, COUNT(*)
--   FROM blocks b JOIN neighborhoods n ON n.id = b.neighborhood_id
--   GROUP BY b.block_no, n.district HAVING COUNT(*) > 1;

-- 1. blocks tablosuna district kolonu ekle (neighborhoods.district'ten normalize edilmiş)
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS district TEXT;

-- 2. Mevcut kayıtlardaki district'i neighborhood'dan doldur
UPDATE blocks b
SET district = (SELECT district FROM neighborhoods WHERE id = b.neighborhood_id);

-- 3. district NOT NULL yap ve default değer ver
ALTER TABLE blocks ALTER COLUMN district SET NOT NULL;
ALTER TABLE blocks ALTER COLUMN district SET DEFAULT 'Kağıthane';

-- 4. district'i neighborhood insert/update'lerinde senkronize tutan trigger
CREATE OR REPLACE FUNCTION sync_block_district()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.district := (SELECT district FROM neighborhoods WHERE id = NEW.neighborhood_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blocks_sync_district ON blocks;
CREATE TRIGGER blocks_sync_district
  BEFORE INSERT OR UPDATE OF neighborhood_id ON blocks
  FOR EACH ROW EXECUTE FUNCTION sync_block_district();

-- 5. İlçe bazında unique constraint ekle
-- Not: Önce mevcut mahalle bazı constraint kaldırılıyor
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_neighborhood_id_block_no_key;
ALTER TABLE blocks ADD CONSTRAINT blocks_district_block_no_key UNIQUE (district, block_no);

-- 6. Parsel no ada içinde unique — zaten var, kontrol et
-- UNIQUE(block_id, parcel_no) — migration 006'da tanımlandı.
-- Eğer yoksa:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parcels_block_id_parcel_no_key'
  ) THEN
    ALTER TABLE parcels ADD CONSTRAINT parcels_block_id_parcel_no_key UNIQUE (block_id, parcel_no);
  END IF;
END $$;
