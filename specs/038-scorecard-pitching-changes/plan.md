# Plan Técnico — Spec 038: Cambios de Lanzador en la Hoja de Anotación

**Feature Slug:** `038-scorecard-pitching-changes`  
**Fecha:** 2026-11-26  

---

## 1. Arquitectura y Decisiones (Escalera Ponytail)

- **Fuente única de verdad:** `allRawPlays` ya contiene `play.matchup.pitcher` en orden cronológico. Detectar el cambio directamente al iterar `allRawPlays` en `buildGameScorecard` evita parsear descripciones de texto frágiles o duplicar lógica de `playEvents`.
- **Compatibilidad y Rollback:** Todos los campos nuevos en `ScorecardCell` (`isPitchingChange?`, `pitchingChangeFrom?`, `pitchingChangeTo?`) y `TeamScorecard` (`pitchersUsed?`) son opcionales, garantizando 0 regresiones en consumidores existentes. Rollback limpio vía `git revert`.

---

## 2. Archivos a Modificar

1. `src/types/scorecard.ts`: añadir campos opcionales de cambio de lanzador en `ScorecardCell` y tipo `ScorecardPitcherAppearance` + `pitchersUsed?` en `TeamScorecard`.
2. `src/lib/scorecard-engine.ts`: rastrear el lanzador activo por lado defensivo (`awayPitching` / `homePitching`) al recorrer `allRawPlays`, poblar `isPitchingChange`, `pitchingChangeFrom`, `pitchingChangeTo` y `pitchersUsed`.
3. `src/components/game-center/scorecard-diamond-cell.tsx`: renderizar borde superior azul cielo + badge `CL` y llamada en el tooltip cuando `cell.isPitchingChange` es verdadero.
4. `src/components/game-center/scorecard-tab.tsx`: mostrar resumen cronológico de lanzadores enfrentados y actualizar *Simbología de Anotación*.
5. `src/lib/__tests__/scorecard-base-outs.test.ts`: añadir pruebas unitarias para cambios de lanzador.
