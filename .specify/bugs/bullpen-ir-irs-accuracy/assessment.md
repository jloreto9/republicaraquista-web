# Bug Assessment: Inexactitud, truncamiento y corrupción visual en Corredores Heredados (IR / IRS) del Bullpen

- **Slug**: bullpen-ir-irs-accuracy
- **Created**: 2026-11-13
- **Source**: user report + live data audit + end-to-end code investigation
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> Auditoría de precisión e integridad de los conteos, bitácora y visualización de Corredores Heredados (`IR` / `IRS` / `% IRS`) en `/bullpen` (`Relevistas (IR/IRS)`) para la temporada activa `2026-27` (`season=2026`).

Hallazgos reportados tras auditar los 24 juegos `Final` de Leones del Caracas (`teamId=695`) en 2026 (`2026-10-13` juego `870090` al `2026-11-12` juego `870005`):
- La bitácora `"Bitácora de Relevos con Corredores Heredados"` pierde 25 de las 39 salidas reales con `IR > 0` (`52` de `74` `IR` y `25` de `33` `IRS` ausentes) y se llena de salidas `0 IR / 0 IRS`.
- Todos los registros de la bitácora en `2026-27` muestran `Inn 1` sin importar en qué entrada ingresó el relevista.
- El gráfico comparativo dibuja barras azules de `10%` de ancho y la tabla muestra badges verdes `0.0%` para relevistas que no han heredado ningún corredor (`0 IR / 0 IRS`).
- Al cambiar de equipo en `2026-27`, la vista de Bullpen y Lineups continúa mostrando los datos de Leones del Caracas (`695`).

## Symptom

En `/bullpen` (pestaña `Relevistas (IR/IRS)`):
1. **Bitácora truncada y contaminada con `0 IR`:** Se muestran `50` filas donde `36` corresponden a relevos con `0 IR / 0 IRS` y solo `14` a salidas con `IR > 0` (hasta el `2026-10-31`), ocultando las otras `25` salidas reales con corredores heredados (`52/74 IR` y `25/33 IRS` omitidos).
2. **Inning de entrada falso (`Inn 1`):** Cada fila de la bitácora en `2026` renderiza `Inn 1`, independientemente del inning real en que relevó el lanzador.
3. **Contaminación visual en relevistas con `0 IR`:** Los `11` relevistas con `0 IR / 0 IRS` en 2026 aparecen en la tabla con badge verde `0.0%` (`irsPctNum <= 20`) y, si entran al Top 10 del gráfico, dibujan una barra azul mínima de `10%`.
4. **Selector de Equipo roto en `2026`:** Cambiar el selector `Equipo` (p. ej. a Magallanes, Cardenales, Tiburones, etc.) no consulta juegos ni estadísticas de ese equipo en `getDynamicBullpenAndLineups`; sigue mostrando `IR/IRS`, relevistas, bitácora y lineups históricos de Leones (`695`).
5. **Desincronización de temporada al montar:** Si `localStorage` (`globalSeason`) tiene una temporada distinta a `season` de SSR (p. ej. `2025`), el badge muestra `2025-26` mientras renderiza los datos SSR de `2026` sin disparar fetch.

## Reproduction

1. Abrir `/bullpen` en temporada `2026-27` (pestaña `Relevistas (IR/IRS)`).
2. Observar que la `"Bitácora de Relevos con Corredores Heredados"` muestra `50 Relevos Registrados`, todos etiquetados con `Inn 1`, y la mayoría con `0` en `Heredados (IR)` y `0` en `Anotaron (IRS)` (omitiendo salidas con `IR > 0` previas al `2026-10-31`).
3. Observar en `"Efectividad por Lanzador Relevista"` que relevistas con `0 IR` y `0 IRS` muestran badge verde `0.0%`.
4. Cambiar el selector `Equipo` a cualquier franquicia distinta de Leones del Caracas (`695`): los KPIs (`74 IR / 33 IRS / 44.6%`), la tabla y la bitácora siguen mostrando los de Leones del Caracas.
5. Abrir `/bullpen` teniendo `globalSeason=2025` en `localStorage`: el componente inicializa `currentSeason=2025` con `initialData` de `2026` sin ejecutar `handleSeasonOrTeamChange`.

