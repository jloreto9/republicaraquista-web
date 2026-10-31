# Informe de Implementación: `015-pitching-summary-3x4-metrics`

## 1. Resumen Ejecutivo de Entrega
Se completó la evolución integral del sector **Pitching Summary & Telemetría** (`/pitching`) de **RepubliCaraquistApp**, elevando tanto el entregable descargable como la experiencia web interactiva:

1. **Nuevo Formato Editorial PNG `2400 × 3200 px` (3:4 Vertical, 300 DPI):**
   - Rediseño completo en [`src/lib/pitch-card-canvas.ts`](../../src/lib/pitch-card-canvas.ts) sobre fondo blanco editorial (`#FFFFFF`) con **sombreado semántico suave** (`getMetricCellShade`) en celdas numéricas clave (verde esmeralda suave en percentiles élite, rosa pálido en rezago, blanco neutro en rango medio).
   - Cargador de retratos en 3 niveles a prueba de CORS (`loadCorsSafePitcherHeadshot`): `/assets/players/{id}.png` local $\to$ URL remota (`cdn.tujonron.net`) con `crossOrigin="anonymous"` $\to$ headshot MLB Cloudinary con fallback de silueta limpia, evitando cualquier `SecurityError` en `canvas.toBlob()`.
   - Separación estructural entre **Un Solo Juego (`game`)** —100% de los `3200 px` dedicados al partido analizado con splits y TTO/relevo— y **Temporada Completa (`season`)** —consolidando tasas avanzadas, splits acumulados e historial de últimos 10 juegos con PBP real—.

2. **Motor Cronológico Play-by-Play y Separación Estricta de Sensores (`src/lib/pitch-parser.ts`):**
   - Máquina de estados pre-jugada que reconstruye corredores en base (`1B/2B/3B`) y outs **antes** de cada aparición al plato, garantizando exactitud en `RISP`, `RE24`, `WPA`, `aLI`, `gmLI` y `IR / IRS`.
   - Conteo determinístico pitcheo a pitcheo (`0-0` $\to$ `2 strikes`) para `F-Strike%`, `SwStr%`, `PutAway%`, `CSW%` y `Whiff%`.
   - Separación rigurosa de sensores: en **LVBP** (`hasStatcast === false`) solo se computan métricas PBP y contacto oficial Stringer BIS (`GB%, LD%, FB%, PU%, GO/AO, Soft%, Med%, Hard%`); en **MLB** (`hasStatcast === true`) se habilitan coordenadas reales Hawk-Eye (`pX/pZ`), `Extensión (ft)`, `Zone%`, `Chase%`, `Z-Contact%`, `EV Prom`, `EV Máx`, `HardHit%` y `Barrel%`.

3. **Eliminación de Heurísticas y Directorio LVBP de 8 Franquicias (`src/app/api/pitching/*`):**
   - Eliminada por completo la estimación sintética `0.175` en `/api/pitching/game-logs` y `0.62` en `pitching-game-logs-table.tsx`, sustituida por caché LRU en memoria (`fetchAndParseGameTelemetryCached`) alimentada por el feed PBP real.
   - Cálculo dinámico de `lgERA` y constante `cFIP` por temporada en `/api/pitching/season-data` (desde `pitching_stats` en Supabase para LVBP o MLB Stats API para MLB) para `FIP` y `ERA-`.
   - Buscador `/api/pitching/search` conectado a los 8 clubes de la LVBP en Supabase respetando prioridad de equipo de Ronda Regular sobre refuerzos de postemporada.

---

## 2. Archivos Modificados y Creados

| Archivo | Cambio Realizado |
|---|---|
| `src/types/pitching.ts` | Contratos tipados para perfiles de 8 clubes, splits situacionales/TTO, perfil de contacto BIS/Statcast y métricas de contexto (`GSv2`, `WPA`, `RE24`, `aLI`, `gmLI`, `IR/IRS`, `SD/MD`). |
| `src/lib/pitching-constants.ts` | Fórmulas puras auditables (`computeGSv2`, `computeFIP`, `computeERAMinus`, `computeLOBPct`, `computeBABIP`) y escala semántica `getMetricCellShade`. |
| `src/lib/pitch-parser.ts` | Máquina de estados pre-jugada PBP, agregador multijuego `aggregatePitcherTelemetries` y caché LRU con concurrencia acotada (`mapWithConcurrency`). |
| `src/lib/__tests__/pitch-telemetry.test.ts` | Suite unitaria de verificación matemática, máquina de estados pre-jugada, RISP, TTO, RE24/WPA, separación de sensores y dimensiones `2400×3200`. |
| `src/app/api/pitching/game-data/route.ts` | Integración con el motor unificado PBP/Statcast para salidas individuales. |
| `src/app/api/pitching/game-logs/route.ts` | Enriquecimiento real PBP (`CSW%`, `Whiff%`, `GSv2`, `QS`, `WPA`, `RE24`) sin aproximaciones. |
| `src/app/api/pitching/season-data/route.ts` | Consolidado de temporada con `FIP`, `ERA-`, `K-BB%`, `BABIP`, `LOB%`, `QS`, `SD/MD`, splits y contacto acumulado. |
| `src/app/api/pitching/search/route.ts` | Catálogo completo de lanzadores de los 8 equipos LVBP + búsqueda MLB en vivo. |
| `src/lib/pitch-card-canvas.ts` | Motor gráfico HTML5 Canvas `2400 × 3200 px` (3:4 a 300 DPI) con sombreado semántico y retratos CORS-safe. |
| `src/components/pitching/*.tsx` & `src/app/pitching/page.tsx` | Paridad interactiva 1:1 en visor 3:4, buscador de 8 equipos, header con fallback de avatar, paneles PBP/Statcast y tabla de últimos 10 juegos. |

---

## 3. Verificación y Dictamen de Convergencia
- **Tests Unitarios (`npx tsx src/lib/__tests__/pitch-telemetry.test.ts`):** `PASS` (0 errores).
- **Chequeo Estático de Tipos (`npx tsc --noEmit`):** `PASS` (0 errores).
- **Auditoría de Higiene Editorial y Sensores:** `0` ocurrencias de términos prohibidos ni heurísticas sintéticas; separación estricta `hasStatcast` validada por test automático.
- **Build de Producción Next.js 16 (`npm run build`):** Validado antes de despliegue en Vercel (`main`).
- **Estado Spec-Kit:** **CONVERGED**.
