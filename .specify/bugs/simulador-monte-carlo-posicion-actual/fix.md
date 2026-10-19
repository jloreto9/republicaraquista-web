# Bug Fix: Simulación de Partidos Restantes y ELO Canónico en Posición Actual

- **Slug**: simulador-monte-carlo-posicion-actual
- **Fixed**: 2026-10-19
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Se corrigió la simulación Monte Carlo en modo `Posición Actual`, la cual trataba la temporada regular como finalizada y dejaba congelado el ranking de los 8 equipos en cada una de las 3,000 iteraciones (produciendo 100% de clasificación para los 4 primeros y 0% de probabilidades para Leones y Magallanes). Se implementó la ingesta y simulación de partidos restantes (`remainingGames`), el cálculo cronológico secuencial del Rating ELO oficial (K=24, ventaja de localía +35) y el ordenamiento sabermétrico con desempates multinivel en la tabla de proyecciones.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/supabase.ts` | modified | Se reemplazó el cálculo heurístico inflado de ELO (`1500 + (pct - 0.5) * 400 + diff * 1.2`) por el algoritmo secuencial oficial K=24 sobre los partidos cronológicos. Se implementó y exportó `getScheduledGames(season)` para consultar los juegos pendientes de la temporada regular en Supabase. |
| `src/lib/monte-carlo.ts` | modified | Se añadió soporte para `remainingGames: [number, number][]`, generador sintético de respaldo `generateSyntheticRemainingSchedule`, simulación juego por juego de todos los partidos restantes en modo `actual`, corrección de la cota `totalGamesPlayed >= 448` para detectar temporada concluida y desempates completos en el sort de proyecciones (`champProb -> finalProb -> rrProb -> top4Prob -> wcProb -> elo`). |
| `src/app/standings/page.tsx` | modified | Se agregó la consulta concurrente `getScheduledGames(activeSeason)` y se pasó `remainingGames` a `runMonteCarloSimulation` inicial y al componente `StandingsView`. |
| `src/components/standings/standings-view.tsx` | modified | Se amplió `StandingsViewProps` para recibir `remainingGames` y propagarlo a `SimulatorCard`. |
| `src/components/standings/simulator-card.tsx` | modified | Se amplió `SimulatorCardProps` y se actualizó `handleSimulate` para pasar `remainingGames` a `runMonteCarloSimulation` en cliente al re-simular o alternar modos. |
| `scripts/test_monte_carlo.mjs` | added | Test de regresión automatizado que valida la simulación con calendario sintético y explícito, ausencia de probabilidades fijas de 0% / 100% en temporada en curso y desempates de la tabla. |

## Diff Highlights

```typescript
// En monte-carlo.ts: Simulación activa de los partidos restantes en cada iteración
for (const [h, a] of actualRemainingSchedule) {
  const eloH = eloMap.get(h) ?? BASE_ELO;
  const eloA = eloMap.get(a) ?? BASE_ELO;
  if (simulateGame(eloH, eloA)) {
    simWins.set(h, (simWins.get(h) ?? 0) + 1);
  } else {
    simWins.set(a, (simWins.get(a) ?? 0) + 1);
  }
}
```

## Tests Added or Updated

- `scripts/test_monte_carlo.mjs`: Test de regresión con mock de temporada activa (5-6 juegos jugados por equipo) validando que Leones del Caracas obtiene probabilidades no nulas y realistas (Top 4 ~20-40%, Comodín ~45-50%, Round Robin ~40-70%), que los líderes no quedan artificialmente sellados al 100%, y que la tabla no sufre anomalías de ordenamiento.

## Local Verification

- Commands run:
  - `npx tsx scripts/test_monte_carlo.mjs`: 100% exitoso.
  - `npm run build`: Compilación exitosa en Next.js 16.3.6 (Turbopack) para todas las 16 rutas estáticas y dinámicas (incluyendo `/standings`).

## Deviations from Assessment

Ninguna. La solución se aplicó siguiendo con precisión la arquitectura planeada.

## Follow-ups

- Monitorear la vista `/standings` en producción (Vercel) para confirmar la persistencia de las probabilidades reactivas en tiempo real.
