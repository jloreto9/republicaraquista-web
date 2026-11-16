# Spec 026: Sincronización Canónica Post-Juego en Tiempo Real (`MLB Stats API` + `Supabase`)

**Slug:** `026-realtime-postgame-sync`  
**Autor:** Spec-Kit Swarm & Jorge Leonardo Loreto  
**Fecha:** 2026-11-16  
**Estado:** Especificado (Fase 1 de Spec-Kit)  
**Relacionados:** [Spec 022](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/022-doubleheader-suspended-games-resilience/spec.md) · [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts) · [`src/lib/leones-stats-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/leones-stats-service.ts) · [`src/lib/streaks-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/streaks-service.ts) · [`src/lib/game-feed-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/game-feed-service.ts) · [`src/components/layout/live-ticker.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/layout/live-ticker.tsx)

---

## 1. Contexto y Problema

Cuando finaliza un encuentro de la LVBP (out 27), **MLB Stats API** (`/api/v1/schedule` y `/api/v1.1/game/{gamePk}/feed/live`) refleja inmediatamente el estado `Final` (o `Completed` / `Completed Early` / `Game Over`), el marcador definitivo y el boxscore completo. Sin embargo, los consumidores analíticos de **REPUBLICARAQUISTAPP** dependían de consultas directas a la tabla `games` y a `batting_stats` / `pitching_stats` en **Supabase**, generando una brecha de sincronización hasta que el cron diario o de madrugada ejecutara `update_daily.py`:

1. **Desfase post-juego en métricas colectivas y standings:** Las vistas de Posiciones, ELO, RS/RA/DIF, Home/Away, L10, Expectativa Pitagórica y KPIs de temporada mostraban récords congelados mientras Supabase mantuviera el encuentro como `Scheduled`.
2. **Desfase en analítica de Leones del Caracas y rachas:** `getLeonesAdvancedStats`, `getHeadToHeadRecords`, `getWeeklyRecords`, `getBroadcastChannelRecords`, `getLastGameDetail`, `getRecentTrends`, `getStreaksData` y `getTeamPlayedGames` (WPA, Situacional LOB, Spray Charts, Bullpen) leían únicamente filas persistidas en Supabase, omitiendo juegos recién finalizados y la participación real de peloteros (ej. `José Rondón`, `JOSE_RONDON_ID`) o líderes de bateo y pitcheo.
3. **Ausencia de reconciliación automática y write-through:** No existía una capa canónica única que combinara Supabase + MLB Stats API con extracción de boxscores desde `feed/live`, caché en memoria con TTL de 60 segundos y persistencia write-through segura vía `supabaseAdmin`.
4. **Falta de refresco reactivo en UI al concluir un juego en vivo:** El `LiveTicker` detectaba el cambio visual en la cinta superior, pero la ruta activa del App Router no ejecutaba `router.refresh()` al producirse la transición `Live -> Final`.
5. **Brechas en la ingesta batch (`update_daily.py`):** `update_yesterdays_games` excluía la fecha actual (`today`) y `update_todays_games` no disparaba `update_game_stats` ni aplicaba deduplicación estricta por `gamePk` en todos los flujos.

---

## 2. Requerimientos Funcionales

### RF-01: Capa Canónica de Reconciliación y Write-Through (`src/lib/supabase.ts`)
- Exportar `FINALIZED_GAME_STATUSES = ["Final", "Completed", "Completed Early", "Game Over"]` y `clearCanonicalSyncCache(): void` (para aislamiento determinista en pruebas).
- Exportar `getCanonicalSeasonGames(season = ACTIVE_SEASON, phase = "regular"): Promise<SupabaseGameRow[]>`:
  - Consultar en paralelo `supabase.from("games").select("*").eq("season", season)` y `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${season}` (`AbortSignal.timeout(5000)`, `next: { revalidate: 60 }`), protegido por caché en memoria con **TTL de 60 segundos** y deduplicación de promesas en vuelo (*in-flight deduplication*).
  - Mapear `gameType` de MLB (`R` → `regular`, `D` → `wildcard_playin`, `L` → `round_robin`, `W`/`F` → `final`) y filtrar por la fase solicitada (`regular`/`R`, `round_robin`/`L`, `final`/`F`/`W`, `all`).
  - Deduplicar estrictamente por `id` (`gamePk`), preservando siempre `officialDate` (con normalización VET UTC-4 cuando corresponda) y priorizando estados finalizados > estados en vivo > `Scheduled`/`Postponed`.
  - Para juegos finalizados en MLB Stats API que falten en Supabase, no estén finalizados en BD o carezcan de boxscores, consultar `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live` (`AbortSignal.timeout(8000)`), extraer `players`, `batting_stats` y `pitching_stats` mediante el helper exportado `extractBoxscoreRowsFromFeed(feed, season, phase)`, almacenarlos en `reconciledBoxscoreCache` (indexado por `gamePk`) y ejecutar upserts write-through usando `supabaseAdmin` únicamente cuando exista `SUPABASE_SERVICE_ROLE_KEY` o `supabaseAdmin !== supabase`.
  - Garantizar resiliencia en los upserts write-through: deduplicar payloads por clave de conflicto (`id` para `games`/`players`; `game_id-player_id` para `batting_stats`/`pitching_stats`), incluir reintento fila por fila en caso de fallo de lote y capturar errores sin interrumpir las lecturas.
