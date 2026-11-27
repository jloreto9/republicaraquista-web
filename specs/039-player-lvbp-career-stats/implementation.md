# Informe de Implementación — Spec 039: Historial de por vida LVBP en `/jugadores`

**Feature Slug:** `039-player-lvbp-career-stats`  
**Fecha:** 2026-11-26  
**Dictamen:** **CONVERGED**

---

## 1. Cambios Realizados

- `src/types/player-splits.ts`:
  - Exportados `CareerDataSource`, `PlayerCareerSeasonEntry<T>`, `PlayerCareerPostseasonEntry<T>` y `PlayerLvbpCareerResult`.
- `src/lib/player-career-service.ts` *(nuevo)*:
  - Módulo 100% client-safe (sin importar `./player-splits-service` ni `./supabase`; `parseInningsStringToOuts` y `outsToInningsDisplay` locales).
  - Implementados `fetchMlbLvbpYearByYear` (`sportId=17&leagueId=135`), `normalizeMlbCareerBatting`, `normalizeMlbCareerPitching` (agrupación multi-equipo `2EQ`/`3EQ` + `isTeamSplit`, cálculo exacto de tasas/outs, `wOBA`/`FIP`/`Stats+` en `undefined`), `mergeRegularCareerSeasons`, `mergePostseasonCareerSeasons`, `getPlayerLvbpCareer` (caché en memoria de 1h) y `clearPlayerCareerCache`.
- `src/app/api/stats/player-career/route.ts` *(nuevo)*:
  - Endpoint `GET` (`dynamic = "force-dynamic"`) con validación estricta de `player_id` y `type`, cabecera `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` y respuestas de error en español.
- `src/components/stats/splits/player-general-stats-card.tsx`:
  - Hidratación paralela no bloqueante con caché `clientCareerCache`, estado derivado seguro en React 19 y `fetch` con `AbortController` a `/api/stats/player-career`.
  - Fusión inmediata Supabase + MLB Stats API mediante `mergeRegularCareerSeasons` y `mergePostseasonCareerSeasons` sin bloquear las temporadas activas.
  - Renderizado multi-equipo estilo Baseball-Reference (`isCombined` con pill `2EQ`, `isTeamSplit` indentado con `↳ Club` y claves React únicas por temporada/fase/equipo).
  - Totales blindados sin doble conteo (`!s.isTeamSplit`), `weightedAverageIfComplete` para `wOBA`/`FIP`/`Stats+` (`--` salvo cobertura completa en todas las temporadas contabilizadas), etiquetas `Total de por vida LVBP (N temp.)` y `Total Postemporada LVBP (N temp.)`, pill de carga y barra resumen de carrera.
- `src/lib/__tests__/player-career.test.ts` *(nuevo)*:
  - Suite de pruebas unitarias e integración cubriendo filtro `leagueId=135`, temporadas multi-equipo (`2EQ` + `MAG`/`MAR`) con y sin fila combinada, fusión Supabase + MLB API (regular y postemporada), aritmética exacta de outs y smoke test en vivo contra MLB Stats API.

---

## 2. Verificación Ejecutada

- `npx tsx src/lib/__tests__/player-career.test.ts`: **PASS** (exit code `0`) — valida filtro estricto `leagueId=135`, multi-equipo `2EQ` + `MAG`/`MAR` sin doble conteo, merge Supabase + MLB API, `27.1` + `26.2` = `162` outs = `54.0` IP, y smoke test en vivo con Wilfredo Tovar (`541600`: 15 temp., 9 postemp.) y Erick Leal (`612797`: 9 temp.).
- `npx tsx src/lib/__tests__/player-splits.test.ts`: **PASS** (exit code `0`).
- `npx eslint src/types/player-splits.ts src/lib/player-career-service.ts src/app/api/stats/player-career/route.ts src/components/stats/splits/player-general-stats-card.tsx src/lib/__tests__/player-career.test.ts`: `exit 0` (0 errores, 0 warnings).
- `npx tsc --noEmit`: 0 errores en los archivos creados/modificados (reportados en `#5` y `#8`; 5 errores preexistentes no relacionados en `calendar-event-modal.tsx`, `game-center-view.tsx` y `scorecard-base-outs.test.ts`).
- `npm run build` (Next.js 16.3.6 Turbopack): `exit 0`, compilado en 12.1s con 19/19 páginas generadas incluyendo `/api/stats/player-career` y `/jugadores`.
