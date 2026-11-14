# Spec 025: Páginas Ocultas `/privacy` y `/terms` y Exención en Middleware para Verificación Google OAuth

**Slug:** `025-hidden-privacy-terms`  
**Autor:** Spec-Kit Architect & Jorge Leonardo Loreto  
**Fecha:** 2026-11-14  
**Estado:** Especificado (Fase 1 de Spec-Kit)  
**Relacionados:** [Spec 020](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/020-security-audit-remediation/spec.md) · [`src/app/privacidad/page.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/privacidad/page.tsx) · [`src/middleware.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/middleware.ts)

---

## 1. Contexto y Problema

**REPUBLICARAQUISTAPP** (`https://republicaraquistapp.com/`) requiere completar la **verificación de marca de Google OAuth (Google Cloud Console)** para utilizar **YouTube Data API v3** en flujos automatizados internos de publicación y comprobación de duplicados de YouTube Shorts históricos en el canal del propietario.

Aunque ya existe la ruta pública en español `/privacidad` (`src/app/privacidad/page.tsx`) enlazada desde el pie de página para Google Play Store, el proceso de verificación de Google OAuth presenta dos brechas concretas:

1. **Ausencia de rutas canónicas `/privacy` y `/terms` accesibles por URL directa pero ocultas al usuario:**
   - Google OAuth Brand Verification exige URLs públicas y estables para **Privacy Policy** (`/privacy`) y **Terms of Service** (`/terms`) que incluyan explícitamente los alcances solicitados de YouTube Data API v3 (`youtube.upload`, `youtube`), el manejo de tokens privados, la revocación y la cláusula obligatoria **Google API Services User Data Policy — Limited Use**.
   - Estas páginas deben permanecer **ocultas** de la navegación principal (Sidebar, MobileNav, BottomNav, Footer) y excluidas de motores de búsqueda (`robots: { index: false, follow: false }`).
2. **Bloqueo HTTP 403 a verificadores automatizados en `src/middleware.ts`:**
   - La Regla B (`AGGRESSIVE_BOT_PATTERN`) en `src/middleware.ts` bloquea con `403 Access Denied` cualquier petición cuyo `User-Agent` coincida con patrones como `crawler|spider|go-http-client|python|curl|headlesschrome|...`.
   - Los verificadores automatizados de Google OAuth y herramientas de comprobación de políticas suelen usar user-agents automatizados (`Go-http-client`, `python`, `curl`, `HeadlessChrome`, crawlers), por lo que recibirían un `403` al consultar `/privacy`, `/terms` o `/privacidad`, provocando el rechazo de la verificación.

---

## 2. Decisiones de Diseño Confirmadas

1. **Rutas dedicadas y ocultas (`/privacy` y `/terms`):**
   - Crear `src/app/privacy/page.tsx` y `src/app/terms/page.tsx` sin añadir enlaces en `nav-data.ts`, `sidebar.tsx`, `mobile-nav.tsx`, `bottom-nav.tsx` ni `footer.tsx`.
   - Exportar `metadata` de Next.js con `robots: { index: false, follow: false }` en ambas páginas para evitar indexación en buscadores.
   - Mantener intacta la ruta pública `/privacidad` y `src/app/robots.ts`.
2. **Coherencia visual con respeto estricto a `impeccable.md`:**
   - Reutilizar la paleta oficial Dark Navy (`#070B19` / `#0D152B` / `#1E2B4D`) + Gold (`#FDB827`), `<Header />` de layout e iconos de `lucide-react`.
   - **Prohibido** incluir el *kicker / eyebrow pill badge* sobre el encabezado `<h1>` (cumplimiento de `.agents/rules/impeccable.md`).
3. **Contenido legal bilingüe/claro para Google OAuth Verification:**
   - **`/privacy`:** Combina la declaración general de privacidad de la app web/PWA con una sección dedicada a **Google API Services / YouTube Data API v3** detallando los scopes `https://www.googleapis.com/auth/youtube.upload` y `https://www.googleapis.com/auth/youtube`, su propósito (publicación automatizada y verificación anti-duplicados de Shorts históricos en el canal del propietario), almacenamiento privado de credenciales/tokens, cero venta o compartición con terceros, instrucciones de revocación en `https://myaccount.google.com/permissions` y la cláusula **Limited Use** en español y en su redacción exacta en inglés.
   - **`/terms`:** Condiciones de Uso / Terms of Service cubriendo uso aceptable, naturaleza analítica deportiva y atribución a MLB Stats API, uso y cumplimiento con Google / YouTube API Services (incluyendo referencia a los Términos de Servicio de YouTube), propiedad intelectual, exención de responsabilidad, autoridad responsable y contacto.
