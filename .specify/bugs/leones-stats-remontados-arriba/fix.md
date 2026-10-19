# Bug Fix: Cálculo Dinámico de Remontados, Arriba y Decisiones de Pitcheo en Leones Stats

- **Slug**: leones-stats-remontados-arriba
- **Fixed**: 2026-10-19
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Se reemplazaron los valores fijos en 0 y strings estáticos de las estadísticas de situación y presión de Leones del Caracas en `src/lib/leones-stats-service.ts` por el cálculo dinámico y reactivo a través de los feeds de MLB Stats API (`fetchGameLiveFeed`). Ahora se calculan correctamente `remontados` (1), `up` (1-0), `starters` (0-2), `relievers` (2-2), `terreneadas` (0) y `saves` (0) basándose en las carreras acumuladas al 6to inning y las decisiones oficiales.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/leones-stats-service.ts` | modified | Se importó `fetchGameLiveFeed` e implementó la extracción en paralelo de linescores y decisions para computar carreras tras 6 innings, remontadas, récord con ventaja, decisiones de abridores/relevistas y terreneadas. |
| `scripts/test_leones_stats.mjs` | added | Test de regresión automatizado validando los 6 partidos disputados en 2026: `remontados === 1`, `up === "1-0"`, `starters === "0-2"`, `relievers === "2-2"`. |

## Diff Highlights

```typescript
// En leones-stats-service.ts: extracción de linescores al 6to inning y decisiones
(linescore.innings || []).slice(0, 6).forEach((inn: any) => {
  cRuns6 += Number((isHome ? inn.home?.runs : inn.away?.runs) || 0);
  oRuns6 += Number((isHome ? inn.away?.runs : inn.home?.runs) || 0);
});

const ledAfter6 = cRuns6 > oRuns6;
const trailedAfter6 = cRuns6 < oRuns6;

if (trailedAfter6 && won) remontados++;
if (ledAfter6 && won) arribaWins++;
if (ledAfter6 && !won) arribaLosses++;
```

## Tests Added or Updated

- `scripts/test_leones_stats.mjs`: Test de integración con Supabase y MLB Stats API validando los valores exactos para la temporada 2026-2027.

## Local Verification

- Commands run:
  - `npx tsx --env-file=.env.local scripts/test_leones_stats.mjs`: Pass 100%.
  - `npm run build`: Compilación exitosa en Next.js 16.3.6 (Turbopack) sin errores.

## Deviations from Assessment

Ninguna.
