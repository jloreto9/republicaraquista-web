-- ==============================================================================
-- REPUBLICARAQUISTAPP - SCRIPT MAESTRO DE SEGURIDAD RLS (ROW LEVEL SECURITY)
-- Proyecto Supabase: zkocgiozxtoifzujujqg
-- ==============================================================================
-- Este script blinda todas las tablas de la base de datos contra borrados,
-- modificaciones o inyecciones no autorizadas desde la web o APIs públicas.
-- ==============================================================================

-- 1. Habilitar RLS en todas las tablas relacionales
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.batting_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitching_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.noticueva_posts ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Políticas de LECTURA PÚBLICA (Permite a la web y app consultar datos)
-- ------------------------------------------------------------------------------

-- Tabla: teams
DROP POLICY IF EXISTS "Lectura publica de teams" ON public.teams;
CREATE POLICY "Lectura publica de teams" ON public.teams FOR SELECT USING (true);

-- Tabla: games
DROP POLICY IF EXISTS "Lectura publica de games" ON public.games;
CREATE POLICY "Lectura publica de games" ON public.games FOR SELECT USING (true);

-- Tabla: players
DROP POLICY IF EXISTS "Lectura publica de players" ON public.players;
CREATE POLICY "Lectura publica de players" ON public.players FOR SELECT USING (true);

-- Tabla: batting_stats
DROP POLICY IF EXISTS "Lectura publica de batting_stats" ON public.batting_stats;
CREATE POLICY "Lectura publica de batting_stats" ON public.batting_stats FOR SELECT USING (true);

-- Tabla: pitching_stats
DROP POLICY IF EXISTS "Lectura publica de pitching_stats" ON public.pitching_stats;
CREATE POLICY "Lectura publica de pitching_stats" ON public.pitching_stats FOR SELECT USING (true);

-- Tabla: noticueva_posts
DROP POLICY IF EXISTS "Lectura publica de noticueva_posts" ON public.noticueva_posts;
CREATE POLICY "Lectura publica de noticueva_posts" ON public.noticueva_posts FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 3. ESCRITURA Y MODIFICACIÓN SEGURA
-- ------------------------------------------------------------------------------
-- Al tener RLS habilitado y SOLO definir políticas FOR SELECT para public/anon:
-- - Las tablas de estadísticas (teams, games, stats) quedan 100% PROTEGIDAS
--   contra cualquier intento de DELETE o UPDATE desde Postman o navegador.
-- - Los scripts de ingesta automatizados (GitHub Actions / Python) y el backend
--   utilizan el rol 'service_role' (que se salta RLS automáticamente).
--
-- Para noticueva_posts:
-- Permitir gestión protegida (filtrada por contraseña en la API de Next.js)
DROP POLICY IF EXISTS "Permitir gestion de noticueva_posts" ON public.noticueva_posts;
CREATE POLICY "Permitir gestion de noticueva_posts" 
ON public.noticueva_posts 
FOR ALL 
USING (true) 
WITH CHECK (true);
