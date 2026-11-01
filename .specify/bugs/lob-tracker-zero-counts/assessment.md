# Bug Assessment: El LOB Tracker muestra todos los contadores en cero y distorsiona AVG en RISP

- **Slug**: lob-tracker-zero-counts
- **Created**: 2026-11-01
- **Source**: pasted text + user screenshot
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> "El LOB Tracker no esta funcionando /speckit-master"

Captura adjunta de `/situacional` → pestaña `LOB Tracker (Dejados en Base)`:
- Las 4 columnas de dejados en base (`LOB TERMINAR INNING`, `RISP LOB TERMINAR`, `RISP LOB DENTRO`, `TOTAL RISP LOB`) muestran `0` para todos los bateadores de Leones del Caracas.
- Simultáneamente, `AVG EN RISP` muestra valores artificialmente inflados (`.455`, `.542`, `.632`, `.667`, `.714`, `.727`, `.800`, `1.000`) y `PA EN RISP` difiere de `statSplits` oficial de MLB Stats API.

## Symptom

En `/situacional` (tanto en los KPIs superiores `LOB AL TERMINAR INNING` y `TOTAL RISP LOB` como en la tabla `LOB Tracker — Dejados en Base por Bateador` y en la tarjeta `LOB Tracker` dentro de `/individuales`), todos los contadores de corredores dejados en base aparecen en `0`, mientras que los splits situacionales de bateo/pitcheo clasifican erróneamente las situaciones de corredores en base y muestran `0.0 IP` en pitcheo situacional.

## Reproduction

1. Abrir `/situacional` en la temporada activa `2026-27` y seleccionar la pestaña `LOB Tracker (Dejados en Base)`.
2. Observar que `LOB TERMINAR INNING`, `RISP LOB TERMINAR`, `RISP LOB DENTRO` y `TOTAL RISP LOB` marcan `0` en todas las filas, y que `AVG EN RISP` supera `.500` en casi toda la alineación.
3. Cambiar a `Splits Situacionales` → `Pitcheo` y observar que `IP` aparece en `0.0` para todas las situaciones.

## Suspected Code Paths

- `src/lib/game-feed-service.ts:430` & `src/lib/game-feed-service.ts:502` — En `getDynamicSituationalData`, `outsBefore` se inicializa con `play.count?.outs ?? 0` (que en `allPlays` de MLB Stats API representa los outs **al finalizar** la jugada) y luego calcula `const outsMade = (play.count?.outs ?? 0) - outsBefore`, expresión algebraicamente idéntica a `0` en el 100% de las jugadas. Por ello `if (outsMade > 0)` jamás se ejecuta.
- `src/lib/game-feed-service.ts:525` & `src/lib/game-feed-service.ts:539` — El mismo error `outsMade = (play.count?.outs ?? 0) - outsBefore = 0` deja en `0` los outs acumulados en `pitchBuckets`, produciendo `0.0 IP` y `0.00 ERA/WHIP` en los splits situacionales de pitcheo.
- `src/lib/game-feed-service.ts:439-444` & `src/lib/game-feed-service.ts:530-535` — Se lee `matchup.postOnFirst / postOnSecond / postOnThird` como si fuera el estado de las bases **antes** del turno, cuando en MLB Stats API `postOn*` representa el estado de las bases **después** de la jugada (`post-play`). Así, un doble con bases limpias se clasifica como turno en RISP, un jonrón con corredores en base se clasifica como bases limpias, y al caer el 3er out `postOn*` viene vacío.
- `src/lib/game-feed-service.ts:436` — Se consulta `matchup.pitcherHand?.code`, pero la propiedad real en MLB Stats API `feed/live` es `matchup.pitchHand?.code`.
- `src/lib/game-feed-service.ts:428-521` — Eventos de corrido de bases que cierran o ocurren fuera de una aparición al plato consumada (`caught_stealing_*`, `pickoff_*`, etc.) se contabilizaban como `PA` y `AB` del bateador de turno.
- `src/components/situacional/situacional-view.tsx:101-103` — Subtítulo estático residual que menciona únicamente `(Juego 870090 vs Águilas del Zulia)` y `2024-2025` en lugar de la temporada regular `2026-2027` / `2025-2026`.

## Root Cause Hypothesis

