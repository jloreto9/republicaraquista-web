# Informe de Implementación 033: Estabilización Bayesiana por Muestra (PA) y Cobertura Histórica

**Spec:** [`spec.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/033-lineup-optimizer-bayesian-stabilization/spec.md)  
**Plan:** [`plan.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/033-lineup-optimizer-bayesian-stabilization/plan.md)  
**Fecha:** 2026-11-18  
**Estado:** Implementado y Verificado

---

## 1. Cambios Realizados

1. **Contratos (`src/types/tango-lineup.ts`):**
   - Añadidos campos opcionales retrocompatibles en `TangoPlayer`: `plateAppearances?`, `adjustedWoba?`, `adjustedObp?`, `adjustedSlg?`, `adjustedIso?`.
   - Añadidos `TangoOptimizationOptions` y `stabilizationPriorPa?` en `BuildBestAvailableLineupParams`.

2. **Motor de Optimización (`src/lib/tango-lineup-engine.ts`):**
   - Exportados `DEFAULT_TANGO_PRIOR_PA = 80`, `LVBP_LEAGUE_BATTING_MEANS` (`avg: 0.270`, `obp: 0.340`, `slg: 0.395`, `woba: 0.330`, `iso: 0.125`) y `stabilizeTangoPlayer(player, priorPa)`.
   - Propagados `plateAppearances` y `adjusted*` en `buildTangoPlayerFromBattingStats`, `buildTangoPlayerFromMlbSeasonStats` y `resolvePlayerStats`.
   - Aplicadas las tasas estabilizadas en `calculateLineupMetrics`, `optimizeTangoLineup`, `selectBestDefensiveNine` y `buildBestAvailableLineup` (conservando intactas las tasas observadas en `player` para transparencia visual).
   - Extendida la cascada progresiva de PA a `[requestedMinPa, 35, 20, 10, 5, 0]`.

3. **Cobertura Histórica y Pool (`src/lib/game-feed-service.ts`, `src/app/api/bullpen/route.ts`, `src/app/bullpen/page.tsx`):**
   - Exportada `getHistoricalPlayerStatsMap(season)` y ordenada `buildActiveRosterPool` por `adjustedWoba ?? woba`.
   - Hidratado `playerStatsMap` desde `Supabase` (`getBattingStats`) también en temporadas `< activeSeason` cuando no hay `gamePk`.

4. **Interfaz de Usuario (`src/components/bullpen/tango-lineup-optimizer-tab.tsx`):**
   - Añadido toggle segmentado **`Estabilizado (k=80 PA)`** *(por defecto)* vs **`Crudo`**.
   - Añadidos badge de fuente (`Temporada BD`, `MLB API`, `Base Club`, `Estimado`), conteo `PA` y valor `Est. .XXX` junto al `wOBA` observado en el modo *"Del Juego / Orden del Día"* y en *"Mejor Posible (Roster Activo)"*.
   - Añadidas opciones `Mín. 50 PA` y `Mín. 75 PA` al selector de muestra mínima.

5. **Extracción exacta de abridores 1–9 (`src/lib/game-feed-service.ts`):**
   - Extraído el helper compartido `extractStartingNineFromBoxTeam(teamBox, gamePlayersDict)` usado tanto por `extractTeamGameLineupFromFeed` como por `getDynamicBullpenAndLineups`.
   - Prioriza los códigos `battingOrder % 100 === 0` (`100..900`) y la posición inicial (`allPositions[0]`) por encima de `teamBox.battingOrder` (donde MLB Stats API sobrescribe con los sustitutos del final del partido, p. ej. `303` en lugar de `300`).

---

## 2. Verificación Ejecutada

| Chequeo | Resultado | Detalle |
|---|---|---|
| `node test/best-available-lineup.test.mjs` | ✅ `13/13` pasando | Incluye nuevo test `9a` de estabilización bayesiana (`19-38 PA` vs `119-131 PA`) y modo `k=0`. |
| `node test/gamecenter-lineup-optimizer.test.mjs` | ✅ `14/14` pasando | Valida `plateAppearances` y `adjustedWoba`, y test `2e` de abridores `bo % 100 === 0` frente a sustitutos en `boxTeam.battingOrder`. |
| `node test/bullpen-ir-irs.test.mjs` | ✅ `7/7` pasando | Sin regresiones en módulo de bullpen. |
| `node test/calendar-today.test.mjs` | ✅ `5/5` pasando | Sin regresiones en utilidades de fecha VET. |
| `npm run build` | ✅ Exitoso | Compilado con Next.js 16.3.6 (Turbopack) y 19/19 páginas estáticas generadas. |
| `npx tsc --noEmit` | ⚠️ 0 errores en archivos editados | 1 error preexistente en archivo no tocado: `src/components/calendar/calendar-event-modal.tsx(218,22)`. |
| `npx eslint` (archivos modificados) | ⚠️ 0 errores en código nuevo | 2 errores preexistentes `react-hooks/set-state-in-effect` en `tango-lineup-optimizer-tab.tsx` (líneas 200 y 309). |
