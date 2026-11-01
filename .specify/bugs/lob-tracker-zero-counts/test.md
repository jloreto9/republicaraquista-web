# Bug Verification: Máquina de estados por media entrada para LOB Tracker y Splits Situacionales

- **Slug**: lob-tracker-zero-counts
- **Tested**: 2026-11-01
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

El defecto quedó eliminado al 100% sin regresiones: los 15 juegos oficiales de la temporada `2026-27` cuadran corredor por corredor con `linescore.leftOnBase` de MLB Stats API (`123` LOB al terminar inning), los promedios y apariciones en RISP coinciden exactamente con `statSplits` (`sitCodes=risp`) de MLB (`Wilfredo Tovar = 26 PA / .222`, `Lenyn Sosa = 27 PA / .318`), y los innings lanzados (`130.0 IP`) se reflejan correctamente en `Splits Situacionales` → `Pitcheo`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npx tsx --env-file=.env.local src/lib/__tests__/lob-tracker.test.ts` | pass | `LOB Terminar=123`, `RISP LOB Terminar=67`, `RISP LOB Dentro=72`, `Total RISP LOB=139`, `Pitch IP=130.0`. |
| New / updated tests | `npx tsx --env-file=.env.local src/lib/__tests__/lob-tracker.test.ts` | pass | Paridad unitaria + `gamePk=870072` + temporada `2026`. |
| Regression suite | `npx tsx --env-file=.env.local src/lib/__tests__/player-splits.test.ts` | pass | `350` jugadores activos, `Corredor=15 JJ`, `Gastón=7 JJ`, `lobStats` poblado sin regresiones. |
| Lint / type-check | `npx tsc --noEmit` & `npm run build` | pass | `0` errores TypeScript y compilación de producción Next.js 16 exitosa. |

## Output Excerpts

```text
=== Ejecutando pruebas de LOB Tracker & Splits Situacionales ===
[OK] Temporada 2026 verificada -> PA=634 | LOB Terminar=123 | RISP LOB Terminar=67 | RISP LOB Dentro=72 | Total RISP LOB=139 | Pitch IP=130.0
[OK] Top 3 LOB Ranking 2026: Aldrem Corredor (PA RISP=29, AVG RISP=.292, 3erOut=15, RISP3er=10, RISPMid=10, TotalRISP=20) | Leandro Cedeño (PA RISP=24, AVG RISP=.318, 3erOut=9, RISP3er=3, RISPMid=14, TotalRISP=17) | Lenyn Sosa (PA RISP=27, AVG RISP=.318, 3erOut=19, RISP3er=10, RISPMid=6, TotalRISP=16)
=== TODAS LAS PRUEBAS DE LOB TRACKER PASARON EXITOSAMENTE ===
```

## Residual Risks

- Depende de la disponibilidad del endpoint público `feed/live` de MLB Stats API para juegos en curso o finalizados; los juegos finalizados quedan cacheados en `feedCache`.

## Recommendation

Close the bug — verified end-to-end against MLB Stats API official `linescore` and `statSplits`.