**Confianza: alta (100%, demostrada contra el feed oficial de MLB Stats API).**
En `allPlays` del endpoint `https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live`, `play.count.outs` contiene el total de outs **posterior** a la jugada y `play.matchup.postOnFirst/Second/Third` contiene los corredores en base **posteriores** a la jugada. `getDynamicSituationalData` asignó `outsBefore = play.count?.outs ?? 0` y luego restó `(play.count?.outs ?? 0) - outsBefore` (`=== 0`), anulando por completo tanto el conteo de `LOB` como los innings lanzados (`outs`) del pitcheo situacional, además de usar `postOn*` como estado previo al turno.

## Proposed Remediation

**Preferred**:
1. Implementar una función pura y testeable de máquina de estados por media entrada (`processGameFeedIntoSituational` / seguimiento de estado en `getDynamicSituationalData` dentro de `src/lib/game-feed-service.ts`) que:
   - Reinicie `outsBefore = 0` y bases (`runnerOn1b`, `runnerOn2b`, `runnerOn3b`) al inicio de cada media entrada (`${inning}-${halfInning}`), sembrando corredor automático de extrainning desde `originBase` cuando corresponda.
   - Aplique movimientos intermedios antes de la decisión del turno (`stolen_base_*`, `wild_pitch`, `passed_ball`, `balk`, `defensive_indiff`, `caught_stealing_*`, `pickoff_*`) para obtener el estado exacto de bases y outs al momento de decidirse la aparición al plato (`PA`).
   - Excluya jugadas puras de corrido sin turno consumado (`caught_stealing_*`, `pickoff_*`, etc.) del conteo de `PA`/`AB`/`BvP` de bateadores y de `BF`/`AB` de lanzadores, pero registre sus outs en `IP` monticular y cualquier corredor varado al 3er out en `totalLobEnding` del equipo.
   - Rastree el destino real de cada corredor activo en `play.runners` (anotó `end === "score"`, puesto out `isOut === true`, o quedó en `1B`/`2B`/`3B`) para calcular con exactitud oficial:
     - `lobEnding` y `rispLobEnding` cuando `outsAfter === 3` (paridad exacta con `linescore.teams[side].leftOnBase`, incluyendo casos borde como triple barre-bases donde el bateador es out en 3B para el 3er out → `0 LOB`).
     - `rispLobMid` cuando el turno produce out(s) sin cerrar la entrada (`outsMadeOnPlay > 0 && outsAfter < 3`, excluyendo sacrificios `sac_fly` / `sac_bunt`) y quedan corredores previos varados en `2B` o `3B`.
   - Corrija `matchup.pitchHand?.code` (con fallback a `matchup.pitcherHand?.code` y `getKnownPitcherHand`).
   - Avance el estado (`outsBefore = outsAfter`, `runnerOn1b/2b/3b` desde `postOnFirst/Second/Third` cuando `outsAfter < 3`) hacia la siguiente jugada.
2. Actualizar el subtítulo informativo en `src/components/situacional/situacional-view.tsx` para eliminar el texto estático del juego inaugural `870090`.

**Files likely to change**:
- `src/lib/game-feed-service.ts`
- `src/components/situacional/situacional-view.tsx`
- `src/lib/__tests__/lob-tracker.test.ts`

**Tests to add or update**:
- `src/lib/__tests__/lob-tracker.test.ts`:
  1. Prueba unitaria determinista con jugadas sintéticas verificando: estado previo vs `postOn*`, avance por `wild_pitch` a RISP dentro del turno, `rispLobMid` con `< 3` outs, `lobEnding` / `rispLobEnding` en el 3er out, caso borde de triple barre-bases con 3er out del bateador en 3B (`0 LOB`), y exclusión de `caught_stealing_2b` como `PA`.
  2. Prueba de integración contra MLB Stats API (`season=2026`) verificando que `lobSummary.totalLobEnding` sea `> 0` y coincida con la suma oficial de `linescore.leftOnBase` de los juegos procesados, que ningún líder de turnos tenga `0` global artificial, y que `PA en RISP` / `AVG en RISP` coincidan con `statSplits` oficial (`sitCodes=risp`) de MLB.

## Risks & Considerations

- `player-splits-service.ts` consume `getDynamicSituationalData(season)` para poblar `profile.lobStats` de los bateadores de Leones; corregir la fuente única de verdad repara automáticamente ambos módulos sin romper contratos de tipos (`SituationalData`, `LobSummary`, `BatterLobRecord`).
- Sin nuevas dependencias externas ni alteraciones de esquema en Supabase.

## Open Questions

- Ninguna (`0` ambigüedades pendientes).