4. **Exención quirúrgica en Edge Middleware (`src/middleware.ts`):**
   - Permitir que las rutas exactas `/privacy`, `/terms` y `/privacidad` omitan exclusivamente el bloqueo 403 de la Regla B (`AGGRESSIVE_BOT_PATTERN`), manteniendo intactas la redirección 308 de `.vercel.app` (Regla 0), la Regla A (`MALICIOUS_PATH_PATTERN`), la Regla B para todo el resto del sitio, la Regla C (`/api/*` cross-site) y la Regla D (`Cache-Control` en el Edge).

---

## 3. Requerimientos Funcionales

### RF-01: Página Oculta de Política de Privacidad (`src/app/privacy/page.tsx`)
- Exportar `metadata: Metadata` con:
  - `title` y `description` descriptivos para **REPUBLICARAQUISTAPP** (`https://republicaraquistapp.com/`).
  - `robots: { index: false, follow: false }`.
- Renderizar layout coherente con `src/app/privacidad/page.tsx` (`<Header />`, enlace de retorno al Centro de Mando, tarjetas `#0D152B` con borde `#1E2B4D` y acento `#FDB827`, iconos `lucide-react`) **sin** *kicker/eyebrow pill badge* encima de `<h1>`.
- Incluir obligatoriamente:
  1. Identificación del responsable: **Jorge Leonardo Loreto** (`@JorgeLoreto` / `@RepubCaraquista`), **REPUBLICARAQUISTAPP** (`https://republicaraquistapp.com/`).
  2. Tratamiento general de datos web/PWA (no se venden datos, sin cuentas de usuario público ni recolección de PII).
  3. Sección explícita **Google API Services & YouTube Data API v3**:
     - Scopes exactos: `https://www.googleapis.com/auth/youtube.upload` y `https://www.googleapis.com/auth/youtube`.
     - Finalidad exclusiva: publicación automatizada y comprobación de duplicados de YouTube Shorts históricos en el canal del propietario.
     - Almacenamiento privado y seguro de tokens OAuth; cero compartición o venta de datos de Google/YouTube a terceros.
     - Revocación de acceso por parte del usuario vía `https://myaccount.google.com/permissions`.
     - Declaración **Limited Use** conforme a la *Google API Services User Data Policy*, incluyendo explicación en español y la cláusula exacta en inglés (`"REPUBLICARAQUISTAPP's use and transfer to any other app of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements."`).
  4. Información de contacto directo (`@RepubCaraquista` / `@JorgeLoreto`).

### RF-02: Página Oculta de Condiciones de Uso / Terms of Service (`src/app/terms/page.tsx`)
- Exportar `metadata: Metadata` con `title`, `description` y `robots: { index: false, follow: false }`.
- Renderizar la misma estética Dark Navy + Gold con `<Header />` e iconos `lucide-react`, **sin** *kicker/eyebrow pill badge* encima de `<h1>`.
- Incluir secciones claras de Condiciones de Uso / Terms of Service:
  1. Aceptación de los términos y descripción del servicio (`REPUBLICARAQUISTAPP`, `https://republicaraquistapp.com/`).
  2. Uso aceptable (prohibición de scraping abusivo, ingeniería inversa maliciosa o uso ilícito).
  3. Analítica deportiva y atribución de datos públicos (**MLB Stats API**, naturaleza informativa sin garantías comerciales ni de apuestas).
  4. Integración con **Google / YouTube API Services**: cumplimiento de YouTube Terms of Service (`https://www.youtube.com/t/terms`) y Google Privacy Policy (`https://policies.google.com/privacy`), uso acotado al canal del propietario.
  5. Propiedad intelectual y marcas (referencia informativa a Leones del Caracas / LVBP).
  6. Limitación de responsabilidad / Disclaimer y cambios a los términos.
  7. Responsable y contacto (**Jorge Leonardo Loreto**, `@RepubCaraquista`, `@JorgeLoreto`).

