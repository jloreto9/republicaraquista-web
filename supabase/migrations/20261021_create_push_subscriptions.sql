-- ==============================================================================
-- REPUBLICARAQUISTAPP - MIGRACIÓN OFICIAL SUPABASE
-- Tabla para Suscripciones Web Push PWA (Feature 011)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    topics TEXT[] NOT NULL DEFAULT ARRAY['game_status', 'news_roster'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON public.push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subs_topics ON public.push_subscriptions USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_push_subs_updated_at ON public.push_subscriptions(updated_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Limpieza idempotente de políticas
DROP POLICY IF EXISTS "Permitir lectura de push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Permitir insercion y actualizacion publica de suscripciones" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Permitir actualizacion publica de suscripciones" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Permitir insercion de push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Permitir lectura y gestion con Service Role" ON public.push_subscriptions;

-- Políticas de RLS
CREATE POLICY "Permitir lectura de push_subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir insercion de push_subscriptions" 
ON public.push_subscriptions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de push_subscriptions" 
ON public.push_subscriptions 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir lectura y gestion con Service Role" 
ON public.push_subscriptions 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
