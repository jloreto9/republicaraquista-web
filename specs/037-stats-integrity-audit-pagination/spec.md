# Spec 037: Integridad Total de Estadísticas LVBP, Paginación Determinística y Corrección de Outs/Exhibición

**Slug:** `037-stats-integrity-audit-pagination`  
**Autor:** Jorge Leonardo Loreto & Swarm (`@auditor`, `@speckit`, `@fixer`, `@verifier`)  
**Fecha:** 2026-11-26  
**Estado:** Especificado — Listo para implementación y verificación (Track 2 + Track 3: Bug Assessment `#6` + Spec-Driven Development)  
**Relacionados:** [`assessment.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/.specify/bugs/stats-truncation-audit/assessment.md) · [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts) · [`src/lib/player-splits-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/player-splits-service.ts) · [`src/lib/park-factors-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/park-factors-service.ts) · [`src/lib/player-leverage-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/player-leverage-service.ts) · [`src/app/api/pitching/search/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/pitching/search/route.ts) · [`src/lib/season-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/season-service.ts)

---

## 1. Contexto y Problema

La auditoría multi-fuente ejecutada sobre la temporada LVBP `2026` (reporte `#6` de `@auditor`, comparando las queries actuales de `republicaraquista-web`, Supabase completo paginado, MLB Stats API oficial y `https://tujonron.com/estadisticas`) confirmó cuatro causas raíz que comprometen la integridad estadística:

1. **Truncamiento silencioso por `.limit(10000)` / `.limit(5000)` / `.limit(2000)` sin paginación ni orden determinístico:** En `season=2026`, `batting_stats` alcanzó **11,739** filas (`11,503` regulares + `236` exhibición) y `pitching_stats` **11,731** filas (`11,495` regulares + `236` exhibición). Las consultas con `.limit(10000)` descartan ~1,503 filas de bateo y ~1,495 de pitcheo sin `.order()`, afectando a **119 de 178 bateadores** (incluyendo 6 omitidos por completo y Víctor Bericoto bajando de `7 HR / 107 AB / 41 H / 31 RBI / .383` a `5 HR / 97 AB / 37 H / 26 RBI / .381`) y a **127 de 251 lanzadores** (1 omitido). Además, `getCanonicalGameBoxscoreRows` usa `.limit(5000)` sin chunking, truncando a partir de ~55 juegos, y otros consumidores (`player-splits-service.ts`, `park-factors-service.ts`, `api/pitching/search/route.ts`, `season-service.ts`) carecen de paginación determinística sobre PK.
2. **Deriva de redondeo en `aggregatePitchingRows` (`src/lib/supabase.ts`):** Acumula `ip_decimal` flotante (`0.33`/`0.67`) y redondea `Number(p.inningsDecimal.toFixed(1))` en lugar de sumar **outs enteros exactos** (`outs / 3`), generando errores en **152 de 251 lanzadores (60.6%)** en `inningsPitched`, `ERA`, `WHIP`, `K/9`, `BB/9`, `FIP`, `ERA+` y `WHIP+`.
3. **Fuga de juegos de exhibición (`game_type` `'E'` / `'e'`):** Existen 2 juegos de exhibición finalizados (`47` filas activas de bateo y `32` de pitcheo) que se cuelan cuando se consulta `phase="all"` o en rutas de splits/leverage/search que no excluyen exhibición.
4. **Inconsistencia `game_type: "regular"` en write-through (`reconcileSeasonGames`):** Al insertar o actualizar juegos en Supabase, `reconcileSeasonGames` escribe `"regular"` en lugar del código canónico `"R"` (`972` filas afectadas en `10` juegos), rompiendo compatibilidad con consumidores que filtran `game_type = 'R'`.

Esta especificación establece la solución raíz en una única fuente de verdad (`fetchAllSupabasePages` en `src/lib/supabase.ts`), la corrección aritmética de outs exactos, el filtrado consistente de exhibición y el saneamiento del write-through `game_type`.

---

## 2. Escenarios de Usuario y Criterios de Aceptación

