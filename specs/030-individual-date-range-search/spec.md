# Spec 030: Buscador Individual por Rango de Fechas y Comparativa Interanual en `/individuales`

**Slug:** `030-individual-date-range-search`  
**Autor:** Jorge Leonardo Loreto & Antigravity  
**Fecha:** 2026-11-16  
**Estado:** Especificado (Track 2: Spec-Driven Development)  
**Repositorio:** `republicaraquista-web` (Next.js 16 / React 19 / TypeScript)  
**Relacionados:** [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts) · [`src/app/api/stats/batting/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/stats/batting/route.ts) · [`src/app/api/stats/pitching/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/stats/pitching/route.ts) · [`src/app/api/stats/fielding/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/stats/fielding/route.ts) · [`src/components/stats/individuales-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/individuales-view.tsx)

---

## 1. Contexto y Problema

La sección de **Colectivas (`/colectivas`)** ya cuenta con un buscador por rango de fechas arbitrario y comparación interanual (`specs/012-stathead-colectivas-date-range`). Sin embargo, la vista de **Líderes Individuales (`/individuales`)** solo expone acumulados de fase completa (`R`, `L`, `F`, `all`), sin permitir consultar el rendimiento individual de bateadores, lanzadores y defensores en ventanas temporales específicas (ej. últimos 7 días, últimos 14 días, mes de octubre/noviembre/diciembre o fechas personalizadas) ni comparar contra el tramo equivalente de la temporada anterior.

---

## 2. Escenarios de Usuario y Criterios de Aceptación

### Historia 1 — Consulta Individual por Rango de Fechas Arbitrario (P1)
Como analista o fanático de la LVBP, quiero seleccionar una fecha de inicio (`startDate`) y una fecha fin (`endDate`) dentro de `/individuales` (pestaña **Buscador**) para consultar líderes de **Bateo**, **Pitcheo** y **Fildeo** en ese intervalo exacto:
- **Bateo Individual (`group=hitting`)**: `JJ`, `AP`, `VB`, `CA`, `H`, `2B`, `3B`, `HR`, `CI`, `BB`, `SO`, `BR`, `CS`, `GIDP`, `AVG`, `OBP`, `SLG`, `OPS`, `ISO`, `BABIP`.
- **Pitcheo Individual (`group=pitching`)**: `JJ`, `JI`, `G`, `P`, `SV`, `IP`, `H`, `C`, `CL`, `BB`, `SO`, `HR`, `GIDP`, `ERA`, `WHIP`, `K/9`, `BB/9`, `K/BB`.
- **Fildeo Individual (`group=fielding`)**: `POS`, `JJ`, `JI`, `INN`, `PO`, `A`, `E`, `TC`, `FPCT`, `DP`, `RF/9` y columnas de receptoría (`CS`, `SB`, `CS%`, `PB`).

### Historia 2 — Calificación Proporcional al Tramo y Filtros Instantáneos (P1)
Como usuario, quiero filtrar en memoria sobre el universo del rango seleccionado por franquicia (`LVBP_TEAM_IDS`), nombre, posición defensiva (en fildeo) y umbral dinámico de calificación proporcional a los juegos disputados en el rango (`teamGamesMap` / `maxGames`), con alternativa de un clic para ver todos los jugadores sin mínimo.

### Historia 3 — Comparativa Interanual Opcional con Deltas (P2)
Como analista, quiero activar un interruptor opcional **"Comparar con temporada anterior (Δ)"** (apagado por defecto) para contrastar las métricas del tramo actual (`season`) contra el tramo equivalente de `season - 1`, visualizando deltas semánticos por jugador.

---

## 3. Requerimientos Funcionales y Contrato Técnico

### RF-01: Capa de Datos en `src/lib/supabase.ts`
1. **`getTeamGamesMap(season = ACTIVE_SEASON, phase = "R", startDate?: string, endDate?: string)`**:
   - Sin `startDate`/`endDate`: conserva exactamente el comportamiento actual vía `getStandings`.
   - Con `startDate` y `endDate`: consulta en paralelo `/api/v1/teams/stats` (`group=hitting` y `group=pitching`, `stats=byDateRange`, `sportIds=17`, `leagueIds=135`) para construir `teamGamesMap` (`gamesPlayed`), `teamWinPctMap` (`wins / (wins + losses)`) y `maxGames`.
   - Si MLB Stats API falla o retorna vacío, hace fallback a `getCanonicalPlayedGames(season, { phase: "all" })` filtrado por `game_date >= startDate && game_date <= endDate`.
2. **`getBattingStats(season = ACTIVE_SEASON, phase = "R", teamId = "all", limit = 250, minAb = 0, startDate?: string, endDate?: string)`**:
   - Sin `startDate`/`endDate`: preserva intacto el flujo actual (Supabase + `reconciledBoxscoreCache` + GIDP).
   - Con `startDate` y `endDate`: consulta `/api/v1/stats?stats=byDateRange&sportId=17&leagueId=135&group=hitting&season=${season}&startDate=${startDate}&endDate=${endDate}&playerPool=all&limit=1000`.
   - Filtra a equipos en `LVBP_TEAM_IDS` (y `targetTeamId` si aplica), consolida de forma segura por jugador si hay múltiples splits, calcula tasas (`avg`, `obp`, `slg`, `ops`, `iso`, `babip`), ordena por `ops` desc y `hits` desc, filtra `minAb` y aplica `limit`.
   - Fallback a Supabase `batting_stats` unido con `games` (`game_date >= startDate && game_date <= endDate`) si MLB API falla o retorna vacío.
