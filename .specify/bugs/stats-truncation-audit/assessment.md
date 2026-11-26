# Bug Assessment: Truncamiento de Queries (>10,000 filas), Deriva de IP/Outs y Fuga de Exhibición en Estadísticas LVBP 2026

- **Slug**: `stats-truncation-audit`
- **Created**: 2026-11-26T17:50:00-04:00
- **Source**: Auditoría multi-fuente en Swarm (`#1`, `#6` por `@auditor`: comparación de query truncada en `src/lib/supabase.ts` vs Supabase paginado completo vs MLB Stats API vs `https://tujonron.com/estadisticas` para LVBP temporada `2026`)
- **Verdict**: valid
- **Severity**: critical

## Report (verbatim or summarized)

De acuerdo con el reporte completo de diagnóstico de `@auditor` (mensaje `#6` en el board del swarm):

- En Supabase (`season=2026`), `games` contiene **226** filas (`132` regulares finalizados con 100% paridad frente a MLB `schedule`, `92` `Scheduled` y `2` juegos de exhibición `'E'`/`'e'`), `batting_stats` contiene **11,739** filas (`11,503` regulares + `236` exhibición) y `pitching_stats` contiene **11,731** filas (`11,495` regulares + `236` exhibición).
- Las consultas actuales en `republicaraquista-web` usan `.limit(10000)`, `.limit(5000)` o `.limit(2000)` sin paginación ni `.order()`, cortando ~1,503 filas de bateo y ~1,495 filas de pitcheo de forma no determinística.
- **Impacto cuantificado en LVBP Regular 2026:**
  - **119 de 178 bateadores** presentan estadísticas incompletas (**6** desaparecen por completo: Jadher Areinamo, Connor Panas, Jonathan Villar, Gabriel Rincones Jr., José Azócar y Elias Díaz).
  - **Víctor Bericoto (`player_id=682674`)** aparece con **5 HR, 97 AB, 37 H, 26 RBI, .381 AVG** en lugar de **7 HR, 107 AB, 41 H, 7 2B, 1 3B, 31 RBI, 20 BB, 15 SO, .383/.488/.664 (1.152 OPS)** confirmados en BD completa, MLB Stats API y TuJonrón.
  - **127 de 251 lanzadores** presentan estadísticas truncadas (**1** desaparece por completo).
  - **152 de 251 lanzadores (60.6%)** sufren deriva de redondeo en `inningsPitched`, `ERA`, `WHIP`, `K/9`, `BB/9`, `FIP`, `ERA+` y `WHIP+` por sumar `ip_decimal` (`0.33`/`0.67`) y truncar con `.toFixed(1)` en `aggregatePitchingRows`.
  - **2 juegos de exhibición (`game_type` `'E'`/`'e'`)** se filtran en consultas con `phase="all"` o sin filtro de `game_type` (`47` filas activas de bateo y `32` de pitcheo).
  - **10 juegos escritos vía write-through (`reconcileSeasonGames`)** guardaron `game_type="regular"` (`972` filas de bateo y `972` de pitcheo) en lugar de `"R"`, afectando a consumidores externos que filtran `eq('games.game_type', 'R')`.

## Symptom

1. Las vistas de líderes, individuales y comparativas (`/individuales`, `/pitching-summary`, `/matchup`, `/splits`, `/awards`, `/lineup-optimizer`) muestran totales acumulados subestimados o jugadores ausentes para la temporada LVBP `2026` una vez superadas las 10,000 filas por temporada en `batting_stats` y `pitching_stats`.
2. Lanzadores con fracciones de inning (`.1` / `.2`) presentan desviaciones en `IP`, `ERA` y `WHIP` (ej. Adolfo Oviedo `6.2 IP` reportado como `6.7` y `ERA 9.40` vs `6.67` y `9.45`; Henry Gómez `10.2 IP` como `10.6` y `ERA 4.25` vs `10.67` y `4.22`; Touki Toussaint `0.2 IP` como `0.7` y `ERA 64.29` vs `0.67` y `67.50`).
3. Cuando se consulta `phase="all"` o endpoints de splits/leverage sin filtro de `game_type`, se contaminan los totales con juegos de exhibición (`'E'`/`'e'`).

## Reproduction

1. Ejecutar `getBattingStats(2026, "R", "all", 500, 0)` y `getPitchingStats(2026, "R", "all", 500, 0)` contra Supabase producción (`season=2026`).
2. Inspeccionar la respuesta para Víctor Bericoto (`682674`), Carlos Pérez (`656024`), Símon Muzziotti (`665922`), Alexi Amarista (`506560`), Jonathan Villar (`542340`), Félix Doubront (`467094`) y Silvino Bracho (`611093`).
3. Comparar contra la lectura paginada completa de Supabase, `https://statsapi.mlb.com/api/v1/stats?stats=season&sportId=17&leagueId=135&group=hitting|pitching&season=2026&gameType=R&playerPool=all&limit=1000` y `https://tujonron.com/estadisticas`.
4. Observar el truncamiento en `.limit(10000)` y las desviaciones de `ip_decimal` en `aggregatePitchingRows`.

