# Tareas de Implementación 035: Colectivas por Rol de Pitcheo (`SP`/`RP`), Buscador Global de Jugadores (`/jugadores`) y Splits Avanzados LVBP

**Slug:** `035-collective-pitching-roles-and-player-hub`  
**Fecha:** 2026-11-25  

---

## Track A — Spec-Kit (`spec-writer`)

- [x] **T001 [Track A]**: Redactar y versionar los artefactos iniciales `spec.md`, `plan.md` y `tasks.md` en `specs/035-collective-pitching-roles-and-player-hub/` alineados con los guardrails LVBP y los contratos reales del repositorio.

---

## Track B — Módulo 1: Colectivas SP / RP (`colectivas`)

- [x] **T002 [Track B]**: Exportar `PitchingRoleFilter` (`"all" | "sp" | "rp"`) y agregar `pitchingRole?: PitchingRoleFilter` a `CollectiveStatsResult` en `src/types/collective.ts`.
- [x] **T003 [Track B]**: Actualizar `getCollectiveStats` en `src/lib/collective.ts` para soportar `sitCodes=sp|rp` por temporada/fase y agregar `aggregateBoxscoresByPitchingRole` con caché inmutable `finalizedBoxscoreCache` (concurrencia 12) para rangos de fechas; exponer `pitchingRole` en `src/app/api/stats/collective/route.ts`.
- [x] **T004 [Track B]**: Integrar el selector `Todos | Abridores (SP) | Relevistas (RP)` y el 4to KPI adaptado (`MÁS INNINGS (IP)` para `SP`) en `src/components/colectivas/colectivas-view.tsx`, y añadir soporte por rol con comparativa interanual `Δ`, badge activo y nota `±1 CL` en `src/components/colectivas/stathead-collective-search.tsx`.
- [x] **T005 [Track B]**: Crear y pasar la suite unitaria `src/lib/__tests__/collective-pitching-roles.test.ts` validando clasificación `SP`/`RP`, aritmética de tercios de inning, suma `SP+RP`, KPIs y manejo de `0.0` IP.

---

## Track C — Módulo 2: Player Data, Splits Extendidos y Leverage Index (`player-data`)

- [x] **T006 [Track C]**: Ampliar `src/types/player-splits.ts` con nuevas categorías en `SplitCategory`, `eraAvailable?` en `PitcherSplitRow`, tipos de Leverage (`LeverageTier`, `PlayerLeverageRow`, `PitcherLeverageRow`, `PlayerLeverageResult`), logs/perfil general (`PlayerBatterGameLog`, `PlayerPitcherGameLog`, `PlayerGeneralProfile`) y campos opcionales en `PlayerSplitsProfile`.
- [x] **T007 [Track C]**: Implementar `src/lib/player-leverage-service.ts` (`LEVERAGE_THRESHOLDS`, `classifyLeverageTier`, `aggregatePlaysByLeverage`, `getPlayerLeverageSplits`) reutilizando `wpa-engine.ts` y `game-feed-service.ts`, y exponer `GET /api/stats/player-leverage` en `src/app/api/stats/player-leverage/route.ts`.
- [x] **T008 [Track C]**: Ampliar `SIT_CODES` en `src/lib/player-splits-service.ts` para los 6 nuevos grupos LVBP, corregir `parseMlbPitcherSplit` (`era: "--"`, `eraNum: -1`, `eraAvailable: false` cuando faltan `earnedRuns`/`era`), exportar `buildRecentTrendSplits`, `buildPitcherRestDaySplits`, `buildBatterGameLogs`, `buildPitcherGameLogs` e implementar `getPlayerGeneralProfile` multi-temporada (`[2026, 2025]`).
- [x] **T009 [Track C]**: Endurecer validación (`400` si `player_id` inválido) y `Cache-Control` por temporada en `src/app/api/stats/player-splits/route.ts`, y crear/ejecutar `src/lib/__tests__/player-leverage-and-splits.test.ts` junto a `player-splits.test.ts`.

---

## Track D — Módulo 3: UI, Navegación Global y Página `/jugadores` (`player-ui`)

- [x] **T010 [Track D]**: Registrar `"Buscador de Jugadores"` (`/jugadores`) en `src/components/layout/nav-data.ts`, construir `src/components/layout/player-quick-search.tsx` (atajo `Ctrl+K`, búsqueda sin acentos, filtro `Todos | Bateadores | Lanzadores`, teclado `↑`/`↓`/`Enter`/`Esc`) e integrarlo en `src/components/layout/header.tsx` y `src/components/layout/mobile-nav.tsx`.
- [x] **T011 [Track D]**: Crear la página Server Component `src/app/jugadores/page.tsx` leyendo `searchParams` (`player`, `type`, `season`) y añadir enlace directo `"Abrir en Buscador de Jugadores"` desde `src/components/stats/individuales-view.tsx`.
- [x] **T012 [Track D]**: Crear `src/components/stats/splits/player-general-stats-card.tsx` estilo Baseball-Reference con tabla multi-temporada (`2026-27`, `2025-26`, `Total LVBP`), toggle `Todas | Tradicionales | Avanzadas & Stats+` con semáforo `100 = Promedio LVBP`, Resumen Defensivo y Bitácora de Juegos (`Últimos 7 | Últimos 15 | Todos`).
- [x] **T013 [Track D]**: Crear `src/components/stats/splits/leverage-splits-card.tsx` consumiendo `/api/stats/player-leverage` con skeleton, filas `Alta / Media / Baja Presión`, `aLI`, `WPA`, `Late & Close` y leyenda LVBP; actualizar `src/components/stats/splits/split-table-group.tsx` para mostrar `"--"` neutro y ordenar al final cuando `eraAvailable === false`.
- [x] **T014 [Track D]**: Actualizar `src/components/stats/splits/player-splits-view.tsx` para soportar `syncUrl`, selector unificado sin acentos, ficha general superior, splits de presión, pills de los 6 grupos nuevos y matriz colapsable de 12 conteos (`0-0` a `3-2`).

---

## Track E — Verificación Integral y Cierre

- [x] **T015 [Track E]**: Ejecutar verificación completa (pruebas unitarias, `npx tsc --noEmit`, ESLint, auditoría de lenguaje deportivo y cero Statcast, y `npm run build`), marcar tareas completadas y documentar evidencia en `specs/035-collective-pitching-roles-and-player-hub/implementation.md`.