3. **`getPitchingStats(season = ACTIVE_SEASON, phase = "R", teamId = "all", limit = 250, minIp = 0.0, startDate?: string, endDate?: string)`**:
   - Sin `startDate`/`endDate`: preserva intacto el flujo actual.
   - Con `startDate` y `endDate`: consulta `/api/v1/stats?stats=byDateRange&sportId=17&leagueId=135&group=pitching&season=${season}&startDate=${startDate}&endDate=${endDate}&playerPool=all&limit=1000`.
   - Parsea `inningsPitched` con `parseBaseballInningsToDecimal` / `formatDecimalToBaseballInnings` (`inningsPitched` decimal y `inningsDisplay` `"X.0"|"X.1"|"X.2"`), mapea `wins`, `losses`, `saves`, `gamesStarted`, `gidp`, `hbp`, `era`, `whip`, `kPer9`, `bbPer9`, `kToBb`, ordena por `era` asc y `strikeouts` desc, filtra `minIp` y aplica `limit`.
   - Fallback a Supabase `pitching_stats` unido con `games` (`game_date >= startDate && game_date <= endDate`) si MLB API falla o retorna vacío.
4. **`getFieldingStats(season = ACTIVE_SEASON, phase = "R", teamId = "all", limit = 1000, minChances = 0, startDate?: string, endDate?: string)`**:
   - Sin `startDate`/`endDate`: preserva intacto el flujo actual por fase.
   - Con `startDate` y `endDate`: debido a que `/api/v1/stats?stats=byDateRange&group=fielding` retorna `splits: []` en MLB Stats API, consulta en paralelo por franquicia (`targetTeamId ? [targetTeamId] : LVBP_TEAM_IDS`):
     `/api/v1/teams/${tid}/roster/fullSeason?season=${season}&hydrate=person(stats(type=byDateRange,group=fielding,startDate=${startDate},endDate=${endDate},season=${season},sportId=17))`.
   - Filtra splits de `sport.id === 17` (excluyendo resúmenes `sport.id === 0`), verifica `team.id` en `LVBP_TEAM_IDS` y coincidente con `tid` para evitar duplicados de jugadores multi-equipo, excluye `DH`/`PH`/`PR`, lee posición desde `split.stat.position?.abbreviation || split.position?.abbreviation`, y reutiliza la misma lógica de agrupación, cálculo y ordenamiento de `getFieldingStats`.

### RF-02: Endpoints REST (`/api/stats/batting`, `/api/stats/pitching`, `/api/stats/fielding`)
- Leer `startDate` y `endDate` desde `searchParams`.
- Validar formato `YYYY-MM-DD`, presencia en par (`startDate` y `endDate` juntos) y orden cronológico (`startDate <= endDate`). Ante invalidez, retornar **HTTP 400** con `{ success: false, error: "Rango de fechas inválido. Usa formato YYYY-MM-DD y verifica que la fecha inicial sea menor o igual a la final." }`.
- Pasar `startDate` y `endDate` a `getBattingStats`/`getPitchingStats`/`getFieldingStats` y `getTeamGamesMap(season, phase, startDate, endDate)`.
- Incluir `startDate` y `endDate` en la respuesta JSON.
- Cabecera `Cache-Control`:
  - Si `endDate && endDate < today` (hora oficial VET UTC-4): `"public, max-age=3600, s-maxage=3600, stale-while-revalidate=300"`.
  - En otro caso: `"public, max-age=300, s-maxage=300, stale-while-revalidate=60"`.

### RF-03: Interfaz en `/individuales` (`stathead-individual-search.tsx`, `individuales-view.tsx`)
- Agregar la pestaña **Buscador** (`activeTab === "stathead"`, mapeando `?tab=stathead` y `?tab=buscador`).
- Ocultar `<StatsFilters />` cuando `activeTab === "splits" || activeTab === "stathead"`.
- Presets rápidos (`7d`, `14d`, `oct`, `nov`, `dic`, `all`), selector de grupo (`batting`, `pitching`, `fielding`), filtros en memoria por franquicia/mínimo/jugador/posición, 4 tarjetas KPI de líderes, tabla ordenable con resaltado para Leones del Caracas (`695`), navegación a `Splits` y comparativa interanual opcional (`Δ`).

---

## 4. Invariantes y Guardrails

1. **Retrocompatibilidad estricta:** Toda llamada sin `startDate`/`endDate` conserva exactamente su comportamiento previo.
2. **Idioma 100% español:** Errores HTTP, etiquetas y mensajes en español.
3. **Prohibición de jerga:** Cero ocurrencias de `"sabermétrico"`, `"sabermétrica"` o `"sabermetría"` en UI y respuestas visibles.
4. **Cero métricas Statcast en LVBP.**

---

## 5. Criterios de Aceptación

1. **CA-01:** `getTeamGamesMap`, `getBattingStats`, `getPitchingStats` y `getFieldingStats` resuelven rangos `startDate`–`endDate` usando los endpoints correctos de MLB Stats API y aplican sus fallbacks cuando corresponde.
2. **CA-02:** Las 3 rutas (`/api/stats/batting`, `/api/stats/pitching`, `/api/stats/fielding`) validan rangos con HTTP 400, devuelven `startDate`/`endDate` y ajustan `Cache-Control` según `today` en VET.
3. **CA-03:** La pestaña **Buscador** en `/individuales` consulta las 3 rutas, muestra KPIs, filtros y comparación interanual sin errores de tipos ni build.
4. **CA-04:** Toda la suite de pruebas y `npm run build` pasan sin regresiones.