## Suspected Code Paths

- `src/lib/supabase.ts:538-542` (`filterGamesByPhase`) — Con `phase="all"` no excluye juegos de exhibición `'E'`/`'e'`.
- `src/lib/supabase.ts:549, 658, 716` (`reconcileSeasonGames`) — Consulta `games` sin helper paginado y escribe `game_type: "regular"` (en vez del código MLB `"R"`/`"L"`/`"F"`/`"D"`) en `gamesToUpsert`.
- `src/lib/supabase.ts:946-962` (`getCanonicalGameBoxscoreRows`) — Consulta `batting_stats` y `pitching_stats` con `.in("game_id", targetGameIds).limit(5000)` sin chunking de `gameIds` ni paginación determinística (trunca cuando `> 55` juegos).
- `src/lib/supabase.ts:2151-2165, 2206-2234` (`getBattingStats`) — Ambas consultas (`byDateRange` fallback y temporada completa) usan `.limit(10000)` sin `.order("id")` ni paginación, y `phase === "all"` no excluye `'E'`/`'e'`.
- `src/lib/supabase.ts:2338, 2359-2369` (`aggregatePitchingRows`) — Acumula `ip_decimal` flotante (`0.33`/`0.67`) y redondea con `.toFixed(1)` en vez de acumular **outs exactos** (`outs / 3`) como el bloque `byDateRange` (`src/lib/supabase.ts:2579-2585`).
- `src/lib/supabase.ts:2646-2660, 2701-2729` (`getPitchingStats`) — Ambas consultas (`byDateRange` fallback y temporada completa) usan `.limit(10000)` sin `.order("id")` ni paginación, y `phase === "all"` no excluye `'E'`/`'e'`.
- `src/lib/player-splits-service.ts:1197-1208, 1513-1524` (`getPlayerSplitsProfile`) — No excluye `game_type` `'E'`/`'e'`.
- `src/lib/player-splits-service.ts:1859-1873` (`getAllAvailablePlayersForSplits`) — Usa `.limit(10000)` sin `.order("id")` ni paginación en `batting_stats` y `pitching_stats`, y no excluye `'E'`/`'e'`.
- `src/lib/park-factors-service.ts:380-386, 421-436` (`fetchSupabaseBoxscoreGames`) — Consulta `games` con `.limit(2000)` sin paginación y pagina `batting_stats` por lotes sin `.order("id", { ascending: true })`.
- `src/lib/player-leverage-service.ts:706-731` (`getPlayerLeverageSplits`) — Consulta por `player_id` sin excluir `game_type` `'E'`/`'e'`.
- `src/app/api/pitching/search/route.ts:72-78` — Consulta `pitching_stats` multi-temporada (`[2026, 2025, 2024]`, ~5,302 filas) sin `.order("id")` ni paginación y sin excluir exhibición.
- `src/lib/season-service.ts:63-66` (`getAvailableSeasons`) — Consulta `games.select("season")` sin paginación (498 filas actuales; riesgo latente si baja `max_rows`).

## Root Cause Hypothesis

**Confianza: Alta** (100% confirmada por comparación directa de 4 fuentes en `#6`).

1. **Causa raíz primaria (Truncamiento):** Las tablas `batting_stats` (PK `id`, clave única `(game_id, player_id)`) y `pitching_stats` (PK `id`, clave única `(game_id, player_id)`) superaron el umbral de 10,000 filas por temporada en LVBP `2026` (`11,503` y `11,495` filas regulares respectivamente, incluyendo filas de banca/bullpen en cero). Todas las consultas principales usaban `.limit(10000)` o `.limit(5000)` en una sola petición sin `.order("id", { ascending: true })` ni paginación `.range()`, descartando silenciosamente las filas excedentes.
2. **Causa raíz secundaria (Deriva de outs/IP):** `aggregatePitchingRows` suma `ip_decimal` redondeado (`0.33`/`0.67`) y trunca con `.toFixed(1)` en lugar de convertir cada salida a outs enteros (`Math.round(ip * 3)`) y derivar `ip = outs / 3`, causando error sistemático en el 60.6% de los lanzadores.
3. **Causa raíz terciaria (Exhibición `'E'`/`'e'` y `game_type` write-through):** Los filtros de `phase="all"` y consultas en splits/leverage/search omiten excluir `game_type` de exhibición (`'E'`, `'e'`, `'exhibition'`), y `reconcileSeasonGames` persiste `"regular"` en lugar del código estándar `"R"`, rompiendo consumidores externos que filtran `eq('games.game_type', 'R')`.

## Proposed Remediation