- Exportar `getCanonicalPlayedGames(season = ACTIVE_SEASON, options?: { phase?: string; teamId?: number; includeLive?: boolean }): Promise<SupabaseGameRow[]>`.
- Exportar `getCanonicalGameBoxscoreRows(season: number, gameIds: number[], teamId?: number): Promise<{ battingRows: any[]; pitchingRows: any[] }>` combinando filas de Supabase y `reconciledBoxscoreCache` deduplicadas por `game_id-player_id`.
- Actualizar `getStandings`, `getScheduledGames`, `getRecentGames`, `getSeasonKPIs`, `getBattingStats` y `getPitchingStats` para consumir la capa canónica y reflejar inmediatamente en **≤ 60 segundos** post-out 27: `runsScored`, `runsAllowed`, `runDifferential`, `Home/Away`, `L10`, `Pythagorean`, `eloRating`, KPIs y líderes individuales.

### RF-02: Consumidores de Leones, Rachas y Game Feed
- **`src/lib/leones-stats-service.ts`**:
  - Migrar `getLeonesAdvancedStats`, `getWeeklyRecords`, `getLastGameDetail`, `getRecentTrends`, `getBroadcastChannelRecords` y `getHeadToHeadRecords` a `getCanonicalPlayedGames(season, { phase: "regular", teamId: 695 })`.
  - En `getLeonesAdvancedStats`, determinar `withRondon` / `withoutRondon` combinando `getCanonicalGameBoxscoreRows` y `feed.liveData.boxscore` para acreditar participación de `JOSE_RONDON_ID` (`ab + bb + hbp + sf + sh + r + sb > 0`) inmediatamente tras finalizar el encuentro.
  - En `getLastGameDetail`, usar `getCanonicalGameBoxscoreRows` (con fallback a `feed.liveData.boxscore`) para calcular `topBatter`, `topPitcher` y `mvp` sin espera de cron.
  - En `getBroadcastChannelRecords`, usar `season` dinámico (sin hardcodear `2026`) y `getVenezuelanDate(g.game_date, g.game_datetime)` para emparejar transmisiones bajo horario VET UTC-4, funcionando incluso si `supabase` no está configurado.
- **`src/lib/streaks-service.ts`**:
  - Actualizar `getStreaksData(season)` para obtener partidos vía `getCanonicalPlayedGames(season, { phase: "regular" })` y boxscores vía `getCanonicalGameBoxscoreRows(season, gameIdList, LEONES_ID)`, preservando `BASELINE_2025_STREAKS` cuando `season === 2025`.
- **`src/lib/game-feed-service.ts`**:
  - Actualizar `getTeamPlayedGames(season, teamId)` para usar `getCanonicalPlayedGames(season, { phase: "all", teamId, includeLive: true })` ordenado descendentemente por `game_date`/`game_datetime`.

### RF-03: Auto-Refresco Reactivo `Live -> Final` (`src/components/layout/live-ticker.tsx`)
- Importar `useRouter` desde `next/navigation`.
- Rastrear los `gamePk` previamente en vivo mediante `prevLiveGameIdsRef = useRef<Set<number>>(new Set())`.
- En `fetchTicker`, al recibir `json.games`, detectar si algún `gamePk` que estaba en `prevLiveGameIdsRef.current` pasó a `!g.isLive && g.status === "Final"`, actualizar la referencia con los juegos actualmente en vivo y disparar `router.refresh()` una sola vez por transición.
- Mantener el arreglo de dependencias de `useEffect` libre de estado mutado por el fetch (prevención estricta de bucles infinitos según Lección 5).

