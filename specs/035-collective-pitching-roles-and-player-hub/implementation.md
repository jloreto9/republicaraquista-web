# Informe de Implementación y Verificación — Spec 035

**Slug:** `035-collective-pitching-roles-and-player-hub`  
**Fecha de Verificación:** 2026-11-25  
**Verificador Independiente:** `verifier`  
**Dictamen:** **CONVERGED** (Implementación verificada y aprobada sin regresiones ni deuda nueva)

---

## 1. Resumen de Archivos Implementados y Verificados

### Módulo 1 — Colectivas por Rol de Pitcheo (`SP` / `RP`)
- `src/types/collective.ts`: Exportado `PitchingRoleFilter = "all" | "sp" | "rp"` y campo opcional `pitchingRole?: PitchingRoleFilter` en `CollectiveStatsResult`.
- `src/lib/collective.ts`: `getCollectiveStats` soporta `pitchingRole` (`statSplits&sitCodes=sp|rp` sin rango de fechas con timeout de 10s; `schedule` + boxscores finalizados con concurrencia 12 y caché inmutable `finalizedBoxscoreCache` cuando hay rango de fechas), exporta `aggregateBoxscoresByPitchingRole` con interfaces tipadas (`MlbBoxscore`, `MlbTeamBox`, `MlbBoxscorePlayer`) y recalcula `pitchingSummary` y `pitchingKpis`.
- `src/app/api/stats/collective/route.ts`: Lee y propaga `pitchingRole` en el endpoint `/api/stats/collective`.
- `src/components/colectivas/colectivas-view.tsx`: Selector `Todos | Abridores (SP) | Relevistas (RP)` en pestaña `pitcheo`, recarga por `/api/stats/collective` y cuarto KPI adaptado `MÁS INNINGS (IP)` en modo `sp`.
- `src/components/colectivas/stathead-collective-search.tsx`: Selector `pitchingRole` en grupo `pitching`, propagación a `fetchCurrent` y `fetchPrev` para deltas `Δ` consistentes, badge de rol activo y nota discreta de `±1 CL` por *team unearned runs*.
- `src/lib/__tests__/collective-pitching-roles.test.ts` **[NEW]**: Pruebas unitarias de clasificación `SP`/`RP`, aritmética de tercios de inning, suma `SP + RP`, KPIs y manejo de `0.0` IP.

### Módulo 2 — Player Data, Splits Extendidos LVBP y Leverage Index
- `src/types/player-splits.ts`: Ampliado `SplitCategory`, agregado `eraAvailable?: boolean` en `PitcherSplitRow`, exportados `LeverageTier`, `PlayerLeverageRow`, `PitcherLeverageRow`, `PlayerLeverageResult`, `PlayerBatterGameLog`, `PlayerPitcherGameLog`, `PlayerGeneralProfile` (con `postseasonBatting` y `postseasonPitching` opcionales por fase `"D" | "L" | "F"`) y campos opcionales en `PlayerSplitsProfile`.
- `src/lib/player-leverage-service.ts` **[NEW]**: Implementados `LEVERAGE_THRESHOLDS`, `classifyLeverageTier`, `aggregatePlaysByLeverage` (con atribución de `responsiblePitcher` y carreras limpias `earned`) y `getPlayerLeverageSplits` reutilizando `wpa-engine.ts` y `game-feed-service.ts`.
- `src/lib/player-splits-service.ts`: Ampliado `SIT_CODES` para los 6 nuevos grupos LVBP, corregido `parseMlbPitcherSplit` (`era: "--"`, `eraNum: -1`, `eraAvailable: false` cuando faltan `era` y `earnedRuns`), exportados `buildRecentTrendSplits`, `buildPitcherRestDaySplits`, `buildBatterGameLogs`, `buildPitcherGameLogs` e implementado `getPlayerGeneralProfile` multi-temporada (`[2026, 2025]` con `wOBA`/`wRC+`/`FIP`/`Stats+`), separando Temporada Regular (`"R"`) de Postemporada (`"D"` Comodín, `"L"` Round Robin, `"F"` Serie Final).
- `src/app/api/stats/player-leverage/route.ts` **[NEW]**: Endpoint `GET /api/stats/player-leverage` con validación estricta de `player_id` (`400`) y `Cache-Control` por temporada.
- `src/app/api/stats/player-splits/route.ts`: Endurecida validación de `player_id` (`400`) y `Cache-Control` diferenciado según `season < activeSeason`.
- `src/lib/__tests__/player-leverage-and-splits.test.ts` **[NEW]**: Pruebas de Leverage Index (`High`/`Mid`/`Low`), atribución `responsiblePitcher`/`earned`, tendencia reciente, días de descanso y `era="--"`.

