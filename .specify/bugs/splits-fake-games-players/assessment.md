# Bug Assessment: Splits Inventando Cantidad de Juegos y Jugadores Inactivos (Bateadores y Lanzadores)

- **Slug**: splits-fake-games-players
- **Created**: 2026-10-31T22:23:00-04:00
- **Source**: "Por otro lado, en la pagina de los splits, esta inventando la cantidad de juegos, esta inventando jugadores que no hahn jugado en la temporada, tanto en los bateadores como en los lanzadores /speckit-master"
- **Verdict**: valid
- **Severity**: critical

## Report (verbatim or summarized)
El usuario reporta que en la página de Splits (`/individuales?tab=splits`), el sistema está inventando la cantidad de juegos disputados (`Juegos` / `J`) y mostrando jugadores que no han jugado en la temporada activa (`2026-27`), afectando tanto a bateadores como a lanzadores.

## Symptom
1. **Jugadores inactivos e IDs fantasma en el selector y por defecto**:
   - Al abrir Splits en Bateadores aparece preseleccionado **Harold Castro (`605612`)**, quien tiene **0 juegos** en la temporada LVBP 2026-27.
   - En Lanzadores aparece listado **Rito Lugo (`682845`)** con **0 juegos** en 2026-27.
   - **Aldrem Corredor** aparece duplicado con un ID falso (`672580`) y subtítulo hardcodeado (`".295 AVG • 7 HR • .840 OPS"`), mientras su ID real en LVBP es `625506`.
   - Jugadores activos como **Norwith Gudiño (`660508`)**, **José Rondón (`602922`)** y **Víctor Bericoto (`682674`)** muestran subtítulos estáticos de otra campaña que bloquean sus estadísticas reales de 2026-27.
   - Además, los lanzadores aparecen en `batting_stats` con `0 PA` pero `14` filas de lineup/roster.
2. **Conteo de juegos (`J` / `Juegos`) inflado o inventado**:
   - **Banca y bullpen sin participación contados como juegos jugados**: Supabase almacena el roster del juego en `batting_stats` y `pitching_stats` con filas en cero (`ab=0, bb=0, hbp=0, sf=0, sh=0, r=0, sb=0, cs=0` o `ip_decimal=0, h=0, r=0, er=0, bb=0, so=0`). Como `player-splits-service.ts` y `supabase.ts` hacían `games = rows.length` sin filtrar participación real, **Sandy Gastón (`682624`)** mostraba `14 Juegos` en vez de sus `7` relevos reales, **Gabriel Lino (`593449`)** `14 Juegos` en vez de `1`, y **Kenedy Corona (`682657`)** `14 Juegos` en vez de `2`.
   - **Fuga de estadísticas de Grandes Ligas (`sportId=1`) y temporadas pasadas (`2025`, `2024`)**: `fetchMlbStatSplits` omitía `&sportId=17&leagueId=135` y probaba `[2026, 2025, 2024]`, trayendo 100+ juegos de MLB para peloteros con experiencia en Grandes Ligas o 50+ juegos de LVBP 2025-26 cuando no habían debutado en 2026-27.
   - **Fallback silencioso a `season = 2025` en Supabase**: `getPlayerSplitsProfile` consultaba `games.season = 2025` cuando un jugador tenía 0 juegos en `2026`, etiquetando esos números como temporada `2026`.
   - **Generador sintético con multiplicadores arbitrarios**: `buildSituationalBatterRows` / `scaleBatterRow` y `buildSituationalPitcherRows` / `scalePitcherRow` inventaban juegos (`Math.round(base.games * share)`), turnos, hits, entradas y efectividad cuando `mlbSplits` venía vacío.
   - **Snapshot estático de Día Inaugural en `lobStats`**: `getPlayerSplitsProfile` leía `getLeonesSituationalData(2026)` (snapshot fijo de 1 solo juego en `situational-engine.ts`) en vez del tracker dinámico real.

## Reproduction
1. Navegar a `/individuales` y abrir la pestaña `Splits` en temporada `2026-27`.
2. Observar que carga por defecto `Harold Castro` (0 juegos en LVBP 2026-27) mostrando decenas de juegos de una temporada anterior / MLB.
3. Desplegar el buscador de bateadores o lanzadores: aparecen `Harold Castro`, `Rito Lugo` (0 JJ en 2026-27) y dos entradas para `Aldrem Corredor` (`672580` falso y `625506` real).
4. Seleccionar a `Sandy Gastón` (`682624`) o `Gabriel Lino` (`593449`): el conteo de juegos y los splits contra rivales incluyen partidos donde estuvieron en el bullpen/banca con `0.0 IP` o `0 PA`, o bien filas sintéticas escaladas.

## Suspected Code Paths
- `src/lib/player-splits-service.ts:247-353` — `buildBatterSplitRow` y `buildPitcherSplitRow` cuentan `rows.length` sin validar aparición real ni deduplicar `game_id`.
- `src/lib/player-splits-service.ts:358-544` — `buildSituationalBatterRows`, `scaleBatterRow`, `scalePitcherRow`, `buildSituationalPitcherRows` fabrican splits y conteos de juegos sintéticos.
- `src/lib/player-splits-service.ts:549-591` — `fetchMlbStatSplits` omite `&sportId=17&leagueId=135` y hace fallback silencioso a `[2025, 2024]`; `getBestSplitForCode` no agrega cuando un jugador vistió 2 uniformes LVBP en la misma campaña.
- `src/lib/player-splits-service.ts:734-745` y `1036-1047` — Fallback silencioso a `games.season = 2025` cuando el jugador tiene 0 juegos en `2026`.
- `src/lib/player-splits-service.ts:928-935` y `1235-1243` — Inyección de splits sintéticos cuando `mlbSplits` está vacío.
- `src/lib/player-splits-service.ts:976-979` — Uso de `getLeonesSituationalData(season)` estático (snapshot de 1 juego en 2026) y match laxo por `includes`.
- `src/lib/player-splits-service.ts:1345-1537` — `featuredStars` hardcodeado con jugadores inactivos (`605612`, `682845`), ID erróneo (`672580`) y subtítulos inventados.
- `src/components/stats/splits/player-splits-view.tsx:39-41, 69-75, 145-146, 161-162` — IDs hardcodeados (`605612`, `660508`) y no re-selección al cambiar temporada o si el jugador seleccionado no pertenece a la lista activa.
- `src/lib/supabase.ts:563-608, 742-773` — `getBattingStats` y `getPitchingStats` incrementan `gamesCount` / `appearances` en filas de roster con `0 PA` / `0.0 IP` sin actividad.

