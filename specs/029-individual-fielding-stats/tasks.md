# Tareas de Implementación 029: Estadísticas Individuales de Fildeo

**Slug:** `029-individual-fielding-stats`  
**Fecha:** 2026-11-16

---

## Track A — Tipos, Capa de Datos y API

- [x] **T001 [Track A]**: Ampliar `FieldingStats` en `src/types/sports.ts`.
- [x] **T002 [Track A]**: Ampliar `fetchMlbSeasonStatsSplits` e implementar `parseBaseballInningsToDecimal`, `formatDecimalToBaseballInnings` y `getFieldingStats` en `src/lib/supabase.ts`.
- [x] **T003 [Track A]**: Crear `src/app/api/stats/fielding/route.ts`.

---

## Track B — Interfaz de Fildeo en `/individuales`

- [x] **T004 [Track B]**: Crear `src/components/stats/fielding-table.tsx` con filtro de posiciones, buscador, columnas ordenables, soporte para receptores (`CS`, `SB`, `CS%`, `PB`) y resaltado de Leones.
- [x] **T005 [Track B]**: Actualizar `src/app/individuales/page.tsx`, `src/components/stats/stats-filters.tsx` y `src/components/stats/individuales-view.tsx` para reemplazar el placeholder por `<FieldingTable />`.

---

## Track C — Pruebas y Verificación

- [x] **T006 [Track C]**: Crear `src/lib/__tests__/fielding-stats.test.ts` y ejecutar `fielding-stats.test.ts`, `awards-engine.test.ts`, `player-splits.test.ts`, ESLint y `npm run build`.
- [x] **T007 [Track C]**: Actualizar `tasks.md`, `implementation.md` y `walkthrough.md` con la evidencia observada.