### Módulo 3 — Navegación Global, `/jugadores` y UI de Splits
- `src/components/layout/nav-data.ts`: Registrado `"Buscador de Jugadores"` (`/jugadores`, badge `"NUEVO"`) en `"Analítica Avanzada"` inmediatamente después de `"Líderes Individuales"`.
- `src/components/layout/player-quick-search.tsx` **[NEW]**: Buscador rápido global (`Ctrl+K` / `Cmd+K` en desktop y lupa `compact` en móvil) con `useSyncExternalStore`, caché en memoria por temporada, búsqueda sin acentos, filtro `Todos | Bateadores | Lanzadores` y navegación por teclado (`↑`/`↓`/`Enter`/`Esc`).
- `src/components/layout/header.tsx` y `src/components/layout/mobile-nav.tsx`: Integrado `<PlayerQuickSearch />` y `<PlayerQuickSearch compact />`.
- `src/app/jugadores/page.tsx` **[NEW]**: Server Component `force-dynamic` leyendo `await searchParams` (`player`, `type`, `season`) y montando `<PlayerSplitsView syncUrl={true} />` dentro de `<Suspense>`.
- `src/components/stats/splits/player-general-stats-card.tsx` **[NEW]**: Ficha superior estilo Baseball-Reference con tabla de Temporada Regular (`2026-27`, `2025-26`, `Total Reg. LVBP`), bloque independiente **Postemporada LVBP** (`Comodín`, `Round Robin`, `Serie Final`, y `Total Postemporada` con 2+ entradas), toggle `Todas | Tradicionales | Avanzadas & Stats+`, semáforo `100 = Promedio LVBP`, Resumen Defensivo y Bitácora de Juegos (`Últimos 7 | Últimos 15 | Todos`).
- `src/components/stats/splits/leverage-splits-card.tsx` **[NEW]**: Fetch paralelo asíncrono a `/api/stats/player-leverage`, skeleton de carga, filas `Alta / Media / Baja Presión` con `aLI` y `WPA`, filas `Late & Close` y leyenda explicativa LVBP.
- `src/components/stats/splits/split-table-group.tsx`: Renderizado neutro `"--"` en `text-slate-500` y orden al final cuando `eraAvailable === false || era === "--"`.
- `src/components/stats/splits/player-splits-view.tsx`: Soporte `syncUrl`, buscador unificado sin acentos, integración de `PlayerGeneralStatsCard` y `LeverageSplitsCard`, pills de los 6 nuevos grupos y matriz colapsable de 12 conteos (`0-0` a `3-2`).
- `src/components/stats/individuales-view.tsx`: Enlace directo `"Abrir en Buscador de Jugadores"` en la pestaña `Splits`.

---

## 2. Evidencia de Pruebas y Auditoría (Ejecutadas tras la última edición)

### 2.1. Suites de Pruebas Unitarias y de No-Regresión (5/5 Pasaron)
Comando ejecutado en `c:\Users\Administrator\Projets\republicaraquista-web`:
```powershell
npx --yes tsx src/lib/__tests__/collective-pitching-roles.test.ts; $e1=$LASTEXITCODE;
npx --yes tsx src/lib/__tests__/player-leverage-and-splits.test.ts; $e2=$LASTEXITCODE;
npx --yes tsx src/lib/__tests__/player-splits.test.ts; $e3=$LASTEXITCODE;
npx --yes tsx src/lib/__tests__/plus-stats.test.ts; $e4=$LASTEXITCODE;
npx --yes tsx src/lib/__tests__/individual-date-range.test.ts; $e5=$LASTEXITCODE;
Write-Output "TEST_EXITS=$e1,$e2,$e3,$e4,$e5"
```
Resultados observados:
- `src/lib/__tests__/collective-pitching-roles.test.ts`: **exit 0** (`=== TODAS LAS PRUEBAS DE ROLES DE PITCHEO COLECTIVO (SP/RP) PASARON EXITOSAMENTE ===`)
- `src/lib/__tests__/player-leverage-and-splits.test.ts`: **exit 0** (`=== TODAS LAS PRUEBAS DE LEVERAGE Y SPLITS EXTENDIDOS PASARON ===`)
- `src/lib/__tests__/player-splits.test.ts`: **exit 0** (`=== TODAS LAS PRUEBAS DE PLAYER SPLITS PASARON EXITOSAMENTE ===`)
- `src/lib/__tests__/plus-stats.test.ts`: **exit 0** (`=== TODAS LAS PRUEBAS DE wOBA, FIP Y STATS+ PASARON EXITOSAMENTE ===`)
- `src/lib/__tests__/individual-date-range.test.ts`: **exit 0** (`=== TODAS LAS PRUEBAS DE RANGO DE FECHAS INDIVIDUAL PASARON EXITOSAMENTE ===`)
- Salida agregada: `TEST_EXITS=0,0,0,0,0`

