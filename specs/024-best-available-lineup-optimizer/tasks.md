# Tareas de Implementación 024: Mejor Lineup Posible con lo Mejor Disponible (Roster Activo)

**Slug:** `024-best-available-lineup-optimizer`  
**Fecha:** 2026-11-13  

---

## Track A — Backend, Servicios y Motor (`src/types/*`, `src/lib/*`)

- [x] **T001 [Track A]**: Extender contratos TypeScript retrocompatibles en `src/types/tango-lineup.ts` y `src/types/bullpen.ts`:
  - `src/types/tango-lineup.ts`: agregar `TangoPositionSlot`, `ActiveRosterBatter`, `BestLineupConstraintMode`, `BuildBestAvailableLineupParams` y `BestAvailableLineupResult`.
  - `src/types/bullpen.ts`: importar `ActiveRosterBatter` y agregar `activeRosterPool?: ActiveRosterBatter[]` en `BullpenAndLineupsData["lineups"]`.

- [x] **T002 [Track A]**: Implementar obtención del Roster Activo MLB en `src/lib/game-center-service.ts`:
  - Exportar `ActiveRosterMlbBatter` y `fetchTeamActiveRosterBatters(teamId = 695, season = 2026)` usando `AbortSignal.timeout(8000)`.
  - Consultar `teams/${teamId}/roster?rosterType=active&season=${season}&hydrate=person`, filtrar lanzadores (`"P"` / `"1"`) y retornar `[]` de forma segura si falla la petición.

- [x] **T003 [Track A]**: Implementar selección óptima y restricciones defensivas en `src/lib/tango-lineup-engine.ts`:
  - Exportar `DEFENSIVE_LINEUP_SLOTS` y `normalizeEligiblePositions(rawPositions)`.
  - Exportar `selectBestDefensiveNine(pool)` con búsqueda por backtracking y poda por cota superior maximizando $\sum \text{wOBA}$ sobre las 9 posiciones (`C, 1B, 2B, 3B, SS, LF, CF, RF, DH`) + fallback controlado documentado en `relaxedNote`.
  - Exportar `buildBestAvailableLineup(params)` con exclusión de `excludedPlayerIds`, filtro `minPlateAppearances` (default `10`) con relajación progresiva (`minPA → 5 → 0`) si quedan `< 9` elegibles, soporte dual (`"defensive_valid"` vs `"pure_bats"`), ordenamiento con `optimizeTangoLineup()` y cálculo de `deltaRunsPerGame` / `deltaRunsPerSeason` contra `referenceLineup` cuando exista.

- [x] **T004 [Track A]**: Enriquecer feeds multi-posición y construir `activeRosterPool` en `src/lib/game-feed-service.ts`:
  - Ampliar `collectMlbPlayerMetaFromFeeds(feeds)` para recolectar `playedPositions` (`position.abbreviation` y `allPositions[].abbreviation`, excluyendo `P`, `PH`, `PR`) y `plateAppearances` / `atBats` / `gamesPlayed` de `seasonStats.batting`.
  - Exportar `buildActiveRosterPool(params)` cruzando Roster Activo MLB (o fallback desde `supabaseStats` si viene vacío) con estadísticas reales (`Supabase` → `MLB` → `canónico` → `sintético`) y posiciones elegibles normalizadas.
  - Invocar `fetchTeamActiveRosterBatters(targetTeamId, season)` en paralelo dentro de `getDynamicBullpenAndLineups` y exponer `activeRosterPool` en `lineups`.

---

## Track B — Frontend / UI (`src/components/bullpen/*`)

- [x] **T005 [Track B]**: Propagar `activeRosterPool` en `src/components/bullpen/bullpen-view.tsx`:
  - Pasar `activeRosterPool={data.lineups.activeRosterPool}` hacia `<TangoLineupOptimizerTab />`.

- [x] **T006 [Track B]**: Implementar modo dual y controles interactivos en `src/components/bullpen/tango-lineup-optimizer-tab.tsx`:
  - Aceptar prop opcional `activeRosterPool?: ActiveRosterBatter[]`.
  - Agregar selector de modo segmentado en la cabecera: **`Del Juego / Orden del Día`** vs **`Mejor Posible (Roster Activo)`**.
  - Agregar toggle **`9 Posiciones Válidas`** vs **`Top 9 Bates Puros`**, selector de muestra mínima **`Mín. 10 PA`** (default, con opciones `0 / 10 / 20 / 35 PA`) y panel con chips interactivos de peloteros disponibles para excluir/reactivar con recálculo instantáneo.
  - Mostrar comparativa lado a lado (Lineup de Referencia vs Mejor Lineup Posible con posición asignada y badge **`Nuevo en el 9`**), aviso cuando `relaxedConstraintNote` aplique y sección inferior **"Banca / No incluidos en este 9"**.
  - Verificar cumplimiento estricto de español 100%, cero términos *"sabermétrico/a"*, cero métricas Statcast e iconos exclusivos de `lucide-react`.

---

## Track C — Pruebas y Verificación (`test/*`, TypeScript, Build, `implementation.md`)

- [x] **T007 [Track C]**: Crear suite de pruebas unitarias `test/best-available-lineup.test.mjs`:
  - Validar `normalizeEligiblePositions` (`OF`, `IF`, `LF/CF/RF`, `DH`, exclusión de `P`/`PH`/`PR`).
  - Validar `selectBestDefensiveNine` asignando las 9 posiciones válidas sin duplicar jugador ni alinear múltiples receptores/campocortos simultáneos, maximizando `wOBA` total y probando fallback controlado.
  - Validar `buildBestAvailableLineup`: modo `"defensive_valid"` vs `"pure_bats"`, filtro `minPlateAppearances` con relajación automática (`10 → 5 → 0`) cuando `< 9` elegibles, exclusión manual (`excludedPlayerIds`) y `deltaRunsPerGame` frente a `referenceLineup`.
  - Validar `buildActiveRosterPool` (cruce Roster Activo + Supabase/MLB + `playedPositions` + fallback cuando roster está vacío).

- [x] **T008 [Track C]**: Ejecutar verificación integral y cerrar Spec-Kit 024:
  - Ejecutar `node test/best-available-lineup.test.mjs`, `node test/calendar-today.test.mjs` y `node test/gamecenter-lineup-optimizer.test.mjs`.
  - Ejecutar `npx tsc --noEmit` (0 errores nuevos en los archivos modificados).
  - Ejecutar `npm run build` (exit 0).
  - Marcar `[x]` las tareas completadas en `tasks.md` y crear `specs/024-best-available-lineup-optimizer/implementation.md` con evidencia observada.
