-- ==============================================================================
-- REPUBLICARAQUISTAPP - SCRIPT DE ENDURECIMIENTO DE SEGURIDAD RLS
-- Fecha: Noviembre 2026
-- Objetivo: Blindar noticueva_posts y push_subscriptions contra mutaciones no autorizadas
-- ==============================================================================

-- 1. Endurecimiento de noticueva_posts
ALTER TABLE IF EXISTS public.noticueva_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir gestion de noticueva_posts" ON public.noticueva_posts;
DROP POLICY IF EXISTS "Permitir lectura publica de noticueva_posts" ON public.noticueva_posts;
DROP POLICY IF EXISTS "Lectura publica de noticueva_posts" ON public.noticueva_posts;
DROP POLICY IF EXISTS "Gestion administrativa con service_role" ON public.noticueva_posts;

-- Lectura pública exclusivamente para notas con published = true
CREATE POLICY "Lectura publica de noticueva_posts"
ON public.noticueva_posts
FOR SELECT
USING (published = true);

-- Inserción, actualización y borrado restringidos exclusivamente a service_role
CREATE POLICY "Gestion administrativa con service_role"
ON public.noticueva_posts
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 2. Endurecimiento de push_subscriptions (Protección de PII y credenciales push)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Permitir actualizacion de push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Permitir insercion de push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Permitir lectura y gestion con Service Role" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Gestion total de suscripciones con service_role" ON public.push_subscriptions;

-- Inserción pública permitida para que nuevos dispositivos se suscriban
CREATE POLICY "Permitir insercion de push_subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

-- Lectura, actualización y borrado masivo reservados exclusivamente para service_role (backend)
CREATE POLICY "Gestion total de suscripciones con service_role"
ON public.push_subscriptions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
