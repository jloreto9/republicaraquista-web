# Informe de Implementación y Verificación 034: wOBA, FIP y Métricas Ajustadas `Stats+` en Líderes Individuales

**Slug:** `034-individual-woba-plus-stats`  
**Fecha:** 2026-11-18  
**Estado:** Implementado y Verificado (Converged)

---

## 1. Resumen de Archivos Entregados

### Track A — Tipos y Capa de Datos
- [`src/types/sports.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/types/sports.ts):
  - Añadidas propiedades opcionales en `BattingStats`: `woba`, `avgPlus`, `obpPlus`, `slgPlus`, `opsPlus`, `wobaPlus`, `wrcPlus`.
  - Añadidas propiedades opcionales en `PitchingStats`: `fip`, `eraPlus`, `whipPlus`, `fipPlus`.
- [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts):
  - Definida la constante `LVBP_WOBA_WEIGHTS` alineada con `src/lib/awards-engine.ts` (temporada base LVBP 2025-2026: `bb: 0.69, hbp: 0.72, single: 0.888, double: 1.271, triple: 1.616, hr: 2.101, scale: 1.15`).
  - Exportadas las funciones puras `enrichBattingStatsWithPlus` y `enrichPitchingStatsWithPlus` con manejo seguro de `0 AB`/`0 PA`/`0 IP` y división por cero, clamp `>= 0` y tope `500` en índices de pitcheo (`> 100` siempre indica rendimiento superior al promedio de la liga).
  - Integradas en `aggregateBattingRows`, `aggregatePitchingRows` y las ramas `startDate && endDate` (`mlbOk`) de `getBattingStats` y `getPitchingStats` siempre antes de los cortes `minAb`/`minIp`/`limit`, conservando los filtros `targetTeamId`.

### Track B — Tablas y Buscador en `/individuales`
- [`src/components/stats/batting-table.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/batting-table.tsx):
  - Añadido selector de columnas `Todas` | `Tradicionales` | `Avanzadas & Stats+` (defecto `"all"`) y leyenda visual compacta `100 = Promedio LVBP` con sus 4 rangos de color (`≥130 Élite`, `110–129 Sobre prom.`, `91–109 Promedio`, `1–90 Bajo prom.`).
  - Mantenidas fijas las columnas de identidad (`#`, `JUGADOR`, `EQ`, `JJ`, `AP`) y el slash line (`AVG`, `OBP`, `SLG`, `OPS`); agrupadas bajo vista tradicional las columnas de conteos (`VB`, `CA`, `H`, `2B`, `3B`, `HR`, `CI`, `BB`, `SO`, `GIDP`, `BR`) y bajo vista avanzada `ISO`, `BABIP`, `wOBA` (3 decimales sin cero inicial) y `AVG+`, `OBP+`, `SLG+`, `OPS+`, `wOBA+`, `wRC+` con badges semáforo (`--` en `<= 0` o `undefined`).
  - Actualizado el comparador de ordenamiento con fallback `?? 0` para ordenar campos opcionales de forma segura manteniendo `ops` descendente por defecto.