## Suspected Code Paths

### 1. `src/lib/game-feed-service.ts` (`getLeonesPlayedGames` y `getDynamicBullpenAndLineups`)
- `src/lib/game-feed-service.ts:982` — `if (!isStarter && (ir > 0 || stats.gamesPitched > 0))` empuja a `bpRecords` todas las apariciones de relevo, incluyendo las `87` salidas con `0` corredores heredados (de `126` salidas totales en 2026). Al combinarse con el corte `.slice(0, 50)` en `bullpen.ts:189`, las salidas con `0 IR` desplazan `25` de `39` salidas reales con `IR > 0` (`52/74 IR` y `25/33 IRS` fuera de la bitácora) y contaminan la UI con filas `0 IR / 0 IRS` y badges verdes `0.0%`.
- `src/lib/game-feed-service.ts:991` — `bpRecords.push({ ..., inning: 0 })` hardcodea `inning: 0` en lugar de resolver el inning real de ingreso del relevista desde `liveData.plays.allPlays` (`126/126` salidas son resolubles al 100% vía `allPlays`). Como `bullpen.ts:193` evalúa `Number(b.inning || 1)`, el valor falsy `0` fuerza `Inn 1` en todas las entradas de 2026.
- `src/lib/game-feed-service.ts:933-1039` (y `88-98`, `166`) — `targetTeamId` (`937`) se ignora al obtener los feeds y construir los registros: `getSeasonLiveFeeds(season)` (`941` → `167`) llama a `getLeonesPlayedGames(season)` que hardcodea `.or("home_team_id.eq.695,away_team_id.eq.695")` (`96`); dentro del bucle se hardcodea `LEONES_TEAM_ID` en `isHome` (`955`), `bpRecords.push` (`team_id: LEONES_TEAM_ID`, `984`), `luRecords.push` (`team_id: LEONES_TEAM_ID` y `"Leones del Caracas"`, `1012, 1018-1019`) y al invocar `getBullpenAndLineups(season, LEONES_TEAM_ID, ...)` (`1035, 1039`). Cambiar de equipo en `2026` siempre devuelve `IR/IRS` de Leones (`695`).
- `src/lib/game-feed-service.ts:977` — `const isStarter = stats.gamesStarted > 0;` omite la guarda `pitchersList[0] === pId` (presente en `pitch-parser.ts:1035` y `bullpen-budget.ts:333`). Si un boxscore en vivo o reanudado omite `gamesStarted`, el abridor sería tratado como relevista.
- *(Contexto adicional de validación PBP)* `src/lib/game-feed-service.ts:978-979` lee `stats.inheritedRunners ?? 0` y `stats.inheritedRunnersScored ?? 0` directamente de `boxscore` sin inspección de `liveData.plays.allPlays`.

### 2. `src/lib/bullpen.ts` (`getBullpenAndLineups`)
- `src/lib/bullpen.ts:136-157` — `pitcherMap` usa `pName` como clave (`pitcherMap[pName]`, `144`) en lugar de `pId` (`pitcher_id`), arriesgando colisiones de homónimos o fragmentación de un mismo lanzador ante variaciones de acentos/formato.
- `src/lib/bullpen.ts:177` — `qualifiedRelievers` ordena por el porcentaje redondeado a 1 decimal `irsPctNum` (`a.irsPctNum - b.irsPctNum || b.ir - a.ir`) en lugar del ratio exacto `a.irs / a.ir - b.irs / b.ir` (y en `173`, `relievers.sort` también desempata por `irsPctNum`).
- `src/lib/bullpen.ts:189` — `bpRecords.slice(0, 50)` recorta las primeras `50` filas sin filtrar `ir > 0 || irs > 0` (`Number(b.inherited_runners || 0) > 0 || Number(b.inherited_scored || 0) > 0`), provocando la pérdida de `25/39` salidas con `IR > 0` cuando `bpRecords` contiene salidas `0 IR`.
- `src/lib/bullpen.ts:101-106` — Si `overrideData` llega con arreglos vacíos (`bullpen_records: []` y `lineup_records: []`), hace fallback silencioso a `SNAPSHOTS[season]`, donde `src/data/lvbp_season_2026.json` está congelado al `2026-10-14T23:02:49Z` (`finished_games: 4`, `total_bullpen_records: 11`, e incluso omite a Simon Leandro `814129` `Inn 1, 3/0` en el juego `870090`).

