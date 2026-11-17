# Informe de Implementación y Verificación 031: Factores de Parque Empíricos LVBP (`/park-factors`)

**Slug:** `031-lvbp-park-factors`  
**Fecha:** 2026-11-16  
**Estado:** Implementado y Verificado (Converged)

---

## 1. Resumen de Archivos Entregados

### Track A — Tipos, Motor de Cálculo y API
- [`src/types/park-factors.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/types/park-factors.ts): contratos `ParkFactorScope`, `ParkFactorMetricKey`, `ParkMetricFactor`, `StadiumParkFactorRow`, `AlternateVenueNotice` y `ParkFactorsResponse`.
- [`src/lib/park-factors-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/park-factors-service.ts):
  - `resolveCanonicalVenueId(venueName, fallbackHomeTeamId?)`: normaliza estadios de MLB Stats API y Supabase hacia los 9 parques en `LVBP_STADIUMS` (separando Universitario vs. Macuto) y plazas alternas.
  - `computeIterativeParkFactors(games, metric, priorWeight=30)`: solver iterativo controlado por fuerza ofensiva/pitcheo de ambos equipos por temporada, normalizado a promedio ponderado `1.000` con estabilización bayesiana `k=30`.
  - `getParkFactorsData(scope)`: consulta paralela a MLB Stats API `schedule` (`2024`, `2025`, `2026`, `gameType=R`, `Final`) para Carreras (`R`) + lectura paginada de Supabase (`games` y `batting_stats` `2025`, `2026` en lotes de 30 juegos con paginación `.range`) para `HR`, `H`, `2B`, `3B`, `BB`, `SO`, con caché TTL en memoria.
- [`src/app/api/park-factors/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/park-factors/route.ts): endpoint `GET /api/park-factors?scope=multi|2026|2025|2024` con validación HTTP `400` y `Cache-Control` dinámico (`3600s` para temporadas cerradas `2024`/`2025`, `300s` para `multi`/`2026`).

### Track B — Interfaz y Navegación
- [`src/components/park-factors/park-factors-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/park-factors/park-factors-view.tsx): vista interactiva con selector de ventana (`Multi-Año 2024–26`, `2026-27`, `2025-26`, `2024-25`), conmutador `Estabilizado (k=30)` vs. `Crudo Empírico`, selector de escala `Base 100` vs. `1.00x`, 4 tarjetas KPI, tabla ordenable multi-evento con dimensiones y altitud, gráfico horizontal en `Recharts` con línea neutra y guía metodológica.
- [`src/app/park-factors/page.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/park-factors/page.tsx): página App Router SSR dinámica cargando `getParkFactorsData("multi")`.
- [`src/components/layout/nav-data.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/layout/nav-data.ts): añadida entrada `Factores de Parque` (`/park-factors`) bajo la categoría `Laboratorio Sabermétrico`.

### Track C — Pruebas y Verificación
- [`src/lib/__tests__/park-factors.test.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/__tests__/park-factors.test.ts): pruebas unitarias con mocks de `fetch` y `supabase` validando normalización, convergencia sin sesgo de equipo, estabilización `k=30`, paginación >1000 filas, separación UCV/Macuto, route handler `400`/`200`/`Cache-Control` y ausencia de términos prohibidos.

---

## 2. Evidencia Observada de Verificación

- **Pruebas unitarias (`npx tsx src/lib/__tests__/park-factors.test.ts`):** **PASS (`TEST_EXIT=0`)**.
- **Suite completa del repositorio (`11` archivos `src/lib/__tests__/*.test.ts` vía `npx tsx` + `4` archivos `test/*.test.mjs` vía `node`):** **PASS (`ALL_TESTS_OK=True`, `exit=0`)**.
- **ESLint sobre los 7 archivos creados/modificados:** **PASS (`ESLINT_EXIT=0`)**.
- **Typecheck (`npx tsc --noEmit`):** 0 errores en los archivos de `031-lvbp-park-factors` (solo persiste el error preexistente fuera de alcance en `src/components/calendar/calendar-event-modal.tsx(218,22)`).
- **Build de producción (`npm run build`):** **PASS (`BUILD_EXIT=0`)** — `Next.js 16.3.6 (Turbopack)`, `✓ Compiled successfully in 14.2s`, 19/19 páginas generadas en `2.0s` incluyendo `/park-factors` y `/api/park-factors` (nota: `next build` omite typecheck por configuración del proyecto).
