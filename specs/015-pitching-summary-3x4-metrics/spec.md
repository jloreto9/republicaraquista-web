# Especificación de Feature: Pitching Summary Editorial 3:4 (2400x3200 px) y Telemetría Expandida

**Slug:** `015-pitching-summary-3x4-metrics`  
**Autor:** Antigravity & Jorge Leonardo Loreto (@JorgeLoreto)  
**Fecha:** 2026-10-31  
**Estado:** Aprobado para Implementación (Spec-Kit Fase 1-3)  

---

## 1. Contexto y Objetivos de Producto

El módulo **Pitching Summary** (`/pitching`) de **República Caraquista** (`https://republicaraquistapp.vercel.app/`) genera tarjetas descargables PNG y vistas interactivas para lanzadores en las ramas **LVBP** (Play-by-Play oficial + clasificación de contacto BIS) y **MLB** (Statcast / Hawk-Eye), tanto en formato **Salida Individual (`game`)** como **Temporada Completa (`season`)**.

Actualmente presenta cinco limitaciones críticas que esta especificación resuelve:
1. **Lienzo cuadrado insuficiente (`2400 x 2400 px`):** En Salida Individual LVBP, el historial de salidas sobrescribe la tabla de Destinos del Pitcheo y no hay espacio para contexto de partido, contacto ni splits.
2. **Aproximaciones heurísticas en lugar de PBP real:** `game-logs` y `season-data` estiman `CSW%` y `Whiff%` con `calledEst = pitches * 0.175`, y `game-data` aproxima el Leverage Index con 3 cubetas fijas (`calculateSimpleLI`) en lugar de usar la matriz Tango RE24 / Win Expectancy existente en [`src/lib/wpa-engine.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/wpa-engine.ts).
3. **Ausencia de métricas de valor, dominio, rol y contacto:** Faltan `WPA`, `RE24`, `aLI/gmLI`, `GSv2`, `QS`, `IR/IRS`, `SD/MD`, `PutAway%`, `SwStr%`, `FIP`, `ERA-`, `K-BB%`, `BABIP`, `LOB%`, perfil BIS (`GB%/LD%/FB%/PU%`, `GO/AO`, `Hard%/Med%/Soft%`), métricas ópticas MLB (`Extensión`, `Chase%`, `Z-Contact%`, `EV Rival`, `HardHit%`, `Barrel%`), splits situacionales (`vs LHB`, `vs RHB`, `RISP`, `Casa/Visita`) y Vueltas al Orden (`1ra/2da/3ra+ TTO`).
4. **Buscador LVBP restringido:** `/api/pitching/search` solo lista 22 IDs fijos de Leones en vez de consultar todos los lanzadores de los 8 equipos LVBP en Supabase con soporte de retratos locales RGBA CORS-safe.
5. **Etiqueta errónea y jerga prohibida:** El botón web indica `"16:9"` y el pie del canvas contiene la palabra prohibida `"Sabermétrico"`.

---

## 2. Requerimientos Funcionales

### RF01: Nuevo Lienzo PNG Editorial `2400 x 3200 px` (Proporción 3:4 Vertical a 300 DPI)
- Migrar [`generatePitchingCardBlob`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/pitch-card-canvas.ts) de `2400 x 2400 px` a **`2400 x 3200 px`** sobre fondo blanco `#FFFFFF` con paneles estructurados `#F8FAFC` y bordes `#CBD5E1`.
- Aplicar **sombreado semántico suave** (`getMetricCellShade`) en celdas numéricas clave (esmeralda suave para nivel élite, neutro en rango medio, rosa/ámbar suave en alerta).
- Cargar retratos de lanzadores con cascada **3-capas CORS-safe** (`/assets/players/{id}.png` mismo origen $\to$ `photoUrl` con `crossOrigin="anonymous"` $\to$ `mlbFallbackUrl` con `crossOrigin="anonymous"` $\to$ silueta vectorial limpia) garantizando que `canvas.toBlob()` jamás falle por `SecurityError`.
- En Salida Individual (`mode === "game"`), dedicar los `3200 px` íntegros a la radiografía del partido (sin mezclar la tabla de últimos 10 juegos, la cual pertenece exclusivamente a `mode === "season"`).

### RF02: Métricas Expandidas — Formato Salida Individual (`mode === "game"`)
- **Doble Barra KPI + Rol Dinámico:**
  - Fila 1: `IP | BF | H | R | ER | BB | SO | HR | P-S (Strike%)`.
  - Fila 2: `GSv2 + badge QS` (si es Abridor) o `IR / IRS` (si es Relevista) `| WPA | RE24 | aLI (gmLI) | F-Strike% | CSW% | Whiff% | SwStr% | PutAway%`.
- **Bloque Medio:**
  - Rama `lvbp`: **Destinos del Pitcheo PBP** (`Bolas`, `Strikes Cantados`, `Swings Fallidos`, `Fouls`, `En Juego`) + **Perfil de Contacto BIS Permitido** (`GB%`, `LD%`, `FB%`, `PU%`, `GO/AO`, `Hard%`, `Med%`, `Soft%`).
  - Rama `mlb`: **Tabla de Repertorio Hawk-Eye enriquecida** (`Pitch`, `#`, `Uso%`, `Velo Prom/Máx`, `Spin`, `iVB`, `HB`, `Ext.`, `Zone%`, `Chase%`, `Z-Contact%`, `Whiff%`, `CSW%`) + **Calidad de Contacto Óptico** (`EV Prom`, `EV Máx`, `HardHit%`, `Barrel%`, `GB%`).
- **Bloque Inferior:**
  - **Splits Situacionales del Partido:** `vs Zurdos (LHB)`, `vs Derechos (RHB)`, `Con RISP` y `Bases Limpias` (`BF, AB, H, HR, BB, K, AVG, OPS, F-Strike%, CSW%, Whiff%`).
  - **Desglose por Vueltas al Orden (`1ra / 2da / 3ra+ Vuelta` — TTO)** para Abridores (o resumen situacional de entrada/presión para Relevistas).

### RF03: Métricas Expandidas — Formato Temporada Completa (`mode === "season"`)
- **Doble Barra KPI de Temporada:**
  - Fila 1: `JJ (GS) | W-L (SV/HLD) | IP | TBF | ERA | WHIP | FIP | ERA- | SO | BB`.
  - Fila 2: `K% | BB% | K-BB% | BABIP | LOB% | BAA / OPS | F-Strike% | CSW% | Whiff% | WPA / RE24` + tira resumen de rol (`QS` y `GSv2 Prom` para Abridores; `IR/IRS (IRS%)` y `SD / MD` para Relevistas).
- **Bloque Medio:**
  - Rama `lvbp`: **Splits Acumulados de Temporada** (`vs Zurdos`, `vs Derechos`, `Casa`, `Visita`, `Con RISP`) + **Perfil de Contacto BIS de Temporada**.
  - Rama `mlb`: **Tabla de Repertorio Hawk-Eye de Temporada** + **Contacto Óptico Acumulado** + **Splits Acumulados**.
- **Bloque Inferior:**
  - **Historial de Últimos 10 Juegos con PBP 100% Real:** `Fecha | Rival | Rol | Dec. | IP | H | CL | BB | K | Pitcheos (S) | GSv2 | WPA | CSW% | Whiff%` eliminando la heurística `0.175`.

### RF04: Máquina de Estados Pre-Jugada y Caché en Servidor (`pitch-parser.ts`)
- Recorrer `liveData.plays.allPlays` cronológicamente por media entrada manteniendo `outsBefore`, `runnersBefore` (`1B, 2B, 3B`) y diferencial de carreras **antes** de cada turno para calcular con exactitud `RE24`, `WPA`, `LI` (`aLI` y `gmLI`), `RISP` pre-jugada y conteo `TTO` por bateador.
- Cachear los resultados parseados de juegos `Final` en memoria (`Map` con límite LRU) y ejecutar enriquecimiento multi-juego en lotes concurrentes acotados (`Promise.allSettled`, tamaño de lote 6) con `AbortSignal.timeout(10000)`.

### RF05: Buscador LVBP de 8 Franquicias y Paridad Web Interactiva
- Conectar `/api/pitching/search` a Supabase (`pitching_stats` y `players`) cubriendo todos los lanzadores de los 8 equipos LVBP, priorizando el equipo de Ronda Regular sobre refuerzos de postemporada (`GEMINI.md` §1.1.7) y exponiendo `photoUrl` + `mlbPhotoUrl`.
- Sincronizar 1:1 todas las nuevas métricas, tablas de splits/TTO y barras de contacto en `pitching-header.tsx`, `pitching-card-viewer.tsx` (`aspect-[3/4]`), `pbp-panel.tsx`, `statcast-panel.tsx` y `pitching-game-logs-table.tsx`.

---

## 3. Invariantes Matemáticos y Guardrails

1. **Game Score v2 (Tango):** $\text{GSv2} = 40 + 2 \cdot \text{Outs} + \text{SO} - 2 \cdot \text{BB} - 2 \cdot \text{H} - 3 \cdot \text{ER} - 6 \cdot \text{HR}$.
2. **Salida de Calidad (`QS`):** `isStarter === true && Outs >= 18 && ER <= 3`.
3. **FIP y ERA-:** $\text{FIP} = \frac{13\cdot\text{HR} + 3\cdot(\text{BB}+\text{HBP}) - 2\cdot\text{SO}}{\text{IP}} + c_{\text{FIP}}$, $\text{ERA-} = \text{round}\left(100 \cdot \frac{\text{ERA}}{\text{lgERA}}\right)$ con constantes dinámicas de liga y fallback seguro (`lgERA=4.85, cFIP=3.45` LVBP; `lgERA=4.15, cFIP=3.15` MLB).
4. **LOB%:** $\text{LOB\%} = \text{clamp}_{[0,100]}\left(\frac{\text{H}+\text{BB}+\text{HBP}-\text{R}}{\text{H}+\text{BB}+\text{HBP}-1.4\cdot\text{HR}} \times 100\right)$.
5. **PutAway%:** $\frac{\text{Ponches}}{\text{Pitcheos lanzados en conteo de 2 strikes}} \times 100$.
6. **Shutdown / Meltdown (Relevistas):** `SD` cuando `WPA >= +0.06`; `MD` cuando `WPA <= -0.06`.
7. **Separación de Sensores y Lenguaje (`GEMINI.md` §1.1.1 y §1.1.13):** Cero métricas ópticas en LVBP y cero uso de las palabras *"sabermétrico"*, *"sabermétrica"*, *"sabermetría"*, *"Dashboard Ejecutivo"* o *"FanGraphs"* en textos visibles.