### 3. `src/components/bullpen/bullpen-view.tsx`, `src/app/bullpen/page.tsx` y `src/app/api/bullpen/route.ts`
- `src/components/bullpen/bullpen-view.tsx:354-355, 446` —
  - Línea `354`: `irWidth = Math.max(10, (r.ir / maxIr) * 100)` dibuja una barra azul de `10%` de ancho incluso cuando `r.ir === 0` (y sin acotar `irsWidth <= irWidth` en la línea `355` si ocurriese `r.irs > r.ir`).
  - Línea `446`: cuando `r.ir === 0`, `irsPctNum` es `0.0` (`bullpen.ts:160`), por lo que `r.irsPctNum <= 20` renderiza un badge verde `0.0%` en lugar de un estado neutro (`N/A` / `"—"`).
- `src/components/bullpen/bullpen-view.tsx:358, 420, 422-423` — Tanto el gráfico (`358`) como la tabla (`420`) usan `key={r.pitcherName}` en vez de `r.pitcherId` como key de React, y `<Link href="/pitching">` (`423`) descarta `pitcherId` (no enlaza al perfil específico del lanzador).
- `src/components/bullpen/bullpen-view.tsx:60, 108-143` — Desincronización de temporada al montar: `page.tsx:66-78` siempre renderiza `activeSeason` (`2026`), pero `BullpenView` inicializa `currentSeason` con `globalSeason || season` (`60`). Si `globalSeason` en `localStorage` difiere de `season` (p. ej. `2025`), `globalSeason !== currentSeason` (`109`) es falso y `currentSeason >= 2026` (`136`) también es falso, mostrando datos SSR de `2026` bajo la etiqueta `2025-26` sin refetch. Además, `setGlobalSeason` (`87`) no soporta `2022..2024` según `season-context.tsx`.
- `src/app/bullpen/page.tsx:68` vs `src/app/api/bullpen/route.ts:30` — Inconsistencia en el umbral dinámico de temporada: `page.tsx:68` usa `activeSeason >= 2026`, mientras que `api/bullpen/route.ts:30` usa `season >= activeSeason`.

## Root Cause Hypothesis

**Confianza: alta (100%, demostrada mediante auditoría en vivo contra MLB Stats API y trazado completo de código).**

**La fuente oficial MLB Stats API tiene 0 discrepancias:** Al auditar los **24 juegos `Final`** de Leones del Caracas (`695`) en `2026` (`870090` al `870005`), existe coincidencia exacta (**`74 IR / 33 IRS`, `44.6%`**, distribuidos en **23 relevistas**, **39** salidas con `IR > 0` y **87** salidas con `IR = 0`, total **126** apariciones de relevo) entre:
1. `boxscore.teams.{home,away}.players["ID"+id].stats.pitching` (`inheritedRunners`, `inheritedRunnersScored`),
2. Play-by-Play `liveData.plays.allPlays` (estado de bases por `matchup.postOnFirst/Second/Third` + `responsiblePitcher.id`, contemplando sustituciones `PR` sin doble conteo y corredor automático de extrainning en el juego `870048` Inn 10 con `IR=0`), y
3. `people?hydrate=stats(group=[pitching],type=[season],sportId=17,season=2026)`.

Además, en MLB Stats API hay **0** casos de `IRS > IR`, **0** abridores (`pitchers[0]`) con `gamesStarted !== 1` o `IR > 0`, **0** relevistas con `gamesStarted > 0`, y `allPlays` resuelve el inning de entrada exacto para **126/126 (100%)** apariciones de relevo.

