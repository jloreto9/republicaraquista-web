# Spec 023: Lineup Diario de Game Center en el Optimizador Tom Tango y Enriquecimiento con Estadísticas Reales

**Slug:** `023-gamecenter-lineup-to-optimizer`  
**Autor:** Spec-Kit Architect & Jorge Leonardo Loreto  
**Fecha:** 2026-11-12  
**Estado:** Especificado (Fase 1 de Spec-Kit)  
**Relacionados:** [Spec 006](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/006-live-game-center/spec.md) · [Spec 013](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/013-tango-lineup-optimizer/spec.md) · [Spec 022](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/022-doubleheader-suspended-games-resilience/spec.md)

---

## 1. Contexto y Problema

Actualmente existen cuatro desconexiones entre el **Game Center** (`/game-center`) y el **Optimizador de Lineup (Tom Tango - The Book)** (`/bullpen?tab=lineups&subtab=optimizer`):

1. **El Optimizador ignora el lineup publicado del juego de hoy:**
   - `getDynamicBullpenAndLineups` (`src/lib/game-feed-service.ts`) únicamente consulta en Supabase juegos con estado finalizado o en curso (`Final`, `Completed`, `Completed Early`, `Game Over`, `Live`, `In Progress`), omitiendo encuentros en estado `Pre-Game`, `Warmup` o `Preview` donde MLB Stats API ya publicó el orden al bate oficial 1-9.
   - Adicionalmente, `TangoLineupOptimizerTab` (`src/components/bullpen/tango-lineup-optimizer-tab.tsx`) prioriza por defecto `"top_0"` (combinación histórica más frecuente) en lugar del lineup publicado para el juego de hoy.
2. **Desfase horario UTC vs. Venezuela (UTC-4) y ordenamiento de dobles juegos en Game Center:**
   - `getCaracasAvailableGames` (`src/lib/game-center-service.ts:172`) calcula `todayIso = new Date().toISOString().slice(0, 10)` en UTC en lugar de hora oficial de Venezuela (`America/Caracas`, UTC-4 vía `getVenezuelanToday()` en `src/lib/utils.ts`). Después de las 20:00 VET, el filtro avanza al día siguiente y puede priorizar un juego futuro sobre la jornada del día.
   - No existe desempate secundario por `gameNumber` ni marca de doble cartelera en `GameCenterAvailableGame`.
   - `formatBatters` únicamente lee `boxTeam?.batters`, sin respaldo desde `boxTeam?.battingOrder` ni desde `schedule?hydrate=lineups` (`lineups.homePlayers` / `awayPlayers`), y tampoco extrae `batSide.code` ni `obp`/`slg` de temporada.
3. **Resolución sintética prematura de estadísticas en el Optimizador:**
   - `resolvePlayerStats` (`src/lib/tango-lineup-engine.ts`) únicamente consulta el mapa estático `LEONES_REAL_STATS_MAP` (24 peloteros). Para cualquier jugador nuevo, refuerzo, importado o rival fuera de esa lista, genera estadísticas sintéticas según el turno al bate, aun cuando existen estadísticas reales de temporada en Supabase (`batting_stats` vía `getBattingStats`) y en el feed de MLB (`seasonStats.batting` + `gameData.players["ID"+id].batSide.code`).
4. **Ausencia de acceso directo desde Game Center y caché lenta en Pre-Juego:**
   - `BoxscoreLineupsTab` (`src/components/game-center/boxscore-lineups-tab.tsx`) no ofrece un enlace directo para llevar un lineup 1-9 publicado al Optimizador (`/bullpen?tab=lineups&subtab=optimizer&gamePk=<gamePk>`), ni `BullpenView` lee parámetros de URL (`tab`, `subtab`, `gamePk`).
   - `/api/game-center` (`src/app/api/game-center/route.ts`) aplica `s-maxage=300` (5 minutos) a respuestas `Preview`, retrasando la visibilidad de lineups recién publicados antes del playball; además, `game-center-view.tsx` muestra el texto *"Encuentro concluido..."* cuando el estado es `"Preview"`.

---

## 2. Requerimientos Funcionales

