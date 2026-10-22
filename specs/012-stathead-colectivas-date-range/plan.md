# Implementation Plan: 012 - Buscador de Colectivas tipo Stathead con Rango de Fechas y Comparación Interanual

**Feature Directory**: `specs/012-stathead-colectivas-date-range`  
**Target Repository**: `republicaraquista-web`  
**Target Branch**: `012-stathead-colectivas-date-range`  
**Files Affected**:
1. `src/lib/collective.ts` (Extensión de `fetchStatsGroup` y `getCollectiveStats` con `startDate` y `endDate`).
2. `src/app/api/stats/collective/route.ts` (Soporte de query params `startDate` y `endDate`).
3. `src/types/collective.ts` (Tipos para comparación delta interanual y rangos de fechas).
4. `src/components/colectivas/stathead-collective-search.tsx` (Nuevo componente interactivo con filtros, presets de fecha, switch de comparación y tabla comparativa con deltas).
5. `src/components/colectivas/colectivas-view.tsx` (Integración de la nueva pestaña `"🔍 Stathead / Rango"`).

---

## 1. Arquitectura Técnica y Flujo de Datos

```
[Usuario selecciona Rango de Fechas (ej. 12 al 22 Oct) y activa "Comparar 2024"]
                                  │
                                  ▼
      src/components/colectivas/stathead-collective-search.tsx
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        │ Petición Paralela A                               │ Petición Paralela B
        ▼ (Temporada Actual: 2025)                          ▼ (Temporada Anterior: 2024)
   /api/stats/collective?season=2025&                  /api/stats/collective?season=2024&
   startDate=2025-10-12&endDate=2025-10-22             startDate=2024-10-12&endDate=2024-10-22
        │                                                   │
        ▼                                                   ▼
   src/lib/collective.ts (getCollectiveStats)          src/lib/collective.ts (getCollectiveStats)
        │                                                   │
        ▼ (stats=byDateRange)                               ▼ (stats=byDateRange, revalidate: 86400)
   MLB Stats API (sportId=17, leagueId=135)            MLB Stats API (sportId=17, leagueId=135)
        │                                                   │
        └─────────────────────────┬─────────────────────────┘
                                  ▼
                calculateCollectiveDelta(data2025, data2024)
                                  │
                                  ▼
             Tabla Comparativa Stathead con Deltas (Δ)
          - Acumulados por Equipo (Actual vs Previo)
          - Deltas Semánticos (+0.045 OPS en verde, -0.80 ERA en verde)
          - Total Liga y Promedios por Juego en tfoot
```

---

## 2. Escalera Ponytail (Lazy Senior Dev Assessment)

1. **¿Se necesita construir una base de datos o agregador nuevo? (YAGNI)**: No. La MLB Stats API ya agrega nativamente los números colectivos por rango de fecha con `stats=byDateRange`.
2. **¿Ya existe en el código?**: Sí. `src/lib/collective.ts` ya tiene todo el pipeline de cálculo para los 8 equipos y la liga. Reutilizamos la misma estructura de datos.
3. **¿Diff mínimo?**:
   - En `src/lib/collective.ts`: Solo agregar `startDate?: string, endDate?: string`. Si vienen definidos, cambiar `stats=season` por `stats=byDateRange&startDate=${startDate}&endDate=${endDate}`.
   - En la API: Pasar `searchParams.get("startDate")` y `searchParams.get("endDate")`.
   - En UI: Un componente modular dedicado `stathead-collective-search.tsx` que no contamina la lógica existente de las pestañas actuales.

---

## 3. Contratos de Datos y Fórmulas Diferenciales ($\Delta$)

### A. Tipos de Comparación (`src/types/collective.ts`)
```typescript
export interface StatheadComparisonTeam<T> {
  teamId: number;
  teamName: string;
  teamAbbr: string;
  logo: string;
  current: T;
  previous?: T | null;
  delta?: Partial<Record<keyof T, number>>;
}
```

### B. Reglas Semánticas para Deltas ($\Delta$)
- **Métricas Ofensivas** (Más es mejor):
  - $\Delta \text{AVG} = \text{AVG}_{\text{actual}} - \text{AVG}_{\text{prev}}$
  - $\Delta \text{OPS} = \text{OPS}_{\text{actual}} - \text{OPS}_{\text{prev}}$
  - $\Delta \text{R/J} = (\text{R/JJ})_{\text{actual}} - (\text{R/JJ})_{\text{prev}}$
  - Color: Positivo $\to$ Verde (`text-emerald-400`), Negativo $\to$ Rojo (`text-rose-400`).
- **Métricas de Pitcheo** (Menos es mejor):
  - $\Delta \text{ERA} = \text{ERA}_{\text{actual}} - \text{ERA}_{\text{prev}}$
  - $\Delta \text{WHIP} = \text{WHIP}_{\text{actual}} - \text{WHIP}_{\text{prev}}$
  - Color: Negativo $\to$ Verde (`text-emerald-400`, mejoró la efectividad), Positivo $\to$ Rojo (`text-rose-400`, empeoró).

---

## 4. Plan de Rollback

Si alguna modificación genera regresiones:
1. Las firmas de `getCollectiveStats` mantendrán valores por defecto para `startDate` y `endDate` (`undefined`). Los consumidores existentes no notarán ningún cambio de comportamiento.
2. La pestaña en `colectivas-view.tsx` puede ocultarse con un simple condicional sin alterar las pestañas existentes de Bateo, Pitcheo y Fildeo.
