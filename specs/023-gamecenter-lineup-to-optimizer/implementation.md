# Informe de Implementación 023: Lineup Diario de Game Center en el Optimizador Tom Tango

**Slug:** `023-gamecenter-lineup-to-optimizer`  
**Fecha:** 2026-11-12  
**Estado:** Implementado y Verificado

---

## 1. Resumen Ejecutivo

Se integró el flujo completo entre el **Game Center** (`/game-center`) y el **Optimizador de Lineup (Tom Tango)** (`/bullpen?tab=lineups&subtab=optimizer`), eliminando la desconexión con los lineups publicados en estado `Pre-Game` / `Warmup`, corrigiendo el desfase horario UTC vs. Venezuela (UTC-4) en la selección de juegos y dobles carteleras, y priorizando estadísticas reales de temporada (Supabase `batting_stats` y MLB `feed/live`) sobre el mapa estático y el fallback sintético.

---

## 2. Cambios Implementados por Track

### Track A — Contratos, Servicios, Motor y Rutas
- **`src/types/tango-lineup.ts`**, **`src/types/bullpen.ts`**, **`src/types/game-center.ts`**:
  - Añadidos `TangoStatsSource` (`"supabase" | "mlb" | "canonical_map" | "synthetic"`) y `statsSource?` en `TangoPlayer`.
  - Añadida `TodayLineupStatus` y campos opcionales retrocompatibles en `GameLineup` (`status?`, `isToday?`, `gameNumber?`, `detailedState?`, `teamId?`, `teamName?`) y en `BullpenAndLineupsData["lineups"]` (`todayLineup?`, `todayLineupStatus?`, `requestedLineup?`, `playerStatsMap?`).
  - Añadidos `gameNumber?`, `isDoubleHeader?`, `gameDatetime?` en `GameCenterAvailableGame` y `bats?`, `obp?`, `slg?` en `GameCenterBoxscoreBatter`.
- **`src/lib/game-center-service.ts`**:
  - Reemplazado cálculo UTC por `getVenezuelanToday().dateString` en `filterAndSortCaracasGames`, ordenando `isLive` primero → `date DESC` → `gameNumber DESC` → `gameDatetime DESC`.
  - Añadido `"Warmup"` a `isPreview` en `getGameCenterData`.
  - Extraída función `formatBoxscoreBatters` con cascada resiliente `boxTeam.batters` → `boxTeam.battingOrder` → `schedule?hydrate=lineups` (`extractLineupFromSchedule` / `fetchScheduleLineupsForGame`), extrayendo `bats`, `obp` y `slg`.
- **`src/lib/tango-lineup-engine.ts`**:
  - Exportados `buildTangoPlayerFromBattingStats` y `buildTangoPlayerFromMlbSeasonStats` reutilizando `computeWoba` y `computeWrcPlus`.
  - Extendido `resolvePlayerStats` con 5to parámetro opcional `realStatsLookup` siguiendo precedencia estricta `realStatsLookup` → `LEONES_REAL_STATS_MAP` (`canonical_map`) → `synthetic`.
- **`src/lib/game-feed-service.ts`**:
  - Implementados `extractTeamGameLineupFromFeed`, `resolveTodayAndRequestedLineups`, `buildPlayerStatsMapFromSources` y `getRequestedGameLineupAndStats`.
  - Extendido `getDynamicBullpenAndLineups(season, { targetGamePk, teamId })` para exponer `todayLineup`, `todayLineupStatus`, `requestedLineup` y `playerStatsMap` sin alterar `kpis.totalGames` ni `gameLineups` con juegos `Preview`.
- **`src/app/api/game-center/route.ts`**, **`src/app/api/bullpen/route.ts`**, **`src/app/bullpen/page.tsx`**:
  - `Cache-Control` `public, s-maxage=30, stale-while-revalidate=15` para respuestas `"Preview"` en `/api/game-center`.
  - Soporte de `searchParams` (`tab`, `subtab`, `gamePk`, `teamId`) en `/bullpen` y `?gamePk=` en `/api/bullpen`.

