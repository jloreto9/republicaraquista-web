# Technical Plan: NotiCueva por Gilberto Méndez & Feed de X

**Feature**: `noticueva-gilberto-mendez-x`  
**Stack**: Next.js 16 (App Router) + React 19 + Tailwind CSS + Supabase (PostgreSQL)

---

## 1. Arquitectura de Módulos

```
src/
├── types/
│   └── noticueva.ts              # Modelos de Post, Input, Auth
├── lib/
│   └── noticueva-service.ts      # Consultas Supabase + fallback persistente
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx           # Añadir item NotiCueva
│   │   └── mobile-nav.tsx        # Añadir item NotiCueva
│   └── noticueva/
│       ├── noticueva-feed.tsx    # Cuadrícula y lectura de artículos de Gilberto Méndez
│       ├── noticueva-card.tsx    # Tarjeta de artículo individual
│       ├── noticueva-admin.tsx   # Panel de redacción amigable (login + formulario + gestor)
│       └── x-timeline.tsx        # Widget responsive del timeline de X (@republicaraquista)
└── app/
    ├── noticueva/
    │   └── page.tsx              # Vista pública: NotiCueva por Gilberto Méndez + Feed de X
    ├── admin/
    │   └── page.tsx              # Entrada directa al Panel de Redacción
    └── api/
        └── noticueva/
            ├── route.ts          # GET (público) y POST (con auth)
            ├── [id]/route.ts     # PUT y DELETE (con auth)
            └── auth/route.ts     # Validación de contraseña de redactor
```

---

## 2. Esquema SQL para Supabase

```sql
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

-- Habilitar RLS
ALTER TABLE public.noticueva_posts ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública
CREATE POLICY "Permitir lectura publica de noticueva_posts" 
ON public.noticueva_posts FOR SELECT USING (true);

-- Política de inserción/actualización pública vía anon (o backend con clave)
CREATE POLICY "Permitir gestion de noticueva_posts" 
ON public.noticueva_posts FOR ALL USING (true) WITH CHECK (true);
```

---

## 3. Seguridad del Panel de Redacción

- Clave de redactor: Variable de entorno `NOTICUEVA_ADMIN_PASSWORD`
- Verificación del lado del servidor en `/api/noticueva/auth` y en las mutaciones POST/PUT/DELETE mediante header `x-admin-key` o sesión de cookie.
- Si la contraseña es correcta, almacena un token de sesión en `sessionStorage` para no forzar a Gilberto a escribir la clave cada vez que guarda o edita en la misma sesión.