**Preferred**:
1. Introducir un único helper reutilizable de paginación determinística en `src/lib/supabase.ts` (`fetchAllSupabasePages`) que ordene por clave única determinística (`.order("id", { ascending: true })`), use `{ count: "exact" }` en la primera página (`pageSize = 1000` o configurable) para cargar las páginas restantes con concurrencia acotada (alta velocidad en serverless Vercel) y degrade con seguridad cuando reciba mocks de pruebas unitarias que no implementen `.range()` o `.order()`.
2. Reemplazar todas las consultas acotadas con `.limit(10000)` / `.limit(5000)` / `.limit(2000)` o sin paginación en `src/lib/supabase.ts` (`getBattingStats`, `getPitchingStats`, `getCanonicalGameBoxscoreRows` con chunking de `gameIds` + paginación, `reconcileSeasonGames`), `src/lib/player-splits-service.ts`, `src/lib/park-factors-service.ts`, `src/app/api/pitching/search/route.ts` y `src/lib/season-service.ts`.
3. Corregir `aggregatePitchingRows` para sumar outs enteros exactos (`outs = round(ip_decimal * 3)` o desde `ip_string` / `parseBaseballInningsToDecimal`) y calcular `inningsPitched = Number((outs / 3).toFixed(2))`, `inningsDisplay = formatDecimalToBaseballInnings(outs / 3)`, `ERA`, `WHIP`, `K/9` y `BB/9` sobre `outs / 3`.
4. Excluir juegos de exhibición (`'E'`, `'e'`, `'exhibition'`) en `phase="all"` y en `player-splits-service.ts`, `player-leverage-service.ts` y `api/pitching/search/route.ts` (salvo solicitud explícita de exhibición), y persistir códigos canónicos de MLB (`"R"`, `"L"`, `"F"`, `"D"`) en el write-through de `reconcileSeasonGames` manteniendo compatibilidad de lectura para `["R", "regular"]`.
5. Añadir suite de regresión `src/lib/__tests__/stats-pagination-integrity.test.ts` y verificar en vivo contra Supabase, MLB Stats API y TuJonrón.

**Alternatives**:
- Aumentar `.limit(10000)` a `.limit(50000)`: rechazado porque PostgREST impone un `max_rows` configurable en el servidor (típicamente 1,000–10,000) que silencia cualquier `.limit()` superior y volvería a truncar silenciosamente cuando crezca la temporada.
- Filtrar filas en cero directamente en SQL (`or(ab.gt.0,...)`) sin paginar: insuficiente por sí solo porque en temporadas largas o consultas multi-temporada (`api/pitching/search` o `park-factors`) seguirá superándose el límite de página si no hay paginación determinística.

**Files likely to change**:
- `src/lib/supabase.ts`
- `src/lib/player-splits-service.ts`
- `src/lib/park-factors-service.ts`
- `src/lib/player-leverage-service.ts`
- `src/app/api/pitching/search/route.ts`
- `src/lib/season-service.ts`
- `src/lib/__tests__/stats-pagination-integrity.test.ts` **[NEW]**

**Tests to add or update**:
- `src/lib/__tests__/stats-pagination-integrity.test.ts`: paginación multipágina (`>10,000` filas / caso Víctor Bericoto `7 HR, 41 H, 107 AB, 31 RBI, .383 AVG`), compatibilidad con mocks sin `.range()`/`.order()`, deduplicación con `reconciledBoxscoreCache`, suma exacta de outs/IP (`6.2 IP` -> `6.67`, `10.2 IP` -> `10.67`, `0.2 IP` -> `0.67`), exclusión de `'E'`/`'e'` y write-through `game_type="R"`.
- Re-ejecución completa de todas las suites en `src/lib/__tests__/`, `npm run lint`, `npm run build` y verificación en vivo contra MLB Stats API y TuJonrón.

## Risks & Considerations

- **Latencia en Vercel:** Paginar secuencialmente 12 páginas de 1,000 filas aumentaría el TTFB. El helper `fetchAllSupabasePages` debe resolver la página 0 con `{ count: "exact" }` y paralelizar las páginas restantes con concurrencia acotada (ej. 4–6 peticiones concurrentes).
- **Compatibilidad con mocks de tests existentes:** `realtime-postgame-sync.test.ts` y `individual-date-range.test.ts` usan clientes Supabase mockeados que pueden exponer `.eq()/.in()` sin `.range()` o `.order()`. El helper debe detectar capacidades del query builder o aceptar resultados directos de fallback sin romper pruebas previas.
- **Hallazgos fuera de código en `republicaraquista-web` (reportados en `#6`):**
  1. **2 filas fantasma por homonimia en Supabase BD** (`666678 Pedro Garcia` en juegos `870079`/`870072` duplicando a `690345`; `805769 Jose Leandro` en `870090` duplicando a `814129`): requieren saneamiento en BD / pipeline de ingesta, no en la paginación de lectura.
  2. **Diferencia intencional en `G` de bateo (`hasBatterAppearance`):** Mantiene exclusión de reemplazos defensivos/corredores emergentes sin PA/R/SB/CS para evitar inflar `G` con las `8,766` filas de banca en cero.
  3. **Repositorios hermanos (`caraquista-reflex` y `RepubliCaraquistApp`):** Se documentan como deuda coordinada en seguimiento aparte, ya que el alcance de código de este ticket es exclusivamente `republicaraquista-web`.

## Open Questions

- Ninguna. Todas las causas raíz fueron verificadas con evidencia multi-fuente en `#6`.
