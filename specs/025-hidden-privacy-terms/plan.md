# Plan Técnico 025: Páginas Ocultas `/privacy` y `/terms` y Exención en Middleware

**Slug:** `025-hidden-privacy-terms`  
**Fecha:** 2026-11-14  

---

## 1. Validación Constitucional y Escalera Ponytail

1. **Artículo I (Causa Raíz y Fuente de Verdad):**
   - El bloqueo a verificadores automatizados de Google OAuth ocurre en la Regla B de `src/middleware.ts`; se resuelve allí directamente con una guarda exacta por `pathname` sin tocar configuraciones externas ni debilitar otras reglas.
   - Las rutas legales solicitadas por Google OAuth se implementan directamente como páginas estáticas del App Router en `src/app/privacy/page.tsx` y `src/app/terms/page.tsx`.
   - Prohibido crear scripts temporales; se editan únicamente los archivos fuente canónicos.
2. **Artículo II (Minimalismo y Escalera Ponytail):**
   - **Reutilizar helpers y layout existentes:** `<Header />` (`src/components/layout/header.tsx`), `Link` de `next/link`, `Metadata` de `next`, iconos de `lucide-react` y la estructura visual de `src/app/privacidad/page.tsx`.
   - **Sin nuevas dependencias:** Cero paquetes npm nuevos.
   - **Diff mínimo:** `src/middleware.ts` añade únicamente 3 líneas (`isLegalVerificationPath` + `!isLegalVerificationPath` en la condición de la Regla B); los componentes de navegación global y `footer.tsx` no se tocan.
3. **Artículo IV (Diseño Frontend `impeccable.md` y Seguridad):**
   - Mantener estética Dark Navy (`#070B19` / `#0D152B` / `#1E2B4D`) + Gold (`#FDB827`), iconos exclusivos de `lucide-react`, sin *kicker/eyebrow pill badges* encima de `<h1>`.
   - Mantener intactas todas las protecciones de `src/middleware.ts` (`MALICIOUS_PATH_PATTERN`, `AGGRESSIVE_BOT_PATTERN` en el resto de rutas, blindaje cross-site de `/api/*` y cabeceras `Cache-Control`).
4. **Artículo V (Verificación Previa):**
   - Verificación estática de rutas/metadata/exclusión de navegación + `npm run lint` + `npm run build` antes de cerrar la implementación.

---

## 2. Contratos Técnicos y Rutas

### 2.1. Rutas App Router (Server Components estáticos)
| Ruta | Archivo | Indexación (`metadata.robots`) | Enlazado en UI |
|---|---|---|---|
| `/privacy` | `src/app/privacy/page.tsx` | `{ index: false, follow: false }` | No (oculta, acceso por URL directa) |
| `/terms` | `src/app/terms/page.tsx` | `{ index: false, follow: false }` | No (oculta, acceso por URL directa) |

### 2.2. Exención en Edge Middleware (`src/middleware.ts`)
```typescript
// B. Bloqueo de crawlers agresivos y bots no deseados (excluir rutas legales para verificadores OAuth)
const isLegalVerificationPath =
  pathname === "/privacy" || pathname === "/terms" || pathname === "/privacidad";
if (!isLegalVerificationPath && userAgent && AGGRESSIVE_BOT_PATTERN.test(userAgent)) {
  return new NextResponse("Access Denied", {
    status: 403,
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
```
- **Invariante:** Comparación exacta (`===`) sobre `pathname`, sin regex amplias ni `startsWith` que puedan eximir subrutas no deseadas.

---

## 3. Diseño Técnico por Track y Archivo

