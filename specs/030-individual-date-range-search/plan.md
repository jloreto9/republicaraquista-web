# Plan Técnico 030: Buscador Individual por Rango de Fechas en `/individuales`

**Slug:** `030-individual-date-range-search`  
**Fecha:** 2026-11-16

---

## 1. Estrategia y Fuente de Verdad

Aplicando los principios de fuente única de verdad (`CLAUDE.md`) y minimalismo (`Ponytail`):
- Reutilizar `src/lib/supabase.ts` como punto central para las consultas de bateo, pitcheo, fildeo y conteo de juegos por franquicia, añadiendo soporte opcional `startDate?: string, endDate?: string` sin duplicar las funciones existentes ni romper consumidores actuales.
- Reutilizar `getVenezuelanToday()` de `src/lib/utils.ts` para evaluar si `endDate < today` en hora oficial VET (UTC-4) al calcular `Cache-Control` y `revalidate`.
- Extraer helpers compartidos dentro de `src/lib/supabase.ts` para:
  1. Validación de rango de fechas y cálculo de `Cache-Control` (usado por las 3 rutas API sin copiar/pegar lógica).
  2. Agregación de filas Supabase de bateo y pitcheo (`aggregateBattingRows`, `aggregatePitchingRows`), compartida entre el flujo normal y el fallback por rango de fechas.
  3. Agrupación, cálculo de ratios y ordenamiento de fildeo (`aggregateFieldingSplits`), compartida entre `stats=season` y `roster/fullSeason` hidratado con `byDateRange`.

---

## 2. Arquitectura y Flujo de Datos

```text
[StatheadIndividualSearch]
   │ GET /api/stats/{batting|pitching|fielding}?season=S&phase=all&team_id=all&limit=1000&startDate=...&endDate=...
   ▼
[API Route Handler]
   ├─ Valida par (startDate, endDate), formato YYYY-MM-DD y startDate <= endDate (400 si inválido)
   ├─ Ejecuta en paralelo get{Batting|Pitching|Fielding}Stats(..., startDate, endDate) + getTeamGamesMap(S, phase, startDate, endDate)
   └─ Responde JSON con startDate/endDate + Cache-Control dinámico (3600s pasado VET / 300s activo)
   ▼
[src/lib/supabase.ts]
   ├─ getTeamGamesMap -> MLB /teams/stats?group={hitting,pitching}&stats=byDateRange -> fallback getCanonicalPlayedGames
   ├─ getBattingStats -> MLB /stats?stats=byDateRange&group=hitting -> fallback Supabase batting_stats + games
   ├─ getPitchingStats -> MLB /stats?stats=byDateRange&group=pitching -> fallback Supabase pitching_stats + games
   └─ getFieldingStats -> MLB /teams/{tid}/roster/fullSeason?hydrate=person(stats(type=byDateRange,group=fielding))
```

---

## 3. Archivos Afectados

### Track A — Backend, Capa de Datos y API Routes
- `src/lib/supabase.ts`:
  - Helpers de fecha y caché: `parseStatsDateRange`, `getStatsCacheControlHeader`.
  - Extensión retrocompatible de `getTeamGamesMap`, `getBattingStats`, `getPitchingStats` y `getFieldingStats`.
- `src/app/api/stats/batting/route.ts`
- `src/app/api/stats/pitching/route.ts`
- `src/app/api/stats/fielding/route.ts`

### Track B — Interfaz de Usuario en `/individuales`
- `src/components/stats/stathead-individual-search.tsx` **[NEW]**
- `src/components/stats/individuales-view.tsx`

### Track C — Pruebas y Verificación
- `src/lib/__tests__/individual-date-range.test.ts` **[NEW]**
- `specs/030-individual-date-range-search/implementation.md` **[NEW]**

---

## 4. Plan de Rollback

1. Las firmas de `getTeamGamesMap`, `getBattingStats`, `getPitchingStats` y `getFieldingStats` mantienen todos sus parámetros actuales y añaden `startDate?: string, endDate?: string` opcionales al final; las llamadas existentes no cambian su comportamiento.
2. En los route handlers, si no se envían `startDate`/`endDate`, se invocan exactamente los mismos flujos de temporada/fase sin alterar respuestas previas.
3. Si se requiere revertir, basta con revertir los commits del módulo sin afectar esquemas de Supabase ni cachés persistentes.
