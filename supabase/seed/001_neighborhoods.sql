-- Kağıthane MVP mahalle seed verisi
INSERT INTO neighborhoods (name, district, city) VALUES
  ('Yeşilce',      'Kağıthane', 'İstanbul'),
  ('Sultan Selim', 'Kağıthane', 'İstanbul'),
  ('Ortabayır',    'Kağıthane', 'İstanbul'),
  ('Sanayi',       'Kağıthane', 'İstanbul'),
  ('Seyrantepe',   'Kağıthane', 'İstanbul'),
  ('Çeliktepe',    'Kağıthane', 'İstanbul'),
  ('Gültepe',      'Kağıthane', 'İstanbul')
ON CONFLICT (name) DO NOTHING;
