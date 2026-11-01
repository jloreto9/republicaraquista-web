# Bug Fix: Splits Inventando Cantidad de Juegos y Jugadores Inactivos (Bateadores y Lanzadores)

- **Slug**: splits-fake-games-players
- **Assessed**: `.specify/bugs/splits-fake-games-players/assessment.md`
- **Fixed**: 2026-10-31T22:31:30-04:00
- **Approach**: Preferred (eliminación integral de las 6 causas raíz en la fuente de verdad)

## Summary of Change
Se eliminaron por completo los jugadores hardcodeados inactivos, los fallbacks silenciosos a temporadas anteriores (`2025`, `2024`), la fuga de estadísticas de Grandes Ligas (`sportId=1`), los generadores sintéticos con multiplicadores proporcionales (`scaleBatterRow` / `scalePitcherRow`) y el conteo erróneo de filas de banca/bullpen sin acción (`0 PA` / `0.0 IP`) como juegos disputados. Ahora el módulo de Splits opera 100% con datos oficiales verificados de la temporada activa de la LVBP (`sportId=17&leagueId=135` + apariciones reales en Supabase).

## Files Modified
- `src/lib/supabase.ts` — Exportación de predicados canónicos `hasBatterAppearance`, `hasPitcherAppearance` e `isPlayedGameStatus`; filtrado de filas de banca/bullpen en cero y deduplicación por `(player_id, game_id)` en `getBattingStats` y `getPitchingStats` (ampliando `.limit(10000)` e incorporando `hbp` y `game_id`).
- `src/lib/player-splits-service.ts` —
  1. Filtrado estricto de participación real (`hasBatterAppearance` / `hasPitcherAppearance`) y deduplicación por `game_id` en `buildBatterSplitRow`, `buildPitcherSplitRow` y `getPlayerSplitsProfile`.
  2. Corrección de `fetchMlbStatSplits` para consultar exclusivamente `season` con `&sportId=17&leagueId=135` y validar `league.id === 135` / `LVBP_TEAM_IDS`, agregando clubes LVBP vía `combineMlbRawSplits` con aritmética exacta de outs (`parseInningsStringToOuts`).
  3. Eliminación total de `buildSituationalBatterRows`, `scaleBatterRow`, `buildSituationalPitcherRows`, `scalePitcherRow`, el fallback silencioso a `games.season = 2025` y el arreglo estático `featuredStars`.
  4. Construcción 100% dinámica de `getAllAvailablePlayersForSplits(season)` con subtítulos reales (`JJ`, `AVG`/`OPS` o `IP`/`K`/`ERA`), priorizando a los jugadores activos de Leones del Caracas por volumen real.
  5. Conexión de `lobStats` a `getDynamicSituationalData(season)` para Leones en campaña activa con match exacto por `batterId`.
- `src/components/stats/splits/player-splits-view.tsx` — Eliminación de IDs hardcodeados (`605612` Harold Castro, `660508`), auto-selección dinámica del primer jugador activo elegible según rol y temporada, optimización de carga de lista por `[season]` y etiqueta explícita `LVBP {season}-{yy}` en el encabezado.

## Tests Added or Updated
- `src/lib/__tests__/player-splits.test.ts` — Suite automatizada que valida predicados de participación real, aritmética de outs, exclusión de jugadores inactivos (`605612`, `682845`) e IDs falsos (`672580`), ausencia de lanzadores con `0 PA` en listas de bateo, retorno `null` para inactivos en `2026` y cuadre exacto `totalGames === Local + Visitante` contra Supabase y MLB Stats API LVBP.

## Deviations from Assessment
- Ninguna.

## Follow-ups
- Ejecutar validación integral (`speckit-bug-test`) y desplegar en `main`.