### Historia 1 — Paridad Completa de Líderes e Individuales Bateo/Pitcheo (>10,000 filas) (P1)
Como analista y usuario de República Caraquista, quiero que todos los bateadores y lanzadores LVBP `2026` (sin límite artificial de 10,000 o 5,000 filas) reflejen sus totales exactos frente a MLB Stats API y TuJonrón (por ejemplo, Víctor Bericoto con `27 JJ, 107 AB, 41 H, 7 HR, 31 RBI, .383/.488/.664`) sin perder ningún jugador ni juego de temporada regular.

### Historia 2 — Exactitud en Innings Lanzados y Tasas Derivadas de Pitcheo (P1)
Como analista, quiero que `inningsPitched`, `inningsDisplay`, `ERA`, `WHIP`, `K/9`, `BB/9` y los índices `+` (`ERA+`, `WHIP+`, `FIP+`) en `getPitchingStats` se calculen mediante acumulación exacta de **outs** (`outs / 3`) y no mediante sumas de `0.33`/`0.67` truncadas a 1 decimal, eliminando el 60.6% de derivas detectadas.

### Historia 3 — Exclusión Segura de Juegos de Exhibición (`'E'`/`'e'`) y Consistencia de `game_type` (P1)
Como usuario de `/individuales`, `/splits`, `/leverage`, `/matchup` y `/pitching-summary`, quiero que los juegos de exhibición (`'E'`/`'e'`) queden excluidos por defecto en `"all"` y en los perfiles de splits/leverage/búsqueda salvo que se solicite explícitamente exhibición, y que `reconcileSeasonGames` persista códigos canónicos (`"R"`, `"L"`, `"F"`, `"D"`) manteniendo compatibilidad de lectura con `"regular"`.

### Historia 4 — Paginación Transversal en Servicios y Resiliencia en Pruebas (P1)
Como desarrollador, quiero que `getCanonicalGameBoxscoreRows`, `reconcileSeasonGames`, `player-splits-service.ts`, `park-factors-service.ts`, `api/pitching/search/route.ts` y `season-service.ts` paginen determinísticamente ordenando por `id` ascendente sin romper los mocks de las suites unitarias existentes que no implementan `.range()` o `.order()`.

---

## 3. Requerimientos Funcionales y Contrato Técnico

### RF-01: Helper Central de Paginación Determinística (`src/lib/supabase.ts`)
1. Exportar (o compartir desde `src/lib/supabase.ts`) un helper reutilizable `fetchAllSupabasePages<T>(buildPageQuery, options?)` con las siguientes garantías:
   - **Orden determinístico:** Las consultas paginadas deben aplicar `.order(orderColumn, { ascending: true })` (por defecto `"id"`, clave primaria única sin empates en `batting_stats`, `pitching_stats` y `games`).
   - **Carga rápida con `count: "exact"` y concurrencia acotada:** En la página 0 (`offset = 0`, `pageSize` por defecto `1000`), solicitar `{ count: "exact" }` cuando el query builder soporte `.range()`; si `totalCount > rows.length`, despachar las páginas restantes (`1..N`) en lotes paralelos con concurrencia acotada (ej. `4–6`) para mantener baja latencia en Vercel Serverless.
   - **Fallback secuencial si `count` es nulo:** Si PostgREST o un mock no devuelve `count`, iterar incrementando `offset += pageSize` mientras `rows.length === pageSize`.
   - **Compatibilidad segura con mocks de test:** Si el query builder recibido en tests unitarios no expone `.range()` o `.order()` (o si devuelve un `PromiseLike` directo), ejecutar la consulta una sola vez de forma segura sin lanzar `TypeError`.
   - **Manejo explícito de errores:** Propagar/retornar `{ data, error }` estructurado sin silenciar errores de Supabase.

### RF-02: Eliminación de Truncamientos en `src/lib/supabase.ts`
1. **`reconcileSeasonGames(season)`:** Reemplazar la lectura directa de `games` por `fetchAllSupabasePages` con `.order("id", { ascending: true })`.
2. **`getCanonicalGameBoxscoreRows(season, gameIds, teamId?)`:** Dividir `targetGameIds` en chunks (ej. `30–50` IDs por lote) y paginar cada lote en `batting_stats` y `pitching_stats` con `fetchAllSupabasePages` y `.order("id", { ascending: true })`, conservando la deduplicación por `${game_id}-${player_id}` y la mezcla prioritaria con `reconciledBoxscoreCache`.
3. **`getBattingStats(season, phase, teamId, limit, minAb, startDate?, endDate?)`:**
   - Reemplazar `.limit(10000)` en el fallback por rango de fechas y en la consulta principal de temporada por `fetchAllSupabasePages` ordenado por `"id"`.
   - Cuando `phase === "all"`, excluir juegos de exhibición (`'E'`, `'e'`, `'exhibition'`).
