# Tareas 033: Estabilización Bayesiana por Muestra (PA) y Cobertura Histórica

- [x] **T001** Extender contratos en `src/types/tango-lineup.ts` (`plateAppearances?`, `adjusted*`, `TangoOptimizationOptions`, `stabilizationPriorPa?`).
- [x] **T002** Implementar `DEFAULT_TANGO_PRIOR_PA`, `LVBP_LEAGUE_BATTING_MEANS` y `stabilizeTangoPlayer` en `src/lib/tango-lineup-engine.ts`, e integrarlos en builders, `resolvePlayerStats`, `calculateLineupMetrics`, `optimizeTangoLineup`, `selectBestDefensiveNine` y `buildBestAvailableLineup`.
- [x] **T003** Exportar `getHistoricalPlayerStatsMap` y ordenar `activeRosterPool` por `adjustedWoba` en `src/lib/game-feed-service.ts`; conectar en `src/app/api/bullpen/route.ts` y `src/app/bullpen/page.tsx`.
- [x] **T004** Actualizar `src/components/bullpen/tango-lineup-optimizer-tab.tsx` con toggle `Estabilizado (Bayes k=80)` vs `Crudo`, badge de fuente y `PA` en modo *"Del Juego"*, valor `Est.` visible y opciones `50 / 75 PA`.
- [x] **T005** Agregar pruebas en `test/best-available-lineup.test.mjs` y `test/gamecenter-lineup-optimizer.test.mjs`, ejecutar toda la suite `test/*.mjs`, `npx tsc --noEmit` y `npm run build`.
- [x] **T006** Documentar resultados en `specs/033-lineup-optimizer-bayesian-stabilization/implementation.md`, marcar tareas y hacer commit + push.
