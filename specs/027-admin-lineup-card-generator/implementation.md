# Informe de Implementación y Verificación 027: Generador Admin de Tarjeta de Lineup Oficial y Push 1-Click

**Slug:** `027-admin-lineup-card-generator`  
**Fecha:** 2026-11-16  
**Estado:** Implementado y Verificado (Converged)

---

## 1. Resumen de Archivos Entregados

### Track A — Plantilla Base, Servicio Backend y Endpoint API
- [`public/assets/lineup-template-bg.jpg`](file:///c:/Users/Administrator/Projets/republicaraquista-web/public/assets/lineup-template-bg.jpg): plantilla oficial 9:16 servida estáticamente (`93,867` bytes).
- [`src/lib/lineup-card-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/lineup-card-service.ts):
  - Interfaces exportadas: `LineupCardSlot`, `LineupCardGameOption`, `LineupCardPayload`.
  - Formateadores puros exportados: `normalizeLineupPosition` (`"DH"` → `"BD"`), `formatOpponentShortName` (7 rivales LVBP), `formatShortSpanishDate` (`"14NOV"`, `"5OCT"`, `"1DIC"`), `formatCompactTime` (`"8:00PM"`), `formatTransmissionLines` (`TRANSMISIÓN IVC,` / `BeisbolPlay, La Mega`), `formatStadiumBannerName` y `formatPlayerDisplayName` (remoción de acentos en vocales preservando `Ñ`).
  - Orquestador `getLineupCardData(targetGamePk?, season = ACTIVE_SEASON)`: consulta `/schedule?hydrate=lineups,probablePitcher` y `/feed/live` (`AbortSignal.timeout(8000)`), cruza por `officialDate` con `src/data/calendar_2026_27.json` (con respaldo offline al calendario si falla MLB API), reutiliza `extractTeamGameLineupFromFeed` (`src/lib/game-feed-service.ts`) y `scheduleGame.lineups`, y resuelve el abridor de Leones en cascada (`probablePitchers` → `scheduleGame.teams[side].probablePitcher` → `boxscore.teams[side].pitchers[0]` → `"POR ANUNCIAR"`).
- [`src/app/api/noticueva/lineup-card/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/noticueva/lineup-card/route.ts): endpoint `GET` con `export const dynamic = "force-dynamic"`, parseo de `gamePk` y `season`, y cabecera `Cache-Control: no-store, max-age=0`.

### Track B — Motor Canvas HD 1080×1920 y Panel NotiCueva Admin
- [`src/lib/lineup-card-canvas.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/lineup-card-canvas.ts):
  - Constantes `LINEUP_CARD_WIDTH = 1080`, `LINEUP_CARD_HEIGHT = 1920`, `SCALE = 1080 / 576`, `ROW_CYS = [278, 334, 389, 444, 503, 558, 613.5, 668.5, 724]` y `DEFAULT_LINEUP_BG_SRC = "/assets/lineup-template-bg.jpg"`.
  - Caché en memoria (`imageCache` + `inFlightImageLoads`) de `HTMLImageElement` y respaldo de degradado `#041421` → `#071F32`.
  - Funciones exportadas: `renderLineupCardOnCanvas` y `generateLineupCardBlob`.
- [`src/components/admin/lineup-card-generator-panel.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/admin/lineup-card-generator-panel.tsx):
  - Panel `LineupCardGeneratorPanel` con selector de juegos, botón `"Sincronizar MLB API"`, carga opcional de fondo personalizado (`URL.createObjectURL`), sondeo seguro cada `30_000` ms gobernado por refs (`shouldPollRef`, `activeGamePkRef`, `pollingTimerRef`) + `document.visibilityState === "visible"` (sin estado mutado por fetch en dependencias de `useEffect`, respetando `isDirtyRef`), editor en vivo de rival/9 slots/pitcher/transmisión/fecha/hora/estadio, preview `<canvas>` `aspect-[9/16]` y 4 botones de acción: Descargar PNG HD (`lineup-leones-vs-...png`), Copiar Imagen (`ClipboardItem`), Compartir (`navigator.share` con `File` PNG y fallback informativo) y 1-Click Push (`POST /api/push/send` con `x-admin-key`, `topic: "news_roster"` y `url: "/game-center?gamePk=" + activeGamePk`).
- [`src/components/noticueva/noticueva-admin.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/noticueva/noticueva-admin.tsx): integrado `<LineupCardGeneratorPanel adminPassword={password} />` directamente encima de `<PushBroadcastPanel adminPassword={password} />` en la vista autenticada.

### Track C — Spec-Kit y Pruebas
- Artefactos [`spec.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/027-admin-lineup-card-generator/spec.md), [`plan.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/027-admin-lineup-card-generator/plan.md), [`tasks.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/027-admin-lineup-card-generator/tasks.md) e [`implementation.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/027-admin-lineup-card-generator/implementation.md).
- [`src/lib/__tests__/lineup-card.test.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/__tests__/lineup-card.test.ts): suite con `node:assert/strict` ejecutada vía `npx tsx` cubriendo `normalizeLineupPosition`, `formatOpponentShortName` (7 rivales), `formatShortSpanishDate`, `formatCompactTime`, `formatTransmissionLines`, `formatStadiumBannerName`, `formatPlayerDisplayName` y `getLineupCardData` con `globalThis.fetch` mockeado (lineup oficial desde `feed/live`, fallback a `schedule.lineups` + `boxscore.pitchers[0]`, deduplicación de `gamePk` pospuesto y estado sin lineup oficial).

---

## 2. Evidencia Observada de Verificación

- **Pruebas unitarias e integración (`npx tsx src/lib/__tests__/lineup-card.test.ts`):** **PASS (`TEST_EXIT=0`)**
  - Output observado: `=== TODAS LAS PRUEBAS DEL GENERADOR DE LINEUP PASARON EXITOSAMENTE ===`.
- **ESLint sobre los archivos nuevos (`eslint.cmd src/lib/lineup-card-service.ts src/app/api/noticueva/lineup-card/route.ts src/lib/lineup-card-canvas.ts src/components/admin/lineup-card-generator-panel.tsx src/lib/__tests__/lineup-card.test.ts`):** **PASS (`ESLINT_ALL_EXIT=0`)**.
- **Auditoría de copy UI (búsqueda case-insensitive de `"saberm"` en `lineup-card-service.ts`, `route.ts`, `lineup-card-canvas.ts`, `lineup-card-generator-panel.tsx`):** **0 ocurrencias**.
- **Build de Producción Next.js (`npm run build`):** **PASS (`BUILD_EXIT=0`)**
  - `Next.js 16.3.6 (Turbopack)`, `✓ Compiled successfully in 8.6s`, `✓ Generating static pages using 7 workers (19/19) in 2.5s`, ruta dinámica `/api/noticueva/lineup-card` compilada.
