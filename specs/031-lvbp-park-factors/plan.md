# Plan Técnico 031: Factores de Parque Empíricos de la LVBP (`/park-factors`)

**Slug:** `031-lvbp-park-factors`  
**Fecha:** 2026-11-16

---

## 1. Estrategia y Escalera Ponytail

1. **Reutilizar fuente de verdad de estadios:** Importar `LVBP_STADIUMS` de [`src/lib/stadiums-service.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/stadiums-service.ts) para obtener metadatos físicos (`lf`, `lcf`, `cf`, `rcf`, `rf`, `wallHeightFt`, `elevationMeters`, `city`, `teamId`, `teamLogo`, `color`) sin duplicar el catálogo de los 9 parques.
2. **Módulo único y cohesivo:** Concentrar tipos, normalización de estadios, algoritmo iterativo y fetchers (MLB Stats API + Supabase paginado) en `src/lib/park-factors-service.ts` (y tipos exportados en `src/types/park-factors.ts` para consumo limpio de cliente/servidor).
3. **Respeto a componentes existentes:** Integrar en [`src/components/layout/nav-data.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/layout/nav-data.ts) sin alterar `probabilidades-engine.ts` ni otros módulos.

---

## 2. Arquitectura y Flujo de Datos

```text
[src/app/park-factors/page.tsx (Server Component)]
   └─► getParkFactorsData("multi")
          │
          ▼
[src/lib/park-factors-service.ts]
   ├─► MLB Stats API /schedule (seasons 2024, 2025, 2026, gameType=R, Final) ──► Carreras (R) 3 años
   ├─► Supabase games + batting_stats (paginado 1000/req, seasons 2025, 2026) ──► R, HR, H, 2B, 3B, BB, SO
   └─► computeIterativeParkFactors(games, metric, priorWeight=30) ──► raw & stabilized factors + R/J
          │
          ▼
[ParkFactorsView (Client Component)]
   ├─► Switch de Ventana: Multi-Año (2024-26) | 2026-27 | 2025-26 | 2024-25
   ├─► Switch de Estabilización (k=30 vs Crudo) y Escala (Base 100 vs 1.00x)
   ├─► 4 Tarjetas KPI + Tabla Multi-Evento Ordenable + Gráfico Recharts + Glosario
   └─► Fetch on-demand a GET /api/park-factors?scope=... al cambiar ventana
```

---

## 3. Archivos Afectados

1. `src/types/park-factors.ts` **[NEW]** — Interfaces de respuesta, métricas y estadios.
2. `src/lib/park-factors-service.ts` **[NEW]** — Normalización de `venue`, algoritmo iterativo controlado por equipos, paginación Supabase, fetch MLB API y caché TTL.
3. `src/app/api/park-factors/route.ts` **[NEW]** — Endpoint `GET /api/park-factors?scope=...`.
4. `src/components/park-factors/park-factors-view.tsx` **[NEW]** — UI interactiva Dark Navy / Dorado.
5. `src/app/park-factors/page.tsx` **[NEW]** — Página Next.js App Router SSR/dinámica.
6. `src/components/layout/nav-data.ts` **[MODIFY]** — Añadir entrada `Factores de Parque` en `Laboratorio Sabermétrico`.
7. `src/lib/__tests__/park-factors.test.ts` **[NEW]** — Suite unitaria en `node:assert/strict` (`npx tsx`).

---

## 4. Plan de Rollback

- La funcionalidad es completamente aditiva en rutas y archivos nuevos; el único archivo existente modificado es `src/components/layout/nav-data.ts` (1 línea añadida al arreglo de navegación). Revertir el commit elimina la sección limpiamente sin afectar ninguna ruta existente.
