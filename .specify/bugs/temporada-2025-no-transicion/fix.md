# Bug Fix: Transición de Temporada Activa 2026-2027 en Vercel

- **Slug**: temporada-2025-no-transicion
- **Fixed**: 2026-10-13T07:23:00-04:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Se corrigió la discrepancia de columnas entre el pipeline de ingesta batch (`ingest_lvbp_batch.py`) y el esquema de Supabase, permitiendo la inserción exitosa de juegos (incluyendo el juego inaugural 870098 en estado `Final`), bateo, pitcheo y jugadores de 2026. Se actualizaron `ACTIVE_SEASON = 2026` y `FALLBACK_SEASON = 2026` en `republicaraquista-web`, y se añadió el snapshot de datos `lvbp_season_2026.json`.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `caraquista-reflex/scripts/ingest_lvbp_batch.py` | modified | Ajustar payloads de `teams`, `games` y `players` al esquema exacto de Supabase (remover columnas inexistentes `game_pk`, `phase`, `is_night`, usar `abbreviation` y `full_name`). |
| `republicaraquista-web/src/lib/constants.ts` | modified | Actualizar `ACTIVE_SEASON = 2026` para navegación, sidebar y drawer móvil. |
| `republicaraquista-web/src/lib/season-service.ts` | modified | Actualizar `FALLBACK_SEASON = 2026` y umbral mínimo a `2026`. |
| `republicaraquista-web/src/data/lvbp_season_2026.json` | added | Snapshot local de 2026 para análisis de bullpen y alineaciones. |
| `republicaraquista-web/src/app/page.tsx` | modified | Actualizar texto de banner: "¡Temporada 2026-2027 en Marcha! Debut de Leones hoy 13 de Octubre". |

## Diff Highlights

```typescript
// src/lib/constants.ts
- export const ACTIVE_SEASON = 2025; // 2025-2026 (fallback sincrónico)
+ export const ACTIVE_SEASON = 2026; // 2026-2027 (temporada activa oficial)

// src/lib/season-service.ts
- export const FALLBACK_SEASON = 2025;
+ export const FALLBACK_SEASON = 2026;
- const finalSeason = detectedSeason >= 2025 ? detectedSeason : FALLBACK_SEASON;
+ const finalSeason = detectedSeason >= 2026 ? detectedSeason : FALLBACK_SEASON;
```

## Local Verification

- **Ingesta Batch ejecutada**: `python scripts/ingest_lvbp_batch.py --season 2026 --with-pbp` completó con éxito (HTTP 200/201 en `teams`, `games`, `players`, `batting_stats`, `pitching_stats`).
- **Consulta dinámica a Supabase**: `getActiveSeason()` resuelve `{ season: 2026 }`.
- **Servicios de página de inicio**: `getSeasonKPIs(2026)`, `getRecentGames(2026)`, `getStandings(2026)`, `getDashboardTabsData(2026)` ejecutados con éxito vía `tsx`.
- **Build de Producción**: `npm run build` en `republicaraquista-web` completó con código 0 en 2.4s, generando las 31 rutas estáticas.

## Deviations from Assessment

Ninguna.

## Follow-ups

- Ejecutar despliegue a Vercel mediante `git push origin main`.