Esto prueba que **el bug es 100% interno al pipeline de agregación, filtrado y renderizado de la aplicación** (`game-feed-service.ts`, `bullpen.ts`, `bullpen-view.tsx`, `page.tsx` y `api/bullpen/route.ts`), causado por:
1. Emisión indiscriminada de `87` relevos con `0 IR` + ausencia de filtro `ir > 0 || irs > 0` antes del `.slice(0, 50)`.
2. Hardcodeo de `inning: 0` en lugar de extraer el inning de entrada desde `allPlays`.
3. Hardcodeo de `LEONES_TEAM_ID (695)` en la consulta de juegos y construcción de `bpRecords`/`luRecords`/`getBullpenAndLineups`.
4. Agregación y keys de React por `pitcherName` en vez de `pitcherId`, ranking por porcentaje redondeado y falta de guarda `pitchersList[0] === pId`.
5. Fallos de renderizado para `r.ir === 0` (barra mínima `10%`, badge verde `0.0%`, `irsWidth` sin acotar) y desincronización de temporada SSR vs `localStorage` + umbral `>= 2026` vs `>= activeSeason`.

## Proposed Remediation

**Preferred**:
1. **`src/lib/game-feed-service.ts`**:
   - Reemplazar/generalizar `getLeonesPlayedGames(season)` → `getTeamPlayedGames(season, targetTeamId)` (manteniendo alias compatible si otros callers lo usan) y `getSeasonLiveFeeds(season, targetTeamId)` para consultar los juegos reales de `targetTeamId`.
   - Dentro de `getDynamicBullpenAndLineups`: usar `targetTeamId` en `isHome`, `teamBox`/`oppBox`, `bpRecords`, `luRecords` y al invocar `getBullpenAndLineups(season, targetTeamId, ...)`.
   - Usar `const isStarter = pitchersList[0] === pId || Number(stats.gamesStarted || 0) > 0;` (`977`).
   - Resolver el inning real de entrada de cada relevista desde `feed?.liveData?.plays?.allPlays` (primer play donde `matchup.pitcher?.id === pId`, con fallback a `1` solo si no aparece en `allPlays`).
   - Emitir en `bpRecords` únicamente apariciones con `ir > 0 || irs > 0` (o separar conteo de `appearances` si se requiere mostrar relevistas con `0 IR`, asegurando que `logs` y `relievers` no pierdan salidas ni muestren `0 IR` en la bitácora — alineado con `lvbp_season_2022..2025.json` donde existen `0` registros con `inherited_runners === 0`, o filtrando en `bullpen.ts` según contrato).
2. **`src/lib/bullpen.ts`**:
   - Indexar `pitcherMap` por `pId > 0 ? String(pId) : pName` (`136-157`) conservando `pitcherId` y `pitcherName`.
   - Ordenar `qualifiedRelievers` (y desempate de `relievers`) por el ratio exacto `a.irs / a.ir - b.irs / b.ir` en lugar de `irsPctNum` redondeado (`173, 177`).
   - Filtrar `bpRecords.filter((b) => Number(b.inherited_runners || 0) > 0 || Number(b.inherited_scored || 0) > 0)` antes de `.slice(0, 50)` en `logs` (`189`).
   - Cuando se pasa `overrideData` explícito (desde `getDynamicBullpenAndLineups`), no hacer fallback silencioso al snapshot congelado `SNAPSHOTS[season]` si el arreglo viene vacío por ausencia real de registros de un equipo (`101-106`).
