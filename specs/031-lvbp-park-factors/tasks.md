# Tareas de Implementación 031: Factores de Parque Empíricos LVBP (`/park-factors`)

**Slug:** `031-lvbp-park-factors`  
**Fecha:** 2026-11-16

---

## Track A — Tipos, Motor de Cálculo y API

- [x] **T001 [Track A]**: Definir contratos e interfaces en `src/types/park-factors.ts` (`ParkFactorScope`, `ParkFactorMetricKey`, `ParkMetricFactor`, `StadiumParkFactorRow`, `ParkFactorsResponse`).
- [x] **T002 [Track A]**: Implementar `src/lib/park-factors-service.ts` con `resolveCanonicalVenueId`, `computeIterativeParkFactors`, consulta paralela a MLB Stats API (`2024–2026`), lectura paginada de Supabase (`games` + `batting_stats` `2025–2026`) y caché TTL en memoria.
- [x] **T003 [Track A]**: Crear endpoint `src/app/api/park-factors/route.ts` con validación de `scope`, manejo de errores y cabeceras `Cache-Control`.

## Track B — Interfaz y Navegación

- [x] **T004 [Track B]**: Crear `src/components/park-factors/park-factors-view.tsx` con selector de ventana (`multi`, `2026`, `2025`, `2024`), toggle `Estabilizado (k=30)` / `Crudo`, toggle de escala `Base 100` / `1.00x`, 4 tarjetas KPI, tabla ordenable con dimensiones de barda, gráfico comparativo horizontal (`Recharts`) y guía metodológica.
- [x] **T005 [Track B]**: Crear página `src/app/park-factors/page.tsx` y registrar `Factores de Parque` (`/park-factors`) en `src/components/layout/nav-data.ts` bajo `Laboratorio Sabermétrico`.

## Track C — Pruebas y Verificación

- [x] **T006 [Track C]**: Crear pruebas unitarias en `src/lib/__tests__/park-factors.test.ts` validando normalización de estadios, convergencia sin sesgo de equipo en `computeIterativeParkFactors`, estabilización `k=30`, paginación Supabase, route handler `/api/park-factors` y ausencia de términos prohibidos.
- [x] **T007 [Track C]**: Ejecutar `npx tsx src/lib/__tests__/park-factors.test.ts`, suite completa de pruebas, `npx eslint`, `npx tsc --noEmit` y `npm run build`, documentando en `specs/031-lvbp-park-factors/implementation.md`.