4. **`getPitchingStats(season, phase, teamId, limit, minIp, startDate?, endDate?)`:**
   - Reemplazar `.limit(10000)` en el fallback por rango de fechas y en la consulta principal de temporada por `fetchAllSupabasePages` ordenado por `"id"`.
   - Cuando `phase === "all"`, excluir juegos de exhibición (`'E'`, `'e'`, `'exhibition'`).

### RF-03: Acumulación Exacta de Outs en `aggregatePitchingRows` (`src/lib/supabase.ts`)
1. En `aggregatePitchingRows`:
   - Reemplazar la suma flotante `p.inningsDecimal += Number(row.ip_decimal || 0)` por acumulación entera de outs: convertir cada fila mediante `rowOuts = row.ip_string ? Math.round(parseBaseballInningsToDecimal(row.ip_string) * 3) : Math.round(Number(row.ip_decimal || 0) * 3)`.
   - Calcular `ipDecimal = p.outs / 3`, `inningsPitched = Number(ipDecimal.toFixed(2))` e `inningsDisplay = formatDecimalToBaseballInnings(ipDecimal)` (alineado con el bloque `byDateRange` en `src/lib/supabase.ts:2579-2585`).
   - Calcular `era`, `whip`, `kPer9` y `bbPer9` usando `ipDecimal` exacto (`p.outs / 3`) en lugar de `toFixed(1)` (con guarda `p.outs > 0`).
   - Preservar la deduplicación por `${player_id}-${game_id}` y el filtro `hasPitcherAppearance`.

### RF-04: Normalización Canónica de `game_type` y Exclusión de Exhibición
1. **Exclusión de exhibición en `filterGamesByPhase` / consultas de `supabase.ts`:**
   - En `filterGamesByPhase(games, phase)`: cuando `targetPhase === "all"`, filtrar fuera los juegos cuya fase normalizada sea `"exhibition"` / `"e"` (permitiendo `"exhibition"` únicamente si se solicita explícitamente `phase="E"` o `"exhibition"`).
   - En `getBattingStats` y `getPitchingStats` (tanto fallback de fechas como temporada con `phase="all"`): excluir `game_type` `'E'`, `'e'`, `'exhibition'`.
2. **Write-through canónico en `reconcileSeasonGames`:**
   - Definir helper `toCanonicalMlbGameType(rawType?: string | null): string` que convierta `"regular"` / `"R"` -> `"R"`, `"round_robin"` / `"L"` -> `"L"`, `"final"` / `"F"` / `"W"` -> `"F"`, `"wildcard_playin"` / `"D"` -> `"D"`, `"exhibition"` / `"E"` -> `"E"`.
   - Usar `toCanonicalMlbGameType(...)` al construir `gamesToUpsert` (`src/lib/supabase.ts:658, 716`) en lugar de `"regular"`.
   - Mantener `.in("games.game_type", ["R", "regular"])` (y equivalentes para `"L"`, `"F"`, `"D"`) al consultar para garantizar retrocompatibilidad con filas ya almacenadas en Supabase.

### RF-05: Corrección de Consumidores Secundarios en `src/lib/` y `src/app/api/`
1. **`src/lib/player-splits-service.ts`:**
   - En `getPlayerSplitsProfile` (`L1197-1208` bateadores y `L1513-1524` lanzadores): filtrar fuera juegos con `game_type` de exhibición (`'E'`, `'e'`, `'exhibition'`) antes de agregar splits, y usar paginación defensiva si aplica.
   - En `getAllAvailablePlayersForSplits` (`L1859-1873`): reemplazar `.limit(10000)` en `batting_stats` y `pitching_stats` usando `fetchAllSupabasePages` con `.order("id", { ascending: true })` y excluir juegos de exhibición `'E'`/`'e'`/`'exhibition'`.
