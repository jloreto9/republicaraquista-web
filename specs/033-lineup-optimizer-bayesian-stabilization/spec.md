# Spec 033: Estabilización Bayesiana por Muestra (PA) y Cobertura Histórica en Optimizador Tom Tango

**Slug:** `033-lineup-optimizer-bayesian-stabilization`  
**Autor:** Spec-Kit Architect & Jorge Leonardo Loreto  
**Fecha:** 2026-11-18  
**Estado:** Especificado (Fase 1 de Spec-Kit)  
**Relacionados:** [Spec 013](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/013-tango-lineup-optimizer/spec.md) · [Spec 023](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/023-gamecenter-lineup-to-optimizer/spec.md) · [Spec 024](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/024-best-available-lineup-optimizer/spec.md)

---

## 1. Contexto y Diagnóstico

Durante la evaluación del **Optimizador de Lineups (Tom Tango - The Book)** en producción (`/bullpen?tab=lineups&subtab=optimizer`), se identificaron dos causas raíz de sesgo y datos imprecisos:

1. **Sesgo de muestra pequeña (`PA`) en el ranking ofensivo:**
   - Tanto `optimizeTangoLineup` (modo *"Del Juego / Orden del Día"*) como `selectBestDefensiveNine` / `buildBestAvailableLineup` (modo *"Mejor Posible (Roster Activo)"*) ordenan y seleccionan bateadores estrictamente por `wOBA`, `OBP`, `SLG` e `ISO` crudos sin regresión a la media.
   - `TangoPlayer` no transporta `plateAppearances` desde `Supabase` ni desde `MLB feed/live`.
   - En consecuencia, bateadores con muestras cortas e infladas (ej. 19–38 PA con `wOBA` de `.401`–`.553`) desplazan sistemáticamente a titulares consolidados con 115–135+ PA (ej. Bericoto, Cedeño, Lenyn Sosa, Aldrem Corredor), produciendo lineups poco realistas.
2. **Ausencia de `playerStatsMap` en temporadas históricas (`season < activeSeason`) y opacidad de fuente en modo *"Del Juego"*:**
   - En `src/app/api/bullpen/route.ts` y `src/app/bullpen/page.tsx`, cuando `season < activeSeason` y no hay `gamePk`, no se construye `playerStatsMap`, forzando que `resolvePlayerStats` caiga en `LEONES_REAL_STATS_MAP` (datos congelados) o en el fallback sintético (`statsSource: "synthetic"`).
   - El modo `"game_lineup"` en `TangoLineupOptimizerTab` oculta la insignia de fuente (`Temporada BD`, `MLB API`, `Base Club`, `Estimado`) y las `PA` del bateador.

---

## 2. Requerimientos Funcionales

### RF-01: Contratos de Datos Retrocompatibles (`src/types/tango-lineup.ts`)
- Extender `TangoPlayer` con campos opcionales:
  - `plateAppearances?: number`
  - `adjustedWoba?: number`
  - `adjustedObp?: number`
  - `adjustedSlg?: number`
  - `adjustedIso?: number`
- Agregar `TangoOptimizationOptions` (`{ stabilizationPriorPa?: number }`) y `stabilizationPriorPa?: number` en `BuildBestAvailableLineupParams`.

### RF-02: Estabilización Bayesiana Empírica en el Motor (`src/lib/tango-lineup-engine.ts`)
- Exportar `DEFAULT_TANGO_PRIOR_PA = 80` y `LVBP_LEAGUE_BATTING_MEANS` (`avg: 0.270`, `obp: 0.340`, `slg: 0.395`, `woba: 0.330`, `iso: 0.125`).
- Exportar función pura `stabilizeTangoPlayer(player: TangoPlayer, priorPa = DEFAULT_TANGO_PRIOR_PA)`:
  - Cuando `priorPa > 0` y `typeof player.plateAppearances === "number"` con `player.plateAppearances >= 0`, aplica regresión bayesiana hacia la media de liga:
    $$\text{métrica}_{\text{est}} = \frac{\text{PA} \cdot \text{métrica}_{\text{cruda}} + k \cdot \mu_{\text{liga}}}{\text{PA} + k}$$
  - Cuando `priorPa <= 0` o `plateAppearances` no está definido, devuelve las métricas observadas sin alterar.
- Poblar `plateAppearances` y precalcular `adjustedWoba`, `adjustedObp`, `adjustedSlg`, `adjustedIso` en `buildTangoPlayerFromBattingStats` y `buildTangoPlayerFromMlbSeasonStats`.
- Aplicar `stabilizeTangoPlayer` para la asignación de slots y cálculo BaseRuns en `calculateLineupMetrics`, `optimizeTangoLineup`, `selectBestDefensiveNine` y `buildBestAvailableLineup`, manteniendo intactas las estadísticas crudas observadas (`player.woba`, `obp`, `slg`, `avg`, `iso`) para transparencia visual.

### RF-03: Cobertura Real en Temporadas Históricas (`src/lib/game-feed-service.ts`, `src/app/api/bullpen/route.ts`, `src/app/bullpen/page.tsx`)
- Exportar `getHistoricalPlayerStatsMap(season)` en `src/lib/game-feed-service.ts` consultando `getBattingStats(season, "R", "all", 400, 0)`.
- En `/api/bullpen` y `/bullpen`, hidratar `playerStatsMap` con `getHistoricalPlayerStatsMap(season)` cuando `season < activeSeason` y no exista `fallbackRequested`.

### RF-04: Transparencia y Toggle de Estabilización en UI (`src/components/bullpen/tango-lineup-optimizer-tab.tsx`)
- Agregar control segmentado **`Estabilizado (Bayes k=80)`** *(activo por defecto)* vs **`Crudo (Sin ajuste PA)`** aplicable tanto al modo *"Del Juego / Orden del Día"* como a *"Mejor Posible (Roster Activo)"*.
- En modo *"Del Juego"*, mostrar `PA` (cuando esté disponible), el badge de fuente (`Temporada BD`, `MLB API`, `Base Club`, `Estimado`) y el `wOBA Est.` junto al `wOBA` crudo cuando difieran.
- En modo *"Mejor Posible"*, añadir opciones `Mín. 50 PA` y `Mín. 75 PA` al selector de muestra mínima y mostrar `Est.` junto al `wOBA` observado en el lineup, chips y banca.

---

## 3. Criterios de Aceptación

1. **CA-01 (Anti-Sesgo de Muestra Pequeña):** Con `priorPa = 80`, un bateador de 19–32 PA con `wOBA` crudo inflado (`.401`–`.467`) no desplaza a titulares consolidados de 115–130+ PA con sólido rendimiento (`Bericoto .476`, `Cedeño .433`, `Sosa .386`).
2. **CA-02 (Modo Crudo Opcional):** Al pasar `stabilizationPriorPa: 0` (o alternar el toggle en UI a *Crudo*), el motor ordena por métricas sin regresión.
3. **CA-03 (Transparencia Histórica):** En temporadas `< activeSeason`, `/api/bullpen` entrega `playerStatsMap` con datos reales de `Supabase` (`statsSource: "supabase"`) en lugar de caer a dummies.
4. **CA-04 (Calidad y No Regresión):** Pruebas unitarias en `test/` pasando al 100%, `npx tsc --noEmit` sin errores y `npm run build` exitoso.
