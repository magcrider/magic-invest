-- Magic Invest — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Orden: correr todo de una vez

-- ============================================================
-- TABLAS DE DATOS DE MERCADO (compartidas, solo lectura para usuarios)
-- Pobladas por Edge Functions (Banrep API, EOD data provider)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.macro_rates (
  id             BIGSERIAL PRIMARY KEY,
  type           TEXT    NOT NULL, -- 'banrep_policy_rate' | 'trm' | 'inflation_colombia' | 'inflation_usa'
  value          NUMERIC NOT NULL,
  effective_date DATE    NOT NULL,
  source         TEXT    NOT NULL DEFAULT 'manual',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type, effective_date)
);

CREATE TABLE IF NOT EXISTS public.cdt_rates (
  id             BIGSERIAL PRIMARY KEY,
  bank           TEXT    NOT NULL, -- 'bancolombia' | 'bogota' | 'davivienda' | 'promedio_banrep'
  term_days      INTEGER NOT NULL, -- 30, 60, 90, 180, 360
  rate           NUMERIC NOT NULL,
  effective_date DATE    NOT NULL,
  source         TEXT    NOT NULL DEFAULT 'manual',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bank, term_days, effective_date)
);

CREATE TABLE IF NOT EXISTS public.eod_prices (
  id          BIGSERIAL PRIMARY KEY,
  ticker      TEXT    NOT NULL,
  date        DATE    NOT NULL,
  close_price NUMERIC NOT NULL,
  currency    TEXT    NOT NULL DEFAULT 'USD',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ticker, date)
);

-- ============================================================
-- TABLAS DE USUARIO (por usuario autenticado)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_config (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        TEXT    NOT NULL,
  value      JSONB   NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS public.cdt_positions (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank             TEXT    NOT NULL,
  amount           NUMERIC NOT NULL,
  rate             NUMERIC NOT NULL,
  term_days        INTEGER NOT NULL,
  start_date       DATE    NOT NULL,
  end_date         DATE    NOT NULL,
  capitalization   TEXT    NOT NULL DEFAULT 'maturity',
  withholding_rate NUMERIC NOT NULL DEFAULT 0.04,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.etf_positions (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker              TEXT    NOT NULL,
  name                TEXT    NOT NULL,
  shares              NUMERIC NOT NULL,
  average_cost_usd    NUMERIC NOT NULL,
  ter                 NUMERIC NOT NULL DEFAULT 0,
  currency            TEXT    NOT NULL DEFAULT 'USD',
  total_invested_cop  NUMERIC,
  trm_at_purchase     NUMERIC,
  total_invested_usd  NUMERIC,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inbox_events (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL,
  subtype      TEXT,
  title        TEXT    NOT NULL,
  body         TEXT    NOT NULL,
  asset_ref    TEXT,
  asset_type   TEXT,
  read_at      TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_macro_rates_type_date  ON public.macro_rates(type, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_cdt_rates_bank_term    ON public.cdt_rates(bank, term_days, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_eod_prices_ticker_date ON public.eod_prices(ticker, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_config_user_key   ON public.user_config(user_id, key);
CREATE INDEX IF NOT EXISTS idx_cdt_positions_user     ON public.cdt_positions(user_id, end_date);
CREATE INDEX IF NOT EXISTS idx_etf_positions_user     ON public.etf_positions(user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_inbox_events_user_read ON public.inbox_events(user_id, read_at, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.macro_rates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cdt_rates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_prices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cdt_positions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etf_positions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_events   ENABLE ROW LEVEL SECURITY;

-- Datos de mercado: cualquier usuario autenticado puede leer, nadie puede escribir desde cliente
DROP POLICY IF EXISTS "market_data_read" ON public.macro_rates;
CREATE POLICY "market_data_read" ON public.macro_rates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "market_data_read" ON public.cdt_rates;
CREATE POLICY "market_data_read" ON public.cdt_rates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "market_data_read" ON public.eod_prices;
CREATE POLICY "market_data_read" ON public.eod_prices
  FOR SELECT TO authenticated USING (true);

-- Datos de usuario: solo el propio usuario
DROP POLICY IF EXISTS "own_data" ON public.user_config;
CREATE POLICY "own_data" ON public.user_config
  FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_data" ON public.cdt_positions;
CREATE POLICY "own_data" ON public.cdt_positions
  FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_data" ON public.etf_positions;
CREATE POLICY "own_data" ON public.etf_positions
  FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_data" ON public.inbox_events;
CREATE POLICY "own_data" ON public.inbox_events
  FOR ALL TO authenticated USING (auth.uid() = user_id);
