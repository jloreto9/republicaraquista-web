# Plan Técnico 033: Estabilización Bayesiana por Muestra (PA) y Cobertura Histórica

**Spec:** [`spec.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/033-lineup-optimizer-bayesian-stabilization/spec.md)  
**Fecha:** 2026-11-18

---

## 1. Estrategia y Escalera de Simplicidad

Siguiendo el mismo patrón de estabilización bayesiana ya validado en [`park-factors-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/park-factors-service.ts#L264-L266), introducimos una función pura sin dependencias nuevas ni alteración de esquemas en Supabase.

## 2. Archivos a Modificar

| Archivo | Cambio Exacto |
|---|---|
| `src/types/tango-lineup.ts` | Campos opcionales `plateAppearances?`, `adjustedWoba?`, `adjustedObp?`, `adjustedSlg?`, `adjustedIso?` en `TangoPlayer`; `TangoOptimizationOptions`; `stabilizationPriorPa?` en `BuildBestAvailableLineupParams`. |
| `src/lib/tango-lineup-engine.ts` | `DEFAULT_TANGO_PRIOR_PA = 80`, `LVBP_LEAGUE_BATTING_MEANS`, `stabilizeTangoPlayer()`, propagación de `plateAppearances` y `adjusted*` en builders/resolver, integración de `options?.stabilizationPriorPa` en `calculateLineupMetrics`, `optimizeTangoLineup`, `selectBestDefensiveNine` y `buildBestAvailableLineup`. |
| `src/lib/game-feed-service.ts` | Exportar `getHistoricalPlayerStatsMap(season)` y ordenar `buildActiveRosterPool` por `adjustedWoba ?? woba` descendente (desempate por `woba` y `plateAppearances`). |
| `src/app/api/bullpen/route.ts` | Resolver `getHistoricalPlayerStatsMap(season)` cuando `season < activeSeason` y `!fallbackRequested`. |
| `src/app/bullpen/page.tsx` | Igual hidratación histórica en SSR para mantener paridad con el endpoint API. |
| `src/components/bullpen/tango-lineup-optimizer-tab.tsx` | Toggle `Estabilizado (Bayes k=80)` vs `Crudo`, badges `statsSource` y `PA` en modo *"Del Juego"*, visualización de `Est.` junto a `wOBA` crudo, y opciones `50 PA` / `75 PA` en el selector. |
| `test/best-available-lineup.test.mjs` y `test/gamecenter-lineup-optimizer.test.mjs` | Casos unitarios de regresión bayesiana con datos reales simulados (19–32 PA vs 120 PA) y modo `stabilizationPriorPa: 0`. |

## 3. Plan de Rollback y No Regresión

- Todos los nuevos campos en `TangoPlayer` y parámetros `options` son opcionales con defaults seguros (`DEFAULT_TANGO_PRIOR_PA = 80`).
- Si un `TangoPlayer` proviene de tests o fallbacks sin `plateAppearances`, `stabilizeTangoPlayer` devuelve las tasas sin modificar, garantizando 100% de compatibilidad con las pruebas previas de Spec 013, 023 y 024.
- Rollback directo vía `git revert` sobre el commit único de esta feature.
