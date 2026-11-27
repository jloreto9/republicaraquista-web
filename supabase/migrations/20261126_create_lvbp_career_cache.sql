-- ==============================================================================
-- REPUBLICARAQUISTAPP - CACHE PERSISTENTE DE HISTORIAL LVBP (< 2025)
-- Fecha: 2026-11-26
-- Objetivo: Almacenar estadísticas históricas inmutables de por vida LVBP
--           (temporadas < 2025) por jugador y rol para respuestas en ~30-50ms.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.lvbp_career_cache (
  player_id INTEGER NOT NULL,
  player_type TEXT NOT NULL CHECK (player_type IN ('batter', 'pitcher')),
  payload JSONB NOT NULL,
  seasons_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, player_type)
);

ALTER TABLE public.lvbp_career_cache ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.lvbp_career_cache TO anon, authenticated;
GRANT ALL ON TABLE public.lvbp_career_cache TO service_role;

DROP POLICY IF EXISTS "Lectura publica de lvbp_career_cache" ON public.lvbp_career_cache;
CREATE POLICY "Lectura publica de lvbp_career_cache"
ON public.lvbp_career_cache
FOR SELECT
TO anon, authenticated
USING (true);
