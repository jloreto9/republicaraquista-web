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

### Fase 3: Componente de Interfaz de Usuario
- [x] **T003**: Construir componente `src/components/bullpen/tango-lineup-optimizer-tab.tsx` con:
  - Selector de alineaciones reales empleadas en el terreno y combinaciones frecuentes.
  - 4 tarjetas de KPIs de impacto (Carreras actual vs óptimo, ganancia de carreras en 56G, balance platoon).
  - Tabla comparativa detallada slot a slot (Orden real vs Tom Tango) con badges de rol y justificación táctica.
  - Módulo didáctico desplegable con los axiomas de *The Book*.

### Fase 4: Integración en el Tracker de Lineups
- [x] **T004**: Actualizar `src/components/bullpen/bullpen-view.tsx` para agregar la sub-pestaña `optimizer` ("✨ Optimizador Lineups (Tom Tango - The Book)") y enlazar `gameLineups` y `topFrequentLineups`.

### Fase 5: Remediacón de Datos Reales (Cero Invención de Lineups)
- [x] **T008**: Refactorizar `src/lib/tango-lineup-engine.ts`:
  - Eliminar por completo el pool inventado `LEONES_BATTING_POOL` y a René Pinto (jugador no perteneciente al roster principal de Leones).
  - Crear `LEONES_REAL_STATS_MAP` con los 24 bateadores reales auditados de Supabase (Wilfredo Tovar, Aldrem Corredor, Yonathan Daza, Brainer Bonaci, Harold Castro, José Rondón, Lenyn Sosa, Victor Bericoto, Jhonny Pereda, Leandro Cedeño, Oswaldo Arcia, Liván Soto, Salvador Perez, Orlando Arcia, Freddy Fermin, Jeferson Morales, Gabriel Noriega, Alfredo Duno, Kenedy Corona, etc.).
  - Normalizar `resolvePlayerStats` mediante `playerId` y nombres sin tildes.
- [x] **T009**: Integrar `topFrequentLineups` en `bullpen-view.tsx` y pasarlo a `TangoLineupOptimizerTab`.
- [x] **T010**: Rediseñar selector de `TangoLineupOptimizerTab`:
  - Eliminar la opción inventada `-1`.
  - Configurar por defecto la alineación titular real más frecuente (`topFrequentLineups[0]`) o el último juego disputado (`gameLineups[0]`).
  - Agrupar opciones en `<optgroup label="⭐ Alineaciones Titulares Más Frecuentes">` y `<optgroup label="📅 Juegos Disputados en la Temporada">`.
  - Reflejar en la UI la alineación real exacta empleada por el mánager en ese juego/frecuencia vs la propuesta matemática de Tom Tango.

### Fase 6: Verificación, Compilación y Cierre
- [x] **T011**: Ejecutar `npx tsc --noEmit` verificando cero errores de compilación TypeScript.
- [x] **T012**: Actualizar `specs/013-tango-lineup-optimizer/implementation.md`.
- [x] **T013**: Git commit convencional y push a `origin/main`.
