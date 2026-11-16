# Informe de Implementación y Verificación 028: Carrera por los Premios LVBP (MVP y Pitcher del Año)

**Slug:** `028-awards-mvp-pitcher-tracker`  
**Fecha:** 2026-11-16  
**Estado:** Implementado y Verificado (Converged)

---

## 1. Resumen de Archivos Entregados

### Track A — Capa de Datos y Endpoints
- [`src/types/sports.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/types/sports.ts): añadido `hbp?: number` a `PitchingStats`.
- [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts):
  - Extraído `fetchMlbSeasonStatsSplits` como helper compartido para `fetchMlbSeasonGidpMap` y el nuevo `fetchMlbSeasonPitchingMetaMap` (`gidp`, `wins`, `losses`, `saves`, `gamesStarted`, `hbp`).
  - `getPitchingStats` acumula `hbp` desde Supabase/caché y rellena `gamesStarted`, `wins`, `losses`, `saves` y `hbp`.
  - `getTeamGamesMap` ahora devuelve también `teamWinPctMap` obtenido desde `getStandings`.
- [`src/app/api/stats/batting/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/stats/batting/route.ts) y [`src/app/api/stats/pitching/route.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/api/stats/pitching/route.ts): devuelven `teamWinPctMap` y elevan el `limit` por defecto a `500`.

### Track B — Motor Analítico de Premios
- [`src/lib/awards-engine.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/awards-engine.ts):
  - `computeLeagueBattingEnvironment` y `computeLeaguePitchingEnvironment`: calculan dinámicamente `lgWoba`, `lgRunsPerPa`, `lgEra` y `cFip` sobre el universo de la liga.
  - `calculateMvpRace`: aplica elegibilidad $\ge 3.1\text{ AP/J}$ (fallback `[2.2, 1.5, 0.5]` si hay $< 5$ calificados) y pondera 45 pts Impacto Ofensivo (`wRAA`, `wRC+`, `wOBA`) + 40 pts Triple Corona/Producción (`OPS`, `AVG`, `HR`, `CI`, `CA`, `BR netas`) + 15 pts Éxito Colectivo (`teamWinPct`).
  - `calculatePitcherOfYearRace`: aplica elegibilidad invernal $\ge 0.8\text{ IP/J}$ (fallback `[0.6, 0.4, 0.1]` si hay $< 5$ calificados) y pondera 45 pts Prevención/Dominio (`ERA`, `WHIP`, `FIP`) + 35 pts Volumen/Ponches (`IP`, `SO`, `K/9`, `K/BB`) + 20 pts Decisiones/Éxito Colectivo (`G`, balance `G-P`, `teamWinPct`).
  - Detección de insignias de liderato (`Líder AVG`, `Líder HR`, `Líder CI`, `Líder OPS`, `Líder wRC+`, `Líder H`, `Líder CA`, `Líder BR`, `Líder ERA`, `Líder WHIP`, `Líder FIP`, `Líder G`, `Líder SO`, `Líder IP`).

### Track C — Interfaz `/individuales`
- [`src/components/stats/awards-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/awards-view.tsx): vista en dos columnas (`Jugador Más Valioso` y `Pitcher del Año`) con Tarjeta Hero #1 (`AwardHeroCard`), desglose en barras por los 3 pilares (`PillarBars`), insignias de liderato, callout `Referente Caraquista en la Carrera` cuando Leones (`695`) no ocupa el `#1`, tabla `#2 al #10` con ranking general LVBP invariante y acceso directo a `Splits`.
- [`src/components/stats/individuales-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/individuales-view.tsx), [`src/components/stats/stats-filters.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/stats-filters.tsx) y [`src/app/individuales/page.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/individuales/page.tsx): agregada la pestaña `"Premios"` (`?tab=awards` / `?tab=premios`), sincronización por temporada/fase con pool completo (`team_id=all&limit=500`) y filtrado de franquicia en memoria.

---

## 2. Evidencia Observada de Verificación

- **Pruebas unitarias del motor (`npx tsx src/lib/__tests__/awards-engine.test.ts`):** **PASS (`exit=0`)**
  - Output observado: `=== TODAS LAS PRUEBAS DEL MOTOR DE PREMIOS LVBP PASARON EXITOSAMENTE ===`.
  - Valida entorno de liga, puntajes MVP/Pitcher del Año, umbral invernal `0.8 IP/J`, fallback progresivo (`0.6 IP/J`), caso borde de igualdad en récords colectivos (`teamScore = 7.5`), preservación de `overallRank` caraquista y ausencia de `"saberm"` en todos los archivos del módulo.
- **Pruebas de no regresión (`npx tsx src/lib/__tests__/player-splits.test.ts`):** **PASS (`exit=0`)**
  - Output observado: `=== TODAS LAS PRUEBAS DE PLAYER SPLITS PASARON EXITOSAMENTE ===`.
- **ESLint sobre los 10 archivos modificados/nuevos:** **PASS (`exit=0`)** — 0 errores, 0 warnings.
- **Compilación de producción (`npm run build`):** **PASS (`exit=0`)** — `Next.js 16.3.6 (Turbopack)`, `✓ Compiled successfully in 2.8s`, `✓ Generating static pages using 7 workers (19/19) in 1777ms`.
