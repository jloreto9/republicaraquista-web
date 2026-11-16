# Tareas de Implementación 030: Buscador Individual por Rango de Fechas

**Slug:** `030-individual-date-range-search`  
**Fecha:** 2026-11-16

---

## Track A — Capa de Datos y Endpoints API

- [x] **T001 [Track A]**: Implementar helpers compartidos de validación de fechas (`parseStatsDateRange`), cabecera `Cache-Control` (`getStatsCacheControlHeader`) y utilidades numéricas seguras en `src/lib/supabase.ts`.
- [x] **T002 [Track A]**: Extender `getTeamGamesMap(season, phase, startDate?, endDate?)` en `src/lib/supabase.ts` con consulta paralela a MLB `/teams/stats` (`hitting` y `pitching`, `byDateRange`) y fallback a `getCanonicalPlayedGames(season, { phase: "all" })`.
- [x] **T003 [Track A]**: Extender `getBattingStats` y `getPitchingStats` en `src/lib/supabase.ts` con soporte `byDateRange`, manejo seguro de innings de pitcheo (`parseBaseballInningsToDecimal` / `formatDecimalToBaseballInnings`), cálculo/reconstrucción de tasas y fallback a Supabase filtrado por `games.game_date`.
- [x] **T004 [Track A]**: Extender `getFieldingStats` en `src/lib/supabase.ts` con hidratación de `roster/fullSeason` por equipo (`stats(type=byDateRange,group=fielding)`), filtrado de `sport.id === 17` / `LVBP_TEAM_IDS` / `NON_DEFENSIVE_POSITIONS` y reutilización del agregador defensivo.
- [x] **T005 [Track A]**: Actualizar `src/app/api/stats/batting/route.ts`, `src/app/api/stats/pitching/route.ts` y `src/app/api/stats/fielding/route.ts` con validación HTTP 400, paso de `startDate`/`endDate` y `Cache-Control` dinámico VET.

---

## Track B — Interfaz de Usuario (`/individuales`)

- [x] **T006 [Track B]**: Crear `src/components/stats/stathead-individual-search.tsx` con selector de grupo, presets de fechas, comparativa interanual opcional (`Δ`), filtros instantáneos en memoria, 4 KPIs de líderes y tabla ordenable con acceso a splits.
- [x] **T007 [Track B]**: Integrar la pestaña `"stathead"` (`Buscador`) en `src/components/stats/individuales-view.tsx`.

---

## Track C — Pruebas y Verificación

- [x] **T008 [Track C]**: Crear pruebas unitarias en `src/lib/__tests__/individual-date-range.test.ts` cubriendo `getTeamGamesMap`, `getBattingStats`, `getPitchingStats`, `getFieldingStats` y los 3 route handlers.
- [x] **T009 [Track C]**: Ejecutar suite completa de pruebas, `npx tsc --noEmit`, auditoría de copy UI y `npm run build`, y documentar en `specs/030-individual-date-range-search/implementation.md`.
