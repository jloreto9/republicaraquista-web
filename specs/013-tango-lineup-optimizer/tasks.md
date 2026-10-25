# Desglose de Tareas: Optimizador de Lineup Sabermétrico (Tom Tango)

**Slug:** `013-tango-lineup-optimizer`  
**Fase:** Desglose de Tareas Ejecutables (Fase 3 de Spec-Kit)  
**Fecha:** 2026-10-25  

---

## Matriz de Tareas Atómicas

### Fase 1: Tipado e Interfaces
- [x] **T001**: Crear `src/types/tango-lineup.ts` con definiciones de `TangoPlayer`, `TangoSlotContribution`, `TangoLineupMetrics` y `TangoOptimizationResult`.

### Fase 2: Motor Sabermétrico de Tom Tango
- [x] **T002**: Crear `src/lib/tango-lineup-engine.ts` implementando:
  - Constantes de apariciones al plato `SLOT_PA_WEIGHTS` (56 juegos LVBP).
  - Ponderadores de apalancamiento situacional `TANGO_SLOT_LEVERAGE` con roles de *The Book*.
  - Cálculo de carreras esperadas BaseRuns por slot y sinergia de platoon balance (zurdos/derechos).
  - Algoritmo de asignación óptima de 9 slots (2 ➔ 1 ➔ 4 ➔ 5 ➔ 3 ➔ 9 ➔ 6, 7, 8).
  - Base de datos de bateadores de Leones del Caracas con estadísticas sabermétricas reales (wOBA, OBP, SLG, AVG, ISO, wRC+).

### Fase 3: Componente de Interfaz de Usuario
- [x] **T003**: Construir componente `src/components/bullpen/tango-lineup-optimizer-tab.tsx` con:
  - Selector de juego del historial o alineación canónica de Leones del Caracas.
  - 4 tarjetas de KPIs de impacto (Carreras actual vs óptimo, ganancia de carreras en 56G, balance platoon).
  - Tabla comparativa detallada slot a slot (Actual vs Tom Tango) con badges de rol y justificación táctica.
  - Módulo didáctico desplegable con los axiomas de *The Book*.

### Fase 4: Integración en el Tracker de Lineups
- [x] **T004**: Actualizar `src/components/bullpen/bullpen-view.tsx` para agregar la sub-pestaña `optimizer` ("✨ Optimizador de Lineup (Tom Tango)") en la barra de navegación del Tracker Lineups 1-9.

### Fase 5: Verificación, Compilación y Cierre
- [x] **T005**: Ejecutar `npx tsc --noEmit` verificando cero errores de compilación TypeScript.
- [x] **T006**: Redactar `specs/013-tango-lineup-optimizer/implementation.md` con validación de los 5 Criterios de Aceptación.
- [x] **T007**: Git commit convencional y push a `origin/main`.
