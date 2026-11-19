# Plan Técnico 034: wOBA, FIP y Métricas Ajustadas `Stats+` en Líderes Individuales

**Slug:** `034-individual-woba-plus-stats`  
**Fecha:** 2026-11-18

---

## 1. Estrategia y Fuente de Verdad

Siguiendo las reglas de fuente única de verdad (`CLAUDE.md`) y minimalismo (`Ponytail`):
- Reutilizar las constantes canónicas LVBP 2025-2026 definidas en `src/lib/awards-engine.ts` (`bb: 0.69, hbp: 0.72, single: 0.888, double: 1.271, triple: 1.616, hr: 2.101, scale: 1.15`) como referencia para `enrichBattingStatsWithPlus` en `src/lib/supabase.ts`.
- Centralizar el enriquecimiento en dos funciones puras exportadas (`enrichBattingStatsWithPlus` y `enrichPitchingStatsWithPlus`) invocadas en los puntos exactos de salida de `src/lib/supabase.ts` (agregadores Supabase y ramas `byDateRange` de MLB Stats API), evitando duplicar cálculos en los endpoints API o componentes UI.
- Mantener los tipos nuevos como propiedades opcionales en `BattingStats` y `PitchingStats` (`src/types/sports.ts`) para garantizar retrocompatibilidad con mocks, pruebas previas y consumidores existentes.
- En la capa UI (`batting-table.tsx`, `pitching-table.tsx`, `stathead-individual-search.tsx`), parametrizar las columnas `Stats+` con arreglos de metadatos (`BATTING_PLUS_COLUMNS`, `PITCHING_PLUS_COLUMNS`) y componentes locales compactos (`PlusStatBadge`) para evitar JSX repetido y mantener cambios acotados a los archivos existentes.

---

## 2. Arquitectura y Flujo de Datos

```text
[Supabase batting_stats/pitching_stats | MLB Stats API byDateRange]
   │ Pool completo de liga (sin filtro minAb / minIp / limit)
   ▼
[src/lib/supabase.ts]
   ├─ enrichBattingStatsWithPlus(pool)  ──► Calcula wOBA + AVG+/OBP+/SLG+/OPS+/wOBA+/wRC+
   └─ enrichPitchingStatsWithPlus(pool) ──► Calcula FIP + ERA+/WHIP+/FIP+ (escala >100 mejor)
   │ Aplica targetTeamId / minAb / minIp / limit
   ▼
[/api/stats/batting | /api/stats/pitching | Server Props]
   ▼
[UI /individuales]
   ├─ BattingTable              (Selector Todas|Tradicionales|Avanzadas & Stats+, semáforo)
   ├─ PitchingTable             (Selector, sort ascendente en FIP, semáforo)
   └─ StatheadIndividualSearch  (Selector en cabecera, sort seguro, StatValueCell con Δ)
```

---

## 3. Archivos Afectados

### Track A — Tipos y Capa de Datos (`data-engine`)
- `src/types/sports.ts`: campos opcionales en `BattingStats` y `PitchingStats`.
- `src/lib/supabase.ts`: `enrichBattingStatsWithPlus`, `enrichPitchingStatsWithPlus` e integración antes de cortes en `aggregateBattingRows`, `getBattingStats` (`byDateRange`), `aggregatePitchingRows` y `getPitchingStats` (`byDateRange`).

### Track B — Tablas y Buscador UI (`ui-tables`)
- `src/components/stats/batting-table.tsx`: selector de columnas, leyenda `100 = Promedio LVBP`, comparador seguro con `?? 0`, columnas `wOBA` y `Stats+` con semáforo.
- `src/components/stats/pitching-table.tsx`: selector de columnas, leyenda `100 = Promedio LVBP`, ordenamiento ascendente por defecto en `fip`, descendente en `+`, comparador seguro con `?? 0`, columnas `FIP` y `Stats+`.
- `src/components/stats/stathead-individual-search.tsx`: `"fip"` en `ASCENDING_DEFAULT_FIELDS`, helper `compareSortableRows`, selector de columnas y leyenda en cabecera de tabla para bateo/pitcheo, y columnas ordenables con `StatValueCell` + deltas interanuales.

### Track C — Pruebas, Especificación y Verificación (`data-engine` + `verifier`)
- `src/lib/__tests__/plus-stats.test.ts` **[NEW]**
- `specs/034-individual-woba-plus-stats/spec.md`, `plan.md`, `tasks.md` **[NEW]**
- `specs/034-individual-woba-plus-stats/implementation.md` **[NEW — post-verificación]**

---

## 4. Plan de Rollback

1. Las propiedades añadidas a `BattingStats` y `PitchingStats` son opcionales, y las tablas UI renderizan `--` ante ausencia o valor `<= 0`.
2. Para revertir en caso necesario, basta revertir los commits de `src/lib/supabase.ts`, `src/types/sports.ts` y los tres componentes bajo `src/components/stats/` sin migraciones ni impacto en esquemas de Supabase.
