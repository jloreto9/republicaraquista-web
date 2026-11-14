# Bug Fix: Precisión, filtrado de bitácora, inning real y soporte multi-equipo en Bullpen (IR / IRS)

- **Slug**: bullpen-ir-irs-accuracy
- **Fixed**: 2026-11-13
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Se corrigieron de raíz las 5 causas de inexactitud, truncamiento, inning falso (`Inn 1`), contaminación visual de relevistas con `0 IR` y fuga multi-equipo en el flujo `/bullpen` (`Relevistas (IR/IRS)`):

1. `src/lib/game-feed-service.ts` ahora consulta los juegos del equipo objetivo (`getTeamPlayedGames` / `getSeasonLiveFeeds`), extrae el inning real de ingreso desde `liveData.plays.allPlays` (`extractRelieverEntryInnings`), aplica la guarda `pitchersList[0] === pId || Number(stats.gamesStarted ?? 0) > 0`, registra en `bpRecords` únicamente salidas de relevo con `ir > 0 || irs > 0`, evita el fallback al snapshot congelado `2026` cuando `feeds.length === 0`, y pasa `targetTeamId` en lugar de `LEONES_TEAM_ID (695)`.
2. `src/lib/bullpen.ts` respeta `overrideData` explícito sin fallback silencioso a `SNAPSHOTS[season]`, agrupa `pitcherMap` por `id:${pId}` (evitando colisión de homónimos), ordena `relievers` y `qualifiedRelievers` por ratio exacto `irs / ir`, y filtra `logs` a salidas con corredores heredados elevando el límite de corte de `50` a `150`.
3. `src/app/bullpen/page.tsx` alinea su criterio de temporada dinámica con `src/app/api/bullpen/route.ts` usando `season >= activeSeason`.
4. `src/components/bullpen/bullpen-view.tsx` filtra el gráfico comparativo a `r.ir > 0` con estado vacío en español, acota `irsWidth <= irWidth`, reemplaza el badge verde `0.0%` por `"—"` neutro cuando `r.ir === 0`, renombra la columna `"Juegos"` a `"Salidas c/ IR"`, usa `pitcherId` como `key` y enlace `/pitching?playerId=...`, y sincroniza `currentSeason` al montar cuando `globalSeason` en `localStorage` difiere del SSR.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/game-feed-service.ts` | modified | `getTeamPlayedGames`, `getSeasonLiveFeeds(season, teamId)`, `extractRelieverEntryInnings`, `isStarter` con `pitchersList[0] === pId`, emisión exclusiva `ir > 0 \|\| irs > 0`, `targetTeamId` en registros/lineups y `overrideData` vacío en `season >= 2026` sin feeds. |
| `src/lib/bullpen.ts` | modified | Sin fallback a `SNAPSHOTS[season]` cuando `overrideData !== undefined`; clave `id:${pId}`; ordenamiento por ratio exacto `irs / ir`; filtro `inherited_runners > 0 \|\| inherited_scored > 0` en `logs` con `.slice(0, 150)`. |
| `src/app/bullpen/page.tsx` | modified | Unificación del umbral dinámico a `isDynamicSeason = season >= activeSeason` (paridad con `src/app/api/bullpen/route.ts`). |
| `src/components/bullpen/bullpen-view.tsx` | modified | Gráfico filtrado a `irRelievers` (`r.ir > 0`), `irsWidth <= irWidth`, badge `"—"` para `r.ir === 0`, columna `"Salidas c/ IR"`, keys por `pitcherId`, links `/pitching?playerId=...` y sincronización de `currentSeason` con `globalSeason` al montar. |
| `test/gamecenter-lineup-optimizer.test.mjs` | modified | Actualizada aserción en Test `4a` para validar `totalGames === 0` y `gameLineups.length === 0` cuando `feeds.length === 0` en `season >= 2026` (sin fuga del snapshot `lvbp_season_2026.json` de Leones). |
| `test/bullpen-ir-irs.test.mjs` | added test | Suite unitaria dedicada para `extractRelieverEntryInnings`, `getBullpenAndLineups` (`overrideData` vacío, clave `id:`, ratio exacto `irs/ir`, retención >50 logs) y `getDynamicBullpenAndLineups` multi-equipo (`695` vs `696`). |

## Diff Highlights

```ts
// src/lib/game-feed-service.ts — inning real de entrada y guarda de abridor:
const entryInnings = extractRelieverEntryInnings(feed, targetTeamId);
const isStarter = pitchersList[0] === pId || Number(stats.gamesStarted ?? 0) > 0;
if (!isStarter && (ir > 0 || irs > 0)) {
  bpRecords.push({
    team_id: targetTeamId,
    ...,
    inning: entryInnings.get(pId) ?? 1,
    inherited_runners: ir,
    inherited_scored: irs,
  });
}

