# Plan Técnico 037: Integridad Total de Estadísticas LVBP, Paginación Determinística y Corrección de Outs/Exhibición

**Slug:** `037-stats-integrity-audit-pagination`  
**Fecha:** 2026-11-26  
**Referencia Bug Assessment:** [`.specify/bugs/stats-truncation-audit/assessment.md`](file:///c:/Users/Administrator/Projets/republicaraquista-web/.specify/bugs/stats-truncation-audit/assessment.md)

---

## 1. Estrategia, Fuente de Verdad y Escalera Ponytail

Siguiendo la jerarquía de prioridades (`CLAUDE.md`) y la Escalera Ponytail (`ponytail.md`):
1. **Un solo helper compartido (`fetchAllSupabasePages`):** Evitar bucles de paginación ad-hoc en cada servicio. `src/lib/supabase.ts` expondrá `fetchAllSupabasePages` para que lo reutilicen tanto sus propias funciones (`reconcileSeasonGames`, `getCanonicalGameBoxscoreRows`, `getBattingStats`, `getPitchingStats`) como los demás servicios (`player-splits-service.ts`, `park-factors-service.ts`, `season-service.ts`, `api/pitching/search/route.ts`).
2. **Orden determinístico sin empates:** Todas las tablas involucradas (`batting_stats`, `pitching_stats`, `games`) poseen clave primaria única `id`. Ordenar por `.order("id", { ascending: true })` garantiza particiones disjuntas entre páginas `.range(from, to)`.
3. **Baja latencia en Vercel mediante fan-out paralelo acotado:**
   - La página 0 solicita `.range(0, pageSize - 1)` con `{ count: "exact" }` (o equivalente sobre el builder).
   - Si `count > pageSize`, se calculan los rangos restantes y se ejecutan en paralelo con concurrencia acotada (`mapWithConcurrency`, ya existente en `src/lib/supabase.ts`), minimizando el tiempo total respecto a un bucle secuencial.
   - Si el builder es un mock de test sin `.range()` o `.order()`, se ejecuta directamente en una sola llamada para preservar compatibilidad al 100% con los tests existentes.
4. **Corrección en la fuente de verdad aritmética:** Reutilizar `parseBaseballInningsToDecimal` y `formatDecimalToBaseballInnings` (ya existentes en `src/lib/supabase.ts`) dentro de `aggregatePitchingRows` para sumar outs enteros exactos (`outs / 3`), igualando el comportamiento de `byDateRange`.
5. **Exclusión uniforme de exhibición (`'E'`/`'e'`):** Centralizar un predicado `isExhibitionGameType(rawType)` y `toCanonicalMlbGameType(rawType)` en `src/lib/supabase.ts` para reutilizarlo en `filterGamesByPhase`, `reconcileSeasonGames`, `getBattingStats`, `getPitchingStats`, `player-splits-service.ts`, `player-leverage-service.ts` y `api/pitching/search/route.ts`.

---

## 2. Arquitectura y Flujo de Datos

```text
[Supabase PostgREST (batting_stats | pitching_stats | games)]
   │ PK única `id` (.order("id", { ascending: true }))
   ▼
[fetchAllSupabasePages(buildQuery, { pageSize: 1000, concurrency: 5 })]
   ├─ Página 0 + { count: "exact" }
   ├─ Páginas 1..N en paralelo acotado (si builder soporta .range)
   └─ Fallback directo si mock sin .range()/.order()
   │
   ├──► [src/lib/supabase.ts]
   │      ├─ reconcileSeasonGames (paginado + write-through game_type canónico "R"/"L"/"F"/"D")
   │      ├─ getCanonicalGameBoxscoreRows (chunks de gameIds + paginado + reconciledBoxscoreCache)
   │      ├─ getBattingStats (paginado + filtro no-exhibición en "all")
   │      └─ getPitchingStats (paginado + filtro no-exhibición en "all" + outs exactos en aggregatePitchingRows)
   │
   ├──► [src/lib/player-splits-service.ts] (paginado en selector + exclusión 'E'/'e' en perfil y selector)
   ├──► [src/lib/park-factors-service.ts] (paginado en games y orden determinístico en batting_stats)
   ├──► [src/lib/player-leverage-service.ts] (exclusión 'E'/'e' en game_id lookup)
   ├──► [src/app/api/pitching/search/route.ts] (paginado multi-temporada + exclusión 'E'/'e')
   └──► [src/lib/season-service.ts] (paginado en getAvailableSeasons)
```

---

## 3. Archivos Afectados por Módulo

### Track A — Spec-Kit y Assessment (`@speckit`)
- `.specify/bugs/stats-truncation-audit/assessment.md` **[NEW]**
- `specs/037-stats-integrity-audit-pagination/spec.md` **[NEW]**
- `specs/037-stats-integrity-audit-pagination/plan.md` **[NEW]**
- `specs/037-stats-integrity-audit-pagination/tasks.md` **[NEW]**
- `specs/037-stats-integrity-audit-pagination/implementation.md` **[NEW — tras verificación final]**

### Track B — Núcleo Supabase y Aritmética de Pitcheo (`@fixer`)
- `src/lib/supabase.ts`:
  - Helpers exportados `fetchAllSupabasePages`, `isExhibitionGameType` (y `toCanonicalMlbGameType` interno/exportado).
  - `filterGamesByPhase` excluye `"exhibition"` cuando `phase === "all"`.
  - `reconcileSeasonGames` pagina `games` y escribe `game_type` canónico (`"R"`/`"L"`/`"F"`/`"D"`/`"E"`).
  - `getCanonicalGameBoxscoreRows` aplica chunking sobre `targetGameIds` + `fetchAllSupabasePages` con `.order("id", { ascending: true })`.
  - `getBattingStats` y `getPitchingStats` (tanto fallback por fechas como consulta completa) reemplazan `.limit(10000)` por `fetchAllSupabasePages` ordenado por `"id"` y excluyen juegos de exhibición `'E'`/`'e'`/`'exhibition'` en `phase === "all"`.
  - `aggregatePitchingRows` suma outs enteros exactos (`outs / 3`) y calcula `inningsPitched`, `inningsDisplay`, `era`, `whip`, `kPer9` y `bbPer9` sin deriva `.toFixed(1)`.

### Track C — Consumidores Secundarios (`@fixer`)
- `src/lib/player-splits-service.ts`:
  - `getPlayerSplitsProfile` excluye juegos de exhibición `'E'`/`'e'`/`'exhibition'`.
  - `getAllAvailablePlayersForSplits` reemplaza `.limit(10000)` por `fetchAllSupabasePages` ordenado por `"id"`, incluye `game_type` y excluye exhibición.
- `src/lib/park-factors-service.ts`:
  - `fetchSupabaseBoxscoreGames` reemplaza `.limit(2000)` en `games` por `fetchAllSupabasePages` y ordena por `"id"` los lotes de `batting_stats`.
- `src/lib/player-leverage-service.ts`:
  - Excluye juegos de exhibición `'E'`/`'e'`/`'exhibition'` al consultar `batting_stats` y `pitching_stats`.
- `src/app/api/pitching/search/route.ts`:
  - Pagina `pitching_stats` multi-temporada con `fetchAllSupabasePages` y `.order("id", { ascending: true })`, excluyendo exhibición.
- `src/lib/season-service.ts`:
  - `getAvailableSeasons` consulta `games` vía `fetchAllSupabasePages` con orden determinístico.

### Track D — Suite de Regresión y Verificación (`@fixer` + `@verifier`)
- `src/lib/__tests__/stats-pagination-integrity.test.ts` **[NEW]**:
  - Prueba paginación multipágina (`>10,000` filas / 12 páginas simulando caso Víctor Bericoto `7 HR, 41 H, 107 AB, 31 RBI, .383 AVG`).
  - Prueba compatibilidad con mocks sin `.range()`/`.order()`.
  - Prueba chunking + paginación + deduplicación con `reconciledBoxscoreCache` en `getCanonicalGameBoxscoreRows`.
  - Prueba suma exacta de outs/IP (`6.2 IP`, `10.2 IP`, `0.2 IP`) en `aggregatePitchingRows`.
  - Prueba exclusión de `'E'`/`'e'` en `phase="all"` y write-through canónico `game_type="R"` en `reconcileSeasonGames`.
- Validación integral ejecutada por `@verifier`: todas las suites en `src/lib/__tests__/`, `npm run lint`, `npm run build` y verificación en vivo contra Supabase + MLB Stats API + `https://tujonron.com/estadisticas`.

---

## 4. Plan de Rollback

1. Los cambios no alteran esquemas SQL de Supabase, variables de entorno ni interfaces públicas TypeScript (`BattingStats`, `PitchingStats`, respuestas de API).
2. La suite nueva `src/lib/__tests__/stats-pagination-integrity.test.ts` es completamente aditiva.
3. En caso de anomalía, basta con ejecutar `git checkout -- src/` (o `git revert` del commit) y eliminar `src/lib/__tests__/stats-pagination-integrity.test.ts` para restaurar el estado previo al instante.
