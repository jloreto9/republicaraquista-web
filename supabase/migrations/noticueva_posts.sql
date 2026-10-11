-- ==============================================================================
-- Tabla: noticueva_posts
-- Espacio editorial de República Caraquista: "NotiCueva por Gilberto Méndez"
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.noticueva_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Política de lectura pública (cualquier aficionado puede leer las notas)
CREATE POLICY "Permitir lectura publica de noticueva_posts" 
ON public.noticueva_posts 
FOR SELECT 
USING (true);

-- Política de inserción, actualización y borrado pública (filtrada en API con clave)
CREATE POLICY "Permitir gestion de noticueva_posts" 
ON public.noticueva_posts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Nota de Bienvenida Inicial de Gilberto Méndez
INSERT INTO public.noticueva_posts (title, slug, content, author, image_url, created_at, published)
VALUES (
    '¡Bienvenidos a la NotiCueva!',
    'bienvenidos-a-la-noticueva',
    'Saludos, caraquistas. Arranca una nueva temporada y desde este espacio les traeré el pulso directo de la cueva melenuda: impresiones del dugout, reportes de bajas, incorporaciones del roster y lo que de verdad se vive en el Monumental y en la carretera. ¡Vamos con todo por el campeonato número 22!',
    'Gilberto Méndez',
    'https://midfield.mlbstatic.com/v1/team/695/spots/120',
    NOW(),
    true
)
ON CONFLICT (slug) DO NOTHING;
