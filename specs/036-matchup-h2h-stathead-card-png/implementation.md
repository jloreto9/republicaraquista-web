# Informe de Implementación y Verificación — Spec 036

**Slug:** `036-matchup-h2h-stathead-card-png`  
**Fecha de Verificación:** 2026-11-25  
**Verificador Independiente:** `verifier`  
**Dictamen:** **CONVERGED** (Implementación verificada y aprobada sin regresiones ni deuda nueva)

---

## 1. Resumen de Archivos Implementados y Verificados

### Módulo 1 — Modelo de Datos, Motor H2H y Pruebas (`matchup-data`)
- `src/types/matchup.ts`: Conservadas las interfaces existentes y exportados `MatchupCardWinner`, `MatchupCardRow`, `MatchupCardSection`, `MatchupCardPlayerMeta` y `MatchupCardData`.
- `src/lib/matchup-engine.ts`:
  - `compareBatters` prioriza `b.woba ?? computeWoba(b)` y `b.wrcPlus ?? computeWrcPlus(...)` para `p1`, `p2`, `pool1` y `pool2`.
  - `comparePitchers` prioriza `p.fip ?? computeFip(p)` para `p1`, `p2`, `pool1` y `pool2`.
  - Limpiados los comentarios heredados con términos prohibidos (`// Coeficientes lineales estándar LVBP`, `// Métricas de Impacto`).
  - Exportados `buildBatterMatchupCardData` (18 filas en 2 bloques: 12 en `Estadísticas Generales` + 6 en `Métricas Avanzadas e Índices (+)`, `K%` menor es mejor, `OPS+` `"--"`/`"tie"` si `<= 0`) y `buildPitcherMatchupCardData` (17 filas en 2 bloques: 10 en `Estadísticas Generales` + 7 en `Dominio y Avanzadas`, helper `compareWinLoss` para `G-P`, `ERA+`/`FIP+`/`WHIP+` `"--"`/`"tie"` si `<= 0`, `K%` mayor / `BB%` menor), ambos con `footerNote: "100 = Promedio LVBP"`.
- `src/lib/__tests__/matchup-card.test.ts` **[NEW]**: Pruebas unitarias determinísticas con `node:assert/strict` cubriendo las 18 filas de bateadores, 17 filas de lanzadores, direcciones de ganador, `compareWinLoss`, `0 AP`/`0 IP` sin `NaN`/`Infinity` y prioridad a `Stats+` oficiales.

### Módulo 2 — Motor Gráfico Canvas PNG (`matchup-canvas`)
- `src/lib/matchup-card-canvas.ts` **[NEW]**: Implementa `MATCHUP_CARD_WIDTH = 1080`, `computeMatchupCardHeight`, `renderMatchupCardToCanvas` y `generateMatchupCardBlob` con escala Retina `2x`, carga de fotos CORS-safe en 3 niveles (replicando `src/lib/pitch-card-canvas.ts`), diseño Claro Editorial (`#FFFFFF`, cabecera 3 columnas `35% | 30% | 35%`, encabezados `#F1F5F9`/`#991B1B`, celdas ganadoras `#E6F4EA` y pie con balance H2H y `100 = Promedio LVBP`).

### Módulo 3 — UI `/matchup` y Modal Exportable (`matchup-ui`)
- `src/components/matchup/matchup-card-modal.tsx` **[NEW]**: Modal accesible (`role="dialog"`, `aria-modal="true"`, cierre por `Escape` o backdrop, bloqueo de scroll del `body`), vista previa en vivo en `<canvas>`, control de renderizado ligado a `renderKey` (compatible con `react-hooks/set-state-in-effect`), y botones Lucide (`Download`, `Copy`, `Check`, `X`, `Loader2`) para **Descargar PNG** (`matchup-${slug1}-vs-${slug2}.png`) y **Copiar Imagen** (`¡Copiada!` 2.5s con fallback claro).
- `src/components/matchup/matchup-view.tsx`: Selectores independientes de temporada (`2026-27`, `2025-26`) y fase (`R`, `D`, `L`, `F`, `all`) por jugador con caché en `useRef<Map<...>>`, fetch bajo demanda con `AbortController` hacia `/api/stats/batting` y `/api/stats/pitching`, paso real de `pool1` y `pool2` a `compareBatters`/`comparePitchers`, `cardData` memoizado, botón **"Tarjeta PNG"** (`ImageDown`), integración de `<MatchupCardModal />` e iconos Lucide (`Flame`, `Target`) en el toggle.

