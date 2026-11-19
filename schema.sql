-- ATELIER NOIR & MULTI-TENANT BERBER SİSTEMİ BULUT VERİTABANI ŞEMASI
-- Bu kodu Supabase Dashboard -> SQL Editor kısmına yapıştırıp "Run" butonuna basın.

-- 1. Tabloyu oluştur (Tek satırda veya dükkan bazlı tüm salon durumunu JSONB olarak saklar)
CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hızlı prototip ve yetki hatası almamak için RLS'i devre dışı bırak
ALTER TABLE app_state DISABLE ROW LEVEL SECURITY;

-- 3. Gerçek Zamanlı (Realtime) dinleme için replication yayınına ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_state;
  END IF;
END $$;

-- 4. Çoklu Berber VatanSMS WhatsApp Hatırlatma Alanları (Mevcut kayıtlara dokunmadan güvenli ekleme)
-- Not: app_state.data JSONB içerisindeki shops dizisinde whatsapp_enabled (default: false) ve whatsapp_reg_id (nullable) olarak tutulur.
-- Eğer ilişkisel shops veya tenants tablosu mevcutsa güvenli şekilde sütunları ekler:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'shops'
  ) THEN
    ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS whatsapp_reg_id TEXT DEFAULT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'tenants'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS whatsapp_reg_id TEXT DEFAULT NULL;
  END IF;
END $$;
