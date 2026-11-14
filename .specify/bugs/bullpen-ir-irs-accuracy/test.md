# Bug Verification: Precisión, filtrado de bitácora, inning real y soporte multi-equipo en Bullpen (IR / IRS)

- **Slug**: bullpen-ir-irs-accuracy
- **Tested**: 2026-11-13
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

El defecto quedó eliminado y verificado de extremo a extremo contra datos en vivo de Supabase y MLB Stats API para la temporada `2026-27`:

- **Leones del Caracas (`teamId=695`, 24 juegos):** `getDynamicBullpenAndLineups(2026)` produce exactamente **`74 IR / 33 IRS (44.6%)`**, `12` relevistas con herencia, **`39` registros en `logs` (`0` filas con `0 IR`)** y **`9` innings de ingreso distintos (`[1, 2, 3, 4, 5, 6, 7, 8, 9]`)**, con `"Simon Leandro"` como mejor relevista calificado (`17.6% IRS (3/17 anotaron)`).
- **Multi-equipo (`teamId=696`, Magallanes, 27 juegos):** `getDynamicBullpenAndLineups(2026, { teamId: 696 })` retorna sus propios datos reales (**`131 IR / 59 IRS (45.0%)`**, `20` relevistas, `71` logs, `0` filas con `0 IR`, `"Felipe Vázquez"` `14.3% IRS (2/14 anotaron)`) sin fuga de datos de Caracas (`695`).
- Todas las suites Node (`calendar-today`, `gamecenter-lineup-optimizer`, `best-available-lineup`, `bullpen-ir-irs`) y el build de producción `npm run build` pasan con código de salida `0`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| New unit suite | `node test/bullpen-ir-irs.test.mjs` | pass | `7/7` pruebas: `extractRelieverEntryInnings`, `overrideData` vacío, clave `id:`, ratio exacto `irs/ir`, `60` logs >50, `targetTeamId` `695` vs `696`, guarda `pitchersList[0]`. |
| Lineup optimizer regression | `node test/gamecenter-lineup-optimizer.test.mjs` | pass | `13/13` pruebas; Test `4a` actualizado a `totalGames === 0` sin fuga de snapshot `2026`. |
| Best available lineup regression | `node test/best-available-lineup.test.mjs` | pass | `12/12` pruebas. |
| Calendar regression | `node test/calendar-today.test.mjs` | pass | Todas las aserciones de zona horaria VET y mes activo pasaron. |
| Live parity check (read-only) | `node --env-file=.env.local --input-type=module -` (`getDynamicBullpenAndLineups(2026)` para `695` y `696`) | pass | `695`: `74 IR / 33 IRS (44.6%)`, `39` logs, `0` `0-IR`, innings `[1..9]`; `696`: `131 IR / 59 IRS (45.0%)`, `71` logs, `0` `0-IR`. |
| ESLint (backend) | `npx eslint src/lib/game-feed-service.ts src/lib/bullpen.ts src/app/bullpen/page.tsx src/app/api/bullpen/route.ts` | pass | `0` errores, `0` warnings. |
| ESLint (frontend) | `npx eslint src/components/bullpen/bullpen-view.tsx` | pass (0 new) | `0` errores nuevos introducidos; `6` errores preexistentes `react-hooks/set-state-in-effect` y `2` warnings `exhaustive-deps` en líneas `108-144` no modificadas salvo condición en `136`. |
| TypeScript check | `npx tsc --noEmit` | pass (0 in owned) | `0` errores en archivos del fix; `1` error preexistente no relacionado en `src/components/calendar/calendar-event-modal.tsx:218`. |
| Production build | `npm run build` | pass | `Compiled successfully in 3.4s`, `17/17` páginas estáticas generadas sin fallos. |

## Output Excerpts

```text
🎉 13 pruebas completadas exitosamente.   # test/gamecenter-lineup-optimizer.test.mjs
🎉 12 pruebas completadas exitosamente.   # test/best-available-lineup.test.mjs
🎉 7 pruebas unitarias de bullpen IR/IRS completadas exitosamente.  # test/bullpen-ir-irs.test.mjs

{
  "caracas": {
    "kpis": { "totalIr": 74, "totalIrs": 33, "irsPct": "44.6%", "bestReliever": "Simon Leandro", "bestRelieverSub": "17.6% IRS (3/17 anotaron)" },
    "relieversCount": 12,
    "logsCount": 39,
    "zeroIrLogs": 0,
    "distinctInnings": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "totalGames": 24
  },
  "magallanes": {
    "kpis": { "totalIr": 131, "totalIrs": 59, "irsPct": "45.0%", "bestReliever": "Felipe Vázquez", "bestRelieverSub": "14.3% IRS (2/14 anotaron)" },
    "relieversCount": 20,
    "logsCount": 71,
    "zeroIrLogs": 0,
    "totalGames": 27
  }
}
```

## Residual Risks

- `logs` en `src/lib/bullpen.ts` mantiene un tope de `.slice(0, 150)` salidas con `IR > 0` por equipo y temporada; en temporadas regulares LVBP estándar (p. ej. `39` y `71` salidas observadas) cubre el 100% sin truncamiento.
- Los errores preexistentes de ESLint (`react-hooks/set-state-in-effect` en `src/components/bullpen/bullpen-view.tsx`) y TypeScript (`src/components/calendar/calendar-event-modal.tsx:218`) quedan fuera del alcance de este bug y no afectan `npm run build`.

## Recommendation

Close the bug — verified across unit tests, live Supabase + MLB Stats API parity for `695` and `696`, and Next.js production build.
