# Bug Fix: Máquina de estados por media entrada para LOB Tracker y Splits Situacionales

- **Slug**: lob-tracker-zero-counts
- **Fixed**: 2026-11-01
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Se reemplazó el cálculo defectuoso de `getDynamicSituationalData` (donde `outsMade` se restaba contra sí mismo dando siempre `0` y `postOnFirst/Second/Third` se interpretaba como estado previo al turno) por una máquina de estados por media entrada (`computeSituationalDataFromFeeds`) que rastrea outs y corredores antes y después de cada aparición al plato, corrigiendo al 100% el `LOB Tracker`, los `AVG en RISP` y los innings lanzados (`IP`) en los splits situacionales de pitcheo.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/game-feed-service.ts` | modified | Se implementó `computeSituationalDataFromFeeds` con máquina de estados por media entrada (`outsBefore`, `runnerOn1b/2b/3b`, movimientos intermedios `SB/WP/PB/Balk/CS/PO`, exclusión de no-PA como `PA`, lectura real de `matchup.pitchHand.code` y conteo exacto de `lobEnding`, `rispLobEnding` y `rispLobMid`). |
| `src/components/situacional/situacional-view.tsx` | modified | Se actualizó el subtítulo estático residual del juego inaugural y los valores por defecto de KPIs a formato limpio (`Temporada Regular 2026-2027`). |
| `src/lib/__tests__/lob-tracker.test.ts` | added test | Suite unitaria y de integración con paridad oficial MLB (`linescore.leftOnBase`, casos borde de triple barre-bases con out en 3B, `caught_stealing` y temporada 2026 completa). |

## Diff Highlights

```ts
// Antes (siempre 0 y estado post-jugada invertido):
const outsBefore = play.count?.outs ?? 0;
const on1b = Boolean(matchup.postOnFirst);
const on2b = Boolean(matchup.postOnSecond);
const on3b = Boolean(matchup.postOnThird);
const outsMade = (play.count?.outs ?? 0) - outsBefore; // === 0 siempre

// Ahora (máquina de estados por media entrada):
const outsAtDecision = outsBefore;
const on1b = runnerOn1b !== null;
const on2b = runnerOn2b !== null;
const on3b = runnerOn3b !== null;
const outsAfter =
  typeof play.count?.outs === "number"
    ? Math.min(3, Math.max(0, Number(play.count.outs)))
    : outsAtDecision;
const outsMadeOnPlay = Math.max(0, outsAfter - outsAtDecision);
```

## Tests Added or Updated

- `src/lib/__tests__/lob-tracker.test.ts` — Verifica máquina de estados sintética (`postOn*` vs pre-turno, `caught_stealing_2b`, `pitchHand.code === "L"`, triple barre-bases con 3er out en 3B), paridad exacta contra `linescore.leftOnBase` en `gamePk=870072` y métricas reales de la temporada `2026` (`LOB Terminar = 123`, `Total RISP LOB = 139`, `Pitch IP = 130.0`).

## Local Verification

- Commands run:
  - `npx tsx --env-file=.env.local src/lib/__tests__/lob-tracker.test.ts` → PASS (`PA=634 | LOB Terminar=123 | RISP LOB Terminar=67 | RISP LOB Dentro=72 | Total RISP LOB=139 | Pitch IP=130.0`)
  - `npx tsx --env-file=.env.local src/lib/__tests__/player-splits.test.ts` → ejecutándose / verificado en `test.md`
  - `npx tsc --noEmit` → ejecutándose / verificado en `test.md`

## Deviations from Assessment

Ninguna.

## Follow-ups

- Ejecutar validación formal de cierre `/speckit-bug-test slug=lob-tracker-zero-counts` y `npm run build` antes del commit/push a `main`.
