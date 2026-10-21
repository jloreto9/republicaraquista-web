# Feature Specification: 009 - Bullpen Budget & Carga Semanal Rolling (FanGraphs Closer Depth Chart)

**Feature Directory**: `specs/009-bullpen-budget-workload`  
**Created**: 2026-10-21  
**Status**: Completed  
**Target Repository**: `republicaraquista-web` (Next.js 16 / React 19 en Vercel)  
**Input**: Añadir una nueva pestaña en la sección de Bullpen (`/bullpen`) titulada **"Bullpen Budget"** (Carga de Trabajo Rolling de la última semana), inspirada en la cuadrícula de trabajo de FanGraphs RosterResource Closer Depth Chart. Muestra para cada lanzador del equipo seleccionado (con soporte para los 8 clubes de la LVBP) el uso día a día en la ventana semanal contigua, desglosando pitcheos realizados, innings lanzados, rol, jerarquía, acumulados rolling (P3D, P5D), días libres del calendario y trazabilidad completa de abridores (GS).

---

## 1. User Scenarios & Acceptance Criteria *(mandatory)*

### User Story 1 - Pestaña y Navegación "Bullpen Budget" en `/bullpen` (Priority: P1) 🎯 MVP

Como analista o seguidor de los Leones del Caracas (o cualquier franquicia LVBP), quiero una pestaña dedicada en `/bullpen` denominada **"Bullpen Budget"** para evaluar de un vistazo el desgaste y disponibilidad de cada lanzador.

**Acceptance Criteria**:
1. La barra de navegación superior de `/bullpen` incluye 3 pestañas principales:
   - `🛡️ Relevistas (IR/IRS)`
   - `🔋 Bullpen Budget (Carga 7D)`
   - `📋 Tracker Lineups 1-9`
2. El selector de Franquicia (8 equipos LVBP) y Temporada (2026, 2025, 2024, etc.) actualiza reactivamente la cuadrícula de trabajo para el club seleccionado.

---

### User Story 2 - Cuadrícula FanGraphs Rolling por Día (Innings y Pitcheos) (Priority: P1) 🎯 MVP

Como mánager virtual o sabermétrico, quiero una tabla en cuadrícula estilo FanGraphs RosterResource que para cada lanzador del equipo muestre:
- **Identidad del Lanzador**: Headshot oficial, Nombre completo, Mano (`Der` / `Zur`), Rol asignado (`SP` - Abridor, `CL` - Cerrador, `SU` - Preparador, `HL` - Alto Apalancamiento, `MR` - Relevo Medio, `LR` - Relevo Largo).
- **Columnas de Días Calendario Contiguos**:
  - Días de juego: Fecha (`27 Dic`), rival (`vs LAG`), pitcheos (`29P`), innings (`0.2 IP`), etiquetas de decisión (`SV`, `HLD`, `W`, `L`) y aperturas (`GS`).
  - Días libres / Descanso: Fecha (`19 Dic`), etiqueta `Día Libre`, celda limpia con guion tenue `-`.
  - Código cromático:
    - 🟢 **Verde** (0-15 pitcheos): Carga leve.
    - 🟡 **Ámbar** (16-25 pitcheos): Carga moderada.
    - 🔴 **Rojo** (26+ pitcheos o back-to-back): Carga pesada / alerta de fatiga.
- **Columnas de Resumen Rolling**:
  - `P3D`: Pitcheos en los últimos 3 días.
  - `P5D`: Pitcheos en los últimos 5 días.
  - `IP Sem`: Innings acumulados en la ventana.
  - `Semáforo de Disponibilidad`:
    - 🟢 `Disponible`: Fresco para entrar.
    - 🟡 `Precaución`: Lanzó ayer o carga intermedia acumulada / sesión de bullpen.
    - 🔴 `Fatiga / Descanso`: 2+ días consecutivos, >25 pitcheos en su última salida o ciclo de descanso de abridor tras 50+ pitcheos.

---

### User Story 3 - Días Libres del Calendario (Priority: P1)

Como mánager, quiero que los días libres de la liga (como los lunes de descanso en LVBP) se mantengan visibles en la secuencia de fechas como columnas de `Día Libre`, de modo que se aprecie visualmente el descanso del cuerpo de lanzadores y se computen de forma realista los días de descanso acumulados.

---

### User Story 4 - Trazabilidad de Abridores y Aperturas (`GS`) (Priority: P1)

Como analista, quiero que los abridores (`SP`) se incluyan en la cuadrícula de trabajo con sus aperturas marcadas con la insignia `GS`, conteos de lanzamientos e innings de apertura, y conteo de `GS` en las estadísticas de temporada, permitiendo monitorear su ciclo de descanso entre salidas de la rotación.

---

### User Story 5 - KPIs Ejecutivos de Salud del Staff (Priority: P2)

En la parte superior de la vista de Bullpen Budget, presentar 4 tarjetas KPI:
1. **Brazos Disponibles**: Conteo de lanzadores frescos vs total (ej. `12 / 16`).
2. **Brazos en Fatiga / Alerta**: Lanzadores con descanso recomendado hoy.
3. **Carga Total 3 Días**: Suma de lanzamientos del cuerpo de lanzadores en los últimos 3 días.
4. **Brazo Más Exigido**: Nombre y número de pitcheos del lanzador con mayor desgaste semanal.
