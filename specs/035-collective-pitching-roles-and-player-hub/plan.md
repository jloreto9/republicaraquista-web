# Plan Técnico 035: Colectivas por Rol de Pitcheo (`SP`/`RP`), Buscador Global de Jugadores (`/jugadores`) y Splits Avanzados LVBP

**Slug:** `035-collective-pitching-roles-and-player-hub`  
**Fecha:** 2026-11-25  

---

## 1. Estrategia y Fuente de Verdad

Siguiendo la jerarquía de prioridades (`CLAUDE.md`) y el minimalismo de la Escalera Ponytail:
- **Reutilización máxima de motores existentes:**
  - Para **Leverage Index y WPA** en splits de jugadores, reutilizar directamente `calculateWinExpectancy`, `calculateLeverageIndex` y `encodeBaseState` de `src/lib/wpa-engine.ts` junto con `fetchGameLiveFeed` de `src/lib/game-feed-service.ts`, evitando reimplementar la matriz RE24 o descargas de feeds.
  - Para **Estadísticas Generales Multi-Temporada y `Stats+`**, reutilizar `getBattingStats`, `getPitchingStats` y `getFieldingStats` de `src/lib/supabase.ts` (que ya enriquecen `wOBA`, `wRC+`, `FIP` y `Stats+` desde Spec 034).
  - Para **métricas FanGraphs y formateo de innings**, reutilizar `computeBatterFanGraphsMetrics`, `computePitcherFanGraphsMetrics` y `outsToInningsDisplay` de `src/lib/player-splits-service.ts` manteniendo el grafo de dependencias acíclico (`player-leverage-service.ts` importa de `player-splits-service.ts`, nunca al revés).
- **Estrategia híbrida verificada para MLB Stats API en Colectivas `SP`/`RP`:**
  - Por temporada/fase completa: `teams/stats` con `stats=statSplits&sitCodes=sp|rp`.
  - Por rango de fechas (`startDate` + `endDate`): MLB Stats API ignora `sitCodes` cuando se usa `stats=byDateRange`; por ello se resuelve con `schedule` + `boxscore` oficiales por juego finalizado (`concurrencia = 12`), caché inmutable en memoria (`finalizedBoxscoreCache`) y una función pura testable `aggregateBoxscoresByPitchingRole`.
- **Desacoplamiento de carga pesada:** El cálculo de Leverage Index (que inspecciona feeds play-by-play) vive en un endpoint paralelo (`/api/stats/player-leverage`) y se consume de forma asíncrona desde `LeverageSplitsCard`, evitando bloquear la carga inicial de `/jugadores` y de `/api/stats/player-splits`.

---

## 2. Arquitectura y Flujo de Datos

```text
MÓDULO 1 — Colectivas SP / RP (/colectivas)
  ├─ Temporada / Fase (!startDate || !endDate)
  │    └─ MLB teams/stats (stats=statSplits&sitCodes=sp|rp)
  └─ Rango de Fechas Stathead (startDate && endDate)
       └─ MLB schedule ─► juegos Final ─► boxscores (cache inmutable, conc. 12)
            └─ aggregateBoxscoresByPitchingRole(boxscores, role)
  ▼
[src/lib/collective.ts] ─► /api/stats/collective?pitchingRole=all|sp|rp
  ├─ ColectivasView (Selector Todos/SP/RP, 4to KPI MÁS INNINGS en SP)
  └─ StatheadCollectiveSearch (Selector SP/RP, Δ interanual por rol, nota ±1 CL)

MÓDULO 2 & 3 — Hub de Jugadores (/jugadores) + Quick Search
  ├─ Header (Ctrl+K) / MobileNav (lupa) ─► PlayerQuickSearch ─► /api/stats/player-splits?mode=list
  │    └─ Navega a /jugadores?player={id}&type={batter|pitcher}&season={season}
  ├─ Carga principal ─► /api/stats/player-splits?player_id=...&type=...&season=...
  │    ├─ general: Supabase [2026, 2025] (Batting/Pitching/Fielding + Stats+) + Game Logs
  │    ├─ 6 grupos de splits LVBP (sitCodes ampliados + buildRecentTrendSplits + buildPitcherRestDaySplits)
  │    └─ Fix ERA intra-inning: era="--", eraNum=-1, eraAvailable=false si falta earnedRuns/era
  └─ Carga paralela ─► /api/stats/player-leverage?player_id=...&type=...&season=...
       └─ game_ids (Supabase/gameLog) ─► fetchGameLiveFeed (conc. 8) ─► aggregatePlaysByLeverage
            └─ LeverageSplitsCard (High > 1.50, Mid 0.85–1.50, Low < 0.85, aLI, WPA, Late & Close)
```

---

## 3. Archivos Afectados por Módulo

### Track A — Spec-Kit (`spec-writer`)
- `specs/035-collective-pitching-roles-and-player-hub/spec.md` **[NEW]**
- `specs/035-collective-pitching-roles-and-player-hub/plan.md` **[NEW]**
- `specs/035-collective-pitching-roles-and-player-hub/tasks.md` **[NEW]**

