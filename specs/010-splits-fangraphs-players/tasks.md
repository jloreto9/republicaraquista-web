# Desglose de Tareas: Splits FanGraphs (Bateadores y Lanzadores)

**Slug:** `010-splits-fangraphs-players`  
**Fase:** Tareas Atómicas  
**Fecha:** 2026-10-21  

---

## Tareas de Implementación

- [x] **T001 - Extensión del Modelo de Tipos (`src/types/player-splits.ts`)**  
  Añadir a `PlayerSplitRow` y `PitcherSplitRow` los campos sabermétricos FanGraphs (`iso`, `babip`, `bbPct`, `kPct`, `kPerBb`, etc.) y las nuevas categorías `count` y `role` en `PlayerSplitsProfile`.

- [x] **T002 - Motor de Consulta y Normalización FanGraphs (`src/lib/player-splits-service.ts`)**  
  Implementar la función de consumo a `statSplits` de MLB Stats API con catálogo de `sitCodes` oficiales, normalización de métricas sabermétricas, cálculo de ISO/BABIP/BB%/K% y caché en memoria con TTL de 15 minutos.

- [x] **T003 - Actualización de Tablas de Splits (`src/components/stats/splits/split-table-group.tsx`)**  
  Incorporar las columnas sabermétricas completas estilo FanGraphs tanto para la vista de bateo como para la vista monticular, con ordenamiento por cualquier columna métrica.

- [x] **T004 - Barra de Categorías y Selector de Navegación (`src/components/stats/splits/player-splits-view.tsx`)**  
  Integrar los pills de filtrado por categoría (Todos, Platoon, Bases & RISP, Conteos, Entradas, Localía, Rivales) y optimizar el buscador universal de jugadores de la LVBP.

- [x] **T005 - Verificación Integral y Despliegue (`tsc --noEmit` & `npm run build`)**  
  Ejecutar compilación de producción, validar funcionamiento con bateadores (Junior Caminero / Aldrem Corredor / Harold Castro) y lanzadores (Freddy Peralta / Norwith Gudiño / Sam Bordner) y desplegar en Vercel.
