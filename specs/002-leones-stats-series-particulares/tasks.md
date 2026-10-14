# Tasks Breakdown: Series Particulares & Fix de Estadísticas Situacionales en Leones Stats

> **Feature**: `002-leones-stats-series-particulares`  
> **App**: `republicaraquista-web` (REPUBLICARAQUISTAPP)  

---

## Tareas

- [x] **Task 1: Definición de Tipos TypeScript (`src/types/leones-stats.ts`)**
  - Agregar interfaz `HeadToHeadRecord` con campos: `rivalId`, `rivalName`, `rivalAbbr`, `rivalLogo`, `scheduledGames`, `gamesPlayed`, `wins`, `losses`, `record`, `pct`, `runsFor`, `runsAgainst`, `runDiff`, `homeRecord`, `awayRecord`, `statusText`.
  - Agregar `h2hRecords: HeadToHeadRecord[]` al tipo `DashboardTabsData`.

- [x] **Task 2: Fix de Causa Raíz en `src/lib/leones-stats-service.ts`**
  - Eliminar la inyección de `BASELINE_2025_STATS` para temporadas diferentes a 2025 (`season !== 2025`).
  - Para 2026 (y dinámicas), inicializar contadores limpios (0 remontados, 0-0 arriba, 0 terreneadas, 0 salvados, 0-0 extras, 0-1 ult-10).
  - Calcular correctamente decisiones de lanzadores (para juego 1: abridores 0-1, relevistas 0-0).
  - Implementar cálculo dinámico de `getWeeklyRecords(season)` para 2026 utilizando el calendario y partidos de Supabase.

- [x] **Task 3: Implementación de Servicio de Series Particulares (`getHeadToHeadRecords`)**
  - Implementar `getHeadToHeadRecords(season)` en `src/lib/leones-stats-service.ts`.
  - Consolidar enfrentamientos vs los 7 rivales de LVBP (8 juegos programados c/u en regular).
  - Para 2026: Calcular vs Águilas (1 jugado, 0G-1P, 0 CF, 8 CP, -8 DIF, 7 restantes) y vs otros 6 rivales (0 jugados, 0G-0P, 8 restantes).
  - Para 2025: Calcular a partir de los 56 juegos de 2025.
  - Integrar en `getDashboardTabsData`.

- [x] **Task 4: Componente Visual de Series Particulares en `leones-stats-tab.tsx`**
  - Crear la sección de Series Particulares inmediatamente debajo de la cuadrícula de Estadísticas de Situación.
  - Renderizar tarjetas individuales para los 7 rivales con diseño Glassmorphism, logos oficiales de MLB static, badges de estatus, récords y juegos restantes.
  - Actualizar `dashboard-tabs.tsx` para pasar `h2hRecords`.

- [x] **Task 5: Verificación, Validación de Tipos y Build de Producción**
  - Ejecutar verificación de tipos y `npm run build` en `republicaraquista-web`.
  - Asegurar que no hay errores ni regresiones.
  - Confirmar que los números coinciden exactamente con la realidad (1 juego jugado en 2026, 0-1).
