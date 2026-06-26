# Dönüşüm Haritası — MVP Planı

---

## 1. Ürün Kısa Tanımı

**Dönüşüm Haritası**, İstanbul/Kağıthane bölgesinde kentsel dönüşüm potansiyeli taşıyan ada ve parsellerde yürütülen saha görüşmelerini dijital ortamda yönetmek için tasarlanmış, harita merkezli bir saha takip uygulamasıdır.

Saha personeli mahalle/ada/parsel hiyerarşisinde yapı verisi girer, malik ve bağımsız bölüm bazında görüş kaydeder. Admin bu verileri harita üzerinde anlık olarak izler, seçili parseller için inşaat firmalarına kişisel veri içermeyen özetler iletir. Sistem bir karar sistemi değil; ön analiz, saha koordinasyonu ve kontrollü firma bilgilendirme aracıdır.

---

## 2. MVP Kullanıcı Senaryoları

### Senaryo A — Saha Personeli Parsel Açar

1. Haritada Yeşilce mahallesini filtreler.
2. Haritada yaklaşık konumu işaretler, ada/parsel no girer (bilinmiyorsa otomatik kod üretilir).
3. Parsel poligonunu harita üzerinde çizer.
4. "Bu parselde 12 daire, 2 dükkan var" girer → sistem 14 bağımsız bölüm kaydı oluşturur.
5. Gün içinde kapı kapı dolaşır, her daire için görüşülen kişi bilgisi ve kentsel dönüşüm görüşünü girer.
6. Sözlü onay kutusunu işaretler, kaydeder.

### Senaryo B — Admin Haritayı İzler

1. Ana harita ekranında parseller olumlu oranına göre renkli görünür.
2. Turuncu parsele tıklar, mini kart açılır: "14 BB, 4 olumlu (%28)"
3. Detay sayfasına girer, bağımsız bölüm listesini, görüşme notlarını inceler.

### Senaryo C — Firma Bilgilendirme

1. Admin "Yeşilce Ada 123" detay sayfasında "Firma Bilgilendir" butonuna basar.
2. Aktif firmalar listelenir, 2 firma seçer.
3. Sistem kişisel veri içermeyen e-posta taslağı hazırlar (mahalle, ada, parsel, oranlar, admin iletişim).
4. Admin önizler, onaylar, gönderilir; sistem gönderim kaydını tutar.

### Senaryo D — Firma Kullanıcısı Görüntüler

1. Firma kullanıcısı sisteme girer, sadece kendisine yetkilendirilmiş parselleri görür.
2. Özet görünümde: mahalle, ada, parsel, oran. Kişisel veri yok.
3. Admin "detay izni" verirse malik adı ve telefon da görünür hale gelir.

---

## 3. Teknik Mimari

```
┌─────────────────────────────────────────────────────┐
│                   Next.js 14 (App Router)           │
│  TypeScript · Tailwind CSS · shadcn/ui              │
│                                                     │
│  /app                                               │
│    /auth          → Giriş/çıkış                     │
│    /dashboard     → Ana panel                       │
│    /map           → Harita (client component)       │
│    /parcels       → Parsel CRUD                     │
│    /companies     → Firma yönetimi                  │
│    /admin         → Kullanıcı/rol yönetimi          │
└──────────────────┬──────────────────────────────────┘
                   │ REST + Realtime
┌──────────────────▼──────────────────────────────────┐
│                   Supabase                          │
│                                                     │
│  Auth        → Email/password + rol claim           │
│  PostgreSQL  → PostGIS extension                    │
│  Storage     → Fotoğraflar (private bucket)         │
│  Edge Fn     → E-posta gönderimi (Resend)           │
│  RLS         → Satır bazlı güvenlik                 │
└─────────────────────────────────────────────────────┘
```

**Runtime seçimleri:**

| Katman | Seçim |
|---|---|
| Framework | Next.js 14 App Router |
| Dil | TypeScript |
| Stil | Tailwind CSS + shadcn/ui |
| Backend/Auth/DB | Supabase (PostgreSQL + PostGIS) |
| Dosya depolama | Supabase Storage |
| Veri yönetimi (client) | Tanstack Query |
| Form | React Hook Form + Zod |
| E-posta | Resend (Supabase Edge Function) |

---

## 4. Harita Yaklaşımı

### Kütüphane Karşılaştırması

