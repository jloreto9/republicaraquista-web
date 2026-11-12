# Tareas de Implementación 023: Lineup Diario de Game Center → Optimizador Tom Tango

**Slug:** `023-gamecenter-lineup-to-optimizer`  
**Fecha:** 2026-11-12  

---

## Track A — Backend, Servicios, Motor y Rutas (`src/types/*`, `src/lib/*`, `src/app/api/*`, `src/app/bullpen/page.tsx`)

- [x] **T001 [Track A]**: Extender interfaces TypeScript de forma retrocompatible (campos opcionales):
  - `src/types/tango-lineup.ts`: añadir `TangoStatsSource` y `statsSource?: TangoStatsSource` en `TangoPlayer`.
  - `src/types/bullpen.ts`: añadir `TodayLineupStatus`, campos opcionales en `GameLineup` (`status`, `isToday`, `gameNumber`, `detailedState`, `teamId`, `teamName`) y en `BullpenAndLineupsData["lineups"]` (`todayLineup`, `todayLineupStatus`, `requestedLineup`, `playerStatsMap`).
  - `src/types/game-center.ts`: añadir `gameNumber?`, `isDoubleHeader?`, `gameDatetime?` en `GameCenterAvailableGame`, y `bats?`, `obp?`, `slg?` en `GameCenterBoxscoreBatter`.

- [x] **T002 [Track A]**: Corregir fecha Venezuela (UTC-4), dobles juegos y parsing pre-juego en `src/lib/game-center-service.ts`:
  - Reutilizar `getVenezuelanToday().dateString` de `src/lib/utils.ts` en `getCaracasAvailableGames`.
  - Capturar `gameNumber`, `isDoubleHeader`, `gameDatetime` y ordenar por `isLive` → `date DESC` → `gameNumber DESC` → `gameDatetime DESC`.
  - Incluir `"Warmup"` en `isPreview` en `getGameCenterData`.
  - En `formatBatters`, añadir respaldo por `boxTeam?.battingOrder` y por `schedule?hydrate=lineups` cuando `boxTeam?.batters` esté vacío, y poblar `bats` (`batSide.code`), `obp` y `slg`.

- [x] **T003 [Track A]**: Implementar resolución real de estadísticas de bateadores en `src/lib/tango-lineup-engine.ts`:
  - Reutilizar `computeWoba` y `computeWrcPlus` de `src/lib/matchup-engine.ts` para crear helpers `buildTangoPlayerFromBattingStats` y `buildTangoPlayerFromMlbSeasonStats`.
  - Extender `resolvePlayerStats(name, position, playerId, defaultOrder, realStatsLookup?)` manteniendo retrocompatibilidad con 4 argumentos y priorizando `realStatsLookup` (Supabase / MLB) → `LEONES_REAL_STATS_MAP` → sintético.

- [x] **T004 [Track A]**: Exponer lineup de hoy, lineup por `gamePk` y `playerStatsMap` en `src/lib/game-feed-service.ts`:
  - Consultar juegos de la fecha VET actual con `getCaracasAvailableGames(season)` incluyendo `Pre-Game` / `Warmup` / `Preview` / `Live` / `Final`, con respaldo desde `schedule?hydrate=lineups` si `feed/live` aún no tiene `battingOrder`.
  - Construir `todayLineup` y `todayLineupStatus` sin alterar `totalGames` ni récords W-L históricos cuando el juego de hoy está en `Preview`.
  - Construir `requestedLineup` cuando se solicita un `gamePk` específico (incluyendo juegos `Pre-Game` o de otro equipo).
  - Construir `playerStatsMap` consultando `getBattingStats(season, "R", "all", 400, 0)` + `seasonStats.batting` y `batSide.code` de los feeds disponibles.

