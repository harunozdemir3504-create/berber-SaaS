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
