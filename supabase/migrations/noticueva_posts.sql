-- ==============================================================================
-- REPUBLICARAQUISTAPP - MIGRACIÓN OFICIAL SUPABASE
-- Tabla para NotiCueva por Gilberto Méndez
-- ==============================================================================

-- 1. Tabla de Notas Editoriales: noticueva_posts
CREATE TABLE IF NOT EXISTS public.noticueva_posts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Gilberto Méndez',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    published BOOLEAN DEFAULT true NOT NULL
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_noticueva_created_at ON public.noticueva_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_noticueva_slug ON public.noticueva_posts(slug);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.noticueva_posts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS idempotentes (permite reejecutar el script sin errores)
DROP POLICY IF EXISTS "Permitir lectura publica de noticueva_posts" ON public.noticueva_posts;
DROP POLICY IF EXISTS "Permitir gestion de noticueva_posts" ON public.noticueva_posts;

CREATE POLICY "Permitir lectura publica de noticueva_posts" 
ON public.noticueva_posts 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir gestion de noticueva_posts" 
ON public.noticueva_posts 
FOR ALL 
USING (true) 
WITH CHECK (true);
