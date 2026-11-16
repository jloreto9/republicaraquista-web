# Tareas de Implementación 026: Sincronización Canónica Post-Juego en Tiempo Real

**Slug:** `026-realtime-postgame-sync`  
**Fecha:** 2026-11-16  

---

## Track A — Capa Canónica de Reconciliación (`src/lib/supabase.ts`)

- [x] **T001 [Track A]**: Exportar `FINALIZED_GAME_STATUSES` y `clearCanonicalSyncCache()` en `src/lib/supabase.ts`.
- [x] **T002 [Track A]**: Implementar `getCanonicalSeasonGames`, `extractBoxscoreRowsFromFeed`, `reconciledBoxscoreCache`, caché TTL 60s con deduplicación in-flight, deduplicación por `gamePk` (`Final > Live > Scheduled/Postponed` y `officialDate`) y write-through seguro con `supabaseAdmin`.
- [x] **T003 [Track A]**: Exportar `getCanonicalPlayedGames` y `getCanonicalGameBoxscoreRows`, y actualizar `getStandings`, `getScheduledGames`, `getRecentGames`, `getSeasonKPIs`, `getBattingStats` y `getPitchingStats` para consumir la capa canónica.

---

## Track B — Consumidores Analíticos (`leones-stats-service.ts`, `streaks-service.ts`, `game-feed-service.ts`)

- [x] **T004 [Track B]**: Actualizar `src/lib/leones-stats-service.ts` (`getLeonesAdvancedStats`, `getWeeklyRecords`, `getLastGameDetail`, `getRecentTrends`, `getBroadcastChannelRecords`, `getHeadToHeadRecords`) con `getCanonicalPlayedGames`, `getCanonicalGameBoxscoreRows`, acreditación de `JOSE_RONDON_ID` desde `feed.liveData.boxscore`, `season` dinámico y `getVenezuelanDate`.
- [x] **T005 [Track B]**: Actualizar `getStreaksData` en `src/lib/streaks-service.ts` y `getTeamPlayedGames` en `src/lib/game-feed-service.ts` para usar la capa canónica preservando `BASELINE_2025_STREAKS`.

---

## Track C — UI Auto-Refresh e Ingesta Batch (`live-ticker.tsx`, `update_daily.py`)

- [x] **T006 [Track C]**: Actualizar `src/components/layout/live-ticker.tsx` con `useRouter` + `prevLiveGameIdsRef` para disparar `router.refresh()` en transiciones `Live -> Final` sin introducir bucles de `useEffect`.
- [x] **T007 [Track C]**: Actualizar `RepubliCaraquistApp/scripts/update_daily.py` (`end_date = today`, deduplicación por `gamePk` y `update_game_stats` en juegos finalizados).

---

## Track D — Spec-Kit, Pruebas y Verificación Independiente

- [x] **T008 [Track D]**: Crear los artefactos canónicos de Spec-Kit en `specs/026-realtime-postgame-sync/` (`spec.md`, `plan.md`, `tasks.md`, `implementation.md`).
- [x] **T009 [Track D]**: Implementar y ejecutar `src/lib/__tests__/realtime-postgame-sync.test.ts` validando reconciliación post-juego, standings/ELO, consumidores de Leones, rachas, extracción/fusión de boxscores y deduplicación de `gamePk` reprogramados.
- [x] **T010 [Track D]**: Ejecutar verificación independiente (`npm run build`, suite de pruebas, `python -m py_compile` y auditoría de diff) y cerrar `implementation.md`.
