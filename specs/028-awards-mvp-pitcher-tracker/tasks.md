# Tareas de Implementación 028: Carrera por los Premios LVBP (MVP y Pitcher del Año)

**Slug:** `028-awards-mvp-pitcher-tracker`  
**Fecha:** 2026-11-16

---

## Track A — Capa de Datos y API Routes

- [x] **T001 [Track A]**: Añadir `hbp?: number` a `PitchingStats` en `src/types/sports.ts`.
- [x] **T002 [Track A]**: En `src/lib/supabase.ts`, crear `fetchMlbSeasonPitchingMetaMap` (compartiendo `fetchMlbSeasonStatsSplits`), poblar `gamesStarted`, `wins`, `losses`, `saves` y `hbp` en `getPitchingStats`, y retornar `teamWinPctMap` desde `getTeamGamesMap`.
- [x] **T003 [Track A]**: Actualizar `src/app/api/stats/batting/route.ts` y `src/app/api/stats/pitching/route.ts` para devolver `teamWinPctMap` y usar `limit = 500` por defecto.

---

## Track B — Motor Analítico de Premios

- [x] **T004 [Track B]**: Implementar `src/lib/awards-engine.ts` con cálculo de entorno de liga (`lgwOBA`, `(R/PA)_lg`, `lgERA`, `cFIP`), elegibilidad (`3.1 AP/J` y `0.8 IP/J` con fallback progresivo), ponderación híbrida (0–100 pts) e insignias de liderato.

---

## Track C — Interfaz `/individuales`

- [x] **T005 [Track C]**: Implementar `src/components/stats/awards-view.tsx` en 2 columnas (`Jugador Más Valioso` y `Pitcher del Año`) con Tarjeta Hero #1, callout `Referente Caraquista en la Carrera` y tabla `#2 al #10`.
- [x] **T006 [Track C]**: Integrar la pestaña `"Premios"` en `src/components/stats/individuales-view.tsx`, actualizar `src/components/stats/stats-filters.tsx` y pasar `initialTeamWinPctMap` en `src/app/individuales/page.tsx`.

---

## Track D — Pruebas y Verificación

- [x] **T007 [Track D]**: Crear `src/lib/__tests__/awards-engine.test.ts` y ejecutar pruebas unitarias (`npx tsx`), verificación de no-regresión en `player-splits.test.ts`, ESLint y `npm run build`.
- [x] **T008 [Track D]**: Actualizar `tasks.md` e `implementation.md` con los resultados observados y crear `walkthrough.md`.
