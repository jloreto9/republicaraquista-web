# Especificación Funcional: Remediación de Auditoría de Seguridad (020)
**Feature:** `020-security-audit-remediation`  
**Fecha:** Noviembre 2026  
**Objetivo:** Subsanar las vulnerabilidades y debilidades identificadas en la auditoría de seguridad de `republicaraquista-web` en Vercel y Supabase.

---

## 1. Alcance y Requerimientos Funcionales

### RF-01: Protección del Despacho de Web Push (`broadcast-scoring`)
- **Problema:** `/api/push/broadcast-scoring` permitía llamadas `POST` no autenticadas con texto arbitrario.
- **Requerimiento:** 
  1. Si la petición proviene de un usuario administrativo o tarea automatizada, validar cabeceras `Authorization: Bearer <token>` o `x-admin-key`.
  2. Si la petición proviene del cliente (`GameCenterView`), el backend debe verificar que los parámetros (`gamePk`, `homeScore`, `awayScore`) correspondan a una jugada oficial válida y sanitizar el título/mensaje para evitar inyección de contenido no autorizado o phishing.

### RF-02: Endurecimiento de Row Level Security (RLS) en Supabase
- **Problema:** Políticas de RLS en `noticueva_posts` y `push_subscriptions` permitían mutaciones y lecturas abiertas usando la `anon` key pública.
- **Requerimiento:**
  1. Restringir la gestión DML (`INSERT`, `UPDATE`, `DELETE`) en `noticueva_posts` a usuarios autenticados con rol administrativo (`service_role`).
  2. Eliminar la lectura pública de `push_subscriptions` para proteger la privacidad de los tokens de suscripción de los fanáticos.
  3. Proporcionar un script de migración SQL idempotente y documentar `SUPABASE_SERVICE_ROLE_KEY` en `.env.example`.

### RF-03: Fortalecimiento de Autenticación en API NotiCueva
- **Problema:** Riesgo de *fail-open* si `NOTICUEVA_ADMIN_PASSWORD` está vacía y filtración de contraseñas en URLs de métodos `DELETE`.
- **Requerimiento:**
  1. Si `NOTICUEVA_ADMIN_PASSWORD` no está definida o está vacía, responder `503 Service Unavailable` impidiendo cualquier bypass.
  2. En [`noticueva-admin.tsx`](file:///C:/Users/Administrator/Projets/republicaraquista-web/src/components/noticueva/noticueva-admin.tsx), eliminar el paso de contraseñas en parámetros de búsqueda en la URL (`?password=...`) y usar exclusivamente la cabecera `x-admin-key`.
  3. En los endpoints de borrado y actualización, priorizar cabeceras de autenticación seguras.

### RF-04: Prevención de XSS en Renderizador Markdown
- **Problema:** [`FormattedContent`](file:///C:/Users/Administrator/Projets/republicaraquista-web/src/components/noticueva/formatted-content.tsx) renderizaba enlaces `[texto](url)` sin filtrar esquemas peligrosos como `javascript:`.
- **Requerimiento:**
  1. Validar que las URLs extraídas utilicen protocolos seguros (`https://`, `http://`, `/`, `mailto:`). En caso contrario, neutralizar el enlace a `#`.

### RF-05: Protección de Endpoints de Estado DDL (`/status`)
- **Problema:** `/api/noticueva/status` y `/api/push/status` exponían el contenido completo de scripts DDL y errores de base de datos a cualquier visitante.
- **Requerimiento:**
  1. Devolver el script de migración SQL y errores detallados únicamente a clientes autorizados con la clave de administración. Clientes anónimos solo reciben el estado booleano de disponibilidad.

### RF-06: Cabeceras de Seguridad HTTP en Vercel
- **Problema:** Ausencia de cabeceras de protección en el Edge.
- **Requerimiento:**
  1. Incorporar en [`next.config.ts`](file:///C:/Users/Administrator/Projets/republicaraquista-web/next.config.ts) cabeceras recomendadas: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.

---

## 2. Criterios de Aceptación
1. `POST /api/push/broadcast-scoring` rechaza peticiones con datos incompletos o textos no autorizados y valida contra feed oficial o credenciales de admin.
2. `[texto](javascript:alert(1))` en `FormattedContent` no genera atributos `href="javascript:..."`.
3. Ninguna URL en `noticueva-admin.tsx` incluye la contraseña como parámetro query `?password=...`.
4. El build de Next.js (`npm run build`) compila limpiamente sin romper ninguna ruta existente.