### RF-03: Ocultamiento en Navegación y Motores de Búsqueda
- No agregar `/privacy` ni `/terms` en `src/components/layout/nav-data.ts`, `sidebar.tsx`, `mobile-nav.tsx`, `bottom-nav.tsx` ni `footer.tsx`.
- No modificar `src/app/robots.ts` ni `src/app/privacidad/page.tsx`.
- El ocultamiento a buscadores se garantiza mediante la metaetiqueta `robots` (`noindex, nofollow`) generada por `metadata.robots` en ambas rutas.

### RF-04: Exención Quirúrgica de Verificadores OAuth en Middleware (`src/middleware.ts`)
- En la Regla B de `src/middleware.ts`, definir una comprobación explícita de ruta exacta:
  ```typescript
  const isLegalVerificationPath =
    pathname === "/privacy" || pathname === "/terms" || pathname === "/privacidad";
  ```
- Omitir el retorno `403 Access Denied` de `AGGRESSIVE_BOT_PATTERN` únicamente cuando `isLegalVerificationPath` sea `true`.
- Mantener sin cambios:
  - Regla 0 (redirección 308 `.vercel.app` → `republicaraquistapp.com`).
  - Regla A (`MALICIOUS_PATH_PATTERN` → `404 Not Found`).
  - Regla B (`AGGRESSIVE_BOT_PATTERN` → `403 Access Denied`) para cualquier otra ruta.
  - Regla C (protección cross-site de `/api/*`).
  - Regla D (cabeceras `Cache-Control` en el Edge).

---

## 4. Restricciones de Dominio, Diseño y Seguridad

1. **Sin regresiones de seguridad:** No debilitar `MALICIOUS_PATH_PATTERN` ni desactivar `AGGRESSIVE_BOT_PATTERN` en rutas fuera de `{"/privacy", "/terms", "/privacidad"}`.
2. **Estética y reglas `impeccable.md`:** Dark Navy (`#070B19` / `#0D152B` / `#1E2B4D`) + Gold (`#FDB827`), iconos `lucide-react` (sin emojis usados como iconos), cero kicker/eyebrow chips encima de `<h1>`, cero tarjetas anidadas excesivas.
3. **Cero nuevas dependencias:** Sin paquetes npm adicionales ni cambios en `package.json`.
4. **Inmutabilidad de datos y esquemas:** Cero cambios en Supabase, API routes o componentes de navegación global.
5. **Privacidad de credenciales:** No incluir secretos, tokens ni client IDs privados en el código fuente de las páginas legales.

---

## 5. Criterios de Aceptación (Definición de Terminado)

1. **CA-01 (Existencia y `noindex`):** Existen `src/app/privacy/page.tsx` y `src/app/terms/page.tsx`, y ambos exportan `metadata` con `robots: { index: false, follow: false }`.
2. **CA-02 (Contenido Google OAuth / YouTube Data API v3):** `/privacy` detalla los scopes `youtube.upload` y `youtube`, el propósito en el canal del propietario, el manejo privado de tokens, el enlace de revocación `https://myaccount.google.com/permissions` y la cláusula exacta de **Limited Use**; `/terms` cubre uso aceptable, atribución MLB Stats API, cumplimiento YouTube/Google, propiedad intelectual, disclaimer y contacto.
3. **CA-03 (Cumplimiento Visual `impeccable.md`):** Ambas páginas respetan el estilo Dark Navy + Gold y `<Header />`, y **no** contienen ningún badge/kicker/eyebrow pill sobre `<h1>`.
4. **CA-04 (Ocultamiento Total en UI):** Una búsqueda en `src/` confirma cero enlaces o referencias a `/privacy` y `/terms` en `sidebar.tsx`, `mobile-nav.tsx`, `bottom-nav.tsx`, `nav-data.ts` y `footer.tsx`.
5. **CA-05 (Exención Middleware + Build/Lint):** `src/middleware.ts` exime únicamente `/privacy`, `/terms` y `/privacidad` de la Regla B (`AGGRESSIVE_BOT_PATTERN` 403), manteniendo intactas el resto de reglas; `npm run lint` y `npm run build` terminan con exit code 0.
