# Desglose de Tareas: Hoja de Anotación Oficial en Vivo (Baseball Scorecard)

**Slug:** `014-game-center-scorecard`  
**Fase:** Desglose de Tareas Ejecutables (Fase 3 de Spec-Kit)  
**Fecha:** 2026-10-25  

---

## Matriz de Tareas Atómicas

### Fase 1: Modelado de Datos y Tipos
- [x] **T001**: Crear `src/types/scorecard.ts` con definiciones de `ScorecardDiamond`, `ScorecardCell`, `ScorecardBatterRow`, `ScorecardInningSummary`, `TeamScorecard` y `GameCenterScorecard`.
- [x] **T002**: Extender `src/types/game-center.ts` agregando `scorecard?: GameCenterScorecard` al contrato de `GameCenterData`.

### Fase 2: Motor de Reconstrucción Sabermétrica
- [x] **T003**: Construir `src/lib/scorecard-engine.ts` con funciones de:
  - Deducción de abreviaturas canónicas de béisbol (`K`, `ꓘ`, `1B`, `2B`, `3B`, `HR`, `BB`, `IBB`, `HBP`, `6-3`, `4-3`, `5-3`, `F8`, `L6`, `DP 6-4-3`, etc.).
  - Mapeo de avance de bases sobre el rombo a partir de `play.runners`.
  - Soporte de múltiples apariciones al plato en un mismo inning sin colisiones.
  - Ensamblaje de filas de bateadores respetando la jerarquía de slots 1-9 y suplentes.
  - Cálculo de resúmenes de entrada (R, H, E, LOB).
- [x] **T004**: Integrar `buildGameScorecard` en `src/lib/game-center-service.ts` vinculando el live feed oficial.

### Fase 3: Componentes de Interfaz de Usuario
- [x] **T005**: Crear `src/components/game-center/scorecard-diamond-cell.tsx` con el rombo vectorial SVG interactivo, aristas de avance iluminadas, relleno de carreras anotadas, badge de out y popover de detalle.
- [x] **T006**: Crear `src/components/game-center/scorecard-tab.tsx` con toggle de equipos (Leones vs Rival), tabla responsiva con columna fija (*sticky*), totales individuales y colectivos por entrada, y glosario didáctico de simbología.
- [x] **T007**: Actualizar `src/components/game-center/game-center-view.tsx` para agregar la pestaña `"scorecard"` con el botón `Hoja de Anotación` e icono `ClipboardList`.

### Fase 4: Verificación, Compilación y Cierre
- [x] **T008**: Ejecutar `npx tsc --noEmit` y `npm run build` validando compilación limpia sin errores de TypeScript ni Turbopack.
- [x] **T009**: Crear `specs/014-game-center-scorecard/implementation.md` documentando la entrega y convergencia.
