# Tasks: NotiCueva por Gilberto Méndez & Feed de X

- [X] **T1: Tipos y Servicio de Datos**
  - Crear `src/types/noticueva.ts` con interfaces `NotiCuevaPost`, `CreatePostInput`, `UpdatePostInput`.
  - Crear `src/lib/noticueva-service.ts` con métodos de lectura, creación, actualización y eliminación con fallback local/Supabase.
  - Generar archivo SQL `supabase/migrations/noticueva_posts.sql` con la definición de la tabla.

- [X] **T2: Rutas de API Seguras (`/api/noticueva`)**
  - Crear `src/app/api/noticueva/auth/route.ts` para verificar la contraseña `Leones21.`.
  - Crear `src/app/api/noticueva/route.ts` (GET para listar posts, POST para crear).
  - Crear `src/app/api/noticueva/[id]/route.ts` (PUT para editar, DELETE para borrar).

- [X] **T3: Componentes de UI**
  - Crear `src/components/noticueva/x-timeline.tsx` con integración del timeline de `@republicaraquista` en Dark Navy.
  - Crear `src/components/noticueva/noticueva-card.tsx` y `src/components/noticueva/noticueva-feed.tsx` para visualización pública.
  - Crear `src/components/noticueva/noticueva-admin.tsx` con el editor ultra-amigable para Gilberto Méndez.

- [X] **T4: Vistas Públicas y Privadas**
  - Crear `src/app/noticueva/page.tsx` con header oficial *"NotiCueva por Gilberto Méndez"*, posts y Feed de X.
  - Crear `src/app/admin/page.tsx` para el acceso al panel de redacción.

- [X] **T5: Navegación y Enlaces**
  - Añadir enlace `NotiCueva` en `src/components/layout/sidebar.tsx` y `src/components/layout/mobile-nav.tsx`.

- [X] **T6: Verificación y Compilación**
  - Ejecutar `npm run build` y validar que las nuevas rutas compilen sin errores.
  - Commit y Push a `origin/main` para despliegue en Vercel.