### Track B — Frontend / UI
- **`src/components/bullpen/bullpen-view.tsx`**: Soporte de `initialTab`, `initialLineupSubtab`, `initialGamePk`, `initialTeamId`, evitando sobrescribir `todayLineup`/`requestedLineup` en el montaje inicial y propagando `playerStatsMap`, `todayLineup`, `todayLineupStatus`, `requestedLineup` e `initialGamePk` a `TangoLineupOptimizerTab`.
- **`src/components/bullpen/tango-lineup-optimizer-tab.tsx`**: Prioridad de selección por defecto (`initialGamePk` → `"today"` → `"top_0"` → `"game_0"`), `<optgroup>` para **"Lineup Publicado de Hoy (Game Center)"** y **"Lineup Seleccionado desde Game Center"**, badge/aviso en español con respaldo cuando no está publicado, y uso de `playerStatsMap` en `resolvePlayerStats(...)`.
- **`src/components/game-center/game-center-view.tsx`** y **`src/components/game-center/boxscore-lineups-tab.tsx`**: Corrección del texto de estado `"Preview"` (*"Encuentro programado..."*), polling cada 30s en `"Preview"`, y enlace **"Optimizar este Lineup"** cuando `startersCount >= 9` hacia `/bullpen?tab=lineups&subtab=optimizer&gamePk=${gamePk}` (con `&teamId=${currentTeam.id}` cuando `!== 695`).

### Track C — Pruebas
- **`test/gamecenter-lineup-optimizer.test.mjs`**: 13 pruebas unitarias cubriendo fecha VET (UTC-4), ordenamiento de doble juego, cascada de extracción (`batters` → `battingOrder` → `schedule?hydrate=lineups`), `buildTangoPlayerFromBattingStats`, `buildTangoPlayerFromMlbSeasonStats`, precedencia de `resolvePlayerStats`, `todayLineupStatus`/`requestedLineup` en `getDynamicBullpenAndLineups` (publicado, no publicado, sin juego hoy) y prioridad de selección por defecto.

---

## 3. Pruebas y Verificación Ejecutada

| Comando | Resultado | Exit Code | Observaciones |
|---|---|---|---|
| `node test/calendar-today.test.mjs` | 5/5 checks OK | `0` | Suite existente de fecha VET y calendario |
| `node test/gamecenter-lineup-optimizer.test.mjs` | 13/13 checks OK | `0` | Suite nueva de Spec 023 |
| `npm run build` | Build exitoso (`next build`, 17/17 páginas estáticas generadas) | `0` | Advertencia preexistente de `middleware` → `proxy` |
| `npx tsc --noEmit` | 0 errores en archivos del diff | `1` | 1 error preexistente fuera del diff: `src/components/calendar/calendar-event-modal.tsx(218,22): TS18048` |
| `npx eslint <13 archivos modificados>` | 0 errores nuevos en la lógica backend/API | `1` | Errores/warnings preexistentes del repo: `react-hooks/set-state-in-effect` y `react-hooks/exhaustive-deps` en `bullpen-view.tsx`, `tango-lineup-optimizer-tab.tsx`, `game-center-view.tsx`; `no-unused-vars` (`DEFAULT_PREFERENCES`) en `game-center-view.tsx`; 6 `@typescript-eslint/no-explicit-any` en `game-center-service.ts` (líneas 539, 665, 712, 733, 750, 825) |

---

## 4. Dictamen de Convergencia

**CONVERGED**: Todos los criterios de aceptación (CA-01 a CA-07) e invariantes de dominio (100% español en UI, sin términos *"sabermétrico/a"* en títulos/botones, sin métricas Statcast, sin cambios de esquema en Supabase y retrocompatibilidad opcional en interfaces) quedaron verificados.
