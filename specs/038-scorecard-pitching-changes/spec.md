# Spec 038: Señalización de Cambios de Lanzador en la Hoja de Anotación (Scorecard)

**Feature Slug:** `038-scorecard-pitching-changes`  
**Fecha:** 2026-11-26  
**Estado:** Especificado  

---

## 1. Propósito y Contexto

En una hoja de anotación tradicional de béisbol (*Scorecard*), cuando el equipo a la defensiva realiza un cambio de lanzador, es fundamental dejar señalizado exactamente en qué turno al bate (celda) ingresó el nuevo lanzador y qué lanzadores enfrentó cada ofensiva a lo largo del encuentro.

Actualmente, `buildGameScorecard` (`src/lib/scorecard-engine.ts`) y `ScorecardDiamondCell` (`src/components/game-center/scorecard-diamond-cell.tsx`) solo muestran el nombre del lanzador dentro del tooltip al hacer hover/clic, sin señalización visual ni trazabilidad del relevo en la cuadrícula.

---

## 2. Requerimientos Funcionales

- **RF-01 (Detección de Cambio de Lanzador en `scorecard-engine.ts`):**
  - Para cada media entrada (`isTopInning = true` → lanza Home Club; `isTopInning = false` → lanza Visitante), rastrear cronológicamente `play.matchup.pitcher.id` y `fullName`.
  - El primer lanzador de cada equipo se registra como abridor (`isStarter: true`) sin marcar cambio (`isPitchingChange` falso/indefinido).
  - Cada transición `prevPitcherId !== currentPitcherId` debe marcar la celda del primer bateador enfrentado por el relevista con `isPitchingChange: true`, `pitchingChangeFrom` y `pitchingChangeTo`.
- **RF-02 (Resumen Cronológico de Lanzadores por Equipo):**
  - Cada `TeamScorecard` debe incluir `pitchersUsed: ScorecardPitcherAppearance[]` con el abridor y los relevistas enfrentados en orden cronológico (entrada de ingreso y lanzador reemplazado).
- **RF-03 (Señalización Visual en `ScorecardDiamondCell`):**
  - Las celdas con `isPitchingChange === true` deben mostrar una línea superior azul cielo (`border-t-[2.5px] border-sky-400/90`) y un indicador compacto `CL` centrado en la parte superior que no colisione con el badge de out (arriba izquierda) ni el badge `R` (arriba derecha).
  - El tooltip de la celda debe destacar explícitamente el cambio de lanzador (`Entra <relevista> (por <saliente>)`).
- **RF-04 (Tira de Lanzadores y Leyenda en `ScorecardTab`):**
  - Mostrar una barra compacta con la secuencia cronológica de lanzadores enfrentados (`1° <abridor>` → `<inn>° ↳ <relevista>`) y documentar el indicador `CL` en la sección *Simbología de Anotación*.
- **RF-05 (Idioma e Invariantes):**
  - Textos 100% en español, sin métricas Statcast ni jerga prohibida (`GEMINI.md` §1.1).

---

## 3. Criterios de Aceptación

- **CA-01:** En el juego `869970` (Tigres vs. Leones), la celda de Leandro Cedeño en el 4to inning marca `isPitchingChange: true` (`José Guedez` por `José González`) y la de Gorkys Hernández en el 5to inning marca `isPitchingChange: true` (`Nate Garkow` por `Luis Palacios`).
- **CA-02:** El abridor de cada equipo no aparece marcado como cambio de lanzador.
- **CA-03:** Pruebas unitarias, `eslint` en archivos modificados y `npm run build` pasan sin errores.
