# Tasks: 008 - Totales y Promedios por Juego de la Liga en Estadísticas Colectivas

**Feature Directory**: `specs/008-colectivas-league-totals-averages`  
**Status**: Completed  
**Completed Tasks**: 5/5

---

## Task List

- [x] **Task 1: Extensión de Tipos TypeScript (`src/types/collective.ts`)**
  - Definir interfaces `CollectiveLeagueSummary<T>` con `total`, `perGame`, `perTeamGame` y `uniqueGames`.
  - Agregar campos `battingSummary`, `pitchingSummary` y `fieldingSummary` a `CollectiveStatsResult`.
  - Asegurar compatibilidad estricta con los tipos existentes.

- [x] **Task 2: Cálculo Matemático y Agregación en `src/lib/collective.ts`**
  - Implementar cálculo de partidos únicos de la liga a partir de `sum(games) / 2`.
  - Implementar funciones auxiliares para acumular conteos y recalcular ratios ponderados de la liga (AVG, OBP, SLG, OPS, BABIP, ERA, WHIP, K/9, BB/9, K/BB, BAA, FPCT, CS%, RF/9).
  - Implementar conversión precisa de tercio de outs para Innings Pitched (IP).
  - Generar diccionarios de strings formateados para `perGame` (por partido completo) y `perTeamGame` (por equipo por juego).

- [x] **Task 3: Renderizado de `<tfoot>` con "Total Liga" y "Promedio por Juego" en `colectivas-view.tsx`**
  - Agregar sección `<tfoot>` en la tabla de Bateo Colectivo con las 2 filas solicitadas.
  - Agregar sección `<tfoot>` en la tabla de Pitcheo Colectivo con las 2 filas solicitadas.
  - Agregar sección `<tfoot>` en la tabla de Fildeo Colectivo con las 2 filas solicitadas.
  - Aplicar estilos visuales Dark Navy con borde distintivo dorado/azul marino, tipografía mono legible y badges de liga.

- [x] **Task 4: Soporte de Vista Conmutable para Promedios por Equipo**
  - Implementar selector o toggle en la barra superior o cabecera de la tabla para alternar entre "Totales Acumulados" y "Promedios por Equipo".
  - Asegurar que el cambio sea instantáneo en cliente sin refetch innecesario.

- [x] **Task 5: Validación Técnica, Build y Despliegue**
  - Ejecutar `npm run build` con Next.js 16 (Turbopack) sin errores.
  - Ejecutar `npx tsc --noEmit` con 0 errores de tipos.
  - Realizar commit semántico y push a Git para despliegue automático en Vercel.