### 2.2. Auditoría de Guardrails LVBP, Idioma y Contratos de Tipos
Comando ejecutado sobre los 20 archivos nuevos/modificados de Spec 035:
```powershell
Select-String -Path $files -Pattern "Statcast|Exit Velocity|Launch Angle|Barrels|Sprint Speed|sabermetr|\bELO\b" -CaseSensitive:$false
```
Resultado observado: **exit 0 — 0 coincidencias** (ningún término prohibido de Statcast, jerga `sabermetr*` ni uso indebido de `ELO` en UI).  
Inspección manual de UI y API: textos visibles 100% en español, convenciones `season=2026` (`2026-27`) y `season=2025` (`2025-26`) respetadas, y alineación completa entre los contratos de `@player-data` y los consumidores de `@player-ui`.

### 2.3. ESLint (Spec 035 vs. Deuda Preexistente del Repositorio)
- **ESLint dirigido a archivos nuevos y modificados limpios de Spec 035** (`19` archivos: `src/types/collective.ts`, `src/lib/collective.ts`, `src/app/api/stats/collective/route.ts`, `src/types/player-splits.ts`, `src/lib/player-leverage-service.ts`, `src/app/api/stats/player-leverage/route.ts`, `src/app/api/stats/player-splits/route.ts`, `src/components/layout/nav-data.ts`, `src/components/layout/player-quick-search.tsx`, `src/components/layout/header.tsx`, `src/components/layout/mobile-nav.tsx`, `src/app/jugadores/page.tsx`, `src/components/stats/splits/player-general-stats-card.tsx`, `src/components/stats/splits/leverage-splits-card.tsx`, `src/components/stats/splits/split-table-group.tsx`, `src/components/stats/splits/player-splits-view.tsx`, `src/components/stats/individuales-view.tsx`, `src/lib/__tests__/collective-pitching-roles.test.ts`, `src/lib/__tests__/player-leverage-and-splits.test.ts`):
  - Resultado observado: **exit 0** (`0 errors, 1 warning` — el warning corresponde únicamente a `ACTIVE_SEASON` preexistente en `src/components/layout/header.tsx` L4).
  - **0 errores** en todos los archivos nuevos de Spec 035 y **0 errores nuevos** en los archivos modificados de Spec 035.
- **Deuda preexistente del repositorio (fuera de alcance según `CLAUDE.md` §5 y confirmación del coordinador en #14):**
  - `npm run lint` global reportó `251 problems (137 errors, 114 warnings)` en archivos ajenos preexistentes (`noticueva`, `bullpen-view.tsx`, `bullpen-budget-tab.tsx`, `pitching/search`, `scorecard-engine.ts`, `streaks-service.ts`, `ticker-service.ts`, `probabilidades-engine.ts`, etc.) más líneas preexistentes no tocadas en `colectivas-view.tsx`, `stathead-collective-search.tsx` y `player-splits-service.ts`.

### 2.4. TypeScript (`npx tsc --noEmit`) y Build de Producción (`npm run build`)
- `npx tsc --noEmit`: **0 errores** en todos los archivos de Spec 035; reportó exclusivamente 1 error preexistente ajeno en `src/components/calendar/calendar-event-modal.tsx(218,22): error TS18048: 'event.result' is possibly 'undefined'`.
- `npm run build` (`next build` con Next.js 16.3.6 Turbopack): **exit 0** (`✓ Compiled successfully in 4.5s`, `✓ Generating static pages using 7 workers (19/19) in 2.1s`). Rutas `/jugadores`, `/colectivas`, `/individuales`, `/api/stats/collective`, `/api/stats/player-splits` y `/api/stats/player-leverage` compiladas correctamente.

---

## 3. Dictamen Final de Convergencia

Todos los requerimientos funcionales (`RF-01` a `RF-05`), criterios de aceptación (`CA-01`+), invariantes LVBP, 5 suites de prueba, auditoría ESLint de Spec 035 y build de producción han sido verificados después de las últimas ediciones sin regresiones. **Spec 035 queda CERRADA y CONVERGENTE.**