| Kriter | Google Maps JS API | Mapbox GL JS | Leaflet + OSM |
|---|---|---|---|
| Polygon çizim | DrawingManager (deprecated uyarısı var) | Draw plugin, stabil | Leaflet.Draw, stabil |
| Hazır parsel sınırı | Yok (3. taraf gerekir) | Yok (3. taraf gerekir) | Yok (3. taraf gerekir) |
| Fiyat modeli | $7/1000 yükleme | $0.50/1000 tile | Ücretsiz |
| Türkiye uydu görüntüsü | Çok iyi | İyi | OSM tabanlı, yeterli |
| TypeScript desteği | İyi | Çok iyi | Yeterli |
| Soyutlama kolaylığı | Orta | Kolay | Kolay |

### Öneri: Soyut Harita Katmanı + Google Maps Başlangıç

```typescript
// /lib/map/types.ts — provider bağımsız arayüz
interface MapProvider {
  initialize(container: HTMLElement, options: MapOptions): void
  addPolygon(id: string, coords: LatLng[], style: PolygonStyle): void
  updatePolygon(id: string, style: PolygonStyle): void
  enableDrawMode(onComplete: (coords: LatLng[]) => void): void
  fitBounds(bounds: BoundingBox): void
  onClick(handler: (latlng: LatLng) => void): void
  destroy(): void
}

// /lib/map/providers/google.ts   → Google Maps impl
// /lib/map/providers/mapbox.ts   → ileride Mapbox impl
```

Başlangıçta Google Maps kullanılır. DrawingManager yerine `google.maps.Polygon` ile kendi çizim aracımızı yazarız (click ile nokta ekle, çift click ile bitir). Bu hem deprecated riskini hem de API bağımlılığını azaltır.

**Parsel sınırı kaynağı:** Türkiye'de kamuya açık CBS parsel katmanı (TKGM/CBSGM WMS) teorik olarak mevcut ancak güvenilirlik tutarsız. MVP'de **manuel çizim birincil yöntem** olur; hazır sınır entegrasyonu roadmap'e alınır.

**Zoom bazlı davranış:**

- zoom ≥ 16 → parsel poligonları göster
- zoom < 16 → ada merkezinde renkli cluster marker göster

---

## 5. Veritabanı Şeması

### Uzantılar

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

### `profiles`