## Root Cause Hypothesis
Combinación confirmada empíricamente de **6 causas raíz** en `player-splits-service.ts`, `player-splits-view.tsx` y `supabase.ts`:
1. Inyección estática de `featuredStars` y defaults hardcodeados (`605612`) sin verificar participación en `season`.
2. Fallback silencioso a `games.season = 2025` dentro de `getPlayerSplitsProfile` cuando `season >= 2026` devuelve 0 filas.
3. Omisión de `&sportId=17&leagueId=135` y bucle `seasonsToTry = [season, season - 1, 2024]` en `fetchMlbStatSplits`, mezclando MLB (`sportId=1`) y años previos con LVBP.
4. Funciones sintéticas `scaleBatterRow` / `scalePitcherRow` que inventan juegos y estadísticas proporcionales.
5. Conteo crudo `rows.length` sobre `batting_stats` y `pitching_stats` sin filtrar apariciones reales (`hasBatterAppearance` / `hasPitcherAppearance`), inflando `Juegos` con días de banca o bullpen sin ver acción.
6. Lectura de `getLeonesSituationalData(2026)` estático para `lobStats`.

## Proposed Remediation

**Preferred**:
1. **Filtrado estricto de participación real y deduplicación por `game_id`** (`hasBatterAppearance` y `hasPitcherAppearance` exportados y reutilizados en `player-splits-service.ts` y `supabase.ts`):
   - Bateador vio acción si `(ab + bb + hbp + sf + sh) > 0 || r > 0 || sb > 0 || cs > 0`.
   - Lanzador vio acción si `ip_decimal > 0 || h > 0 || r > 0 || er > 0 || bb > 0 || hbp > 0 || so > 0 || hr > 0`.
   - Filtrar juegos no disputados (`Scheduled`, `Postponed`, `Cancelled`) y deduplicar por `game_id`.
2. **Consulta oficial LVBP exacta en `fetchMlbStatSplits`**:
   - Consultar únicamente la temporada solicitada (`season`) con `&sportId=17&leagueId=135` (y filtro defensivo `league.id === 135` / `LVBP_TEAM_IDS`), agregando correctamente los conteos si el pelotero jugó con más de un club LVBP en el mismo torneo.
   - Reconciliar `totalRow` y `totalGames` con la partición oficial `h + a` de MLB LVBP cuando tenga al menos tantos juegos como Supabase (cubriendo juegos recién finalizados aún no sincronizados por cron) y obteniendo `gamesStarted` (`JI`) real desde `sp`/`h+a`.
3. **Eliminar todo dato inventado y fallbacks engañosos**:
   - Borrar `buildSituationalBatterRows`, `scaleBatterRow`, `buildSituationalPitcherRows`, `scalePitcherRow`, el fallback silencioso a `2025`, y el arreglo `featuredStars`.
   - Construir `getAllAvailablePlayersForSplits(season)` 100% desde jugadores con apariciones reales en `season`, ordenando primero a Leones del Caracas (`teamId === 695`) por volumen (`PA` / `IP` descendente) y luego al resto de la LVBP.
   - Para `lobStats`, usar `getDynamicSituationalData(season)` cuando `teamId === 695` y `season >= 2026` (con match exacto `b.batterId === playerId`), evitando el snapshot estático del Juego 1.
4. **Actualizar `player-splits-view.tsx`**:
   - Eliminar IDs hardcodeados (`605612`, `660508`) y seleccionar dinámicamente el primer jugador elegible de `playersList` para el `playerType` y `season` activos cuando no venga `initialPlayerId` o cuando el seleccionado no exista en la nueva temporada.

**Files likely to change**:
- `src/lib/player-splits-service.ts`
- `src/components/stats/splits/player-splits-view.tsx`
- `src/lib/supabase.ts`
- `src/lib/__tests__/player-splits.test.ts` (nuevo test automatizado)

**Tests to add or update**:
- `src/lib/__tests__/player-splits.test.ts`: validar predicados de participación real, ausencia total de jugadores inactivos (`605612`, `682845`, `672580`) y de lanzadores con `0 PA` en `getAllAvailablePlayersForSplits(2026)`, retorno `null` para inactivos en `2026`, conteo exacto de juegos reales en `getPlayerSplitsProfile` (bateador y lanzador), y cero splits sintéticos.

## Risks & Considerations
- Mantener intactos los contratos TypeScript de `PlayerSplitsProfile`, `PlayerSplitRow`, `PitcherSplitRow` y `PlayerSelectorItem` para cero regresiones en `SplitTableGroup` e `IndividualesView`.
- En `getPitchingStats` (`supabase.ts`), incluir `hbp` en el `select` (columna existente verificada en `pitching_stats`) para detectar relevistas que enfrentaron a 1 bateador por golpeado con `0.0 IP`.

## Open Questions
- Ninguna. Las 6 causas raíz fueron aisladas y comprobadas contra Supabase y MLB Stats API en vivo.