2. **`src/lib/park-factors-service.ts`:**
   - En `fetchSupabaseBoxscoreGames` (`L380-386`): reemplazar `.limit(2000)` en `games` usando `fetchAllSupabasePages` ordenado por `"id"`.
   - En `L421-436`: añadir `.order("id", { ascending: true })` (o reutilizar `fetchAllSupabasePages`) en los lotes de `batting_stats`.
3. **`src/lib/player-leverage-service.ts`:**
   - En `L706-731`: incluir `game_type` en el `.select(...)` de `games!inner(...)` y excluir filas de exhibición `'E'`/`'e'`/`'exhibition'`.
4. **`src/app/api/pitching/search/route.ts`:**
   - En `L72-78`: paginar con `fetchAllSupabasePages` y `.order("id", { ascending: true })`, excluyendo filas de exhibición `'E'`/`'e'`/`'exhibition'`.
5. **`src/lib/season-service.ts`:**
   - En `getAvailableSeasons` (`L63-66`): reemplazar la consulta sin paginación por `fetchAllSupabasePages` (ordenando determinísticamente por `"id"` antes de deduplicar `season`) para evitar truncamiento ante límites `max_rows`.

---

## 4. Invariantes y Guardrails

1. **No romper nada / Retrocompatibilidad:** Los contratos públicos de `BattingStats`, `PitchingStats`, `getBattingStats`, `getPitchingStats`, `getCanonicalGameBoxscoreRows` y `getAllAvailablePlayersForSplits` se mantienen intactos. Los mocks de tests existentes (`realtime-postgame-sync.test.ts`, `individual-date-range.test.ts`, `plus-stats.test.ts`, etc.) deben seguir pasando sin cambios destructivos.
2. **Fuente de verdad única:** Toda lógica de paginación determinística en Supabase debe residir en un único helper compartido (`fetchAllSupabasePages`), prohibiendo copiar bucles `while (true)` en cada servicio.
3. **Preservación de `hasBatterAppearance` y `hasPitcherAppearance`:** No desactivar el filtro de participación real; las `8,766` filas de bateo y `9,702` de pitcheo en cero corresponden a banca/bullpen inactivos.
4. **Alcance estricto del repositorio:** No modificar esquemas de Supabase ni archivos de `caraquista-reflex` o `RepubliCaraquistApp` dentro de este ticket; las 2 filas homónimas duplicadas en BD (`666678 Pedro Garcia` y `805769 Jose Leandro`) quedan documentadas en `assessment.md` como saneamiento de datos en BD.
5. **Reglas LVBP y Español (`GEMINI.md` / `CLAUDE.md`):** Mantener etiquetas/comentarios nuevos en español, sin Statcast en LVBP, sin jerga prohibida y sin scripts temporales.

---

## 5. Criterios de Aceptación

1. **CA-01 (Paridad Paginada >10,000 filas):** `getBattingStats(2026, "R", "all", 500, 0)` y `getPitchingStats(2026, "R", "all", 500, 0)` recuperan el 100% de las filas de Supabase (`11,503` bateo regular y `11,495` pitcheo regular) sin truncamiento; Víctor Bericoto (`682674`) reporta exactamente `27 JJ, 107 AB, 41 H, 7 HR, 31 RBI, .383 AVG` y ningún bateador o lanzador desaparece frente a MLB Stats API y TuJonrón.
2. **CA-02 (Outs Exactos en Pitcheo):** `aggregatePitchingRows` acumula outs enteros exactos (`outs / 3`), eliminando las 152 derivas de redondeo (`6.2 IP` -> `6.67` y `6.2`, `10.2 IP` -> `10.67` y `10.2`, `0.2 IP` -> `0.67` y `0.2`).
3. **CA-03 (Exhibición y `game_type`):** Ninguna consulta de `phase="all"`, splits, leverage o búsqueda de lanzadores incluye juegos `'E'`/`'e'`/`'exhibition'`; `reconcileSeasonGames` escribe códigos canónicos (`"R"`, `"L"`, `"F"`, `"D"`) manteniendo compatibilidad de lectura con `"regular"`.
4. **CA-04 (Calidad, Pruebas y Validación en Vivo):** La nueva suite `src/lib/__tests__/stats-pagination-integrity.test.ts`, todas las suites existentes en `src/lib/__tests__/`, `npm run lint`, `npm run build` y la comparación en vivo contra MLB Stats API y TuJonrón pasan al 100%.
