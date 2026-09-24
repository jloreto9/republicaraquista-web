# Tasks: Pitching Summary & Telemetría

**Feature**: [spec.md](file:///c:/Users/Administrator/Projets/republicaraquista-web/.specify/features/pitching-summary-telemetry/spec.md) | [plan.md](file:///c:/Users/Administrator/Projets/republicaraquista-web/.specify/features/pitching-summary-telemetry/plan.md)  
**Total Tasks**: 21  

---

## Phase 1: Setup & Data Contracts

- [x] T001 Definir tipos e interfaces TypeScript para Pitching Summary en `src/types/pitching.ts`
- [x] T002 [P] Definir constantes de lanzamientos, colores canónicos de Thomas Nestico y mapas de códigos en `src/lib/pitching-constants.ts`

---

## Phase 2: Foundational Backend API Endpoints

- [x] T003 Implementar endpoint de búsqueda universal de lanzadores en `src/app/api/pitching/search/route.ts`
- [x] T004 [P] Implementar endpoint de registro de salidas (Game Logs) en `src/app/api/pitching/game-logs/route.ts`
- [x] T005 Implementar endpoint de extracción y analítica pitcheo a pitcheo (PBP y Statcast) en `src/app/api/pitching/game-data/route.ts`

---

## Phase 3: User Story 1 (P1) - Buscador Universal y Perfil de Lanzador

- [x] T006 [US1] Crear componente de búsqueda centralizada con chips de Leones del Caracas en `src/components/pitching/pitching-search.tsx`
- [x] T007 [US1] Crear componente de cabecera con avatar oficial de MLB, biografía y selector de temporada/salida en `src/components/pitching/pitching-header.tsx`
- [x] T008 [US1] Crear vista principal orquestadora con gestión de estado reactivo en `src/components/pitching/pitching-view.tsx`
- [x] T009 [US1] Crear ruta de página Next.js en `src/app/pitching/page.tsx`

---

## Phase 4: User Story 2 (P2) - Panel Play-by-Play Sabermétrico (LVBP)

- [x] T010 [US2] Crear componente de pastillas de KPI (IP, H, R, ER, BB, K, Pitches, Strikes, CSW%, Whiff%) en `src/components/pitching/pbp-panel.tsx`
- [x] T011 [P] [US2] Crear tabla sabermétrica de destinos de pitcheos con conteos y porcentajes en `src/components/pitching/pbp-panel.tsx`
- [x] T012 [P] [US2] Crear gráfico de barras apiladas de carga por entrada (Inning Workload) en `src/components/pitching/pbp-panel.tsx`
- [x] T013 [P] [US2] Crear gráfico interactivo de Leverage Index por entrada con cota neutral 1.0 en `src/components/pitching/pbp-panel.tsx`
- [x] T014 [US2] Crear componente comparativo de Platoon Splits (vs LHB / vs RHB) en `src/components/pitching/pbp-panel.tsx`

---

## Phase 5: User Story 3 (P3) - Repertorio y Telemetría Statcast (MLB)

- [x] T015 [US3] Crear tabla sabermétrica de repertorio Hawk-Eye con velocidades, rotación, iVB, HB y tasas en `src/components/pitching/statcast-panel.tsx`
- [x] T016 [P] [US3] Crear plano cartesiano interactivo de quiebre (iVB vs HB en pulgadas) en `src/components/pitching/statcast-panel.tsx`
- [x] T017 [P] [US3] Crear gráfico de dispersión en la Zona de Strike con marco regulatorio en `src/components/pitching/statcast-panel.tsx`

---

## Phase 6: User Story 4 (P4) - Exportación de Tarjeta Gráfica HD (300 DPI)

- [x] T018 [US4] Implementar motor de dibujo en Canvas HTML5 para tarjeta panorámica 16:9 HD (2400x1350 px) con créditos en `src/lib/pitch-card-canvas.ts`
- [x] T019 [US4] Integrar botón de descarga de tarjeta HD en `src/components/pitching/pitching-header.tsx`

---

## Phase 7: User Story 5 (P5) - Navegación e Integración Repo-wide

- [x] T020 [US5] Incorporar `/pitching` en los elementos de navegación de `src/components/layout/sidebar.tsx` y `src/components/layout/mobile-nav.tsx`
- [x] T021 [US5] Agregar botones directos "Ver Pitching Summary ↗" en la tabla de lanzadores de `src/components/stats/pitching-table.tsx` y en el ranking de relevistas de `src/components/bullpen/bullpen-view.tsx`

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T022 Validar tipado TypeScript estricto con `npx tsc --noEmit` y compilación de producción con `npm run build`
- [x] T023 Validar respuesta en vivo de la ruta `/pitching` y de los endpoints de API en Vercel

---

## Phase 9: User Story 6 (P6) - Modos Temporales (Salida Individual vs Temporada Completa)

- [x] T024 [US6] Extender `src/types/pitching.ts` con tipo `TimeMode` y soporte de métricas acumuladas (ERA, WHIP, juegos totales)
- [x] T025 [US6] Implementar agregación de datos de temporada completa en `src/app/api/pitching/season-data/route.ts` y servicio de datos
- [x] T026 [US6] Incorporar conmutador de modo temporal ("Salida Individual" vs "Temporada Completa") en `src/components/pitching/pitching-header.tsx`
- [x] T027 [US6] Actualizar `src/components/pitching/pitching-view.tsx` para alternar entre salida puntual y acumulado de temporada
- [x] T028 [US6] Adaptar pastillas de KPI y tarjetas visuales en `src/components/pitching/pbp-panel.tsx` y `src/components/pitching/statcast-panel.tsx` para mostrar ERA/WHIP en modo temporada
- [x] T029 [US6] Actualizar `src/lib/pitch-card-canvas.ts` para renderizar metadatos y boxscore de temporada completa en la tarjeta HD exportable
- [x] T030 [US6] Validar con `npx tsc --noEmit` y `npm run build` antes de despliegue final


