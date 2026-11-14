# Informe de Implementación y Verificación 025: Páginas Ocultas `/privacy` y `/terms` y Exención en Middleware

**Slug:** `025-hidden-privacy-terms`  
**Fecha:** 2026-11-14  
**Estado:** Implementado y Verificado (Converged)

---

## 1. Resumen de Archivos Entregados

### Track A — Edge Middleware (`src/middleware.ts`)
- [`src/middleware.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/middleware.ts#L47-L57): agregada la guarda exacta `isLegalVerificationPath` (`pathname === "/privacy" || pathname === "/terms" || pathname === "/privacidad"`) en la Regla B (`AGGRESSIVE_BOT_PATTERN` 403), permitiendo que los verificadores automatizados de Google OAuth lean dichas rutas mientras permanecen intactas la redirección 308 de `.vercel.app` (Regla 0), el bloqueo 404 de `MALICIOUS_PATH_PATTERN` (Regla A), el bloqueo 403 de bots en el resto de rutas (Regla B), el blindaje de `/api/*` (Regla C) y las cabeceras `Cache-Control` (Regla D).

### Track B — Páginas Legales Ocultas (`src/app/privacy/`, `src/app/terms/`)
- [`src/app/privacy/page.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/privacy/page.tsx): exporta `metadata` con `robots: { index: false, follow: false }` y `PrivacyPage` usando `<Header />` y la estética Dark Navy (`#070B19` / `#0D152B` / `#1E2B4D`) + Gold (`#FDB827`) sin *kicker/eyebrow pill badge* sobre `<h1>` ni tarjetas anidadas (`impeccable.md`). Incluye tratamiento general web/PWA/Android-TWA y la sección explícita de **Google API Services / YouTube Data API v3** (`https://www.googleapis.com/auth/youtube.upload` y `https://www.googleapis.com/auth/youtube`), finalidad de automatización y chequeo de duplicados de Shorts históricos en el canal del propietario, almacenamiento privado de tokens, prohibición de venta/compartición con terceros, revocación mediante `https://myaccount.google.com/permissions`, y declaración **Limited Use** en español y su cláusula exacta en inglés.
- [`src/app/terms/page.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/terms/page.tsx): exporta `metadata` con `robots: { index: false, follow: false }` y `TermsPage` con la misma línea visual Dark Navy + Gold y `<Header />` (sin *kicker/eyebrow pill badge* sobre `<h1>`), cubriendo aceptación y uso aceptable, naturaleza estadística y atribución a **MLB Stats API**, cumplimiento de **Google / YouTube API Services**, propiedad intelectual, exención de responsabilidad, autoridad responsable y contacto (`@RepubCaraquista` / `@JorgeLoreto`).

---

## 2. Evidencia Observada de Verificación (Enjambre)

### 2.1. Verificación de Páginas, Metadata y Reglas Visuales (`@legal-pages` / `@verifier`)
- `src/app/privacy/page.tsx` y `src/app/terms/page.tsx` exportan `robots: { index: false, follow: false }`.
- Ambas páginas cumplen los requisitos de Google OAuth Brand Verification y YouTube Data API v3 (incluyendo cláusula **Limited Use**), y obedecen `.agents/rules/impeccable.md` (sin *kicker/eyebrow* encima de `<h1>`, sin *cards-in-cards*, iconos `lucide-react`).

### 2.2. Ocultamiento en Navegación y Estado del Repositorio (`@verifier`)
- Búsqueda de `(/privacy|/terms)` en `src/` arrojó coincidencias únicamente en `src/middleware.ts`, `src/app/privacy/page.tsx` y `src/app/terms/page.tsx`.
- `sidebar.tsx`, `mobile-nav.tsx`, `bottom-nav.tsx`, `nav-data.ts`, `footer.tsx` y `robots.ts` registraron **0 referencias** a `privacy` o `terms`.
- `git status --short` confirmó únicamente los archivos previstos del alcance: `M src/middleware.ts`, `?? src/app/privacy/`, `?? src/app/terms/`, `?? specs/025-hidden-privacy-terms/`.

### 2.3. TypeScript, ESLint y Build de Producción
- **`npx tsc --noEmit` (`@legal-pages`):** **0 errores** en `src/app/privacy/page.tsx` y `src/app/terms/page.tsx` (únicamente el error preexistente en `src/components/calendar/calendar-event-modal.tsx(218,22)`).
- **`npx eslint src/app/privacy/page.tsx src/app/terms/page.tsx src/middleware.ts` (`@verifier`):** **PASS** (exit 0, 0 errores, 0 advertencias).
- **`npm run lint` (repo completo, `@verifier`):** **FAIL (exit 1)** por 246 hallazgos preexistentes (129 errores, 117 advertencias) en archivos previos fuera del alcance (`src/app/api/*`, `src/components/*`, `src/lib/*`, `test/*`), con **0 hallazgos** en `privacy`, `terms` o `middleware`.
- **`npm run build` (`next build`, `@verifier`):** **PASS** (exit 0; 19/19 páginas estáticas generadas incluyendo `○ /privacy`, `○ /terms`, y `ƒ Proxy (Middleware)`).
