# Tasks: 012 - Buscador de Colectivas tipo Stathead con Rango de Fechas y Comparación Interanual

**Feature Directory**: `specs/012-stathead-colectivas-date-range`  
**Status**: Completed  
**Completed Tasks**: 5/5

---

## Task List

- [x] **Task 1: Soporte de `startDate` y `endDate` en Backend y API (`src/lib/collective.ts`, `src/app/api/stats/collective/route.ts`)**
  - Modificar `fetchStatsGroup` y `getCollectiveStats` para recibir opcionalmente `startDate?: string` y `endDate?: string`.
  - Configurar llamada a MLB Stats API con `stats=byDateRange` cuando los parámetros estén presentes y ajustar tiempo de revalidación.
  - Modificar `/api/stats/collective/route.ts` para extraer `startDate` y `endDate` de los `searchParams` y reenviarlos al servicio.

- [x] **Task 2: Extensión de Tipos TypeScript (`src/types/collective.ts`)**
  - Definir interfaces de comparación: `StatheadDateRange`, `StatheadDeltaValue`, `StatheadTeamComparison` y `StatheadComparisonResult`.
  - Exportar contratos tipados para diferenciales delta ($\Delta$).

- [x] **Task 3: Componente `StatheadCollectiveSearch` (`src/components/colectivas/stathead-collective-search.tsx`)**
  - Construir selectores de fecha con presets rápidos ("Últimos 7 días", "14 días", "Octubre", "Noviembre", "Diciembre", "Temporada Completa").
  - Implementar conmutador "Comparar con temporada anterior" con auto-ajuste de fechas del año previo.
  - Desarrollar tablas interactivas para Bateo y Pitcheo Colectivo con ordenamiento dinámico por columnas y badges con deltas ($\Delta$) coloreados semánticamente (verde para mejoras, rojo para retrocesos).
  - Renderizar fila de resumen "Total Liga" y "Promedio por Partido" con cálculo de diferenciales globales en el pie de tabla.

- [x] **Task 4: Integración en la Navegación de Colectivas (`colectivas-view.tsx`)**
  - Añadir la pestaña `"🔍 Stathead"` en la barra superior de pestañas de `/colectivas`.
  - Conectar el estado de temporada activa (`useSeason`).
  - Renderizado condicional integrado sin impacto en las pestañas preexistentes de Bateo, Pitcheo y Fildeo.

- [x] **Task 5: Validación Técnica, Verificación de Tipos y Build**
  - Verificación estricta de tipos con TypeScript (`npx tsc --noEmit`) con 0 errores.
  - Compilación de producción con Next.js 16 (`npm run build`) exitosa (16/16 páginas generadas).
  - Pruebas directas de latencia y consistencia en endpoints de MLB Stats API por rango de fechas.
