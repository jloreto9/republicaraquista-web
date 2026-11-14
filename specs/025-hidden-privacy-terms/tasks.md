# Tareas de Implementación 025: Páginas Ocultas `/privacy` y `/terms` y Exención en Middleware

**Slug:** `025-hidden-privacy-terms`  
**Fecha:** 2026-11-14  

---

## Track A — Edge Middleware (`src/middleware.ts`)

- [x] **T001 [Track A]**: Eximir rutas legales de verificación OAuth en `src/middleware.ts`:
  - Definir `isLegalVerificationPath` para coincidencia exacta con `"/privacy"`, `"/terms"` y `"/privacidad"`.
  - Omitir únicamente el bloqueo `403 Access Denied` de la Regla B (`AGGRESSIVE_BOT_PATTERN`) cuando `isLegalVerificationPath` sea verdadero.
  - Preservar intactas la redirección 308 (`.vercel.app`), Regla A (`MALICIOUS_PATH_PATTERN` 404), Regla B en el resto de rutas, Regla C (`/api/*`) y Regla D (`Cache-Control`).

---

## Track B — Páginas Legales Ocultas (`src/app/privacy/`, `src/app/terms/`)

- [x] **T002 [Track B]**: Crear página oculta de Política de Privacidad en `src/app/privacy/page.tsx`:
  - Exportar `metadata: Metadata` con `robots: { index: false, follow: false }`.
  - Mantener estilo visual Dark Navy (`#070B19` / `#0D152B` / `#1E2B4D`) + Gold (`#FDB827`), `<Header />` e iconos `lucide-react` sin kicker/eyebrow pill badge sobre `<h1>`.
  - Incluir divulgación web/PWA + sección explícita de **Google API Services / YouTube Data API v3** (`youtube.upload`, `youtube`), propósito en el canal del propietario, almacenamiento privado de tokens, cero venta/compartición con terceros, revocación (`https://myaccount.google.com/permissions`) y cláusula **Limited Use** en español e inglés exacto.

- [x] **T003 [Track B]**: Crear página oculta de Condiciones de Uso en `src/app/terms/page.tsx`:
  - Exportar `metadata: Metadata` con `robots: { index: false, follow: false }`.
  - Mantener estilo visual Dark Navy + Gold, `<Header />` e iconos `lucide-react` sin kicker/eyebrow pill badge sobre `<h1>`.
  - Incluir aceptación, uso aceptable, atribución a **MLB Stats API**, cumplimiento de Términos de YouTube / Google API, propiedad intelectual, exención de responsabilidad y contacto del responsable (**Jorge Leonardo Loreto**, `@RepubCaraquista`, `@JorgeLoreto`).

- [x] **T004 [Track B]**: Garantizar ocultamiento total en UI y navegación:
  - Confirmar que no se añaden enlaces ni entradas a `/privacy` o `/terms` en `sidebar.tsx`, `mobile-nav.tsx`, `bottom-nav.tsx`, `nav-data.ts`, `footer.tsx` ni `robots.ts`.

---

## Track C — Verificación, Build y Cierre Spec-Kit (`implementation.md`)

- [x] **T005 [Track C]**: Validar contenido, middleware, ocultamiento, lint y build:
  - Verificar `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, búsqueda de referencias en `src/` y lógica de `src/middleware.ts`.
  - Ejecutar `npm run lint` y `npm run build` en `c:\Users\Administrator\Projets\republicaraquista-web` con código de salida 0.

- [x] **T006 [Track C]**: Cerrar Spec-Kit 025:
  - Marcar `[x]` las tareas completadas en `specs/025-hidden-privacy-terms/tasks.md`.
  - Crear `specs/025-hidden-privacy-terms/implementation.md` con evidencia verificada de archivos, lint y build.