---

## 2. Evidencia de Pruebas y Auditoría (Ejecutadas tras la última edición)

### 2.1. Suites de Pruebas (3/3 Pasaron)
Comando ejecutado en `c:\Users\Administrator\Projets\republicaraquista-web`:
```powershell
npx --yes tsx src/lib/__tests__/matchup-card.test.ts; $e1=$LASTEXITCODE;
npx --yes tsx src/lib/__tests__/plus-stats.test.ts; $e2=$LASTEXITCODE;
npx --yes tsx src/lib/__tests__/player-leverage-and-splits.test.ts; $e3=$LASTEXITCODE;
Write-Output "TEST_EXITS=$e1,$e2,$e3"
```
Resultados observados:
- `src/lib/__tests__/matchup-card.test.ts`: **exit 0** (`matchup-card.test.ts: ALL PASSED`)
- `src/lib/__tests__/plus-stats.test.ts`: **exit 0** (`=== TODAS LAS PRUEBAS DE wOBA, FIP Y STATS+ PASARON EXITOSAMENTE ===`)
- `src/lib/__tests__/player-leverage-and-splits.test.ts`: **exit 0** (`=== TODAS LAS PRUEBAS DE LEVERAGE Y SPLITS EXTENDIDOS PASARON ===`)
- Salida agregada: `TEST_EXITS=0,0,0`

### 2.2. Auditoría de Guardrails LVBP e Idioma
Comando ejecutado sobre los 6 archivos nuevos/modificados de Spec 036:
```powershell
Select-String -Path @("src/types/matchup.ts","src/lib/matchup-engine.ts","src/lib/matchup-card-canvas.ts","src/lib/__tests__/matchup-card.test.ts","src/components/matchup/matchup-card-modal.tsx","src/components/matchup/matchup-view.tsx") -Pattern "Statcast|Exit Velocity|Launch Angle|Barrels|Sprint Speed|sabermetr|\bELO\b" -CaseSensitive:$false
```
Resultado observado: **exit 0 — 0 coincidencias**. Todos los textos visibles en tarjetas, modal y controles están en español con lenguaje deportivo directo.

### 2.3. ESLint sobre Archivos de Spec 036
Comando ejecutado:
```powershell
npx eslint src/types/matchup.ts src/lib/matchup-engine.ts src/lib/matchup-card-canvas.ts src/lib/__tests__/matchup-card.test.ts src/components/matchup/matchup-card-modal.tsx src/components/matchup/matchup-view.tsx
```
Resultado observado: **exit 0** (`0 errors, 0 warnings`).

### 2.4. TypeScript (`npx tsc --noEmit`) y Build de Producción (`npm run build`)
- `npx tsc --noEmit`: **0 errores** en todos los archivos de Spec 036; reportó únicamente el error preexistente ajeno en `src/components/calendar/calendar-event-modal.tsx(218,22): error TS18048: 'event.result' is possibly 'undefined'`.
- `npm run build` (`next build` con Next.js 16.3.6 Turbopack): **exit 0** (`✓ Compiled successfully in 5.4s`, `✓ Generating static pages using 7 workers (19/19) in 2.1s`), compilando `/matchup` sin incidencias.

---

## 3. Dictamen Final de Convergencia

Todos los requerimientos funcionales (`RF-01` a `RF-04`), criterios de aceptación (`CA-01` a `CA-04`), guardrails LVBP, 3 suites de prueba, ESLint sobre los 6 archivos del feature y build de producción han sido verificados sin regresiones. **Spec 036 queda CERRADA y CONVERGENTE.**
