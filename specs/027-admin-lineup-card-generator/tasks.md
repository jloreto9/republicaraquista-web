# Tareas de Implementación 027: Generador Admin de Tarjeta de Lineup Oficial y Push 1-Click

**Slug:** `027-admin-lineup-card-generator`  
**Fecha:** 2026-11-16  

---

## Track A — Plantilla Base, Servicio Backend y Endpoint API

- [x] **T001 [Track A]**: Copiar la imagen plantilla oficial a `public/assets/lineup-template-bg.jpg`.
- [x] **T002 [Track A]**: Implementar `src/lib/lineup-card-service.ts` exportando tipos (`LineupCardSlot`, `LineupCardGameOption`, `LineupCardPayload`), formateadores (`normalizeLineupPosition`, `formatOpponentShortName`, `formatShortSpanishDate`, `formatCompactTime`, `formatTransmissionLines`, `formatStadiumBannerName`, `formatPlayerDisplayName`) y `getLineupCardData(targetGamePk?, season)`.
- [x] **T003 [Track A]**: Implementar `src/app/api/noticueva/lineup-card/route.ts` (`dynamic = "force-dynamic"`, `GET` con `Cache-Control: no-store, max-age=0`).

---

## Track B — Motor Canvas HD 1080×1920 y Panel NotiCueva Admin

- [x] **T004 [Track B]**: Implementar `src/lib/lineup-card-canvas.ts` (`LINEUP_CARD_WIDTH = 1080`, `LINEUP_CARD_HEIGHT = 1920`, `SCALE = 1080 / 576`, `ROW_CYS`, caché en memoria de `HTMLImageElement`, `renderLineupCardOnCanvas` y `generateLineupCardBlob`).
- [x] **T005 [Track B]**: Implementar `src/components/admin/lineup-card-generator-panel.tsx` con selector de juegos, sincronización manual, cambio opcional de fondo, polling seguro de 30s (`useRef` + `visibilityState === "visible"` + `isDirtyRef`), editor compacto en vivo, preview `<canvas>` `aspect-[9/16]` y 4 botones de acción (Descargar PNG HD, Copiar Imagen, Compartir, Push 1-Click).
- [x] **T006 [Track B]**: Integrar `<LineupCardGeneratorPanel adminPassword={password} />` encima de `<PushBroadcastPanel adminPassword={password} />` en `src/components/noticueva/noticueva-admin.tsx`.

---

## Track C — Spec-Kit y Pruebas Unitarias / Integración

- [x] **T007 [Track C]**: Crear los artefactos canónicos de Spec-Kit en `specs/027-admin-lineup-card-generator/` (`spec.md`, `plan.md`, `tasks.md`, `implementation.md`).
- [x] **T008 [Track C]**: Implementar `src/lib/__tests__/lineup-card.test.ts` validando todos los normalizadores/formateadores y `getLineupCardData` con `globalThis.fetch` mockeado, y ejecutar `npx tsx src/lib/__tests__/lineup-card.test.ts` + `eslint`.
- [x] **T009 [Track C]**: Cerrar `tasks.md` e `implementation.md` con la evidencia observada de pruebas, ESLint y `npm run build`.
