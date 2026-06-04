-- Migración: Crear tabla watchlist_etfs
-- Fecha: 2026-06-04
-- Autor: Claude Code (según especificaciones de Winston)
-- Propósito: Permitir a usuarios seguir ETFs y recibir notificaciones cuando cruzan Hurdle Rate

-- Crear tabla
CREATE TABLE IF NOT EXISTS public.watchlist_etfs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, ticker)
);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_watchlist_etfs_user ON public.watchlist_etfs(user_id, ticker);

-- Habilitar RLS
ALTER TABLE public.watchlist_etfs ENABLE ROW LEVEL SECURITY;

-- Política: solo el usuario puede ver/modificar su propia watchlist
DROP POLICY IF EXISTS "own_data" ON public.watchlist_etfs;
CREATE POLICY "own_data" ON public.watchlist_etfs
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Verificación
COMMENT ON TABLE public.watchlist_etfs IS 'Lista de ETFs que el usuario sigue para comparar contra su Hurdle Rate';
COMMENT ON COLUMN public.watchlist_etfs.ticker IS 'Símbolo del ETF (ej: VOO, VTI, QQQ)';
