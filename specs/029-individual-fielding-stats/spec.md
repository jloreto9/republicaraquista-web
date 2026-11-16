# Spec 029: Estadísticas Individuales de Fildeo y Defensa en `/individuales`

**Slug:** `029-individual-fielding-stats`  
**Autor:** Jorge Leonardo Loreto & Antigravity  
**Fecha:** 2026-11-16  
**Estado:** Especificado (Fase 1 de Spec-Kit)  
**Relacionados:** [`src/app/individuales/page.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/individuales/page.tsx) · [`src/components/stats/individuales-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/stats/individuales-view.tsx) · [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts)

---

## 1. Contexto y Diagnóstico

En `src/components/stats/individuales-view.tsx`, la pestaña **Fildeo** (`activeTab === "fielding"`) mostraba un bloque de marcador de posición (*placeholder*) indicando que las estadísticas defensivas estaban pendientes de procesamiento, sin consultar datos reales ni renderizar tabla.

El endpoint oficial de MLB Stats API (`https://statsapi.mlb.com/api/v1/stats?stats=season&sportId=17&leagueId=135&group=fielding&season=${season}&gameType=${phase}&playerPool=all&limit=1000`) expone los registros defensivos individuales completos por jugador, franquicia y posición (incluyendo `putOuts`, `assists`, `errors`, `chances`, `fielding`, `doublePlays`, `triplePlays`, `rangeFactorPer9Inn`, `innings`, `gamesPlayed`, `gamesStarted`, `caughtStealing`, `stolenBases`, `caughtStealingPercentage`, `passedBall`).

---

## 2. Requerimientos Funcionales

### RF-01: Contrato y Capa de Datos (`src/types/sports.ts`, `src/lib/supabase.ts`, `src/app/api/stats/fielding/route.ts`)
- Ampliar `FieldingStats` con campos opcionales retrocompatibles (`gamesStarted`, `innings`, `inningsDecimal`, `triplePlays`, `rangeFactorPer9`, `caughtStealing`, `stolenBases`, `caughtStealingPct`, `passedBalls`).
- Ampliar `fetchMlbSeasonStatsSplits` para aceptar `group: "hitting" | "pitching" | "fielding"`.
- Implementar helpers de aritmética de entradas en formato béisbol (`parseBaseballInningsToDecimal` y `formatDecimalToBaseballInnings`, ej. `"9.2" + "5.1" = "15.0"`).
- Exportar `getFieldingStats(season, phase, teamId, limit, minChances)`:
  - Cuando `phase === "all"`, consultar en paralelo las fases `"R"`, `"L"` y `"F"` y consolidar por `${playerId}-${teamId}-${position}`.
  - Filtrar únicamente franquicias en `LVBP_TEAM_IDS` (y por `teamId` si es distinto de `"all"`).
  - Excluir posiciones no defensivas (`DH`, `PH`, `PR`) y registros sin participación (`games === 0 && totalChances === 0`).
  - Calcular `totalChances`, `fieldingPct`, `rangeFactorPer9` y `caughtStealingPct`.
  - Ordenar por `totalChances` descendente y luego `fieldingPct` descendente.
- Exponer `GET /api/stats/fielding` con `season`, `phase`, `team_id`, `limit` (`1000`), `min_tc` (`0`) y cabecera `Cache-Control: public, s-maxage=300, stale-while-revalidate=60`.

### RF-02: Tabla Defensiva (`src/components/stats/fielding-table.tsx`)
- Filtro interactivo por posición (`Todas`, `C`, `1B`, `2B`, `3B`, `SS`, `IF`, `LF`, `CF`, `RF`, `OF`, `P`) y búsqueda rápida por nombre.
- Columnas ordenables: `#`, `JUGADOR` (con avatar en cascada y botón `Splits`), `EQ`, `POS`, `JJ`, `JI`, `INN`, `TC`, `PO`, `A`, `E`, `DP`, `FPCT`, `RF/9`.
- Columnas específicas para receptores cuando se filtra `C` o hay receptores en vista (`CS`, `SB`, `CS%`, `PB`).
- Resaltado visual para Leones del Caracas (`teamId === 695`).

### RF-03: Integración en `/individuales`
- Precargar `initialFieldingStats` en `IndividualesPage` (`page.tsx`).
- Cargar `/api/stats/fielding` junto a bateo y pitcheo al cambiar temporada/fase en `IndividualesView`.
- Habilitar el switch de calificados en `StatsFilters` para `activeTab === "fielding"` con umbral dinámico (`Math.max(5, Math.round(teamGames * 0.5))` lances totales, `≥ X TC`).

---

## 3. Invariantes y Guardrails

1. **Cero ocurrencias** de `"sabermétrico"`, `"sabermétrica"` o `"sabermetría"` en UI (Lección 3).
2. **Idioma 100% español** en etiquetas, tooltips y controles.
3. **Aritmética de innings béisbol:** `.1` = 1/3 de entrada, `.2` = 2/3 de entrada al consolidar fases.

---

## 4. Criterios de Aceptación

1. **CA-01:** `getFieldingStats` consolida correctamente una fase (`"R"`) y múltiples fases (`"all"`), calcula `FPCT`, `RF/9` y `CS%`, y excluye `DH`/`PH`/`PR` y registros en cero.
2. **CA-02:** La pestaña **Fildeo** en `/individuales` muestra la tabla defensiva con filtros por posición, búsqueda y ordenamiento por columnas.
3. **CA-03:** `npx tsx src/lib/__tests__/fielding-stats.test.ts`, `npx tsx src/lib/__tests__/awards-engine.test.ts`, `npx eslint` y `npm run build` pasan sin errores.