### RF-01: Detección Horaria VET (UTC-4), Dobles Juegos y Parsing Resiliente de Lineups Pre-Juego (`game-center-service.ts`)
- Reemplazar `new Date().toISOString().slice(0, 10)` en `getCaracasAvailableGames` por `getVenezuelanToday().dateString` (`src/lib/utils.ts`).
- Soportar identificación y ordenamiento determinístico de dobles juegos en `GameCenterAvailableGame` añadiendo campos opcionales `gameNumber?: number`, `isDoubleHeader?: boolean` y ordenando juegos del mismo día por `isLive` primero, luego `date DESC`, y a igual fecha por `gameNumber DESC` (o `gameDate` timestamp descendente) para priorizar el juego activo o más reciente.
- Incluir `"Warmup"` dentro de `isPreview` en `getGameCenterData` (`["Scheduled", "Pre-Game", "Warmup"]`).
- En `formatBatters`, implementar cascada de extracción de alineación ofensiva:
  1. Primaria: `boxTeam?.batters` + `boxTeam?.players["ID"+id]` (comportamiento actual).
  2. Respaldo 1: si `boxTeam?.batters` está vacío o no contiene 9 titulares, construir desde `boxTeam?.battingOrder` (slots 1..9) usando `boxTeam?.players["ID"+id]` y `gameData.players["ID"+id]`.
  3. Respaldo 2: si el feed aún no incluye `batters` ni `battingOrder`, aceptar opcionalmente `schedule?hydrate=lineups` (`lineups.homePlayers` / `lineups.awayPlayers`) para juegos `Pre-Game` / `Warmup`.
- Extraer en `GameCenterBoxscoreBatter` (campos opcionales retrocompatibles):
  - `bats?: "R" | "L" | "S"` desde `gameData.players["ID"+id].batSide.code`.
  - `obp?: string` y `slg?: string` desde `seasonStats.batting.{obp, slg}`.

### RF-02: Exposición del Lineup Publicado de Hoy hacia `/bullpen` (`game-feed-service.ts`, `bullpen/page.tsx`, `api/bullpen/route.ts`)
- Extender `BullpenAndLineupsData["lineups"]` en `src/types/bullpen.ts` con campos opcionales retrocompatibles:
  - `todayLineup?: GameLineup | null`: alineación titular 1-9 publicada para la jornada de hoy (fecha VET) de Leones del Caracas (`LEONES_TEAM_ID = 695`), ya sea en estado `Preview` (`Pre-Game` / `Warmup`), `Live` o `Final` del día de hoy.
  - `todayLineupStatus?: TodayLineupStatus`: estado explícito de publicación de hoy (`hasGameToday`, `isPublished`, `gamePk`, `gameDate`, `opponent`, `status`, `detailedState`, `gameNumber`, `message`).
  - `requestedLineup?: GameLineup | null`: alineación 1-9 resuelta para un `gamePk` específico solicitado por query param (`?gamePk=...`), cuando dicho juego no forma parte del historial estándar (ej. un juego `Pre-Game` o una alineación desde Game Center).
  - `playerStatsMap?: Record<number, TangoPlayer>`: mapa de estadísticas reales de temporada indexado por `playerId`.
- **Integridad de métricas históricas:** Si el juego de hoy está en estado `Preview` (aún no disputado), `todayLineup` NO debe sumarse a `kpis.totalGames`, `playerImpacts` ni al récord W-L de `topFrequentLineups`.
- **Doble cartelera hoy:** Si Leones disputa doble juego en la fecha VET de hoy, priorizar el juego `Live` con lineup publicado; si ninguno está `Live`, elegir el juego de hoy con lineup 1-9 publicado de mayor `gameNumber` (o el Juego 1 si solo ese ha publicado lineup).

### RF-03: Selección por Defecto en el Optimizador y Fallback con Aviso en Español (`tango-lineup-optimizer-tab.tsx`)
- Cuando `todayLineup` está disponible con 9 titulares (`todayLineup.starters.length >= 9`) y no hay un `gamePk` explícito en URL:
  - `TangoLineupOptimizerTab` selecciona por defecto `"today"` (el lineup publicado de hoy).
  - En el selector `<select>`, mostrar un grupo destacado al inicio: **"Lineup Publicado de Hoy"** con fecha, rival, estatus (`PRE-JUEGO`, `EN VIVO` o `FINAL`) y número de juego si es doble cartelera.
