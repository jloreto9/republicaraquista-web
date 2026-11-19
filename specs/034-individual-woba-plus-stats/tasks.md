# Tareas de Implementación 034: wOBA, FIP y Métricas Ajustadas `Stats+` en Líderes Individuales

**Slug:** `034-individual-woba-plus-stats`  
**Fecha:** 2026-11-18

---

## Track A — Tipos y Capa de Datos

- [x] **T001 [Track A]**: Añadir propiedades opcionales `woba`, `avgPlus`, `obpPlus`, `slgPlus`, `opsPlus`, `wobaPlus`, `wrcPlus` en `BattingStats` y `fip`, `eraPlus`, `whipPlus`, `fipPlus` en `PitchingStats` dentro de `src/types/sports.ts`.
- [x] **T002 [Track A]**: Implementar y exportar `enrichBattingStatsWithPlus` y `enrichPitchingStatsWithPlus` en `src/lib/supabase.ts` (alineadas a constantes LVBP 2025-2026 de `src/lib/awards-engine.ts`), e integrarlas en `aggregateBattingRows`, `aggregatePitchingRows` y ramas `byDateRange` de `getBattingStats`/`getPitchingStats` antes de `minAb`/`minIp`/`limit`.

---

## Track B — Interfaz de Usuario (`/individuales`)

- [x] **T003 [Track B]**: Actualizar `src/components/stats/batting-table.tsx` con selector `Todas | Tradicionales | Avanzadas & Stats+`, leyenda `100 = Promedio LVBP`, comparador seguro con `?? 0`, columna `wOBA` (3 decimales sin cero inicial) y badges semáforo para `AVG+`, `OBP+`, `SLG+`, `OPS+`, `wOBA+`, `wRC+`.
- [x] **T004 [Track B]**: Actualizar `src/components/stats/pitching-table.tsx` con selector `Todas | Tradicionales | Avanzadas & Stats+`, leyenda `100 = Promedio LVBP`, orden ascendente por defecto en `fip` y descendente en `+`, comparador seguro con `?? 0`, columna `FIP` (2 decimales) y badges semáforo para `ERA+`, `WHIP+`, `FIP+`.
- [x] **T005 [Track B]**: Actualizar `src/components/stats/stathead-individual-search.tsx` añadiendo `"fip"` a `ASCENDING_DEFAULT_FIELDS`, helper `compareSortableRows` con fallback `?? 0`, selector de columnas y leyenda en cabecera para `batting`/`pitching`, y columnas ordenables con `StatValueCell` y delta interanual para `wOBA`, `FIP` y todos los `Stats+`.
- [x] **T006 [Track B]**: Redactar los artefactos Spec-Kit (`spec.md`, `plan.md`, `tasks.md`) en `specs/034-individual-woba-plus-stats/`.

---

## Track C — Pruebas y Verificación

- [x] **T007 [Track C]**: Crear pruebas unitarias en `src/lib/__tests__/plus-stats.test.ts` validando cálculo de `wOBA`, `FIP`, índices `Stats+`, casos borde (`0 VB`/`0 IP`) y preservación del orden de filtrado.
- [x] **T008 [Track C]**: Ejecutar suite de pruebas (`plus-stats.test.ts`, `individual-date-range.test.ts`, `awards-engine.test.ts`), ESLint, auditoría de copy deportivo y `npm run build`, y documentar el cierre en `specs/034-individual-woba-plus-stats/implementation.md`.
