# Implementation Plan: 009 - Bullpen Budget & Carga Semanal Rolling

**Feature Directory**: `specs/009-bullpen-budget-workload`  
**Target Repository**: `republicaraquista-web`  
**Dependencies**: `src/lib/bullpen-budget.ts`, `src/types/bullpen.ts`, `src/components/bullpen/bullpen-view.tsx`, `src/app/api/bullpen/route.ts`

---

## 1. Arquitectura Técnica

```
[MLB Stats API / Schedule & Boxscores]
                   │
                   ▼
       src/lib/bullpen-budget.ts
       ├─► getBullpenBudget(season, teamId)
       │     ├─ Busca últimos 5-7 juegos finalizados del equipo
       │     ├─ Extrae relevistas de los boxscores concurrentemente
       │     ├─ Calcula matriz diaria de innings y pitcheos
       │     ├─ Computa P3D, P5D, días consecutivos y nivel de fatiga
       │     └─ Asigna jerarquía FanGraphs (CL, SU, HL, MR, LR)
       │
       ▼
       src/types/bullpen.ts
       ├─► RelieverDayUsage, RelieverBudgetItem, BullpenBudgetData
       ├─► Extensión de BullpenAndLineupsData con `bullpenBudget`
       │
       ▼
       src/app/api/bullpen/route.ts
       └─► Integra `bullpenBudget` en el payload JSON
       │
       ▼
       src/components/bullpen/bullpen-view.tsx
       ├─► Nueva pestaña principal: "Bullpen Budget (Carga 7D)"
       ├─► Tarjetas KPI de disponibilidad y carga colectiva
       ├─► Cuadrícula FanGraphs interactiva con celdas de color por día
       └─► Semáforo de disponibilidad y tooltips de desglose
```

---

## 2. Definición Algorítmica de Fatiga y Disponibilidad

- **Nivel de Carga Diario**:
  - `rest`: 0 pitcheos.
  - `low` (🟢): 1 a 15 pitcheos.
  - `medium` (🟡): 16 a 25 pitcheos.
  - `high` (🔴): >25 pitcheos.
- **Estado de Disponibilidad (`summary.availabilityStatus`)**:
  - `unavailable` (🔴):
    - Lanzó en el juego más reciente $\ge 30$ pitcheos, Ó
    - Lanzó en 2 juegos consecutivos y acumuló $\ge 35$ pitcheos, Ó
    - Lanzó en 3 juegos consecutivos.
  - `caution` (🟡):
    - Lanzó en el juego más reciente entre 16 y 29 pitcheos, Ó
    - Lanzó en 2 juegos consecutivos con $\le 30$ pitcheos, Ó
    - Acumuló $\ge 40$ pitcheos en los últimos 3 días.
  - `available` (🟢):
    - Descansó en el juego más reciente, Ó
    - Lanzó $\le 15$ pitcheos tras un descanso previo.

---

## 3. Plan de Tareas de Implementación

1. `src/types/bullpen.ts`:
   - Definir interfaces `RelieverDayUsage`, `RelieverBudgetItem`, `BullpenBudgetData`.
   - Extender `BullpenAndLineupsData` con `bullpenBudget?: BullpenBudgetData`.

2. `src/lib/bullpen-budget.ts`:
   - Implementar `getBullpenBudget(season, teamId)` con concurrencia segura, timeouts, cache en memoria y categorización FanGraphs.

3. `src/lib/bullpen.ts` & `src/app/api/bullpen/route.ts`:
   - Conectar `getBullpenBudget` para que la respuesta de `/api/bullpen` y el servidor entreguen el budget listo para renderizar.

4. `src/components/bullpen/bullpen-view.tsx`:
   - Agregar la pestaña `budget` (`Bullpen Budget (Carga 7D)`).
   - Renderizar los 4 KPIs de disponibilidad.
   - Renderizar la cuadrícula FanGraphs con celdas de días, pitcheos, innings, P3D, P5D y badges de rol y disponibilidad.

5. Verificación & Despliegue:
   - `npx tsc --noEmit` y `npm run build`.
   - Git commit & push a `origin main`.