### Track B — Módulo 1: Colectivas SP/RP (`colectivas`)
- `src/types/collective.ts`: `PitchingRoleFilter` y `pitchingRole?` en `CollectiveStatsResult`.
- `src/lib/collective.ts`: `getCollectiveStats(..., pitchingRole)` y `aggregateBoxscoresByPitchingRole`.
- `src/app/api/stats/collective/route.ts`: query param y campo JSON `pitchingRole`.
- `src/components/colectivas/colectivas-view.tsx`: selector `Todos | Abridores (SP) | Relevistas (RP)`, re-fetch y KPI `MÁS INNINGS (IP)` en `SP`.
- `src/components/colectivas/stathead-collective-search.tsx`: selector `SP/RP` en pitcheo, `fetchCurrent`/`fetchPrev` con `pitchingRole`, badge activo y nota `±1 CL`.
- `src/lib/__tests__/collective-pitching-roles.test.ts` **[NEW]**: pruebas de clasificación SP/RP, tercios de inning, suma SP+RP, KPIs y `0.0` IP.

### Track C — Módulo 2: Player Data, Splits y Leverage (`player-data`)
- `src/types/player-splits.ts`: ampliación de `SplitCategory`, `eraAvailable?` y contratos `PlayerLeverage*`, `Player*GameLog`, `PlayerGeneralProfile` y campos en `PlayerSplitsProfile`.
- `src/lib/player-leverage-service.ts` **[NEW]**: `LEVERAGE_THRESHOLDS`, `classifyLeverageTier`, `aggregatePlaysByLeverage`, `getPlayerLeverageSplits`.
- `src/lib/player-splits-service.ts`: ampliación de `SIT_CODES`, corrección de `eraAvailable: false` en `parseMlbPitcherSplit`, funciones puras (`buildRecentTrendSplits`, `buildPitcherRestDaySplits`, `buildBatterGameLogs`, `buildPitcherGameLogs`) y `getPlayerGeneralProfile`.
- `src/app/api/stats/player-splits/route.ts`: validación estricta de `playerId` (`400`) y `Cache-Control` por temporada.
- `src/app/api/stats/player-leverage/route.ts` **[NEW]**: endpoint `GET` paralelo con validación y caché.
- `src/lib/__tests__/player-leverage-and-splits.test.ts` **[NEW]**: tests de Leverage, `responsiblePitcher`/`earned`, tendencia reciente, días de descanso y `era="--"`.

### Track D — Módulo 3: UI, Navegación y Página `/jugadores` (`player-ui`)
- `src/components/layout/nav-data.ts`: ítem `"Buscador de Jugadores"` (`/jugadores`) en `"Analítica Avanzada"`.
- `src/components/layout/player-quick-search.tsx` **[NEW]**: barra rápida global (`Ctrl+K` y modo `compact`).
- `src/components/layout/header.tsx` y `src/components/layout/mobile-nav.tsx`: montaje de `PlayerQuickSearch`.
- `src/app/jugadores/page.tsx` **[NEW]**: ruta Server Component con `searchParams` y `<PlayerSplitsView syncUrl={true} />`.
- `src/components/stats/splits/player-general-stats-card.tsx` **[NEW]**: ficha multi-temporada (`2026-27`, `2025-26`, `Total LVBP`), semáforo `Stats+`, Resumen Defensivo y Game Log.
- `src/components/stats/splits/leverage-splits-card.tsx` **[NEW]**: splits de presión (`High/Mid/Low LI`), `aLI`, `WPA`, `Late & Close` y leyenda LVBP.
- `src/components/stats/splits/split-table-group.tsx`: renderizado neutro y orden al final para `eraAvailable === false` / `"--"`.
- `src/components/stats/splits/player-splits-view.tsx`: `syncUrl`, buscador unificado sin acentos, integración de ficha general, leverage, 6 nuevos grupos y matriz colapsable de conteos.
- `src/components/stats/individuales-view.tsx`: enlace directo `"Abrir en Buscador de Jugadores"` hacia `/jugadores`.

### Track E — Verificación Integral (`verifier` + `coordinator`)
- Ejecución de tests unitarios, `npx tsc --noEmit`, ESLint, auditoría de guardrails LVBP (idioma, sin jerga prohibida, sin Statcast), `npm run build` y redacción de `specs/035-collective-pitching-roles-and-player-hub/implementation.md`.

---

## 4. Plan de Rollback

1. Las rutas y archivos nuevos (`/jugadores`, `/api/stats/player-leverage`, `player-quick-search.tsx`, `player-general-stats-card.tsx`, `leverage-splits-card.tsx`, `player-leverage-service.ts`) son aditivos y no modifican tablas ni esquemas de Supabase.
2. Las extensiones en `CollectiveStatsResult` y `PlayerSplitsProfile` son opcionales, y cuando `pitchingRole === "all"` se conserva intacto el flujo original de colectivas.
3. Ante cualquier incidencia, basta revertir los commits del feature o deshabilitar el enlace en `nav-data.ts` sin migraciones ni pérdida de datos.