3. **`src/components/bullpen/bullpen-view.tsx`, `src/app/bullpen/page.tsx` y `src/app/api/bullpen/route.ts`**:
   - En el gráfico (`352-383`): ocultar relevistas con `r.ir === 0` o asignar `irWidth = r.ir > 0 ? Math.max(10, (r.ir / maxIr) * 100) : 0` y `irsWidth = r.ir > 0 ? Math.min(irWidth, (r.irs / r.ir) * irWidth) : 0`.
   - En la tabla (`446`): cuando `r.ir === 0`, mostrar badge neutro (`—` / `N/A`) en lugar de badge verde `0.0%`.
   - Usar `key={r.pitcherId || r.pitcherName}` en gráfico (`358`) y tabla (`420`), y pasar `?pitcherId=${r.pitcherId}` (cuando `r.pitcherId > 0`) en `<Link href=...>` (`423`).
   - Corregir desincronización de montaje en `BullpenView` (`60, 108-143`): inicializar `currentSeason` con `season` (SSR) o disparar `handleSeasonOrTeamChange` en el efecto inicial cuando `globalSeason && globalSeason !== season` (y sincronizar `initialTeamId`).
   - Unificar el umbral dinámico entre `src/app/bullpen/page.tsx:68` y `src/app/api/bullpen/route.ts:30` usando el mismo criterio (`>= activeSeason` o `>= 2026` consistente con el entorno).

**Files likely to change**:
- `src/lib/game-feed-service.ts`
- `src/lib/bullpen.ts`
- `src/components/bullpen/bullpen-view.tsx`
- `src/app/bullpen/page.tsx`
- `src/app/api/bullpen/route.ts`
- `src/lib/__tests__/bullpen-ir-irs.test.ts` (nuevo test unitario/integración)

**Tests to add or update**:
- `src/lib/__tests__/bullpen-ir-irs.test.ts`:
  1. Pruebas unitarias puras para `getBullpenAndLineups`: filtrado de `0`-IR en `logs` antes del `.slice(0, 50)`, preservación de las `39` salidas `IR > 0` sobre `126` totales, resolución por `pitcherId` (sin colisión de nombres), ordenamiento de `bestReliever` por ratio exacto `irs / ir`, y no-fallback a `SNAPSHOTS` cuando `overrideData` se pasa explícitamente vacío.
  2. Prueba de resolución de inning de entrada desde `allPlays`, guarda `pitchersList[0] === pId` en `isStarter`, y soporte multi-equipo (`targetTeamId !== 695`).
  3. Prueba de integración contra feeds de MLB Stats API (`season=2026`, Leones `695`) validando `74 IR / 33 IRS`, `0` entradas con `inning <= 1` erróneo generalizado, y paridad exacta con `boxscore` y `people?hydrate=stats`.

## Risks & Considerations

- **Contrato de `appearances` / relevistas con `0 IR`:** Si `game-feed-service.ts` deja de emitir registros `0 IR` en `bpRecords`, los relevistas con `0 IR` ya no aparecerán en la tabla `Efectividad por Lanzador Relevista` (igual que en `lvbp_season_2022..2025.json`, donde solo figuran salidas con `inherited_runners > 0`). Si se desea conservar sus apariciones totales en la tabla manteniendo la bitácora limpia, el filtrado `ir > 0 || irs > 0` debe aplicarse en `logs` (`bullpen.ts:189`) y en el gráfico/badge UI (`r.ir === 0`), decidiendo explícitamente si `appearances` representa salidas totales de relevo o salidas con herencia.
- **Compatibilidad de `getLeonesPlayedGames`:** Otros consumidores (`situacional`, `lineups`, etc.) llaman a `getLeonesPlayedGames(season)` o `getSeasonLiveFeeds(season)` sin `teamId`; mantener `teamId = LEONES_TEAM_ID` como parámetro por defecto preserva el 100% de compatibilidad hacia atrás.
- **Sin cambios de esquema:** No se requieren migraciones en Supabase (`bullpen_records` no existe en `supabase/migrations/*.sql`) ni dependencias nuevas.

## Open Questions

- Ninguna (`0` ambigüedades bloqueantes). Nota operativa menor a definir en implementación: confirmar si en la tabla `"Efectividad por Lanzador Relevista"` deben mostrarse únicamente relevistas con `IR > 0` (paridad con snapshots `2022–2025`) o todos los relevistas (`126` salidas) ocultándolos del gráfico y mostrando `—` en `% IRS`.
