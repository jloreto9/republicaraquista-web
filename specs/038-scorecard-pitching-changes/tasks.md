# Tareas Atómicas — Spec 038: Cambios de Lanzador en la Hoja de Anotación

**Feature Slug:** `038-scorecard-pitching-changes`  

- [x] **T001:** Especificar requerimientos y plan técnico (`spec.md`, `plan.md`, `tasks.md`).
- [x] **T002:** Extender tipos en `src/types/scorecard.ts` con `ScorecardPitcherAppearance`, `pitchersUsed?` y campos de cambio de lanzador en `ScorecardCell`.
- [x] **T003:** Implementar detección cronológica de cambios de lanzador en `src/lib/scorecard-engine.ts`.
- [x] **T004:** Renderizar señalización visual (`CL` + línea superior azul cielo + tooltip) en `src/components/game-center/scorecard-diamond-cell.tsx`.
- [x] **T005:** Añadir resumen de lanzadores enfrentados y actualizar leyenda en `src/components/game-center/scorecard-tab.tsx`.
- [x] **T006:** Añadir casos de prueba en `src/lib/__tests__/scorecard-base-outs.test.ts`, verificar contra juego real `869970`, ejecutar `eslint` y `npm run build`, y documentar `implementation.md`.
