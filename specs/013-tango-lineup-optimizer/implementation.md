# Informe de Implementación: Optimizador de Lineup Sabermétrico (Tom Tango)

**Slug:** `013-tango-lineup-optimizer`  
**Fase:** Implementación y Verificación (Fase 4 de Spec-Kit)  
**Fecha:** 2026-10-25  
**Estado:** ✅ Completado y Verificado  

---

## 1. Resumen Ejecutivo de la Implementación

Se implementó el **Optimizador de Lineup Sabermétrico basado en la metodología de Tom Tango (*The Book: Playing the Percentages in Baseball*)**, integrado como una 5ta sub-pestaña interactiva en el **Tracker de Lineups 1-9** dentro de la sección de Bullpen (`/bullpen`).

El módulo permite al fanático y cuerpo técnico evaluar el rendimiento y carreras esperadas de cualquier alineación titular registrada en la temporada regular de la LVBP, contrastarla inmediatamente contra la distribución estocástica óptima postulada por Tango, Lichtman y Dolphin, e interactuar permutando bateadores para observar el impacto directo en carreras por juego ($R/J$) y carreras por temporada ($R/56J$).

---

## 2. Componentes y Archivos Creados / Modificados

### A. Tipado e Interfaces
- **`src/types/tango-lineup.ts`**: Definición canónica de `TangoPlayer`, `TangoSlotContribution`, `TangoLineupMetrics` y `TangoOptimizationResult`.

### B. Motor Sabermétrico
- **`src/lib/tango-lineup-engine.ts`**:
  - Matriz de apariciones al plato `SLOT_PA_WEIGHTS` calibrada para la temporada regular de 56 juegos de la LVBP.
  - Ponderación de apalancamiento `TANGO_SLOT_LEVERAGE` con las justificaciones tácticas de *The Book*.
  - Función de cálculo BaseRuns ponderado por slot con bonificación por balance de platoon zurdo/derecho.
  - Algoritmo secuencial de optimización de 9 slots ($2 \to 1 \to 4 \to 5 \to 3 \to 9 \to 6, 7, 8$).
  - Catálogo inicial de estadísticas calibradas de bateadores de Leones del Caracas con fallback dinámico.

### C. Experiencia de Usuario (UI)
- **`src/components/bullpen/tango-lineup-optimizer-tab.tsx`**:
  - Selector de alineaciones reales de partidos de la temporada o alineación titular estándar.
  - 4 tarjetas de KPIs: Producción Actual vs Óptimo, Ganancia en Temporada (+R en 56 JJ), wOBA Colectivo y Score Platoon.
  - Vista comparativa paralela con controles de subida/bajada de turno en tiempo real.
  - Tabla analítica slot por slot con métricas sabermétricas ($AVG, OBP, SLG, ISO, wOBA$) y fundamento táctico.
  - Módulo didáctico desplegable con los axiomas de *The Book*.
- **`src/components/bullpen/bullpen-view.tsx`**:
  - Incorporación de la sub-pestaña `optimizer` en el selector del Tracker Lineups 1-9 con ícono `Sparkles`.

---

## 3. Verificación de Criterios de Aceptación

| Criterio | Descripción | Estado | Evidencia |
|---|---|:---:|---|
| **CA01** | Sub-pestaña "Optimizador Tom Tango" en Tracker Lineups | ✅ Cumplido | Integrado en `bullpen-view.tsx` con navegación reactiva sin recargas. |
| **CA02** | Algoritmo estocástico de Tom Tango (The Book) | ✅ Cumplido | Algoritmo implementado en `tango-lineup-engine.ts` ($2 \to 1 \to 4 \to 5 \to 3 \to 9 \to 6,7,8$). |
| **CA03** | Proyecciones BaseRuns y ganancia en 56 juegos LVBP | ✅ Cumplido | Cálculo exacto de $R/J$, $R/56J$ y delta $\Delta R$ comparativo. |
| **CA04** | Glosario pedagógico y justificaciones slot a slot | ✅ Cumplido | Módulo desplegable con los 6 axiomas de *The Book* y tabla maestra de fundamentos. |
| **CA05** | Compilación limpia sin errores TypeScript | ✅ Cumplido | `npx tsc --noEmit` completado con 0 errores y 0 regresiones. |

---

## 4. Estado de Convergencia

Todas las 7 tareas de [tasks.md](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/013-tango-lineup-optimizer/tasks.md) han sido ejecutadas, validadas y documentadas satisfactoriamente.