- Cuando hoy no hay partido (`!todayLineupStatus?.hasGameToday`) o el partido está `Scheduled` / `Preview` sin orden al bate 1-9 publicado (`!todayLineupStatus?.isPublished`):
  - Seleccionar automáticamente `"top_0"` (o `"game_0"` si no hay combinaciones frecuentes).
  - Renderizar un badge/aviso claro en español informando el motivo del respaldo:
    - Si hay juego hoy sin lineup publicado: *"Lineup de hoy aún no publicado ({opponent}) — mostrando alineación más frecuente"*.
    - Si no hay juego hoy: *"Sin juego programado para hoy — mostrando alineación más frecuente"*.

### RF-04: Enriquecimiento con Estadísticas Reales de Temporada (`tango-lineup-engine.ts` + `game-feed-service.ts`)
- En `resolvePlayerStats(name, position, playerId, defaultOrder, realStatsLookup?)`:
  - Mantener la firma retrocompatible agregando `realStatsLookup?: Record<number, TangoPlayer>` como 5to parámetro opcional.
  - Orden estricto de resolución (primero datos reales, sintético solo como último recurso):
    1. **Estadísticas reales de temporada desde Supabase (`batting_stats`):** Consultar `getBattingStats(season, "R", teamId, 250, 0)` y calcular `woba` y `wrcPlus` reutilizando `computeWoba` y `computeWrcPlus` de `src/lib/matchup-engine.ts` (`iso = slg - avg`), combinando con `bats` (`batSide.code`) del feed MLB o de `LEONES_REAL_STATS_MAP` si está disponible. Exigir muestra mínima válida (`ab + walks > 0` o `plateAppearances > 0`).
    2. **Estadísticas reales desde MLB `feed/live` (`seasonStats.batting`):** Para jugadores de refuerzo, recién debutados o rivales sin fila en Supabase aún, calcular `avg`, `obp`, `slg`, `iso`, `woba` (`computeWoba`), `wrcPlus` (`computeWrcPlus`) y `bats` (`gameData.players["ID"+id].batSide.code`) directamente desde el feed si `atBats + baseOnBalls > 0`.
    3. **Mapa canónico `LEONES_REAL_STATS_MAP`:** Respaldo histórico auditado cuando el jugador aún no registra turnos en la temporada activa ni en el feed.
    4. **Fallback sintético:** Únicamente cuando ninguna de las fuentes reales anteriores tiene datos ofensivos del jugador.
- Agregar campo opcional `statsSource?: "supabase" | "mlb" | "canonical_map" | "synthetic"` en `TangoPlayer` para trazabilidad y pruebas unitarias.

### RF-05: Acceso Directo desde Game Center y Deep-Linking en `/bullpen`
- En `BoxscoreLineupsTab` (`src/components/game-center/boxscore-lineups-tab.tsx`):
  - Recibir prop opcional `gamePk?: number` desde `GameCenterView`.
  - Cuando el equipo seleccionado en pantalla (por defecto Leones, o el equipo visitante/local mostrado) tenga al menos 9 titulares (`startersCount >= 9`, excluyendo lanzadores) y exista `gamePk`, renderizar un botón/enlace de acción **"Optimizar este Lineup"** (sin usar la palabra "sabermétrico/a") apuntando a:
    `/bullpen?tab=lineups&subtab=optimizer&gamePk=${gamePk}` (y `&teamId=${currentTeam.id}` cuando `currentTeam.id !== 695` o de forma explícita para soportar cualquier equipo del boxscore).
- En `/bullpen`:
  - `src/app/bullpen/page.tsx` lee `searchParams` (`tab`, `subtab`, `gamePk`, `teamId`) y resuelve `requestedLineup` + `playerStatsMap` si `gamePk` viene en la URL.
  - `BullpenView` inicializa `activeTab`, `lineupSubtab`, `currentTeamId` e `initialGamePk` a partir de los query params recibidos (validando valores permitidos).
  - `TangoLineupOptimizerTab` acepta `initialGamePk?: number` y, si coincide con `todayLineup?.gamePk`, `requestedLineup?.gamePk` o algún ítem de `gameLineups`, selecciona automáticamente ese juego al montar.

