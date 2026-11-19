# Spec 034: wOBA, FIP y Métricas Ajustadas `Stats+` en Líderes Individuales (`/individuales`)

**Slug:** `034-individual-woba-plus-stats`  
**Autor:** Jorge Leonardo Loreto & Swarm  
**Fecha:** 2026-11-18  
**Estado:** Implementado en código — Pendiente verificación integral (Track 2: Spec-Driven Development)  
**Repositorio:** `republicaraquista-web` (Next.js 16 / React 19 / TypeScript)  
**Relacionados:** [`src/types/sports.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/types/sports.ts) · [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts) · [`src/lib/awards-engine.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/awards-engine.ts) · [`src/components/stats/batting-table.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/batting-table.tsx) · [`src/components/stats/pitching-table.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/pitching-table.tsx) · [`src/components/stats/stathead-individual-search.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/stathead-individual-search.tsx)

---

## 1. Contexto y Problema

La vista de **Líderes Individuales (`/individuales`)** muestra estadísticas tradicionales y tasas base (`AVG`, `OBP`, `SLG`, `OPS`, `ISO`, `BABIP`, `ERA`, `WHIP`, `K/9`, `BB/9`, `K/BB`) tanto en las tablas principales de temporada (**Bateo** y **Pitcheo**) como en el **Buscador Individual por Rango de Fechas**. Aunque métricas de valor ofensivo y dominio de pitcheo (`wOBA`, `wRC+`, `FIP`) ya se calculaban internamente para el tracker de **Premios** (`src/lib/awards-engine.ts`), no estaban expuestas en las tablas individuales ni existían índices ajustados a la media de la liga (`Stats+`, donde `100 = Promedio LVBP`).

Esta especificación incorpora `wOBA`, `FIP` y la familia de índices `Stats+` (`AVG+`, `OBP+`, `SLG+`, `OPS+`, `wOBA+`, `wRC+`, `ERA+`, `WHIP+`, `FIP+`) en el pipeline de datos y en las tres tablas de `/individuales`, preservando retrocompatibilidad y ergonomía visual mediante un selector de vistas de columnas.

---

## 2. Escenarios de Usuario y Criterios de Aceptación

### Historia 1 — Bateo Avanzado y `Stats+` en Tabla y Buscador (P1)
Como analista o fanático de la LVBP, quiero visualizar `wOBA`, `AVG+`, `OBP+`, `SLG+`, `OPS+`, `wOBA+` y `wRC+` junto al bloque ofensivo de cada bateador en `/individuales` (**Bateo** y **Buscador**), ordenando cualquiera de estas columnas con seguridad y distinguiendo rápidamente con código de color quién rinde por encima o por debajo del promedio de la liga (`100`).

### Historia 2 — Pitcheo Avanzado (`FIP` y `Stats+`) con Escala Unificada (P1)
Como usuario, quiero consultar `FIP` (2 decimales, menor es mejor al ordenar) y `ERA+`, `WHIP+`, `FIP+` (donde `> 100` siempre indica rendimiento superior al promedio de la liga, orden descendente por defecto) en `/individuales` (**Pitcheo** y **Buscador**).

### Historia 3 — Selector de Vista de Columnas y Leyenda `100 = Promedio LVBP` (P1)
Como usuario en desktop o móvil, quiero alternar entre **Todas** (por defecto), **Tradicionales** y **Avanzadas & Stats+** encima de la tabla manteniendo siempre visibles la identidad del jugador (`#`, `JUGADOR`/`LANZADOR`, `EQ`, `JJ`, `AP`/`IP`) y la línea de referencia (`AVG`/`OBP`/`SLG`/`OPS` en bateo; `ERA`/`WHIP`/`K/9`/`BB/9`/`K/BB` en pitcheo), acompañada por una leyenda visual compacta del semáforo `100 = Promedio LVBP`.

### Historia 4 — Comparativa Interanual (`Δ`) en el Buscador por Fechas (P2)
Como analista, al activar **Comparar con temporada anterior (Δ)** en el Buscador Individual por Rango de Fechas, quiero ver el delta interanual para `wOBA` (3 decimales, positivo es mejor), `FIP` (2 decimales, negativo es mejor) y cada índice `Stats+` (0 decimales, positivo es mejor).

---

## 3. Requerimientos Funcionales y Contrato Técnico

### RF-01: Contrato de Tipos (`src/types/sports.ts`)
1. **`BattingStats`** añade como propiedades opcionales:
   - `woba?: number`
   - `avgPlus?: number`
   - `obpPlus?: number`
   - `slgPlus?: number`
   - `opsPlus?: number`
   - `wobaPlus?: number`
   - `wrcPlus?: number`
2. **`PitchingStats`** añade como propiedades opcionales:
   - `fip?: number`
   - `eraPlus?: number`
   - `whipPlus?: number`
   - `fipPlus?: number`

### RF-02: Enriquecimiento Estadístico en `src/lib/supabase.ts`
1. **Constantes canónicas LVBP (temporada base 2025-2026)** alineadas con `src/lib/awards-engine.ts`:
   `bb: 0.69`, `hbp: 0.72`, `single: 0.888`, `double: 1.271`, `triple: 1.616`, `hr: 2.101`, `scale: 1.15`.
2. **`enrichBattingStatsWithPlus(batters: BattingStats[]): BattingStats[]`**:
   - Calcula totales ponderados de liga (`lgAvg`, `lgObp`, `lgSlg`, `lgWoba`, `lgRunsPerPa`) sobre **todo el pool recibido** antes de aplicar filtros de `minAb` o `limit`.
   - Calcula `woba` (redondeado a 3 decimales) y los índices `avgPlus`, `obpPlus`, `slgPlus`, `opsPlus`, `wobaPlus` y `wrcPlus` con manejo seguro para jugadores con `0 VB` / `0 AP`.
3. **`enrichPitchingStatsWithPlus(pitchers: PitchingStats[]): PitchingStats[]`**:
   - Calcula `lgEra`, `lgWhip`, `lgFipCore` y constante de ajuste `cFip = lgEra - lgFipCore` sobre **todo el pool recibido** antes de filtrar por `minIp` o `limit`.
   - Calcula `fip` (2 decimales, `>= 0`) y `eraPlus`, `whipPlus`, `fipPlus` acotados a `[0, 500]` (escala invertida respecto a la media donde `> 100` siempre es mejor). Para `inningsPitched <= 0`, asigna `0`.
4. Integración en `aggregateBattingRows`, `getBattingStats` (rama `startDate && endDate`), `aggregatePitchingRows` y `getPitchingStats` (rama `startDate && endDate`) conservando filtros de equipo (`targetTeamId`) y sin alterar los cortes `minAb`/`minIp`/`limit`.

### RF-03: Tablas y Buscador en UI (`src/components/stats/`)
1. **Semáforo visual unificado para badges `Stats+` (`100 = Promedio LVBP`)**:
   - `>= 130`: `bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold`
   - `110 – 129`: `bg-[#FDB827]/15 text-[#FDB827] border-[#FDB827]/35 font-semibold`
   - `91 – 109`: `bg-slate-800/80 text-slate-200 border-slate-700`
   - `1 – 90`: `bg-rose-500/15 text-rose-300 border-rose-500/30`
   - `<= 0` o `undefined`: `--` en `text-slate-500`
2. **`BattingTable` (`src/components/stats/batting-table.tsx`)**:
   - Selector `Todas` | `Tradicionales` | `Avanzadas & Stats+` (defecto `"all"`) + leyenda `100 = Promedio LVBP`.
   - Columnas fijas: `#`, `JUGADOR`, `EQ`, `JJ`, `AP` y slash line (`AVG`, `OBP`, `SLG`, `OPS`).
   - Tradicionales (`all` | `traditional`): `VB`, `CA`, `H`, `2B`, `3B`, `HR`, `CI`, `BB`, `SO`, `GIDP`, `BR`.
   - Avanzadas & Stats+ (`all` | `advanced`): `ISO`, `BABIP`, `wOBA` (3 decimales sin cero inicial, ej. `.385`), `AVG+`, `OBP+`, `SLG+`, `OPS+`, `wOBA+`, `wRC+`.
   - Orden por defecto `ops` descendente; comparador seguro con fallback `?? 0` en campos opcionales.
3. **`PitchingTable` (`src/components/stats/pitching-table.tsx`)**:
   - Selector `Todas` | `Tradicionales` | `Avanzadas & Stats+` (defecto `"all"`) + leyenda `100 = Promedio LVBP`.
   - Columnas fijas: `#`, `LANZADOR`, `EQ`, `JJ`, `JI`, `IP` y tasas base (`ERA`, `WHIP`, `K/9`, `BB/9`, `K/BB`).
   - Tradicionales (`all` | `traditional`): `H`, `C`, `CL`, `BB`, `SO`, `HR`, `GIDP`.
   - Avanzadas & Stats+ (`all` | `advanced`): `FIP` (2 decimales), `ERA+`, `WHIP+`, `FIP+`.
   - Orden por defecto `era` ascendente; en `handleSort`, `era`, `whip` y `fip` ordenan ascendente por defecto, mientras `eraPlus`, `whipPlus` y `fipPlus` ordenan descendente (`false`). Comparador seguro con `?? 0`.
4. **`StatheadIndividualSearch` (`src/components/stats/stathead-individual-search.tsx`)**:
   - Agrega `"fip"` a `ASCENDING_DEFAULT_FIELDS`.
   - Selector `Todas` | `Tradicionales` | `Avanzadas & Stats+` y leyenda `100 = Promedio LVBP` en la barra de cabecera de la tabla cuando `group === "batting"` o `group === "pitching"`.
   - Ordenamiento seguro con fallback `?? 0` para todas las columnas nuevas.
   - Celdas `StatValueCell` con delta interanual en `batting` (`wOBA` 3 dec `positiveIsGood=true`, y `AVG+`, `OBP+`, `SLG+`, `OPS+`, `wOBA+`, `wRC+` con badge semáforo + delta 0 dec `positiveIsGood=true`) y en `pitching` (`FIP` 2 dec `positiveIsGood=false`, y `ERA+`, `WHIP+`, `FIP+` con badge semáforo + delta 0 dec `positiveIsGood=true`).

---

## 4. Invariantes y Guardrails

1. **Retrocompatibilidad estricta:** Los nuevos campos en `BattingStats` y `PitchingStats` son opcionales; consumidores previos no se ven afectados.
2. **Idioma 100% español:** Etiquetas, leyendas, tooltips y títulos en español.
3. **Lenguaje deportivo directo:** Cero uso de jerga académica prohibida en UI, tooltips o documentación de la feature (verificación de copy con 0 coincidencias).
4. **Cero métricas Statcast en LVBP:** Sin Exit Velocity, Launch Angle, Barrels ni Sprint Speed.
5. **Cálculo sobre pool completo de liga:** Los promedios de referencia (`lgAvg`, `lgObp`, `lgSlg`, `lgWoba`, `lgEra`, `lgWhip`, `cFip`) siempre se calculan antes de filtrar por equipo o mínimo de `AP`/`IP`.

---

## 5. Criterios de Aceptación

1. **CA-01:** `enrichBattingStatsWithPlus` y `enrichPitchingStatsWithPlus` producen valores consistentes con las fórmulas canónicas LVBP 2025-2026, manejan `0 VB` / `0 IP` sin `NaN`/`Infinity` y se ejecutan antes de los filtros de corte.
2. **CA-02:** `BattingTable`, `PitchingTable` y `StatheadIndividualSearch` muestran el selector `Todas | Tradicionales | Avanzadas & Stats+`, la leyenda `100 = Promedio LVBP`, badges semáforo en `+`, ordenamiento ascendente por defecto en `fip` y deltas interanuales en el Buscador.
3. **CA-03:** La auditoría de lenguaje deportivo arroja 0 coincidencias de términos prohibidos en todos los archivos modificados/creados de la feature.
4. **CA-04:** Pruebas unitarias (`plus-stats.test.ts`, `individual-date-range.test.ts`, `awards-engine.test.ts`), ESLint y `npm run build` pasan sin errores ni regresiones.
