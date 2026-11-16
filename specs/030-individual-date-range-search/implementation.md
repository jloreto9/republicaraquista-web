# Informe de Implementación y Verificación 030: Buscador Individual por Rango de Fechas y Comparativa Interanual

**Slug:** `030-individual-date-range-search`  
**Fecha:** 2026-11-16  
**Estado:** Implementado y Verificado (Converged)

---

## 1. Resumen de Archivos Entregados

### Track A — Capa de Datos y Endpoints API
- [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts):
  - Añadidos `INVALID_DATE_RANGE_ERROR`, `parseStatsDateRange(searchParams)` y `getStatsCacheControlHeader(endDate?)` (diferenciando fechas cerradas `< today` VET con `max-age=3600, s-maxage=3600, stale-while-revalidate=300` frente a `max-age=300, s-maxage=300, stale-while-revalidate=60`).
  - Extendido `getTeamGamesMap(season, phase, startDate?, endDate?)` para consultar en paralelo `/api/v1/teams/stats` (`group=hitting` y `group=pitching`, `stats=byDateRange`) con fallback a `getCanonicalPlayedGames(season, { phase: "all" })` filtrado por `game_date`.
  - Extendido `getBattingStats(season, phase, teamId, limit, minAb, startDate?, endDate?)` usando `/api/v1/stats?stats=byDateRange&group=hitting` (consolidación multi-split segura, recálculo de tasas, orden por `ops` desc / `hits` desc) y fallback a Supabase `batting_stats` + `games` por `game_date`.
  - Extendido `getPitchingStats(season, phase, teamId, limit, minIp, startDate?, endDate?)` usando `/api/v1/stats?stats=byDateRange&group=pitching`, aritmética exacta de entradas (`parseBaseballInningsToDecimal` / `formatDecimalToBaseballInnings`), orden por `era` asc / `strikeouts` desc y fallback a Supabase `pitching_stats` + `games` por `game_date`.
  - Extendido `getFieldingStats(season, phase, teamId, limit, minChances, startDate?, endDate?)` con hidratación paralela `/api/v1/teams/${tid}/roster/fullSeason?hydrate=person(stats(type=byDateRange,group=fielding,...))`, filtrado por `sport.id === 17`, `LVBP_TEAM_IDS` + `stTeamId === tid`, exclusión de `DH`/`PH`/`PR` y reutilización de `aggregateFieldingSplits`.
- [`src/app/api/stats/batting/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/stats/batting/route.ts), [`src/app/api/stats/pitching/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/stats/pitching/route.ts) y [`src/app/api/stats/fielding/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/stats/fielding/route.ts): validación HTTP `400` de rango de fechas, propagación de `startDate`/`endDate`, inclusión en la respuesta JSON y cabecera `Cache-Control` dinámica en hora VET.

### Track B — Interfaz `/individuales`
- [`src/components/stats/stathead-individual-search.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/stathead-individual-search.tsx): componente `StatheadIndividualSearch` con grupos `batting`/`pitching`/`fielding`, presets rápidos en VET (`7d`, `14d`, `oct`, `nov`, `dic`, `all`), comparativa interanual opcional (`compareEnabled` apagado por defecto, sincronización `-1 año` y badges de delta), filtros instantáneos en memoria por franquicia/calificación/nombre/posición, 4 tarjetas KPI de líderes y tabla ordenable con resaltado para Leones (`695`) y navegación a `Splits`.
- [`src/components/stats/individuales-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/individuales-view.tsx): integrada la pestaña `"stathead"` (`Buscador`, mapeando `?tab=stathead` y `?tab=buscador`), ocultando `<StatsFilters />` en `"splits"` y `"stathead"`, y renderizando `<StatheadIndividualSearch />`.

### Track C — Pruebas y Verificación
- [`src/lib/__tests__/individual-date-range.test.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/__tests__/individual-date-range.test.ts): suite unitaria con mocks de `fetch` y `supabase` cubriendo `getTeamGamesMap` (MLB + fallback), `getBattingStats` (splits, multi-equipo, filtros y fallback), `getPitchingStats` (innings `"5.2"`, multi-split `"9.0"`, orden y fallback), `getFieldingStats` (`roster/fullSeason`, exclusión `DH`/`PH`/`PR`, agrupación por `player-team-pos`), validación `400`/`200`/`Cache-Control` en los 3 route handlers y auditoría de copy sin términos prohibidos.

---

## 2. Evidencia Observada de Verificación

> **Nota sobre ejecutor de pruebas:** `package.json` no define script `"test"` ni incluye `vitest`; toda la suite en `src/lib/__tests__/*.test.ts` usa `node:assert/strict` y se ejecuta mediante `npx tsx` (y `test/*.test.mjs` mediante `node`).

- **Pruebas unitarias de Rango de Fechas Individual (`npx tsx src/lib/__tests__/individual-date-range.test.ts`):** **PASS (`exit=0`)**
  - Output observado: `=== TODAS LAS PRUEBAS DE RANGO DE FECHAS INDIVIDUAL PASARON EXITOSAMENTE ===`.
- **Suite completa en `src/lib/__tests__/*.test.ts` (10 archivos vía `npx tsx`):** **PASS (`exit=0`)**
  - `awards-engine.test.ts`, `fielding-stats.test.ts`, `individual-date-range.test.ts`, `leones-stats-extrainning.test.ts`, `lineup-card.test.ts`, `lob-tracker.test.ts`, `pitch-telemetry.test.ts`, `player-splits.test.ts`, `realtime-postgame-sync.test.ts`, `streaks-service.test.ts`.
- **Suite completa en `test/*.test.mjs` (4 archivos vía `node`):** **PASS (`exit=0`)**
  - `best-available-lineup.test.mjs`, `bullpen-ir-irs.test.mjs`, `calendar-today.test.mjs`, `gamecenter-lineup-optimizer.test.mjs`.
- **ESLint sobre los 7 archivos nuevos/modificados (`npx eslint ...`):** **PASS (`exit=0`)** — 0 errores, 0 warnings.
- **Typecheck (`npx tsc --noEmit`):** 0 errores en los archivos nuevos/modificados; único error preexistente fuera del alcance: `src/components/calendar/calendar-event-modal.tsx(218,22): error TS18048: 'event.result' is possibly 'undefined'.`
- **Auditoría de copy (`/saberm/i`):** 0 coincidencias en `stathead-individual-search.tsx`, `individuales-view.tsx`, `batting/route.ts`, `pitching/route.ts`, `fielding/route.ts` y `supabase.ts`.
- **Compilación de producción (`npm run build`):** **PASS (`exit=0`)** — `Next.js 16.3.6 (Turbopack)`, `✓ Compiled successfully in 8.3s`, 19/19 páginas generadas en `2.1s`, incluyendo `/individuales`, `/api/stats/batting`, `/api/stats/pitching` y `/api/stats/fielding`.
