# Spec 035: Colectivas por Rol de Pitcheo (`SP`/`RP`), Buscador Global de Jugadores (`/jugadores`) y Splits Avanzados LVBP

**Slug:** `035-collective-pitching-roles-and-player-hub`  
**Autor:** Jorge Leonardo Loreto & Swarm  
**Fecha:** 2026-11-25  
**Estado:** Especificado — Listo para implementación y verificación (Track 2: Spec-Driven Development)  
**Repositorio:** `republicaraquista-web` (Next.js 16 / React 19 / TypeScript)  
**Relacionados:** [`src/types/collective.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/types/collective.ts) · [`src/lib/collective.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/collective.ts) · [`src/types/player-splits.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/types/player-splits.ts) · [`src/lib/player-splits-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/player-splits-service.ts) · [`src/lib/wpa-engine.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/wpa-engine.ts) · [`src/components/colectivas/colectivas-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/colectivas/colectivas-view.tsx) · [`src/components/stats/splits/player-splits-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/splits/player-splits-view.tsx)

---

## 1. Contexto y Problema

La plataforma cuenta actualmente con dos brechas analíticas y de navegación clave en la cobertura de la LVBP (`season=2025` para la campaña 2025-26 y `season=2026` para la campaña 2026-27):

1. **Pitcheo Colectivo sin segmentación Abridores (`SP`) vs. Relevistas (`RP`):** En `/colectivas` (pestaña **Pitcheo** y **Buscador por Rango de Fechas**), las métricas de cuerpo de lanzadores se presentan exclusivamente consolidadas a nivel de equipo. Sin embargo, para evaluar rotación vs. bullpen por temporada, fase o rango específico de fechas con comparativa interanual (`Δ`), se requiere segmentar `Todos | Abridores (SP) | Relevistas (RP)` combinando los `statSplits` oficiales de MLB Stats API (`sitCodes=sp|rp`) para temporadas/fases completas y una agregación determinística de `schedule` + `boxscore` con caché inmutable cuando hay rango de fechas (dado que la API de MLB ignora `sitCodes` en `byDateRange` y viceversa).
2. **Ausencia de un Hub dedicado de Jugadores (`/jugadores`) con búsqueda global instantánea, ficha multi-temporada y splits profundos:** El análisis individual de splits reside únicamente dentro de una pestaña secundaria de `/individuales?tab=splits`, sin acceso directo desde el encabezado ni desde la barra móvil, sin ficha superior estilo Baseball-Reference (resumen multi-temporada con `Tradicionales` y `Avanzadas & Stats+`, resumen defensivo y bitácora de juegos), sin clasificación de situaciones de presión (**Leverage Index** / `WPA` / `Late & Close`) y omitiendo 6 familias de splits verificadas en la LVBP, además de mostrar erróneamente `0.00` en `ERA` cuando MLB Stats API omite carreras limpias en splits intra-inning.

Esta especificación unifica ambas capacidades bajo un diseño limpio, 100% en español y con lenguaje deportivo directo.

---

## 2. Escenarios de Usuario y Criterios de Aceptación

### Historia 1 — Colectivas de Pitcheo `Todos / Abridores (SP) / Relevistas (RP)` en `/colectivas` (P1)
Como analista o fanático de la LVBP, quiero filtrar la pestaña **Pitcheo** de `/colectivas` entre **Todos**, **Abridores (SP)** y **Relevistas (RP)** por temporada y fase (`R`, `P`, etc.), viendo KPIs adaptados al rol (en `SP`, el cuarto KPI destaca `MÁS INNINGS (IP)` en lugar de `LÍDER EN SALVADOS`) y totales de liga recalculados sobre el subconjunto activo.

### Historia 2 — Buscador Colectivo por Rango de Fechas con Filtro `SP / RP` y Comparativa `Δ` (P1)
Como usuario del **Buscador Colectivo por Rango de Fechas**, cuando selecciono la categoría **Pitcheo** y elijo **Abridores (SP)** o **Relevistas (RP)** en un rango de fechas, quiero que el sistema agregue los boxscores oficiales finalizados (con caché inmutable y comparativa interanual `Δ` real usando el mismo rol en el período previo), mostrando el badge del rol activo y una nota discreta indicando posibles variaciones de `±1 CL` por carreras sucias de equipo (*team unearned runs*).

### Historia 3 — Buscador Global Instantáneo (`Ctrl+K` / Lupa Móvil) y Ruta `/jugadores` (P1)
Como usuario navegando cualquier página, quiero presionar `Ctrl+K` (o usar la barra rápida del `Header` y el botón de lupa en `MobileNav`) para buscar jugadores de bateo y pitcheo sin importar tildes o acentos, filtrar por `Todos | Bateadores | Lanzadores`, navegar con teclado (`↑`/`↓`/`Enter`/`Esc`) y abrir directamente `/jugadores?player={id}&type={batter|pitcher}&season={season}`, manteniendo enlace y sincronización con `/individuales?tab=splits`.

### Historia 4 — Ficha Superior Estilo Baseball-Reference en `/jugadores` (P1)
Como usuario en el perfil de un jugador, quiero consultar arriba un bloque integral compuesto por:
1. **Estadísticas Generales Multi-Temporada** (`2026-27`, `2025-26` y fila acumulada `Total LVBP` si registra participación en ambas) con toggle `Todas | Tradicionales | Avanzadas & Stats+` (`wOBA`, `wRC+`, `OPS+`, `FIP`, `ERA+`, `WHIP+`, `FIP+` con semáforo `100 = Promedio LVBP`).
2. **Resumen Defensivo** (visible cuando existan registros de fildeo para el jugador).
3. **Bitácora de Juegos (Game Log)** con selector `Últimos 7 | Últimos 15 | Todos`, mostrando fecha, rival, resultado (`G`/`P` con marcador) y línea del encuentro.

### Historia 5 — Splits de Presión (`LI` / `aLI` / `WPA`) y 6 Nuevos Grupos de Splits LVBP (P1)
Como analista, quiero consultar los **Splits de Presión** (`Alta Presión (LI > 1.50)`, `Presión Media (0.85 – 1.50)`, `Baja Presión (LI < 0.85)` bajo el estándar Baseball-Reference) con `aLI`, `WPA` y fila/bloque `Late & Close` junto a una leyenda didáctica con ejemplos de la LVBP, además de los 6 grupos de splits verificados: **Presión & Leverage + Late & Close**, **Tendencia Reciente (7/15/30d)**, **Estado del Marcador e Inercia**, **Conteos Avanzados + matriz colapsable 0-0 a 3-2**, **Uso, Descanso y Fatiga de Lanzadores** y **Orden al Bate y Bases Exactas**.

### Historia 6 — Corrección de `ERA` en Splits Intra-Inning de Lanzadores (P1)
Como usuario revisando splits intra-inning de un lanzador (por ejemplo, conteos específicos o bases exactas donde MLB Stats API no reporta `earnedRuns` ni `era`), quiero visualizar `"--"` neutro (no `"0.00"` en verde) y que esas filas se ordenen siempre al final al ordenar por `ERA`.

---

## 3. Requerimientos Funcionales y Contrato Técnico

### RF-01: Colectivas SP/RP (`src/types/collective.ts`, `src/lib/collective.ts`, `src/app/api/stats/collective/route.ts`)
1. **Tipos (`src/types/collective.ts`):**
   - Exportar `export type PitchingRoleFilter = "all" | "sp" | "rp";`.
   - Agregar `pitchingRole?: PitchingRoleFilter;` en `CollectiveStatsResult`.
2. **Lógica de datos (`src/lib/collective.ts`):**
   - Actualizar firma: `getCollectiveStats(season = 2025, phase = "R", startDate?: string, endDate?: string, pitchingRole: PitchingRoleFilter = "all"): Promise<CollectiveStatsResult>`.
   - Cuando `pitchingRole === "all"`: preservar comportamiento vigente de pitcheo colectivo.
   - Cuando `pitchingRole === "sp" || pitchingRole === "rp"` **sin fechas** (`!startDate || !endDate`):
     - Consultar `https://statsapi.mlb.com/api/v1/teams/stats?season=${season}&sportIds=17&leagueIds=135&group=pitching&stats=statSplits&sitCodes=${pitchingRole}${phase && phase !== "all" ? `&gameType=${phase}` : ""}` con `AbortSignal.timeout(10000)` y `next: { revalidate }`.
     - Parsear la respuesta hacia `CollectivePitchingTeam[]` ordenado por `era` ascendente.
   - Cuando `pitchingRole === "sp" || pitchingRole === "rp"` **con rango de fechas** (`startDate && endDate`):
     - Consultar `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&startDate=${startDate}&endDate=${endDate}${phase && phase !== "all" ? `&gameType=${phase}` : ""}` (timeout `10000` ms).
     - Filtrar juegos con `detailedState` en `["Final", "Completed", "Completed Early", "Game Over"]` deduplicados por `gamePk`.
     - Descargar `/api/v1/game/${gamePk}/boxscore` con concurrencia `12`, caché inmutable en memoria `finalizedBoxscoreCache` y `next: { revalidate: 86400 }`.
     - Exportar función pura `aggregateBoxscoresByPitchingRole(boxscores: any[], role: "sp" | "rp"): CollectivePitchingTeam[]`:
       - Iterar `home` y `away`, leyendo `teamBox.team.id`, `teamBox.pitchers` y `teamBox.players`.
       - Clasificar cada lanzador `(pid, idx)` mediante `st = players["ID" + pid]?.stats?.pitching`: `isStarter = Number(st.gamesStarted ?? 0) >= 1 || idx === 0`. Filtrar `role === "sp" ? isStarter : !isStarter`.
       - Acumular `gamesSet`, `outs` (`"X.Y"` → `X * 3 + Y`), `h`, `r`, `er`, `bb`, `so`, `hr`, `wins`, `losses`, `sv`, `holds`, `blownSaves`, `gidp`, `ab`.
       - Calcular `ipDecimal = outs / 3`, `ipCanonical = Math.floor(outs / 3) + (outs % 3) / 10`, `ipStr = "${Math.floor(outs / 3)}.${outs % 3}"`, `era`, `whip`, `k9`, `bb9`, `kbb` y `baa` sin `NaN`/`Infinity`. Ordenar por `era` ascendente dejando `0` outs al final.
   - Recalcular `pitchingSummary = calculatePitchingSummary(pitching)` y `pitchingKpis` sobre el arreglo `pitching` filtrado y retornar `pitchingRole`.
3. **API (`src/app/api/stats/collective/route.ts`):**
   - Leer query param `pitchingRole` (`"all" | "sp" | "rp"`, defecto `"all"`), pasarlo a `getCollectiveStats` e incluir `pitchingRole` en el JSON de respuesta.

### RF-02: UI de Colectivas SP/RP (`src/components/colectivas/colectivas-view.tsx`, `src/components/colectivas/stathead-collective-search.tsx`)
1. **`ColectivasView`:**
   - Estado `pitchingRole` (`"all" | "sp" | "rp"`) con selector segmentado **Todos | Abridores (SP) | Relevistas (RP)** dentro de la pestaña `pitcheo`.
   - Re-consultar `/api/stats/collective?season=...&phase=...&pitchingRole=...` al cambiar el rol.
   - Adaptar título de la tabla según el rol; cuando `pitchingRole === "sp"`, el cuarto KPI muestra `MÁS INNINGS (IP)` (máximo `ipStr` y `teamName` de `data.pitching`) en reemplazo de `LÍDER EN SALVADOS`. Usar iconos Lucide (prohibido emojis).
2. **`StatheadCollectiveSearch`:**
   - Estado `pitchingRole` (`"all" | "sp" | "rp"`) con selector visible cuando `group === "pitching"`.
   - Enviar `pitchingRole` tanto en `fetchCurrent` como en `fetchPrev` para que los deltas `Δ` interanuales sean consistentes por rol, re-ejecutando `executeQuery()` al cambiar de rol.
   - Mostrar badge del rol activo y una nota discreta aclarando que las cifras provienen de boxscores oficiales (`±1 CL` posible por *team unearned runs*) cuando `pitchingRole !== "all"`.

### RF-03: Contratos, Splits Extendidos y Corrección de ERA (`src/types/player-splits.ts`, `src/lib/player-splits-service.ts`, `src/app/api/stats/player-splits/route.ts`)
1. **Tipos (`src/types/player-splits.ts`):**
   - Ampliar `SplitCategory` con `"leverage" | "trend" | "score" | "lineup" | "fatigue"`.
   - Agregar `eraAvailable?: boolean;` en `PitcherSplitRow`.
   - Importar `BattingStats`, `PitchingStats`, `FieldingStats` de `./sports` y exportar:
     - `LeverageTier = "high" | "mid" | "low"`
     - `PlayerLeverageRow` y `PitcherLeverageRow` (con `tier`, `avgLi`, `avgLiStr`, `wpa`, `wpaStr`)
     - `PlayerLeverageResult` (`playerId`, `type`, `season`, `gamesAnalyzed`, `avgLi`, `avgLiStr`, `totalWpa`, `totalWpaStr`, `thresholds`, `batterRows?`, `pitcherRows?`)
     - `PlayerBatterGameLog`, `PlayerPitcherGameLog`, `PlayerGeneralProfile` (`seasonsBatting`, `seasonsPitching`, `fielding`, `batterGameLogs`, `pitcherGameLogs`)
   - Ampliar `PlayerSplitsProfile` con propiedades opcionales: `general`, `lateCloseSplits`, `trendSplits`, `scoreSplits`, `detailedCountSplits`, `countMatrixSplits`, `lineupSplits`, `exactBaseSplits`, `pitcherLateCloseSplits`, `pitcherTrendSplits`, `pitcherScoreSplits`, `pitcherDetailedCountSplits`, `pitcherCountMatrixSplits`, `pitcherExactBaseSplits`, `pitcherRestSplits`, `pitcherFatigueSplits`.
2. **Servicio de Splits (`src/lib/player-splits-service.ts`):**
   - Ampliar `SIT_CODES` con los 6 grupos verificados en LVBP:
     - Marcador e inercia + Late & Close: `sah,sbh,sti,taw,tal,lc`
     - Conteos avanzados + matriz 12 conteos: `ac,bc,ec,c00,c01,c02,c10,c11,c12,c20,c21,c22,c30,c31,c32`
     - Orden al bate y bases exactas: `b1,b2,b3,b4,b5,b6,b7,b8,b9,pD,pH,r1,r2,r3,r12,r13,r23,r3l2,ron2`
     - Fatiga / conteo de pitcheos e innings: `fip,fba,pi001,pi016,pi031,pi046,pi061,pi076,pi091,pi106,ix,ig07,ig08,ig09`
   - Corrección en `parseMlbPitcherSplit`: cuando `stat.era` esté vacío/ausente (`undefined | null | ""`) **y** `stat.earnedRuns` sea `undefined | null`, retornar `era: "--"`, `eraNum: -1`, `eraAvailable: false`; en otro caso `eraAvailable: true`.
   - Exportar funciones puras: `buildRecentTrendSplits` (ventanas 7 / 15 / 30 días), `buildPitcherRestDaySplits` (`0` a `5+` días de descanso), `buildBatterGameLogs`, `buildPitcherGameLogs`.
   - Implementar `getPlayerGeneralProfile(playerId, type, validRows, fallbackTeamId)` consultando en paralelo temporadas `[2026, 2025]` vía `getBattingStats`, `getPitchingStats` y `getFieldingStats` de `./supabase` (reutilizando `wOBA`, `wRC+`, `FIP` y `Stats+` y tolerando temporadas vacías sin fallar el perfil).
3. **API (`src/app/api/stats/player-splits/route.ts`):**
   - Validar `playerId` numérico positivo (`400` si inválido) y ajustar `Cache-Control` diferenciando temporada histórica (`season < activeSeason`) vs. activa.

### RF-04: Motor de Leverage Index y Endpoint Paralelo (`src/lib/player-leverage-service.ts`, `src/app/api/stats/player-leverage/route.ts`)
1. **Motor (`src/lib/player-leverage-service.ts`):**
   - Constante exportada `LEVERAGE_THRESHOLDS = { lowMax: 0.85, highMin: 1.50 } as const`.
   - `classifyLeverageTier(li: number): LeverageTier` (`< 0.85` → `"low"`, `<= 1.50` → `"mid"`, `> 1.50` → `"high"`).
   - Reutilizar `calculateWinExpectancy`, `calculateLeverageIndex`, `encodeBaseState` (`./wpa-engine`), `fetchGameLiveFeed` (`./game-feed-service`), y `computeBatterFanGraphsMetrics`, `computePitcherFanGraphsMetrics`, `outsToInningsDisplay` (`./player-splits-service`, sin introducir imports circulares).
   - `aggregatePlaysByLeverage(feeds, playerId, type, season): PlayerLeverageResult`:
     - Procesar `allPlays` completados (`p.about?.isComplete !== false && p.result?.event`), reconstruyendo `outsBefore`, `baseStateBefore`, `homeScoreBefore`, `awayScoreBefore`, `li`, `weHomeBefore`, `weHomeAfter` y `wpaHome`.
     - Para bateador (`matchup.batter?.id === playerId`): clasificar `eventType`, sumar carreras anotadas (`runner.details?.runner?.id === playerId`), `aLI` y `WPA`.
     - Para lanzador (`matchup.pitcher?.id === playerId` o `runner.details?.responsiblePitcher?.id === playerId`): computar outs (`outsAfter - outsBefore`), `r` y `er` (`details?.earned === true` atribuido a `responsiblePitcher.id === playerId` con fallback `matchup.pitcher?.id === playerId`), `aLI` y `WPA`.
     - Retornar siempre las 3 filas en orden canónico: `Alta Presión (LI > 1.50)`, `Presión Media (0.85 – 1.50)` y `Baja Presión (LI < 0.85)`.
   - `getPlayerLeverageSplits(playerId, type, season)`: caché en memoria (`10` min temporada activa, `60` min cerrada), resolución de `game_id` desde Supabase con fallback a `gameLog` de MLB y descarga de feeds con concurrencia `8`.
2. **Endpoint (`src/app/api/stats/player-leverage/route.ts`):**
   - `GET` validando `player_id` entero positivo (`400` si inválido), `type` (`"batter" | "pitcher"`), `season` (default `await getActiveSeason()`). Retornar `{ success: true, leverage }` con `Cache-Control`.

### RF-05: Navegación Global, Ruta `/jugadores` y Componentes UI
1. **Navegación y Quick Search:**
   - `src/components/layout/nav-data.ts`: en categoría `"Analítica Avanzada"`, añadir `{ name: "Buscador de Jugadores", href: "/jugadores", icon: Search, badge: "NUEVO" }` justo después de `"Líderes Individuales"`.
   - `src/components/layout/player-quick-search.tsx`: buscador global con atajo `Ctrl+K` en desktop (`Header`) y botón compacto de lupa en móvil (`MobileNav`). Carga `/api/stats/player-splits?mode=list&season=${season}` con caché en memoria del módulo, normaliza tildes/acentos (`normalize("NFD")`), filtra `Todos | Bateadores | Lanzadores`, soporta teclado (`↑`/`↓`/`Enter`/`Esc`) y navega a `/jugadores?player=${p.id}&type=${p.type}&season=${season}`.
2. **Ruta `/jugadores` (`src/app/jugadores/page.tsx`) y sincronización con `/individuales`:**
   - Server Component (`export const dynamic = "force-dynamic"`) que lee `await searchParams` (`player`, `type`, `season`) y renderiza `Header` + `<Suspense>` con `<PlayerSplitsView initialPlayerId={...} initialType={...} season={...} syncUrl={true} />`.
   - `src/components/stats/individuales-view.tsx`: mantener intacta la pestaña `Splits` y agregar enlace directo `"Abrir en Buscador de Jugadores"` hacia `/jugadores`.
3. **Ficha General (`src/components/stats/splits/player-general-stats-card.tsx`):**
   - Bloque superior estilo Baseball-Reference con:
     - **Estadísticas Generales por Temporada** (`2026-27`, `2025-26` y `Total LVBP` si aplica), toggle `Todas | Tradicionales | Avanzadas & Stats+` y leyenda `100 = Promedio LVBP` usando el semáforo unificado (`>=130` emerald, `110–129` `#FDB827`, `91–109` slate, `1–90` rose).
     - **Resumen Defensivo** (si `profile.general?.fielding.length > 0`).
     - **Bitácora de Juegos (Game Log)** con selector `Últimos 7 | Últimos 15 | Todos`.
4. **Splits de Presión (`src/components/stats/splits/leverage-splits-card.tsx`) y Vista de Splits (`player-splits-view.tsx`, `split-table-group.tsx`):**
   - `LeverageSplitsCard`: fetch paralelo a `/api/stats/player-leverage`, skeleton limpio, tabla `Alta / Media / Baja Presión` con `aLI` y `WPA`, bloque `Late & Close` y leyenda explicativa con ejemplos concretos LVBP.
   - `SplitTableGroup`: si `eraAvailable === false || era === "--"`, renderizar `"--"` en `text-slate-500` (nunca badge verde) y ordenar siempre al final.
   - `PlayerSplitsView`: soportar `syncUrl`, selector unificado sin acentos (`Todos | Bateadores | Lanzadores`), montaje de `PlayerGeneralStatsCard` y `LeverageSplitsCard`, pestañas/pills para los 6 grupos nuevos y toggle colapsable para la matriz de 12 conteos (`0-0` a `3-2`).

---

## 4. Invariantes y Guardrails

1. **Idioma 100% español:** Toda etiqueta, título, tooltip, leyenda y mensaje de error debe redactarse en español.
2. **Lenguaje deportivo directo:** Cero uso de jerga académica prohibida ni menciones al sistema de rating interno en títulos o tarjetas, y cero métricas de rastreo óptico (`Exit Velocity`, `Launch Angle`, `Barrels`, `Sprint Speed`) en la LVBP.
3. **Convención de temporadas LVBP:** `season=2026` representa la temporada `2026-27` y `season=2025` representa `2025-26`.
4. **Estética Dark Navy y Craft Floor:** Tema `#070B19` / `#0D152B` / borde `#1E2B4D` / acento `#FDB827`, iconos exclusivamente de `lucide-react` (sin emojis como iconos), sin tarjetas anidadas redundantes ni eyebrow chips sobre títulos.
5. **Cero regresiones y compatibilidad estricta:** Nuevos campos en `CollectiveStatsResult` y `PlayerSplitsProfile` son opcionales; pruebas existentes (`player-splits.test.ts`, `plus-stats.test.ts`, etc.) deben seguir pasando intactas.

---

## 5. Criterios de Aceptación

1. **CA-01:** En `/colectivas` (temporada/fase y buscador Stathead por rango de fechas), el selector `Todos | Abridores (SP) | Relevistas (RP)` recalcula filas, KPIs (`MÁS INNINGS (IP)` en `SP`), resumen de liga y deltas interanuales `Δ`, mostrando la nota de `±1 CL` en rango de fechas.
2. **CA-02:** `Ctrl+K` en `Header` y la lupa en `MobileNav` abren el buscador instantáneo sin acentos y navegan a `/jugadores?player={id}&type={batter|pitcher}&season={season}`, sincronizado con `/individuales?tab=splits`.
3. **CA-03:** `/jugadores` despliega la ficha general estilo Baseball-Reference (`2026-27`, `2025-26`, `Total LVBP`, `Avanzadas & Stats+`, Defensa, Game Log), los Splits de Presión (`/api/stats/player-leverage` con `aLI`, `WPA`, `Late & Close` y leyenda LVBP) y los 6 nuevos grupos de splits verificados.
4. **CA-04:** Los splits intra-inning de lanzadores sin `earnedRuns`/`era` muestran `"--"` (`eraAvailable: false`) en tono neutro y ordenan al final.
5. **CA-05:** Todas las pruebas unitarias nuevas y existentes (`collective-pitching-roles.test.ts`, `player-leverage-and-splits.test.ts`, `player-splits.test.ts`), `npx tsc --noEmit`, ESLint, auditoría de copy deportivo y `npm run build` pasan sin errores.
