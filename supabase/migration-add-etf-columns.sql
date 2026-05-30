-- Migration: Agregar columnas de migración 2 a etf_positions en Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Fecha: Mayo 2026

-- Agregar las 3 columnas nuevas si no existen
ALTER TABLE public.etf_positions
ADD COLUMN IF NOT EXISTS total_invested_cop NUMERIC,
ADD COLUMN IF NOT EXISTS trm_at_purchase NUMERIC,
ADD COLUMN IF NOT EXISTS total_invested_usd NUMERIC;

-- Verificar
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'etf_positions'
  AND table_schema = 'public'
ORDER BY ordinal_position;