// src/lib/bullpen.ts — sin fallback silencioso, clave por pitcher_id y ratio exacto:
const data = overrideData !== undefined ? overrideData : SNAPSHOTS[season];
const mapKey = pId > 0 ? `id:${pId}` : `name:${pName}`;
qualifiedRelievers.sort(
  (a, b) =>
    (a.ir > 0 ? a.irs / a.ir : 1) - (b.ir > 0 ? b.irs / b.ir : 1) ||
    b.ir - a.ir
);
```

## Tests Added or Updated

- `test/bullpen-ir-irs.test.mjs` (`7/7` pruebas): valida `extractRelieverEntryInnings` (`top`/`bottom` y primer inning), `overrideData` vacío sin fallback a snapshot, agrupación por `id:` ante homónimos, desempate por ratio exacto `irs/ir` (`5/41` vs `6/49`), retención de `60` logs reales descartando `0`-IR, y `getDynamicBullpenAndLineups` multi-equipo (`695` vs `696`) con guarda `pitchersList[0]`.
- `test/gamecenter-lineup-optimizer.test.mjs` (`13/13` pruebas): actualizado Test `4a` para reflejar el comportamiento sin fuga de snapshot obsoleto (`totalGames === 0` cuando `feeds.length === 0` en `season >= 2026`).

## Local Verification

- Commands run:
  - `node test/calendar-today.test.mjs` → PASS
  - `node test/gamecenter-lineup-optimizer.test.mjs` → PASS (`13/13`)
  - `node test/best-available-lineup.test.mjs` → PASS (`12/12`)
  - `node test/bullpen-ir-irs.test.mjs` → PASS (`7/7`)
  - Paridad en vivo (read-only `.env.local` + MLB Stats API) → PASS (`Caracas 695`: `74 IR / 33 IRS (44.6%)`, `39` logs en innings `[1..9]`; `Magallanes 696`: `131 IR / 59 IRS (45.0%)`, `71` logs)
  - `npx eslint src/lib/game-feed-service.ts src/lib/bullpen.ts src/app/bullpen/page.tsx src/app/api/bullpen/route.ts` → PASS (`0` errores)
  - `npx tsc --noEmit` → `0` errores en los archivos modificados (`1` error preexistente no relacionado en `src/components/calendar/calendar-event-modal.tsx:218`)
  - `npm run build` → PASS (`Compiled successfully`, `17/17` static pages)

## Deviations from Assessment

- En lugar de mantener los `87` registros con `0 IR` en `bpRecords`, se optó por emitir únicamente relevos con `ir > 0 || irs > 0` desde `game-feed-service.ts` (paridad exacta con los snapshots `2022–2025`), combinando además la guarda defensiva `ir > 0 || irs > 0` antes de `.slice(0, 150)` en `bullpen.ts` y las guardas UI en `bullpen-view.tsx`.

## Follow-ups

- Ninguno bloqueante para `bullpen-ir-irs-accuracy`. (Nota aparte no relacionada: existe `1` error preexistente de TypeScript en `src/components/calendar/calendar-event-modal.tsx:218` y `6` errores preexistentes de `react-hooks/set-state-in-effect` en `src/components/bullpen/bullpen-view.tsx` líneas `110-142`.)
