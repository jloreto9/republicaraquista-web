# Bug Assessment: Detección y Clasificación Errónea de Juegos de Día (Diurnos)

## 1. Resumen del Síntoma
En el dashboard principal, KPIs (`KPISummary`), estadísticas de situación de Leones (`LeonesStatsTab`), tabla de últimos encuentros (`getRecentGames`) y splits por pelotero, los juegos diurnos (jugados antes de las 18:00 VET / UTC-4, como el partido del viernes 16 de octubre a las 2:00 PM o domingos a las 4:00 PM) se muestran con récord `0-0` o clasificados erróneamente como juegos nocturnos (`nightWins: 1, nightLosses: 4, dayWins: 0, dayLosses: 0`).

## 2. Pasos para Reproducir
1. Cargar la página principal (`/`).
2. Observar la tarjeta KPI **"Día vs Noche"**: muestra `0-0 / 1-4` (o `0-0 / 2-3`).
3. En la pestaña **"Estadísticas de Leones"**, en Estadísticas de Situación: `De día:` muestra `0-0`.
4. El viernes 16 de octubre de 2026, Leones disputó su compromiso ante Bravos de Margarita a las 2:00 PM (18:00 UTC), el cual fue un juego diurno pero se computó en el casillero de juegos de noche.

## 3. Causa Raíz Identificada
1. En [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts) (líneas 373 y 406) y en [`src/lib/leones-stats-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/leones-stats-service.ts) (línea 235), la condición que clasifica el juego es:
   ```ts
   const isDay = Boolean(g.is_day_game);
   ```
2. La tabla `games` de Supabase no contiene la columna `is_day_game` (las columnas existentes son `id`, `game_date`, `game_datetime`, `home_team_id`, `away_team_id`, `home_score`, `away_score`, `status`, `venue`, `season`, `game_type`).
3. Al no existir la columna `is_day_game`, `g.is_day_game` siempre retorna `undefined`, por lo que `Boolean(g.is_day_game)` evalúa a `false` en el 100% de los casos.
4. En contraste, la tabla sí almacena la hora exacta en `game_datetime` (ej. `'2026-10-16T18:00:00+00:00'` para las 2:00 PM hora Venezuela, UTC-4).

## 4. Severidad
- **Severidad**: `Media-Alta` (Afecta directamente la fidelidad estadística de los KPIs, desglose Día/Noche, tablas situacionales y de tendencias).
- **Riesgo**: Bajo (la corrección es puramente analítica y determinística).

## 5. Remediación Propuesta
1. Crear una función de utilidad canónica `isDayGame(gameDatetime?: string, isDayGameFlag?: boolean): boolean` en `src/lib/utils.ts` (o `src/lib/constants.ts`):
   - Si `isDayGameFlag !== undefined && isDayGameFlag !== null`: usar `Boolean(isDayGameFlag)`.
   - Si no, analizar `gameDatetime`: convertir a hora de Venezuela (UTC-4).
   - En la LVBP, un juego se considera **Diurno** si inicia antes de las **18:00 VET** (6:00 PM local, típicamente 1:00 PM, 2:00 PM o 4:00 PM). Los juegos que inician a las 18:00, 19:00 o posterior cuentan con iluminación artificial y son nocturnos.
2. Utilizar esta función unificada en:
   - `getSeasonKPIs` en `src/lib/supabase.ts`
   - `getRecentGames` en `src/lib/supabase.ts`
   - `getLeonesAdvancedStats` en `src/lib/leones-stats-service.ts`
   - `isNightGame` en `src/lib/player-splits-service.ts` (garantizando compatibilidad total).
3. Verificar con test reproducible antes y después del cambio.