```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'field', 'company')),
  company_id    UUID REFERENCES companies(id),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### `neighborhoods` (Mahalleler)

```sql
CREATE TABLE neighborhoods (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  district   TEXT NOT NULL DEFAULT 'Kağıthane',
  city       TEXT NOT NULL DEFAULT 'İstanbul',
  boundary   GEOMETRY(POLYGON, 4326),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Seed: Yeşilce, Sultan Selim, Ortabayır, Sanayi, Seyrantepe, Çeliktepe, Gültepe

---

### `blocks` (Adalar)

```sql
CREATE TABLE blocks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  neighborhood_id  UUID NOT NULL REFERENCES neighborhoods(id),
  block_no         TEXT NOT NULL,
  boundary         GEOMETRY(POLYGON, 4326),
  center_point     GEOMETRY(POINT, 4326),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(neighborhood_id, block_no)
);

CREATE INDEX idx_blocks_neighborhood ON blocks(neighborhood_id);
CREATE INDEX idx_blocks_boundary ON blocks USING GIST(boundary);
```

---

### `parcels` (Parseller)

```sql
CREATE TABLE parcels (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id          UUID NOT NULL REFERENCES blocks(id),
  neighborhood_id   UUID NOT NULL REFERENCES neighborhoods(id),
  parcel_no         TEXT NOT NULL,
  is_auto_code      BOOLEAN DEFAULT false,
  boundary          GEOMETRY(POLYGON, 4326),
  center_point      GEOMETRY(POINT, 4326),
  is_manually_drawn BOOLEAN DEFAULT false,
  data_source       TEXT,
  accuracy_note     TEXT,
  total_units       INT DEFAULT 0,
  apartment_count   INT DEFAULT 0,
  shop_count        INT DEFAULT 0,
  positive_count    INT DEFAULT 0,
  negative_count    INT DEFAULT 0,
  undecided_count   INT DEFAULT 0,
  positive_ratio    NUMERIC(5,4),
  color_status      TEXT DEFAULT 'grey' CHECK (color_status IN ('grey','green','orange')),
  address_note      TEXT,
  general_notes     TEXT,
  created_by        UUID REFERENCES profiles(id),
  updated_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(block_id, parcel_no)
);

CREATE INDEX idx_parcels_block ON parcels(block_id);
CREATE INDEX idx_parcels_neighborhood ON parcels(neighborhood_id);
CREATE INDEX idx_parcels_boundary ON parcels USING GIST(boundary);
CREATE INDEX idx_parcels_color ON parcels(color_status);
```

---

### `units` (Bağımsız Bölümler)

```sql
CREATE TABLE units (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id                UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  unit_type                TEXT NOT NULL CHECK (unit_type IN ('apartment', 'shop')),
  unit_name                TEXT NOT NULL,
  floor                    INT,
  door_no                  TEXT,
  title_deed_status        TEXT DEFAULT 'unknown'
                           CHECK (title_deed_status IN ('titled','untitled','unknown')),
  land_share_numerator     INT,
  land_share_denominator   INT,
  decision_status          TEXT
                           CHECK (decision_status IN ('positive','negative','undecided') OR decision_status IS NULL),
  notes                    TEXT,
  owner_name               TEXT,
  owner_phone              TEXT,
  contact_name             TEXT,
  contact_phone            TEXT,
  contact_role             TEXT CHECK (contact_role IN
                           ('owner','tenant','relative','building_manager','neighbor','unknown','other')),
  verbal_consent           BOOLEAN DEFAULT false,
  consent_date             TIMESTAMPTZ,
  consent_given_by         UUID REFERENCES profiles(id),
  created_by               UUID REFERENCES profiles(id),
  updated_by               UUID REFERENCES profiles(id),
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_units_parcel ON units(parcel_id);
CREATE INDEX idx_units_decision ON units(decision_status);
CREATE INDEX idx_units_type ON units(unit_type);
```

---

### `companies` (Firmalar)

```sql
CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  contact_person  TEXT,
  email           TEXT,
  phone           TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

---

### `company_parcel_access` (Firma-Parsel Yetki)

```sql
CREATE TABLE company_parcel_access (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id             UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parcel_id              UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  can_view_personal_data BOOLEAN DEFAULT false,
  granted_by             UUID REFERENCES profiles(id),
  granted_at             TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, parcel_id)
);
```

---

### `company_notifications` (Firma Bilgilendirme Kayıtları)

```sql
CREATE TABLE company_notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  parcel_id     UUID REFERENCES parcels(id),
  block_id      UUID REFERENCES blocks(id),
  sent_by       UUID REFERENCES profiles(id),
  email_to      TEXT NOT NULL,
  email_subject TEXT,
  email_body    TEXT,
  sent_at       TIMESTAMPTZ DEFAULT now(),
  status        TEXT DEFAULT 'sent' CHECK (status IN ('sent','failed','draft'))
);
```

---

### `photos` (Fotoğraflar)

```sql
CREATE TABLE photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id     UUID REFERENCES parcels(id) ON DELETE CASCADE,
  unit_id       UUID REFERENCES units(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  category      TEXT CHECK (category IN ('facade','entrance','door','street','general','other')),
  caption       TEXT,
  uploaded_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_photos_parcel ON photos(parcel_id);
CREATE INDEX idx_photos_unit ON photos(unit_id);
```

---

### `audit_logs`

```sql
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name   TEXT NOT NULL,
  record_id    UUID NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data     JSONB,
  new_data     JSONB,
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_user ON audit_logs(performed_by);
```

---

### Renk/Skor Mantığı (Trigger)

```
olumlu_oran = positive_count / total_units

total_units = 0          → color_status = 'grey'
olumlu_oran >= 0.50      → color_status = 'green'
olumlu_oran < 0.50       → color_status = 'orange'
```

Trigger: `units` tablosunda `INSERT / UPDATE / DELETE` sonrası ilgili `parcels` satırı otomatik güncellenir.

---

## 6. Sayfa / Komponent Mimarisi

```
app/
├── (auth)/
│   └── login/                    → Giriş sayfası
│
├── (app)/                        → Auth guard layout
│   ├── dashboard/                → Ana panel (istatistik, son aktiviteler)
│   ├── map/                      → Harita (client-only, lazy load)
│   │   └── _components/
│   │       ├── MapContainer.tsx
│   │       ├── ParcelPolygon.tsx
│   │       ├── ParcelInfoCard.tsx
│   │       ├── DrawingToolbar.tsx
│   │       ├── MapFilters.tsx
│   │       └── ZoomAwareRenderer.tsx
│   │
│   ├── parcels/
│   │   ├── new/                  → Parsel oluşturma
│   │   └── [id]/
│   │       ├── page.tsx          → Parsel detay
│   │       ├── units/            → Bağımsız bölüm listesi
│   │       │   └── [unitId]/edit/
│   │       ├── photos/           → Fotoğraf galerisi
│   │       └── notify/           → Firma bilgilendirme
│   │
│   ├── companies/
│   │   ├── page.tsx              → Firma listesi
│   │   ├── new/
│   │   └── [id]/
│   │       └── access/           → Parsel yetki yönetimi
│   │
│   ├── admin/
│   │   └── users/                → Kullanıcı/rol yönetimi
│   │
│   └── settings/
│
├── api/
│   ├── parcels/
│   ├── units/
│   ├── companies/
│   ├── notify/
│   └── photos/
│
lib/
├── map/
│   ├── types.ts                  → MapProvider interface
│   ├── providers/
│   │   └── google.ts
│   └── scoring.ts
├── supabase/
│   ├── client.ts
│   └── server.ts
└── validations/                  → Zod şemaları
```

---

## 7. Yetkilendirme Modeli

### Rol Matrisi

| İşlem | Admin | Saha | Firma |
|---|:---:|:---:|:---:|
| Tüm parselleri görme | ✅ | ✅ | ⛔ |
| Yetkilendirilmiş parseli görme | ✅ | ✅ | ✅ |
| Kişisel veriyi görme | ✅ | ✅ | İzinle |
| Parsel/birim ekleme | ✅ | ✅ | ⛔ |
| Kendi kaydını düzenleme | ✅ | ✅ | ⛔ |
| Firma yönetimi | ✅ | ⛔ | ⛔ |
| Kullanıcı yönetimi | ✅ | ⛔ | ⛔ |
| E-posta gönderme | ✅ | ⛔ | ⛔ |

### RLS Özeti

- `parcels` → firma kullanıcısı sadece `company_parcel_access`'teki `parcel_id`'leri okuyabilir.
- `units` kişisel veri alanları → `can_view_personal_data = true` olmadan firma göremez (uygulama katmanında field stripping).
- `companies`, `company_parcel_access` → sadece admin yönetir.
- Rol bilgisi Supabase `app_metadata.role` claim'inden okunur; middleware'de kontrol edilir.

---

## 8. KVKK / Sözlü Onay Yaklaşımı

**Onay metni (sabit, değiştirilemez):**

> "Kişiye kentsel dönüşüm ön görüşmesi kapsamında iletişim ve görüş bilgisinin sisteme kaydedileceği sözlü olarak açıklanmış, sözlü onay alınmıştır."

**UI davranışı:**

- İletişim/görüş bilgisi içeren herhangi bir alan girildiğinde form submit engellenir.
- Onay checkbox'ı işaretlenmeden "Kaydet" butonu disabled kalır.
- `verbal_consent`, `consent_date`, `consent_given_by` alanları `units` tablosuna yazılır.
- Tüm değişiklikler `audit_logs`'a kaydedilir.

**Fotoğraf:** Kişiyi tanımlayan içerik yüklenmemesi kullanıcıya uyarı olarak gösterilir.

---

## 9. Firma Bilgilendirme Akışı

```
Admin
  │
  ▼
Parsel Detay Sayfası
  │
  └─→ "Firma Bilgilendir" butonu
        │
        ▼
      Firma Seçim Modal
        ├── Aktif firmalar listelenir
        ├── Tek veya çoklu seçim
        └── "Taslak Oluştur"
              │
              ▼
            E-posta Önizleme
              ├── Mahalle, ada, parsel no
              ├── Toplam BB, daire, dükkan
              ├── Olumlu oran
              ├── Admin iletişim bilgisi
              ├── Sistem linki (firma kullanıcısı varsa)
              ├── Kişisel veri YOK
              └── "Onayla ve Gönder"
                    │
                    ▼
                  Supabase Edge Function → Resend API
                    │
                    ▼
                  company_notifications kaydı
                    (status, tarih, içerik snapshot, gönderen)
```

---

## 10. Uygulama Fazları

### Faz 1 — Temel Altyapı (1-2 hafta)

- [ ] Next.js proje iskeleti, Tailwind, shadcn/ui kurulumu
- [ ] Supabase bağlantısı, Auth, middleware
- [ ] Veritabanı migrasyonları (tüm tablolar + PostGIS)
- [ ] RLS politikaları
- [ ] Profil ve rol yönetimi
- [ ] Mahalle seed verisi

### Faz 2 — Harita ve Parsel (2-3 hafta)

- [ ] Soyut harita katmanı + Google Maps provider
- [ ] Harita ekranı, zoom bazlı render
- [ ] Parsel çizim aracı (manuel polygon — click to draw)
- [ ] Parsel oluşturma formu (mahalle → ada → parsel → birim sayısı)
- [ ] Otomatik bağımsız bölüm oluşturma (daire/dükkan)
- [ ] Otomatik parsel kodu üretimi (`YESILCE-AUTO-001`)
- [ ] Parsel detay sayfası

### Faz 3 — Bağımsız Bölüm ve Görüş Yönetimi (1-2 hafta)

- [ ] Bağımsız bölüm listesi ve CRUD
- [ ] Görüşülen kişi / malik bilgi formu
- [ ] Sözlü onay mekanizması
- [ ] Tapu varsayılan değer mantığı
- [ ] Skor/renk hesaplama trigger'ı
- [ ] Harita renklendirme entegrasyonu

### Faz 4 — Firma ve Bilgilendirme (1 hafta)

- [ ] Firma yönetimi (CRUD)
- [ ] Firma-parsel yetkilendirme
- [ ] Firma kullanıcısı görünümü (özet + kişisel veri izni)
- [ ] E-posta taslak + gönderim (Edge Function + Resend)
- [ ] Gönderim kaydı

### Faz 5 — Fotoğraf, Audit, Polish (1 hafta)

- [ ] Supabase Storage entegrasyonu (private bucket)
- [ ] Fotoğraf yükleme / kategorileme / görüntüleme
- [ ] Audit log görüntüleme (admin)
- [ ] Harita filtreler paneli
- [ ] Dashboard istatistikleri
- [ ] Responsive iyileştirmeler

---

## 11. Riskler ve Öneriler

| Risk | Etki | Öneri |
|---|---|---|
| Google Maps DrawingManager deprecated | Orta | Kendi click-to-draw mantığını yaz, provider arayüzü soyutla |
| Google Maps ücretlendirme ($7/1000) | Orta | Başlangıçta $200/ay ücretsiz kredi yeter; trafiği izle |
| TKGM/CBS parsel verisi kalitesi | Yüksek | MVP'de manuel çizim birincil; otomatik entegrasyon roadmap'e |
| PostGIS karmaşıklığı | Düşük | Polygon geometri tipi yeterli, kompleks sorgular MVP'de az |
| Kişisel veri sızıntısı (firma) | Yüksek | Field stripping uygulama katmanında + RLS double-check |
| Saha personeli mobil kullanım | Orta | Responsive tasarım zorunlu; PWA ileride düşünülebilir |
| Tapu/parsel no tekrarı | Düşük | `UNIQUE(block_id, parcel_no)` constraint + otomatik kod mekanizması |

---

## 12. Onay Beklenen Karar Noktaları

Aşağıdaki konularda tercihini almak gerekiyor; bunlara göre kod şekillenecek:

| # | Konu | Seçenekler |
|---|---|---|
| **K1** | Harita kütüphanesi | Google Maps (soyut katman ile) / Mapbox / Leaflet |
| **K2** | Kişisel veri ayrımı | DB view'ı (daha güvenli, daha karmaşık) / Uygulama katmanı field stripping |
| **K3** | Parsel detay açılışı | Harita üzerinde slide-over panel / Ayrı sayfa yönlendirmesi |
| **K4** | Mahalle seed verisi | Migration içinde sabit seed / Admin panelinden dinamik giriş |
| **K5** | E-posta servisi | Resend / SendGrid / Supabase SMTP |
| **K6** | Deployment hedefi | Vercel + Supabase Cloud / Self-hosted |
| **K7** | Mobil öncelik | Saha personeli telefon/tablet ile mi kullanacak? |

---

> **Sonraki adım:** Yukarıdaki karar noktalarını yanıtladıktan sonra "onaylıyorum, uygula" dersen Faz 1'den başlayarak sırayla uygulamaya geçiyorum.
