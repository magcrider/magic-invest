-- Migration: Sistema de Rebalanceo (Fase 1)
-- Created: 2026-06-04
-- Purpose: Crear tablas para bandas de asignación, snapshots históricos y cache de Hurdle Rate

-- 1. Bandas de asignación personalizadas por usuario
CREATE TABLE IF NOT EXISTS public.user_allocation_bands (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cdt_min    NUMERIC(5,2) NOT NULL DEFAULT 50.00,  -- Límite inferior CDT
  cdt_max    NUMERIC(5,2) NOT NULL DEFAULT 70.00,  -- Límite superior CDT
  etf_min    NUMERIC(5,2) NOT NULL DEFAULT 30.00,  -- Límite inferior ETF
  etf_max    NUMERIC(5,2) NOT NULL DEFAULT 50.00,  -- Límite superior ETF
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.user_allocation_bands IS 'Bandas de asignación objetivo para cada usuario (presets: Conservador, Moderado, Agresivo)';
COMMENT ON COLUMN public.user_allocation_bands.cdt_min IS 'Porcentaje mínimo de CDT en el portafolio';
COMMENT ON COLUMN public.user_allocation_bands.cdt_max IS 'Porcentaje máximo de CDT en el portafolio';
COMMENT ON COLUMN public.user_allocation_bands.etf_min IS 'Porcentaje mínimo de ETF en el portafolio';
COMMENT ON COLUMN public.user_allocation_bands.etf_max IS 'Porcentaje máximo de ETF en el portafolio';

-- 2. Historial de snapshots de portafolio para gráficos de evolución
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  cdt_percentage  NUMERIC(5,2) NOT NULL,
  etf_percentage  NUMERIC(5,2) NOT NULL,
  total_value_cop NUMERIC(15,2) NOT NULL,
  hurdle_rate     NUMERIC(5,2),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date
  ON public.portfolio_snapshots(user_id, snapshot_date DESC);

COMMENT ON TABLE public.portfolio_snapshots IS 'Snapshots trimestrales de asignación del portafolio para histórico';
COMMENT ON COLUMN public.portfolio_snapshots.cdt_percentage IS 'Porcentaje de CDT al momento del snapshot';
COMMENT ON COLUMN public.portfolio_snapshots.etf_percentage IS 'Porcentaje de ETF al momento del snapshot';
COMMENT ON COLUMN public.portfolio_snapshots.total_value_cop IS 'Valor total del portafolio en COP';
COMMENT ON COLUMN public.portfolio_snapshots.hurdle_rate IS 'Hurdle Rate calculado en ese momento';

-- 3. Cache de último Hurdle Rate para detección de variaciones macro
CREATE TABLE IF NOT EXISTS public.hurdle_rate_cache (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hurdle_rate   NUMERIC(5,2) NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.hurdle_rate_cache IS 'Cache del último Hurdle Rate calculado para detectar cambios >1.5% (Trigger #8)';
COMMENT ON COLUMN public.hurdle_rate_cache.hurdle_rate IS 'Último Hurdle Rate calculado (%)';
COMMENT ON COLUMN public.hurdle_rate_cache.calculated_at IS 'Timestamp del último cálculo';

-- Row Level Security (RLS)

-- user_allocation_bands
ALTER TABLE public.user_allocation_bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own allocation bands"
  ON public.user_allocation_bands
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own allocation bands"
  ON public.user_allocation_bands
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own allocation bands"
  ON public.user_allocation_bands
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- portfolio_snapshots
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON public.portfolio_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- hurdle_rate_cache
ALTER TABLE public.hurdle_rate_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hurdle rate cache"
  ON public.hurdle_rate_cache
  FOR SELECT
  USING (auth.uid() = user_id);