### RF-06: Frescura de Datos Pre-Juego y UX en Game Center (`api/game-center/route.ts` y `game-center-view.tsx`)
- En `src/app/api/game-center/route.ts`, diferenciar los headers `Cache-Control` según `data.status`:
  - `"Live"`: `public, s-maxage=5, stale-while-revalidate=2`
  - `"Preview"`: `public, s-maxage=30, stale-while-revalidate=15`
  - `"Final"`: `public, s-maxage=300, stale-while-revalidate=60`
- En `src/components/game-center/game-center-view.tsx`:
  - Corregir el mensaje de estado cuando `gameData.status === "Preview"` para no mostrar *"Encuentro concluido..."*, sino un mensaje preciso de pre-juego (ej. *"Encuentro programado. Las alineaciones oficiales se actualizan automáticamente previo al inicio del juego."*).
  - Habilitar polling ligero cada `30000` ms cuando `gameData.status === "Preview"` (en adición a `15000` ms cuando `"Live"`) para detectar publicación de lineups e inicio del encuentro.

---

## 3. Restricciones de Dominio y No Regresión

1. **Idioma 100% en español:** Todos los textos visibles en UI, badges, avisos y botones en español. Prohibido usar los términos *"sabermétrico"*, *"sabermétrica"* o *"sabermetría"* en títulos, subtítulos o botones de interfaz.
2. **Prohibición estricta de Statcast en LVBP:** No introducir métricas ni badges de Exit Velocity, Launch Angle, Barrels o Sprint Speed.
3. **Retrocompatibilidad estricta:** Todos los campos nuevos en interfaces existentes (`TangoPlayer`, `GameLineup`, `BullpenAndLineupsData`, `GameCenterAvailableGame`, `GameCenterBoxscoreBatter`, props de componentes) deben ser **opcionales** (`?`), evitando romper snapshots JSON históricos (`season < 2026`) o consumidores existentes.
4. **Esquemas de Supabase inmutables:** No alterar tablas ni columnas de Supabase.

---

## 4. Criterios de Aceptación (Definición de Terminado)

1. **CA-01 (Fecha VET y Dobles Juegos):** A las 23:30 UTC (19:30 VET) o 01:00 UTC (21:00 VET), `getCaracasAvailableGames` sigue usando la fecha de Caracas (`America/Caracas`) y ordena correctamente dobles carteleras (`gameNumber DESC` a igual fecha).
2. **CA-02 (Lineup Pre-Juego en Game Center y Optimizador):** Cuando MLB Stats API publica el lineup de Leones en un juego `Pre-Game` o `Warmup`, `getGameCenterData` y `getDynamicBullpenAndLineups` devuelven los 9 titulares (con respaldo desde `battingOrder` y `schedule?hydrate=lineups`), y `/bullpen?tab=lineups&subtab=optimizer` lo selecciona por defecto como `"today"`.
3. **CA-03 (Fallback sin Lineup Publicado):** Si hoy no hay juego o el juego de hoy está en `Scheduled` sin orden al bate de 9 jugadores, el Optimizador cae en `"top_0"` (o `"game_0"`) y muestra el aviso claro en español indicando que el lineup de hoy aún no ha sido publicado.
4. **CA-04 (Estadísticas Reales Sin Sintéticos Prematuros):** Todo bateador con estadísticas de temporada en Supabase (`batting_stats`) o en MLB `feed/live` (`seasonStats.batting` + `batSide.code`) se resuelve con `avg`, `obp`, `slg`, `iso`, `woba`, `wrcPlus` y `bats` reales antes de consultar `LEONES_REAL_STATS_MAP` o el fallback sintético.
5. **CA-05 (Atajo Directo Game Center → Optimizador):** En `BoxscoreLineupsTab`, con 9 titulares presentes, el botón **"Optimizar este Lineup"** navega a `/bullpen?tab=lineups&subtab=optimizer&gamePk=<gamePk>` y abre el Optimizador cargado exactamente con la alineación de ese encuentro.
6. **CA-06 (Caché y Preview UX):** `/api/game-center` responde con `s-maxage=30` en estado `Preview` y `GameCenterView` muestra el texto correcto de pre-juego (no *"Encuentro concluido"*).
7. **CA-07 (Verificación Técnica):** Pruebas unitarias en `test/` pasando al 100%, `npx tsc --noEmit` sin errores y `npm run build` exitoso.
