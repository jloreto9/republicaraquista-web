# Tareas de Implementación 037: Integridad Total de Estadísticas LVBP, Paginación Determinística y Corrección de Outs/Exhibición

**Slug:** `037-stats-integrity-audit-pagination`  
**Fecha:** 2026-11-26  
**Referencia:** [`assessment.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/.specify/bugs/stats-truncation-audit/assessment.md) · [`spec.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/037-stats-integrity-audit-pagination/spec.md) · [`plan.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/037-stats-integrity-audit-pagination/plan.md)

---

## Track A — Auditoría (`@auditor`) y Spec-Kit (`@speckit`)

- [x] **T001 [Track A]**: Ejecutar auditoría multi-fuente de solo lectura (`#6`: query truncada vs Supabase paginado vs MLB Stats API vs TuJonrón) e inventariar causas raíz, esquema PK y todos los consumidores en `republicaraquista-web` y repositorios hermanos.
- [x] **T002 [Track A]**: Redactar y versionar `.specify/bugs/stats-truncation-audit/assessment.md`, `specs/037-stats-integrity-audit-pagination/spec.md`, `plan.md` y `tasks.md`.

---

## Track B — Núcleo Supabase, Paginación Determinística y Outs Exactos (`@fixer`)

- [x] **T003 [Track B]**: Implementar y exportar `fetchAllSupabasePages` (paginación determinística por `.order("id", { ascending: true })`, `{ count: "exact" }`, carga paralela acotada y fallback seguro para mocks sin `.range()`/`.order()`), junto con helpers `isExhibitionGameType` y `toCanonicalMlbGameType` en `src/lib/supabase.ts`.
- [x] **T004 [Track B]**: Actualizar `filterGamesByPhase` y `reconcileSeasonGames` en `src/lib/supabase.ts` para paginar `games`, excluir exhibición en `phase="all"` y persistir `game_type` canónico (`"R"`, `"L"`, `"F"`, `"D"`, `"E"`) en write-through manteniendo lectura retrocompatible de `["R", "regular"]`.
- [x] **T005 [Track B]**: Actualizar `getCanonicalGameBoxscoreRows` en `src/lib/supabase.ts` con chunking de `targetGameIds` + `fetchAllSupabasePages` ordenado por `"id"`, manteniendo deduplicación con `reconciledBoxscoreCache`.
- [x] **T006 [Track B]**: Reemplazar `.limit(10000)` en `getBattingStats` y `getPitchingStats` (rango de fechas y temporada completa) por `fetchAllSupabasePages` ordenado por `"id"`, excluyendo juegos de exhibición `'E'`/`'e'`/`'exhibition'` cuando `phase === "all"`.
- [x] **T007 [Track B]**: Corregir `aggregatePitchingRows` en `src/lib/supabase.ts` para acumular **outs enteros exactos** (`outs / 3`) y calcular `inningsPitched`, `inningsDisplay`, `era`, `whip`, `kPer9` y `bbPer9` sin deriva de redondeo `.toFixed(1)`.

---

## Track C — Consumidores Secundarios en `src/lib/` y `src/app/api/` (`@fixer`)

- [x] **T008 [Track C]**: Actualizar `src/lib/player-splits-service.ts` (`getPlayerSplitsProfile` y `getAllAvailablePlayersForSplits`) para usar `fetchAllSupabasePages` ordenado por `"id"` y excluir juegos de exhibición `'E'`/`'e'`/`'exhibition'`.
- [x] **T009 [Track C]**: Actualizar `src/lib/park-factors-service.ts` (`fetchSupabaseBoxscoreGames`) para paginar `games` sin `.limit(2000)` y ordenar por `"id"` las consultas paginadas de `batting_stats`.
- [x] **T010 [Track C]**: Actualizar `src/lib/player-leverage-service.ts`, `src/app/api/pitching/search/route.ts` y `src/lib/season-service.ts` para paginar determinísticamente con `fetchAllSupabasePages` (donde aplica) y excluir juegos de exhibición `'E'`/`'e'`/`'exhibition'`.

---

## Track D — Suite de Regresión y Verificación Integral (`@fixer` + `@verifier` + `@speckit`)

- [x] **T011 [Track D]**: Crear y ejecutar `src/lib/__tests__/stats-pagination-integrity.test.ts` validando paginación multipágina (`>10,000` filas / caso Víctor Bericoto `7 HR`), compatibilidad con mocks sin `.range()`/`.order()`, deduplicación con `reconciledBoxscoreCache`, suma exacta de outs/IP, exclusión de `'E'`/`'e'` y write-through `"R"`.
- [x] **T012 [Track D]**: Ejecución por `@verifier` de `git diff`, todas las pruebas unitarias en `src/lib/__tests__/`, `npm run lint`, `npm run build` y validación en vivo (`getBattingStats`, `getPitchingStats`, `getCanonicalGameBoxscoreRows` vs MLB Stats API y TuJonrón, incluyendo Víctor Bericoto y lista de afectados de `#6`).
- [x] **T013 [Track D]**: Redactar `specs/037-stats-integrity-audit-pagination/implementation.md` con los resultados reales observados, marcar `tasks.md` completado y reportar `@coordinator [done]`.
