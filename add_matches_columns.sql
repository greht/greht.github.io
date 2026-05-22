-- ============================================
-- AGREGAR COLUMNAS DE RESULTADOS A matches
-- ============================================

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS home_score integer,
ADD COLUMN IF NOT EXISTS away_score integer,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled';
