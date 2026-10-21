# Tasks: 009 - Bullpen Budget & Carga Semanal Rolling (FanGraphs Closer Depth Chart)

**Feature Directory**: `specs/009-bullpen-budget-workload`  
**Status**: Completed  
**Estimated Tasks**: 7

---

## Task List

- [x] **Task 1: Extensión de Tipos TypeScript (`src/types/bullpen.ts`)**
  - Declarar `RelieverDayUsage`, `RelieverBudgetItem`, `BullpenBudgetData`.
  - Agregar `bullpenBudget?: BullpenBudgetData` a `BullpenAndLineupsData`.

- [x] **Task 2: Motor de Ingesta y Cálculo de Carga (`src/lib/bullpen-budget.ts`)**
  - Implementar consulta de juegos recientes por equipo (`teamId`) y temporada.
  - Implementar descarga paralela de boxscores oficiales con timeouts estrictos.
  - Generar matriz de uso por día (pitcheos, innings, decisión, nivel de carga).
  - Calcular métricas de acumulación rolling (P3D, P5D, IP total) y semáforo de disponibilidad.
  - Asignar roles FanGraphs (CL, SU, HL, MR, LR) a partir del historial del lanzador.

- [x] **Task 3: Integración en API y Flujo del Servidor**
  - Conectar `getBullpenBudget` en `src/app/api/bullpen/route.ts` y `src/app/bullpen/page.tsx` para hidratación SSR.

- [x] **Task 4: Componente de Cuadrícula FanGraphs en `bullpen-view.tsx` y `bullpen-budget-tab.tsx`**
  - Añadir pestaña `budget` en la barra superior de pestañas.
  - Crear tarjetas ejecutivas de salud del bullpen (disponibles, fatiga, P3D, líder de carga).
  - Diseñar la cuadrícula interactiva con celdas de días, pitcheos en negrita, innings, badges de decisión y colores de fatiga.
  - Añadir leyenda explicativa de colores y semáforo de disponibilidad.

- [x] **Task 5: Validación Técnica, Build y Despliegue Inicial**
  - Ejecutar `npx tsc --noEmit` y `npm run build` en Next.js 16 (Turbopack).
  - Verificar respuesta reactiva en cliente y SSR.
  - Commitear y push a `origin main` para despliegue en Vercel.

- [x] **Task 6: Días Libres del Calendario en la Secuencia Semanal**
  - Generar ventana calendario continua (fechas contiguas) identificando días sin partido como `Día Libre`.
  - Computar descanso real en `consecutiveDaysPitched` y `daysSinceLastPitched`.
  - Renderizar columna `Día Libre` / `Descanso` en cabecera y celdas correspondientes.

- [x] **Task 7: Inclusión de Abridores de la Rotación y Trazabilidad de `GS`**
  - Procesar a todos los lanzadores del encuentro (`starterId` y relevistas).
  - Etiquetar aperturas con insignia `GS` en las celdas diarias.
  - Clasificar rol `SP` (Abridor) para brazos de la rotación y agregarlo a filtros y ordenamiento FanGraphs.
  - Añadir columna `GS` en estadísticas de temporada.
  - Ajustar semáforo de disponibilidad con ciclo fisiológico de abridores (recuperación de 4-5 días tras 50+ pitcheos).
