# Informe de Implementación y Verificación 040: Generador Admin de Insights para X (𝕏) con Gemini y Tarjeta Dato PNG

**Slug:** `040-admin-x-insights-gemini`  
**Fecha:** 2026-11-28  
**Estado:** Implementado y Verificado (Converged)

---

## 1. Resumen de Archivos Entregados

### Track A — Entorno, Contratos, Servicio Gemini y Endpoint API
- [`.env.example`](file:///c:/Users/Administrator/Projets/republicaraquista-web/.env.example): agregadas las variables `GEMINI_API_KEY=tu-api-key-de-google-ai-studio` y `GEMINI_MODEL=gemini-3.8-flash` preservando todas las variables existentes.
- [`src/types/x-insights.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/types/x-insights.ts):
  - Tipos e interfaces exportadas: `XInsightFocus`, `XInsightCardVisualData`, `XInsightDraft`, `XInsightsContextSummary`, `XInsightsRequestPayload` y `XInsightsResponseData`.
- [`src/lib/x-insights-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/x-insights-service.ts):
  - Exporta `VALID_X_INSIGHT_FOCUSES`, `XInsightsError`, `LvbpContextSnapshot`, `GenerateXInsightsOptions`, `clearXInsightsCache`, `isValidXInsightFocus`, `sanitizeManualContext`, `sanitizeBannedTerms`, `enforceTweetLimit`, `collectLvbpContextSnapshot`, `deriveContextSummary`, `buildXInsightsPrompt`, `normalizeXInsightsResponse` y `generateXInsightsWithGemini`.
  - `collectLvbpContextSnapshot(season)` consolida vía `Promise.allSettled` con fallbacks seguros `getStandings`, `getLeonesAdvancedStats`, `getLastGameDetail`, `getRecentTrends`, `getCaracasTeamLeaders`, `getHeadToHeadRecords`, `getStreaksData`, `getCollectiveStats` y `fetchSeasonWpaLeaders`, incluyendo comparativa colectiva de los 8 equipos de la LVBP.
  - `buildXInsightsPrompt` estructura delimitadores XML (`<role>`, `<constraints>`, `<focus_directive>`, `<verified_data>`, `<manual_context>`), declara la sede oficial en el Estadio Monumental Simón Bolívar (Caracas), prohíbe Statcast/ELO/sabermetría y sanea/trunca `manualContext` a un máximo de `400` caracteres.
  - `normalizeXInsightsResponse` limpia cercas Markdown, reemplaza términos prohibidos si el modelo los emite, acota cada tuit a `<= 280` caracteres con `enforceTweetLimit` y aplica fallbacks defensivos sobre `contextSummary`, `drafts` y `cardSuggestion`.
  - `generateXInsightsWithGemini` utiliza caché en memoria (`Map`) con TTL de 5 minutos, consulta `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` (`gemini-3.8-flash` por defecto) enviando la clave exclusivamente en la cabecera `"x-goog-api-key"`, con `AbortSignal.timeout(25000)`, `temperature: 0.75`, `responseMimeType: "application/json"` y `responseSchema` estructurado.
- [`src/app/api/noticueva/x-insights/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/noticueva/x-insights/route.ts): endpoint `POST` con `export const dynamic = "force-dynamic"`, autenticación fail-closed vía `x-admin-key` (o `body.password`) contra `NOTICUEVA_ADMIN_PASSWORD` (`401`), validación de `focus` (`400`), verificación de `GEMINI_API_KEY` (`503`), cooldown de 4 segundos por IP para `forceRefresh=true` (`429` con cabecera `Retry-After`) y respuesta `200` `{ success: true, data }` con `Cache-Control: no-store, max-age=0`.

### Track B — Motor Canvas Tarjeta Dato 𝕏 y Panel Admin (`/admin`)
- [`src/lib/x-insight-card-canvas.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/x-insight-card-canvas.ts):
  - Exporta `XInsightCardFormat` (`"landscape" | "square"`), `X_INSIGHT_CARD_DIMENSIONS` (`1200×675` y `1080×1080`), `renderXInsightCardOnCanvas` y `generateXInsightCardBlob`.
  - Diseño editorial plano en capas `#070B19` / `#0D152B` / `#002D62`, bordes de `1px` en `#1E2B4D`, acento dorado `#FDB827`, `tabular-nums` en la cifra principal, ajuste automático de líneas, carga segura de `/assets/logo.png` y pie `@RepubCaraquista`.
- [`src/components/admin/x-insights-panel.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/admin/x-insights-panel.tsx):
  - Exporta `XInsightsPanel` (`{ adminPassword }`), selector de enfoque (`Automático`, `Postgame`, `Tendencia / Dato`, `Debate / Polémica`, `Hilo 3-4 tuits`), campo de contexto manual (`<= 400` chars), botones `Generar Insights para 𝕏` y `Regenerar` (`forceRefresh: true`) hacia `POST /api/noticueva/x-insights` con cabecera `x-admin-key`, barra resumen de contexto, borradores editables con contador `N / 280`, respaldo verificado colapsable, sugerencia de encuesta/CTA con copia, acciones `Copiar texto` / `Abrir en 𝕏` / `Usar en Tarjeta PNG`, estudio colapsable `Tarjeta Dato 𝕏 (PNG)` con `<canvas>` en vivo y descarga/copiado PNG, además de persistencia en `sessionStorage` (`"noticueva_x_insights_cache"`).
- [`src/components/noticueva/noticueva-admin.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/noticueva/noticueva-admin.tsx): integrado selector de 4 pestañas en Vista 2 (`NotiCueva` | `Insights 𝕏 (IA)` | `Tarjeta Lineup` | `Web Push`), manteniendo `NotiCueva` como pestaña predeterminada y preservando sin regresiones el editor/publicaciones de NotiCueva, `<LineupCardGeneratorPanel adminPassword={password} />` y `<PushBroadcastPanel adminPassword={password} />`.

### Track C — Spec-Kit y Pruebas Unitarias
- Artefactos [`spec.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/040-admin-x-insights-gemini/spec.md), [`plan.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/040-admin-x-insights-gemini/plan.md), [`tasks.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/040-admin-x-insights-gemini/tasks.md) e [`implementation.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/040-admin-x-insights-gemini/implementation.md).
- [`src/lib/__tests__/x-insights.test.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/__tests__/x-insights.test.ts): suite con `node:assert/strict` ejecutada vía `npx tsx` cubriendo `buildXInsightsPrompt`, `normalizeXInsightsResponse` y `generateXInsightsWithGemini` con `globalThis.fetch` mockeado.

---

## 2. Evidencia Observada de Verificación

- **Pruebas unitarias Spec 040 (`npx tsx src/lib/__tests__/x-insights.test.ts`):** **PASS (exit code 0)**
  - Output observado: `=== TODAS LAS PRUEBAS DE INSIGHTS X CON GEMINI PASARON EXITOSAMENTE ===`.
- **Pruebas de no regresión Spec 027 (`npx tsx src/lib/__tests__/lineup-card.test.ts`):** **PASS (exit code 0)**
  - Output observado: `=== TODAS LAS PRUEBAS DEL GENERADOR DE LINEUP PASARON EXITOSAMENTE ===`.
- **ESLint sobre todos los archivos nuevos y modificados (`npx eslint src/types/x-insights.ts src/lib/x-insights-service.ts src/lib/x-insight-card-canvas.ts src/app/api/noticueva/x-insights/route.ts src/components/admin/x-insights-panel.tsx src/components/noticueva/noticueva-admin.tsx src/lib/__tests__/x-insights.test.ts`):** **PASS (exit code 0, 0 errores, 0 warnings)**.
- **Auditoría de dominio y seguridad:**
  - `Select-String` en `src/lib/x-insight-card-canvas.ts`, `src/components/admin/x-insights-panel.tsx`, `src/components/noticueva/noticueva-admin.tsx` y `src/app/api/noticueva/x-insights/route.ts` confirmó **0 ocurrencias** de `sabermetr*`, `ELO`, `Exit Velocity`, `Launch Angle`, `Barrels` o `Sprint Speed`.
  - Verificada autenticación fail-closed con `x-admin-key` contra `NOTICUEVA_ADMIN_PASSWORD` y envío exclusivo de `GEMINI_API_KEY` en header `x-goog-api-key` (nunca en query string ni hardcodeado).
- **Build de Producción Next.js (`npm run build`):** **PASS (exit code 0)**
  - `Next.js 16.3.6 (Turbopack)`, `✓ Compiled successfully in 23.8s`, `✓ Generating static pages using 7 workers (19/19) in 3.2s`, ruta dinámica `ƒ /api/noticueva/x-insights` y ruta `/admin` compiladas limpiamente.
