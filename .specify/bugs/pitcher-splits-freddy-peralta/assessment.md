# Bug Assessment: Pitcher Splits Fallback & Ineligible MLB Players (Freddy Peralta)

- **Slug**: pitcher-splits-freddy-peralta
- **Created**: 2026-10-23T09:50:48-04:00
- **Source**: "Lo de los splits de los lanzadores en RepubliCaraquistApp en Vercel no esta funcionando, de hecho se trajo a Freddy Peralta, un lanzador que nunca jugara en LVBP /speckit-master"
- **Verdict**: valid
- **Severity**: critical

## Report (verbatim or summarized)
El usuario reporta que en la versión desplegada en Vercel, la funcionalidad de splits individuales de lanzadores no está funcionando y muestra a Freddy Peralta (lanzador dominicano de Grandes Ligas que nunca jugará en la LVBP con Leones del Caracas).

## Symptom
1. Al acceder a la pestaña de Splits o conmutar a "Lanzadores", la aplicación muestra por defecto a Freddy Peralta (ID MLB: 642547) con logo de Leones del Caracas y estadísticas de MLB de los Milwaukee Brewers.
2. Al seleccionar cualquier lanzador real de la LVBP (por ejemplo, Norwith Gudiño, Erick Leal, Rito Lugo, etc.), la vista de splits falla mostrando un mensaje de error: "No se encontraron datos de splits para el jugador seleccionado" (respuesta HTTP 404 de `/api/stats/player-splits`).

## Reproduction
1. Abrir la aplicación web en Vercel o entorno local en `/individuales?tab=splits` o `/situacional`.
2. Hacer clic en el conmutador "Lanzadores".
3. Se observa que el jugador por defecto seleccionado es `Freddy Peralta` (CAR / MLB).
4. Al desplegar el selector de jugadores e intentar elegir a cualquier lanzador real de los Leones del Caracas o de la liga, la API responde con 404 Not Found y la UI muestra la pantalla vacía de error.

## Suspected Code Paths
- `republicaraquista-web/src/lib/player-splits-service.ts:1008-1019` — Consulta a Supabase `pitching_stats` con columna inexistente `games_started` causando error PostgreSQL `42703`.
- `republicaraquista-web/src/lib/player-splits-service.ts:1321-1342` — Hardcoding de `Freddy Peralta` (642547) y `Junior Caminero` (691406) en `featuredStars` bajo la franquicia Leones del Caracas (`teamId: 695`).
- `republicaraquista-web/src/lib/player-splits-service.ts:1405-1416` — Límites artificiales muy bajos (`.limit(200)`) en `getAllAvailablePlayersForSplits`, excluyendo al 90% de los lanzadores de la liga.
- `republicaraquista-web/src/components/stats/splits/player-splits-view.tsx:40` — `selectedPlayerId` inicializa con fallback `642547` (Freddy Peralta) para pitchers y `691406` (Junior Caminero) para bateadores.

## Root Cause Hypothesis
**Causa Raíz Principal (Falla de Splits)**:
En `player-splits-service.ts` (línea 1011), la consulta SQL a la tabla `pitching_stats` en Supabase incluye el campo `games_started`. En el esquema real de Supabase, dicha columna no existe (solo existen `id, game_id, player_id, team_id, ip_string, ip_decimal, h, r, er, bb, so, hr, hbp, wp, bk, ibb, era, whip, game_score, created_at`). Por ende, Supabase rechaza la petición con error PostgreSQL `42703` (`column pitching_stats.games_started does not exist`). Esto provoca que `validRows` quede vacío para **todos** los lanzadores reales de la LVBP.

**Causa Raíz Secundaria (Aparición de Freddy Peralta)**:
Dado que `validRows` queda vacío y los lanzadores de la LVBP no tienen splits en `statsapi.mlb.com`, la función devuelve `null` (404) para todos los pitchers de la LVBP. Sin embargo, en `featuredStars` y en el estado inicial de `player-splits-view.tsx`, alguien colocó hardcodeado a `Freddy Peralta` (642547) asignado a Leones del Caracas (`teamId: 695`). Dado que Freddy Peralta sí es lanzador abridor activo en MLB con Milwaukee Brewers, la llamada de fallback a `statsapi.mlb.com/api/v1/people/642547/stats?stats=statSplits` devuelve sus estadísticas de Grandes Ligas, haciendo que fuese el **único** lanzador con datos que no fallaba en el endpoint, mostrándolo erróneamente con la camiseta de los Leones del Caracas.

## Proposed Remediation

**Preferred**:
1. **Corregir la consulta de `pitching_stats` en `player-splits-service.ts`**:
   Eliminar `games_started` del `.select(...)`. Preservar `games_started` como propiedad opcional en TypeScript y calcular `starts` de forma defensiva sin romper el esquema.
2. **Eliminar a Freddy Peralta y Junior Caminero**:
   Remover a Freddy Peralta (642547) y Junior Caminero (691406) de `featuredStars` en `player-splits-service.ts` y de los fallbacks de estado en `player-splits-view.tsx`.
3. **Establecer jugadores canónicos de Leones del Caracas**:
   Configurar los fallbacks por defecto y estrellas destacadas con jugadores emblemáticos reales de la franquicia:
   - Bateadores: Harold Castro (605612), Aldrem Corredor (672580), José Rondón (602922), Lenyn Sosa (672820), Víctor Bericoto (682674).
   - Lanzadores: Norwith Gudiño (660508), Erick Leal (612797), Rito Lugo (682845), Zak Kent (687849), Yoimer Camacho (542467).
4. **Optimizar `getAllAvailablePlayersForSplits`**:
   Ampliar el `.limit(...)` a 5000 registros e incluir a todos los lanzadores con `ip >= 0.1` de la temporada para que el selector de jugadores en la interfaz muestre el roster completo.
5. **Fallback seguro de temporada**:
   Si un lanzador o bateador no registra entradas en la temporada activa (por ejemplo, 2026), verificar automáticamente la temporada anterior (2025) antes de retornar 404.

**Files likely to change**:
- `republicaraquista-web/src/lib/player-splits-service.ts`
- `republicaraquista-web/src/components/stats/splits/player-splits-view.tsx`

**Tests to add or update**:
- Test de consulta y cálculo de splits de lanzadores en Supabase sin `games_started`.
- Test de disponibilidad en lista de jugadores garantizando exclusión de Peralta/Caminero y presencia de pitchers caraquistas.
- Verificación de compilación TypeScript (`tsc --noEmit`).

## Risks & Considerations
- Cero regresiones en `batting_stats` ni en otras vistas (`pitching_summary`, `bullpen-budget`).
- Los contratos de tipos de `PlayerSplitsProfile` y `PitcherSplitRow` se mantienen intactos.

## Open Questions
- Ninguna. Causa raíz reproducida y aislada al 100%.
