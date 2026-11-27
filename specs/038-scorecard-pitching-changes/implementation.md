# Informe de Implementación — Spec 038: Cambios de Lanzador en la Hoja de Anotación

**Feature Slug:** `038-scorecard-pitching-changes`  
**Fecha:** 2026-11-26  
**Dictamen:** **CONVERGED**

---

## 1. Cambios Realizados

- `src/types/scorecard.ts`:
  - Añadidos `isPitchingChange?`, `pitchingChangeFrom?` y `pitchingChangeTo?` en `ScorecardCell`.
  - Añadida interfaz `ScorecardPitcherAppearance` y propiedad `pitchersUsed?: ScorecardPitcherAppearance[]` en `TeamScorecard`.
- `src/lib/scorecard-engine.ts`:
  - `buildGameScorecard` rastrea `currentHomePitcher` y `currentAwayPitcher` cronológicamente sobre `allRawPlays`.
  - El abridor se registra en `pitchersUsed` (`isStarter: true`) sin marcar cambio; cada transición de lanzador marca la primera celda enfrentada por el relevista (`isPitchingChange: true`, `pitchingChangeFrom`, `pitchingChangeTo`) y registra el relevo en `pitchersUsed`.
- `src/components/game-center/scorecard-diamond-cell.tsx`:
  - Señaliza `cell.isPitchingChange` con borde superior azul cielo (`border-t-[2.5px] border-t-sky-400`), badge superior `CL` y bloque destacado en el tooltip (`Cambio de lanzador: Entra ... (por ...)`).
- `src/components/game-center/scorecard-tab.tsx`:
  - Añade la tira cronológica **Lanzadores enfrentados** debajo de la cabecera del equipo activo y actualiza *Simbología de Anotación* con el indicador `CL`.
- `src/lib/__tests__/scorecard-base-outs.test.ts`:
  - Añade aserciones para abridor, relevista (`José Guedez` por `José González` en el 4to inning) y `pitchersUsed`.

---

## 2. Verificación Ejecutada

- `npx tsx src/lib/__tests__/scorecard-base-outs.test.ts`: **PASS**.
- `npx eslint src/types/scorecard.ts src/components/game-center/scorecard-diamond-cell.tsx src/components/game-center/scorecard-tab.tsx src/lib/__tests__/scorecard-base-outs.test.ts`: `exit 0`.
- Verificación en vivo (`gamePk=869970`):
  - `AWAY pitchersUsed`: `Luis Palacios` (`1°`, abridor) → `Nate Garkow` (`5°`, por `Luis Palacios`).
  - `HOME pitchersUsed`: `Jose Gonzalez` (`1°`, abridor) → `Jose Guedez` (`4°`, por `Jose Gonzalez`).
  - Celdas marcadas con `isPitchingChange`: 5to inning (`Gorkys Hernández`, `Luis Palacios` → `Nate Garkow`) y 4to inning (`Leandro Cedeño`, `Jose Gonzalez` → `Jose Guedez`).
- `npm run build`: `exit 0` (19/19 páginas generadas).
