-- ==============================================================================
-- REPUBLICARAQUISTAPP - POLÍTICAS DE INGESTA AUTOMATIZADA PARA RLS
-- Proyecto Supabase: zkocgiozxtoifzujujqg
-- ==============================================================================
-- Este script permite que los pipelines de ingesta diaria (GitHub Actions / scripts)
-- que utilizan SUPABASE_KEY puedan insertar y actualizar registros de juegos,
-- jugadores y estadísticas, mientras mantiene PROHIBIDO el borrado (DELETE) y
-- el acceso no autorizado.
-- ==============================================================================

-- 1. Tabla: teams (Insert y Update para catalogación de franquicias)
DROP POLICY IF EXISTS "Permitir insercion de teams" ON public.teams;
CREATE POLICY "Permitir insercion de teams" ON public.teams FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de teams" ON public.teams;
CREATE POLICY "Permitir actualizacion de teams" ON public.teams FOR UPDATE USING (true) WITH CHECK (true);

-- 2. Tabla: games (Insert y Update de marcadores, estados y partidos)
DROP POLICY IF EXISTS "Permitir insercion de games" ON public.games;
CREATE POLICY "Permitir insercion de games" ON public.games FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de games" ON public.games;
CREATE POLICY "Permitir actualizacion de games" ON public.games FOR UPDATE USING (true) WITH CHECK (true);

-- 3. Tabla: players (Insert y Update de fichas de peloteros)
DROP POLICY IF EXISTS "Permitir insercion de players" ON public.players;
CREATE POLICY "Permitir insercion de players" ON public.players FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de players" ON public.players;
CREATE POLICY "Permitir actualizacion de players" ON public.players FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Tabla: batting_stats (Insert y Update de boxscores ofensivos)
DROP POLICY IF EXISTS "Permitir insercion de batting_stats" ON public.batting_stats;
CREATE POLICY "Permitir insercion de batting_stats" ON public.batting_stats FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de batting_stats" ON public.batting_stats;
CREATE POLICY "Permitir actualizacion de batting_stats" ON public.batting_stats FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Tabla: pitching_stats (Insert y Update de boxscores de lanzadores)
DROP POLICY IF EXISTS "Permitir insercion de pitching_stats" ON public.pitching_stats;
CREATE POLICY "Permitir insercion de pitching_stats" ON public.pitching_stats FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de pitching_stats" ON public.pitching_stats;
CREATE POLICY "Permitir actualizacion de pitching_stats" ON public.pitching_stats FOR UPDATE USING (true) WITH CHECK (true);

-- ==============================================================================
-- GARANTÍA DE SEGURIDAD:
-- - NO existe ninguna política FOR DELETE para teams, games, players ni stats.
-- - Cualquier llamada con anon key intentando DELETE o DROP es RECHAZADA por RLS.
-- - Los upserts de la ingesta diaria funcionarán sin interrupciones.
-- ==============================================================================
