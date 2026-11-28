# Tareas de Implementación 040: Generador Admin de Insights para X (𝕏) con Gemini

**Slug:** `040-admin-x-insights-gemini`  
**Fecha:** 2026-11-28  

---

## Track A — Entorno, Contratos, Servicio Gemini y Endpoint API

- [x] **T001 [Track A]**: Actualizar `.env.example` agregando `GEMINI_API_KEY` y `GEMINI_MODEL=gemini-3.8-flash` sin alterar las variables previas.
- [x] **T002 [Track A]**: Crear `src/types/x-insights.ts` exportando `XInsightFocus`, `XInsightCardVisualData`, `XInsightDraft`, `XInsightsContextSummary`, `XInsightsRequestPayload` y `XInsightsResponseData`.
- [x] **T003 [Track A]**: Implementar `src/lib/x-insights-service.ts` con `collectLvbpContextSnapshot`, `buildXInsightsPrompt`, `normalizeXInsightsResponse`, caché en memoria de 5 minutos (`clearXInsightsCache`) y `generateXInsightsWithGemini` (`gemini-3.8-flash`, header `x-goog-api-key`, `AbortSignal.timeout(25000)`, `responseMimeType: "application/json"`).
- [x] **T004 [Track A]**: Implementar `src/app/api/noticueva/x-insights/route.ts` (`force-dynamic`, validación `x-admin-key` fail-closed, cooldown 4s por IP en `forceRefresh=true`, códigos `401`/`400`/`429`/`503`/`200` con `Cache-Control: no-store, max-age=0`).

---

## Track B — Motor Canvas Tarjeta Dato 𝕏 y UI Admin (`/admin`)

- [x] **T005 [Track B]**: Implementar `src/lib/x-insight-card-canvas.ts` exportando `XInsightCardFormat`, `renderXInsightCardOnCanvas` y `generateXInsightCardBlob` para formatos `1200×675` (`landscape`) y `1080×1080` (`square`) con diseño editorial plano navy/dorado y pie `/assets/logo.png` + `@RepubCaraquista`.
- [x] **T006 [Track B]**: Implementar `src/components/admin/x-insights-panel.tsx` con selector de enfoque, contexto manual (`<= 400` chars), borradores editables con contador `N / 280`, encuesta/CTA, acciones rápidas (`Copiar texto`, `Abrir en 𝕏`, `Usar en Tarjeta PNG`), estudio Canvas PNG y persistencia en `sessionStorage` (`"noticueva_x_insights_cache"`).
- [x] **T007 [Track B]**: Integrar el switcher de 4 pestañas (`NotiCueva` | `Insights 𝕏 (IA)` | `Tarjeta Lineup` | `Web Push`) en `src/components/noticueva/noticueva-admin.tsx` sin regresiones sobre los paneles existentes.

---

## Track C — Spec-Kit, Pruebas Unitarias y Verificación Integral

- [x] **T008 [Track C]**: Crear los artefactos Spec-Kit (`spec.md`, `plan.md`, `tasks.md`) en `specs/040-admin-x-insights-gemini/`.
- [x] **T009 [Track C]**: Implementar `src/lib/__tests__/x-insights.test.ts` usando `node:assert/strict` validando `buildXInsightsPrompt`, `normalizeXInsightsResponse` y `generateXInsightsWithGemini` con `globalThis.fetch` mockeado.
- [x] **T010 [Track C]**: Ejecutar pruebas (`x-insights.test.ts`, `lineup-card.test.ts`), `npx eslint` y `npm run build`; actualizar checkboxes y cerrar `implementation.md` tras verificación completa.
