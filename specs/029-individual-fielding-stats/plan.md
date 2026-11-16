# Plan Técnico 029: Estadísticas Individuales de Fildeo y Defensa

**Slug:** `029-individual-fielding-stats`  
**Fecha:** 2026-11-16

---

## 1. Estrategia y Fuente de Verdad

- Reutilizar `fetchMlbSeasonStatsSplits` en `src/lib/supabase.ts` para consultar `group=fielding` de MLB Stats API (`sportId=17&leagueId=135`) sin duplicar lógica HTTP ni crear tablas auxiliares innecesarias.
- Reutilizar `getTeamGamesMap`, `getTeam`, `getPlayerHeadshotUrl`, `getMlbFallbackHeadshotUrl` y el patrón de `BattingTable`/`PitchingTable`.

---

## 2. Archivos Afectados

- `src/types/sports.ts`: ampliar `FieldingStats`.
- `src/lib/supabase.ts`: ampliar `fetchMlbSeasonStatsSplits`, agregar `parseBaseballInningsToDecimal`, `formatDecimalToBaseballInnings` y `getFieldingStats`.
- `src/app/api/stats/fielding/route.ts` **[NEW]**: endpoint serverless `GET /api/stats/fielding`.
- `src/components/stats/fielding-table.tsx` **[NEW]**: tabla ordenable con filtro por posición, búsqueda y columnas de receptoría.
- `src/components/stats/stats-filters.tsx`: habilitar switch de calificados (`TC mín.`) para `activeTab === "fielding"`.
- `src/components/stats/individuales-view.tsx`: integrar estado `fieldingStats`, fetch por temporada/fase, filtro por equipo/calificados y `<FieldingTable />`.
- `src/app/individuales/page.tsx`: precargar `initialFieldingStats`.
- `src/lib/__tests__/fielding-stats.test.ts` **[NEW]**: pruebas unitarias con `fetch` mockeado y auditoría de copy UI.