### RF-04: Ingesta Batch en `RepubliCaraquistApp/scripts/update_daily.py`
- En `update_yesterdays_games(days_back=3)`: incluir el día en curso (`end_date = today`), deduplicar estrictamente por `gamePk` priorizando estados finalizados sobre `Scheduled`/`Postponed` (Lección 7) y ejecutar `update_game_stats(game_id)` para cualquier estado en `["Final", "Completed", "Completed Early", "Game Over"]`.
- En `update_todays_games()`: deduplicar por `gamePk` y ejecutar `update_game_stats(game_id)` cuando el juego alcance estado finalizado.

---

## 3. Invariantes y Guardrails Obligatorios

1. **Normalización VET (UTC-4) y Primacía de `officialDate` (Lección 4):** Toda asignación de `game_date` prioriza `officialDate` de MLB Stats API; cualquier cruce por fecha en consumidores nocturnos usa `getVenezuelanDate(g.game_date, g.game_datetime)` para evitar desplazamientos de medianoche UTC.
2. **Deduplicación Estricta por `gamePk` (Lección 7):** En juegos suspendidos/reprogramados donde MLB retorna el mismo `gamePk` en múltiples fechas (`Postponed` y `Final`), debe sobrevivir una única entrada canónica priorizando estado finalizado > en vivo > programado/pospuesto y `officialDate` más reciente.
3. **Deduplicación de Boxscores (`game_id-player_id`):** Tanto en caché en memoria (`reconciledBoxscoreCache`) como en cargas hacia/desde Supabase, no deben producirse filas duplicadas de bateo o pitcheo por jugador y juego.
4. **Seguridad en Write-Through (`supabaseAdmin`):** Las escrituras solo ocurren si `supabaseAdmin` cuenta con permisos administrativos (`SUPABASE_SERVICE_ROLE_KEY` o instancia distinta al cliente anónimo); fallos de escritura nunca rompen la lectura.
5. **Presupuesto de Latencia y Caché (60s TTL):** TTL de 60 segundos + deduplicación de promesas en vuelo en `getCanonicalSeasonGames`, más timeouts acotados (`5000ms` para `/schedule`, `8000ms` para `/feed/live`).
6. **Prevención de Bucles Infinitos en React (Lección 5):** Prohibido incluir estado mutado por `fetchTicker` dentro del arreglo de dependencias de `useEffect`.
7. **Idioma e Interfaz:** Cero textos `"sabermétrico/a"` en UI, acceso defensivo con `.get()`/optional chaining y cero métricas Statcast en LVBP.

---

## 4. Criterios de Aceptación

1. **CA-01 (Reconciliación Post-Juego Inmediata):** Cuando MLB `/api/v1/schedule` reporta un juego como `Final` mientras Supabase aún lo mantiene en `Scheduled` (o vacío), `getCanonicalPlayedGames`, `getStandings` (`runsScored`, `runsAllowed`, `runDifferential`, `eloRating`), `getLeonesAdvancedStats`, `getHeadToHeadRecords`, `getWeeklyRecords`, `getBroadcastChannelRecords` y `getStreaksData` reflejan el juego recién finalizado de forma inmediata.
2. **CA-02 (Boxscores y Participación desde `feed/live`):** `extractBoxscoreRowsFromFeed` y `getCanonicalGameBoxscoreRows` extraen filas de bateo y pitcheo (incluyendo participación de José Rondón) sin duplicados por `game_id-player_id`.
3. **CA-03 (Deduplicación de `gamePk` Reprogramados):** Juegos pospuestos/reprogramados con el mismo `gamePk` se consolidan en un único registro priorizando `Final` y `officialDate`.
4. **CA-04 (TTL 60s y Write-Through Seguro):** La caché de 60s evita ráfagas repetidas dentro de la ventana TTL, `clearCanonicalSyncCache()` la reinicia limpiamente en pruebas y las escrituras con `supabaseAdmin` no degradan lecturas ante errores.
5. **CA-05 (Refresco Live -> Final + Compilación):** `live-ticker.tsx` invoca `router.refresh()` únicamente en transición `Live -> Final` sin loops de `useEffect`; `update_daily.py` compila con `python -m py_compile`; la suite de pruebas y `npm run build` pasan sin errores.