- [x] **T005 [Track A]**: Actualizar rutas API y SSR de `/bullpen` y `/api/game-center`:
  - `src/app/api/game-center/route.ts`: ajustar `Cache-Control` para `Preview` a `public, s-maxage=30, stale-while-revalidate=15`.
  - `src/app/bullpen/page.tsx`: leer `searchParams` (`tab`, `subtab`, `gamePk`, `teamId`), pasar `gamePk`/`teamId` a la resolución de datos y entregar `initialTab`, `initialLineupSubtab`, `initialGamePk`, `initialTeamId` a `BullpenView`.
  - `src/app/api/bullpen/route.ts`: aceptar opcionalmente `?gamePk=` y propagarlo en la respuesta de lineups.

---

## Track B — Frontend / UI (`src/components/bullpen/*`, `src/components/game-center/*`)

- [x] **T006 [Track B]**: Actualizar `src/components/bullpen/bullpen-view.tsx` para soportar deep-linking y propagación de props:
  - Aceptar props opcionales `initialTab`, `initialLineupSubtab`, `initialGamePk`, `initialTeamId`.
  - Inicializar estado de pestaña/subpestaña/equipo desde esos props y pasar `todayLineup`, `todayLineupStatus`, `requestedLineup`, `playerStatsMap` e `initialGamePk` a `<TangoLineupOptimizerTab />`.

- [x] **T007 [Track B]**: Actualizar `src/components/bullpen/tango-lineup-optimizer-tab.tsx`:
  - Priorizar selección por defecto: `initialGamePk` (si coincide con `requestedLineup`, `todayLineup` o `gameLineups`) → `"today"` (si `todayLineup` tiene 9 titulares) → `"top_0"` → `"game_0"`.
  - Mostrar sección destacada **"Lineup de Hoy (Game Center)"** en el selector y subtítulo contextual con estado del juego.
  - Cuando no haya juego hoy o no se haya publicado el lineup (`!todayLineupStatus?.isPublished`), mostrar un badge/aviso claro en español indicando el respaldo a `"top_0"`.
  - Pasar `playerStatsMap` a `resolvePlayerStats(...)` (sin palabras prohibidas como *sabermétrico/a* ni métricas Statcast).

- [x] **T008 [Track B]**: Añadir atajo directo y corregir UX Pre-Juego en Game Center:
  - `src/components/game-center/game-center-view.tsx`: pasar `gamePk={gameData.gamePk}` a `<BoxscoreLineupsTab />`, corregir texto de estatus cuando `gameData.status === "Preview"` y habilitar polling cada 30s en estado `"Preview"`.
  - `src/components/game-center/boxscore-lineups-tab.tsx`: aceptar `gamePk?: number` y renderizar el enlace/botón **"Optimizar este Lineup"** hacia `/bullpen?tab=lineups&subtab=optimizer&gamePk=${gamePk}` (con `&teamId=${currentTeam.id}` cuando `currentTeam.id !== 695`) si `startersCount >= 9`.

---

## Track C — Pruebas y Verificación (`test/*`, TypeScript, Build, `implementation.md`)

- [x] **T009 [Track C]**: Crear prueba unitaria dedicada en `test/gamecenter-lineup-optimizer.test.mjs` (o `src/lib/__tests__/gamecenter-lineup-optimizer.test.ts` acorde al runner del repo):
  - Validar fecha VET (UTC-4) después de las 20:00 VET (ej. `2026-11-12T23:30:00-04:00` vs `2026-11-13T01:30:00Z`) y ordenamiento de doble juego (`gameNumber`).
  - Validar parsing de alineación pre-juego desde `batters`, fallback `battingOrder` y fallback `schedule?hydrate=lineups`.
  - Validar resolución de estadísticas reales (`supabase` / `mlb`) antes de `LEONES_REAL_STATS_MAP` y sintético, verificando `statsSource`.
  - Validar selección por defecto (`initialGamePk` → `"today"` → `"top_0"`) y estado `todayLineupStatus` cuando no hay lineup publicado.

- [x] **T010 [Track C]**: Ejecutar verificación completa y documentar cierre:
  - Ejecutar suite de pruebas unitarias existentes y nuevas.
  - Ejecutar `npx tsc --noEmit` (0 errores).
  - Ejecutar `npm run build` (build exitoso).
  - Crear `specs/023-gamecenter-lineup-to-optimizer/implementation.md` con resultados observados y evidencia de pruebas.