- [`src/components/stats/pitching-table.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/pitching-table.tsx):
  - Añadido el mismo selector de columnas y leyenda `100 = Promedio LVBP`.
  - Mantenidas fijas las columnas de identidad (`#`, `LANZADOR`, `EQ`, `JJ`, `JI`, `IP`) y tasas base (`ERA`, `WHIP`, `K/9`, `BB/9`, `K/BB`); agrupados los conteos tradicionales (`H`, `C`, `CL`, `BB`, `SO`, `HR`, `GIDP`) y las columnas avanzadas `FIP` (2 decimales), `ERA+`, `WHIP+`, `FIP+` con badges semáforo.
  - Configurado `handleSort` para ordenar ascendente por defecto en `era`, `whip` y `fip`, y descendente por defecto (`false`) en `eraPlus`, `whipPlus`, `fipPlus`, con comparador seguro `?? 0`.
- [`src/components/stats/stathead-individual-search.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/stathead-individual-search.tsx):
  - Añadido `"fip"` a `ASCENDING_DEFAULT_FIELDS` y unificado el comparador en `compareSortableRows` con fallback `?? 0`.
  - Añadido el selector `Todas` | `Tradicionales` | `Avanzadas & Stats+` y la leyenda `100 = Promedio LVBP` en la barra de cabecera cuando `group === "batting"` o `group === "pitching"`.
  - Añadidas columnas ordenables y celdas `StatValueCell` con delta interanual en bateo (`wOBA` 3 dec `positiveIsGood=true`; `AVG+`, `OBP+`, `SLG+`, `OPS+`, `wOBA+`, `wRC+` con badge semáforo + delta 0 dec `positiveIsGood=true`) y en pitcheo (`FIP` 2 dec `positiveIsGood=false`; `ERA+`, `WHIP+`, `FIP+` con badge semáforo + delta 0 dec `positiveIsGood=true`).

### Track C — Pruebas, Especificación y Cierre
- [`src/lib/__tests__/plus-stats.test.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/__tests__/plus-stats.test.ts): suite unitaria con `node:assert/strict` validando inmutabilidad, fórmulas exactas de `wOBA`/`FIP`/`Stats+`, casos borde (`0 AB`, `0 PA`, `0 IP`, división por cero, clamp `>= 0`, tope `500`) y preservación del flujo y orden por defecto en `getBattingStats` y `getPitchingStats`.
- [`specs/034-individual-woba-plus-stats/spec.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/034-individual-woba-plus-stats/spec.md), [`plan.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/034-individual-woba-plus-stats/plan.md) y [`tasks.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/034-individual-woba-plus-stats/tasks.md).

---

## 2. Evidencia Observada de Verificación

- **Pruebas unitarias `wOBA`, `FIP` y `Stats+` (`npx tsx src/lib/__tests__/plus-stats.test.ts`):** **PASS (`exit=0`)**
  - Output observado: `=== TODAS LAS PRUEBAS DE wOBA, FIP Y STATS+ PASARON EXITOSAMENTE ===`.
- **Pruebas de rango de fechas individual (`npx tsx src/lib/__tests__/individual-date-range.test.ts`):** **PASS (`exit=0`)**
  - Output observado: `=== TODAS LAS PRUEBAS DE RANGO DE FECHAS INDIVIDUAL PASARON EXITOSAMENTE ===`.
- **Pruebas del motor de premios LVBP (`npx tsx src/lib/__tests__/awards-engine.test.ts`):** **PASS (`exit=0`)**
  - Output observado: `=== TODAS LAS PRUEBAS DEL MOTOR DE PREMIOS LVBP PASARON EXITOSAMENTE ===`.
- **ESLint sobre los 6 archivos de código/test (`npx eslint src/types/sports.ts src/lib/supabase.ts src/components/stats/batting-table.tsx src/components/stats/pitching-table.tsx src/components/stats/stathead-individual-search.tsx src/lib/__tests__/plus-stats.test.ts`):** **PASS (`exit=0`)** — 0 errores y 0 warnings.
- **Typecheck (`npx tsc --noEmit`):** 0 errores en todos los archivos de Spec 034; únicamente 1 error preexistente ajeno en `src/components/calendar/calendar-event-modal.tsx(218,22)`.
- **Auditoría de lenguaje deportivo (`Select-String` sin términos prohibidos):** **0 coincidencias** en los archivos de código, pruebas y documentos `specs/034-individual-woba-plus-stats/{spec,plan,tasks,implementation}.md`.
- **Compilación de producción (`npm run build`):** **PASS (`exit=0`)** — `Next.js 16.3.6` (Turbopack), `Compiled successfully in 8.2s`, `Generating static pages using 7 workers (19/19) in 3.0s`.