### Track A — Edge Middleware (`src/middleware.ts`)
1. **Archivo:** [`src/middleware.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/middleware.ts)
   - En la sección `// B. Bloqueo de crawlers agresivos y bots no deseados` (líneas 47–57), definir `isLegalVerificationPath` para `"/privacy"`, `"/terms"` y `"/privacidad"` y anteponer `!isLegalVerificationPath &&` al condicional `if`.
   - No alterar `MALICIOUS_PATH_PATTERN`, `AGGRESSIVE_BOT_PATTERN`, `config.matcher`, la redirección 308 de `.vercel.app`, la protección de `/api/*` ni la cabecera `Cache-Control` final.

### Track B — Páginas Legales Ocultas (`src/app/privacy/page.tsx`, `src/app/terms/page.tsx`)
1. **Archivo:** [`src/app/privacy/page.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/privacy/page.tsx)
   - Exportar `metadata: Metadata` con `robots: { index: false, follow: false }`.
   - Usar `<Header title="Política de Privacidad" subtitle="..." />`, enlace `Volver al Centro de Mando` (`/`), tarjeta hero sin kicker/eyebrow pill badge sobre `<h1>`, y secciones claras:
     - Responsable e identidad del servicio (`REPUBLICARAQUISTAPP`, `https://republicaraquistapp.com/`, Jorge Leonardo Loreto, `@RepubCaraquista`, `@JorgeLoreto`).
     - Datos recopilados y no recopilados en la app web/PWA.
     - **Google API Services & YouTube Data API v3**: scopes `https://www.googleapis.com/auth/youtube.upload` y `https://www.googleapis.com/auth/youtube`, propósito operativo (publicación automatizada y verificación anti-duplicados de Shorts históricos en el canal del propietario), almacenamiento privado de tokens, prohibición de venta/cesión a terceros, revocación en `https://myaccount.google.com/permissions` y cláusula **Google API Services User Data Policy — Limited Use** (en español + texto literal requerido en inglés).
     - Servicios de infraestructura (Vercel, Supabase, MLB Stats API), protección de menores y contacto.
2. **Archivo:** [`src/app/terms/page.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/terms/page.tsx)
   - Exportar `metadata: Metadata` con `robots: { index: false, follow: false }`.
   - Usar `<Header title="Condiciones de Uso" subtitle="..." />`, enlace `Volver al Centro de Mando` (`/`), tarjeta hero sin kicker/eyebrow pill badge sobre `<h1>`, y secciones claras:
     - Aceptación de términos y objeto de `REPUBLICARAQUISTAPP` (`https://republicaraquistapp.com/`).
     - Uso aceptable y restricciones de abuso automatizado.
     - Naturaleza estadística/informativa de datos deportivos y atribución a **MLB Stats API**.
     - Uso y cumplimiento de **Google / YouTube API Services** (sujeción a los Términos de Servicio de YouTube `https://www.youtube.com/t/terms` y Política de Privacidad de Google `https://policies.google.com/privacy`).
     - Propiedad intelectual, exención de responsabilidad (*disclaimer*), vigencia/modificaciones y contacto del responsable (**Jorge Leonardo Loreto**, `@RepubCaraquista`, `@JorgeLoreto`).

### Track C — Verificación y Cierre Spec-Kit
1. Comprobar que `src/app/privacy/page.tsx` y `src/app/terms/page.tsx` cumplen con `robots: { index: false, follow: false }`, contenido Google OAuth / YouTube Data API v3 + Limited Use / Terms of Service y ausencia de kicker/eyebrow pill badge sobre `<h1>`.
2. Verificar por búsqueda en `src/` que no existen enlaces ni referencias a `/privacy` o `/terms` en `sidebar.tsx`, `mobile-nav.tsx`, `bottom-nav.tsx`, `nav-data.ts` ni `footer.tsx`.
3. Verificar que `src/middleware.ts` exime `/privacy`, `/terms` y `/privacidad` únicamente en la Regla B (`AGGRESSIVE_BOT_PATTERN`).
4. Ejecutar `npm run lint` y `npm run build` en `c:\Users\Administrator\Projets\republicaraquista-web` con salida exitosa.
5. Actualizar `tasks.md` y redactar `specs/025-hidden-privacy-terms/implementation.md` con la evidencia observada.

---

## 4. Plan de Rollback

1. Eliminar los archivos nuevos `src/app/privacy/page.tsx` y `src/app/terms/page.tsx`.
2. Revertir el cambio en `src/middleware.ts` mediante `git checkout -- src/middleware.ts` o `git revert`.
3. No existen cambios en base de datos, variables de entorno ni componentes de navegación compartidos.
