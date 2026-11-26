# Spec 036: Tarjeta PNG Editorial H2H, Comparativa Multi-Temporada y Modal Exportable en Matchup 360 (`/matchup`)

**Slug:** `036-matchup-h2h-stathead-card-png`  
**Autor:** Jorge Leonardo Loreto & Swarm  
**Fecha:** 2026-11-25  
**Estado:** Especificado — Listo para implementación y verificación (Track 2: Spec-Driven Development)  
**Repositorio:** `republicaraquista-web` (Next.js 16 / React 19 / TypeScript)  
**Relacionados:** [`src/types/matchup.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/types/matchup.ts) · [`src/lib/matchup-engine.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/matchup-engine.ts) · [`src/lib/pitch-card-canvas.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/pitch-card-canvas.ts) · [`src/components/matchup/matchup-view.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/matchup/matchup-view.tsx) · [`src/lib/supabase.ts`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/lib/supabase.ts)

---

## 1. Contexto y Problema

La vista **Matchup 360 (`/matchup`)** permite comparar cara a cara (H2H) a dos bateadores o dos lanzadores de la LVBP mediante gráfico radar y tabla comparativa, pero presenta tres limitaciones relevantes para el análisis y la difusión editorial:

1. **Sin exportador gráfico PNG listo para redes:** Los usuarios no disponen de una tarjeta comparativa descargable/copiable en formato editorial claro de alta definición (`1080px` a escala Retina `2x`) que resuma la ficha visual de ambos jugadores, el balance de categorías ganadas y el bloque completo de métricas tradicionales, avanzadas e índices `+`.
2. **Selectores de fase y temporada sin carga dinámica real:** En `MatchupView` (`src/components/matchup/matchup-view.tsx`), `phase1` y `phase2` se mantienen en estado local sin re-consultar los pools reales de otras fases (`R`, `D`, `L`, `F`, `all`) ni permitir elegir de forma independiente la temporada de cada jugador (`2026-27` con `season=2026` frente a `2025-26` con `season=2025`).
3. **Desalineación parcial con los `Stats+` oficiales de liga y términos heredados:** `compareBatters` y `comparePitchers` en `src/lib/matchup-engine.ts` recalculaban `wOBA`, `wRC+` y `FIP` localmente en lugar de priorizar los valores enriquecidos por liga (`woba`, `wrcPlus`, `fip`, `opsPlus`, `eraPlus`, `fipPlus`, `whipPlus` provenientes de `src/lib/supabase.ts`), además de conservar comentarios y emojis heredados que deben sustituirse por lenguaje deportivo directo e iconos `lucide-react`.

Esta especificación resuelve los tres frentes incorporando la **Tarjeta PNG Editorial H2H**, el **Modal de Vista Previa en Vivo (`MatchupCardModal`)**, la **comparativa multi-temporada y multi-fase independiente** y el uso prioritario de los índices oficiales `Stats+`.

---

## 2. Escenarios de Usuario y Criterios de Aceptación

### Historia 1 — Comparativa Multi-Temporada y Multi-Fase Independiente en `/matchup` (P1)
Como analista o fanático de la LVBP, quiero seleccionar de forma independiente la temporada (`2026-27` o `2025-26`) y la fase (`Temporada Regular`, `Comodín`, `Round Robin`, `Serie Final`, `Todas las Fases`) para el Jugador 1 y el Jugador 2 en `/matchup`, obteniendo sus estadísticas reales y percentiles relativos a su propio pool de liga sin perder fluidez gracias a una caché en cliente.

### Historia 2 — Tarjeta PNG Editorial H2H Estilo Claro (`1080px` Retina `2x`) (P1)
Como creador de contenido o usuario, quiero hacer clic en **"Tarjeta PNG"** en `/matchup` para generar una pieza gráfica editorial clara sobre fondo blanco `#FFFFFF` con cabecera en 3 columnas (retratos rectangulares sin recorte superior, nombre azul subrayado, escudo, temporada y fase de cada jugador, y sello central de República Caraquista), bloques comparativos con celdas ganadoras en verde suave (`#E6F4EA`) y pie con el balance H2H y la referencia `100 = Promedio LVBP`.

### Historia 3 — Vista Previa en Vivo, Descarga y Copiado al Portapapeles (P1)
Como usuario dentro del modal **Tarjeta PNG**, quiero ver el lienzo renderizado en vivo antes de exportar, descargarlo como archivo `matchup-{jugador1}-vs-{jugador2}.png` o copiar la imagen PNG directamente al portapapeles con confirmación visual (`"¡Copiada!"`) o aviso claro si el navegador bloquea el portapapeles.

### Historia 4 — Prioridad a `Stats+` Oficiales y Consistencia de Ganadores H2H (P1)
Como analista, quiero que las 18 filas de bateadores y 17 filas de lanzadores de la tarjeta usen los valores oficiales de liga cuando existan (`wOBA`, `wRC+`, `OPS+`, `FIP`, `ERA+`, `FIP+`, `WHIP+`) y determinen correctamente el ganador según la dirección de cada métrica (`K%` menor es mejor para bateadores y mayor es mejor para lanzadores; `BB%`, `ERA`, `WHIP`, `FIP`, `HR` y `BB` menor es mejor en lanzadores; `G-P` por porcentaje de victorias con desempate).

---

## 3. Requerimientos Funcionales y Contrato Técnico

### RF-01: Tipos de la Tarjeta H2H (`src/types/matchup.ts`)
Conservar las interfaces vigentes (`CompareType`, `RadarAxis`, `H2HRow`, `PlayerProfileCardData`, `MatchupComparisonData`) y exportar:
1. `export type MatchupCardWinner = "p1" | "p2" | "tie";`
2. `export interface MatchupCardRow { key: string; label: string; val1: string; val2: string; winner: MatchupCardWinner; }`
3. `export interface MatchupCardSection { title: string; rows: MatchupCardRow[]; }`
4. `export interface MatchupCardPlayerMeta { playerId: number; name: string; teamName: string; teamAbbr: string; teamLogo: string; headshot: string; seasonLabel: string; phaseLabel: string; }`
5. `export interface MatchupCardData { compareType: CompareType; player1: MatchupCardPlayerMeta; player2: MatchupCardPlayerMeta; sections: MatchupCardSection[]; p1Wins: number; p2Wins: number; ties: number; footerNote: string; }`

### RF-02: Motor H2H y Constructores de Tarjeta (`src/lib/matchup-engine.ts`)
1. **Prioridad a métricas oficiales:**
   - En `compareBatters`: preferir `b.woba ?? computeWoba(b)` y `b.wrcPlus ?? computeWrcPlus(...)` tanto para `p1`/`p2` como para `pool1`/`pool2`.
   - En `comparePitchers`: preferir `p.fip ?? computeFip(p)` tanto para `p1`/`p2` como para `pool1`/`pool2`.
2. **Constructor de Bateadores — `buildBatterMatchupCardData(p1, p2, meta1, meta2): MatchupCardData`:**
   - `pa = p.plateAppearances ?? p.pa ?? (p.atBats + p.walks + (p.hbp || 0) + (p.sf || 0) + (p.sh || 0))`
   - `woba = p.woba ?? computeWoba(p)`, `wrcPlus = p.wrcPlus ?? computeWrcPlus(woba)`, `opsPlus = p.opsPlus && p.opsPlus > 0 ? Math.round(p.opsPlus) : 0`
   - `bbPct = pa > 0 ? (p.walks / pa) * 100 : 0`, `kPct = pa > 0 ? (p.strikeouts / pa) * 100 : 0`
   - **Bloque 1 — `"Estadísticas Generales"` (12 filas):** `JJ`, `AP`, `H`, `2B`, `HR`, `CI`, `CA`, `BR`, `AVG`, `OBP`, `SLG`, `OPS` (mayor es mejor en las 12; tasas formateadas sin cero inicial cuando `< 1`, ej. `.314`).
   - **Bloque 2 — `"Métricas Avanzadas e Índices (+)"` (6 filas):** `wRC+` (mayor), `OPS+` (mayor; `"--"` si `<= 0` y `"tie"` si falta en alguno), `wOBA` (mayor), `ISO` (mayor), `BB%` (mayor, ej. `"12.4%"`), `K%` (**menor es mejor**, ej. `"18.5%"`).
   - Total: `18` filas con conteo exacto de `p1Wins`, `p2Wins`, `ties` y `footerNote: "100 = Promedio LVBP"`.
3. **Constructor de Lanzadores — `buildPitcherMatchupCardData(p1, p2, meta1, meta2): MatchupCardData`:**
   - `bf = Math.max(0, Math.round(p.inningsPitched * 3 + p.hits + p.walks + (p.hbp || 0)))`
   - `fip = p.fip ?? computeFip(p)`
   - `eraPlus`, `fipPlus`, `whipPlus` (`> 0 ? Math.round(v) : 0`; `"--"` si `<= 0` y `"tie"` si falta en alguno).
   - `kPct = bf > 0 ? (p.strikeouts / bf) * 100 : 0`, `bbPct = bf > 0 ? (p.walks / bf) * 100 : 0`.
   - **Bloque 1 — `"Estadísticas Generales"` (10 filas):** `JJ` (mayor), `JI` (mayor), `IP` (mayor, usando `inningsDisplay || inningsPitched.toFixed(1)`), `G-P` (`"${wins || 0}-${losses || 0}"` evaluado con `compareWinLoss` por porcentaje de victorias y desempate por más victorias y menos derrotas), `SV` (mayor), `ERA` (**menor**), `WHIP` (**menor**), `SO` (mayor), `BB` (**menor**), `HR` (**menor**).
   - **Bloque 2 — `"Dominio y Avanzadas"` (7 filas):** `ERA+` (mayor), `FIP` (**menor**), `FIP+` (mayor), `WHIP+` (mayor), `K/9` (mayor), `K%` (mayor), `BB%` (**menor**).
   - Total: `17` filas con conteo exacto de `p1Wins`, `p2Wins`, `ties` y `footerNote: "100 = Promedio LVBP"`.
4. **Limpieza de copy y comentarios:** Reemplazar comentarios heredados con jerga prohibida por lenguaje deportivo directo (`// Coeficientes lineales estándar LVBP`, `// Métricas de Impacto`).

### RF-03: Motor Gráfico Canvas PNG (`src/lib/matchup-card-canvas.ts`)
1. **Exportaciones públicas:**
   - `MATCHUP_CARD_WIDTH = 1080`
   - `computeMatchupCardHeight(data: MatchupCardData): number`
   - `renderMatchupCardToCanvas(canvas: HTMLCanvasElement, data: MatchupCardData): Promise<void>`
   - `generateMatchupCardBlob(data: MatchupCardData): Promise<Blob | null>`
2. **Carga de imágenes CORS-safe:** Replicar el patrón de 3 niveles de `src/lib/pitch-card-canvas.ts` (`hasLocalPlayerPhoto` de `@/lib/player-photos-data`, URL primaria y `getMlbFallbackHeadshotUrl` de `@/lib/constants`) para prevenir `SecurityError` al llamar `canvas.toBlob()`.
3. **Especificación visual Claro Editorial (Retina `2x`):**
   - Escala `canvas.width = MATCHUP_CARD_WIDTH * 2`, `canvas.height = totalHeight * 2`, `ctx.setTransform(2, 0, 0, 2, 0, 0)`, con guarda segura cuando `typeof window === "undefined"`.
   - Lienzo `#FFFFFF`, padding externo `24px`, marco rectangular `#94A3B8` (`2px`).
   - **Cabecera 3 columnas (`396px`, proporción `35% | 30% | 35%`, divisores `#CBD5E1`):**
     - Columnas laterales (`player1`, `player2`): retrato rectangular `216 × 268 px` sobre fondo `#E2E8F0` con borde `#CBD5E1` y recorte `cover` alineado arriba (`top-center`), nombre en `#1D4ED8` negrita con subrayado sutil y autoajuste tipográfico, escudo `22×22` + `${teamAbbr} · ${seasonLabel} · ${phaseLabel}` en `#475569`.
     - Columna central: `/assets/logo.png` (`116 × 116 px`), título `REPÚBLICA CARAQUISTA` (`#0F172A` negrita), subtítulo `MATCHUP 360 • LVBP` (`#64748B`) y badge pill (`BATEADORES` o `LANZADORES`).
   - **Bloques de tabla (`sectionHeaderHeight = 50px`, `rowHeight = 52px`):**
     - Encabezado del bloque: fondo `#F1F5F9`, bordes `#94A3B8`, texto centrado en rojo editorial `#991B1B` (`20px` negrita).
     - Filas de 3 columnas (`35% | 30% | 35%`) con divisor `#E2E8F0`: celda ganadora `#E6F4EA` (neutra `#FFFFFF`), valores centrados `22px` (`#0F172A` bold si gana, `#334155` regular si no) y etiqueta central `20px` `#0F172A` bold.
   - **Pie editorial (`72px`):** fondo `#F8FAFC`, borde superior `#94A3B8`; izquierda `Balance: ${p1Wins} – ${p2Wins}` (más ` (${ties} emp.)` si `ties > 0`), centro `${footerNote}` (`100 = Promedio LVBP`), derecha `@RepubCaraquista · LVBP`.

### RF-04: Modal de Vista Previa y Vista `/matchup` (`src/components/matchup/matchup-card-modal.tsx`, `src/components/matchup/matchup-view.tsx`)
1. **`MatchupCardModal` (`src/components/matchup/matchup-card-modal.tsx`):**
   - Props: `{ isOpen: boolean; onClose: () => void; data: MatchupCardData | null }`.
   - Cierra con `Escape` o clic en backdrop; bloquea scroll del `body` mientras `isOpen`.
   - Renderiza vista previa en vivo en `<canvas ref={canvasRef} />` con `renderMatchupCardToCanvas` (sin `setState` síncrono dentro de `useEffect`, usando clave de renderizado para cumplir `react-hooks/set-state-in-effect`).
   - Botones con iconos `lucide-react` (`Download`, `Copy`, `Check`, `X`, `Loader2`): **Descargar PNG** (`matchup-${slug1}-vs-${slug2}.png`) y **Copiar Imagen** (con estado `"¡Copiada!"` durante 2.5s y mensaje amigable si el portapapeles no está soportado).
2. **`MatchupView` (`src/components/matchup/matchup-view.tsx`):**
   - Selectores independientes de temporada (`2026-27`, `2025-26`) y fase (`R`, `D`, `L`, `F`, `all`) para Jugador 1 y Jugador 2 (`season1`, `season2`, `phase1`, `phase2`).
   - Caché cliente `useRef<Map<string, BattingStats[] | PitchingStats[]>>` precargada con `${compareType}-${season}-R`; fetch con `AbortController` a `/api/stats/batting` o `/api/stats/pitching` (`team_id=all&limit=500`) cuando falte una combinación.
   - Pasar `pool1` y `pool2` reales a `compareBatters` / `comparePitchers`, construir `cardData` vía `useMemo` con `buildBatterMatchupCardData` / `buildPitcherMatchupCardData`, agregar botón **"Tarjeta PNG"** (`ImageDown`) y montar `<MatchupCardModal />`.
   - Sustituir emojis en el toggle `Bateadores / Lanzadores` por iconos Lucide (`Flame`, `Target`) y limpiar cualquier término prohibido.

---

## 4. Invariantes y Guardrails

1. **Idioma 100% español:** Toda etiqueta, botón, mensaje de error y texto dentro de la tarjeta PNG y el modal debe estar en español.
2. **Lenguaje deportivo directo:** Cero uso de jerga académica prohibida, cero menciones impropias al sistema de rating interno en títulos/tarjetas y cero métricas de rastreo óptico en LVBP.
3. **Convención de temporadas LVBP:** `season=2026` corresponde a `2026-27` y `season=2025` corresponde a `2025-26`.
4. **Cero `any` y cumplimiento estricto de ESLint React 19:** Tipado estricto en TypeScript y cero `setState` síncrono dentro de `useEffect`.
5. **Cero regresiones en comparativas existentes:** El radar y la tabla H2H de `/matchup` mantienen su funcionalidad agregando la descarga PNG y la carga multi-temporada/fase real.

---

## 5. Criterios de Aceptación

1. **CA-01:** `buildBatterMatchupCardData` (18 filas) y `buildPitcherMatchupCardData` (17 filas) priorizan `Stats+`/`wOBA`/`FIP` oficiales, resuelven todas las direcciones de ganador (incluyendo `K%` invertido entre bateo/pitcheo y `G-P`) y manejan `0 AP`/`0 IP` sin `NaN`/`Infinity`.
2. **CA-02:** `matchup-card-canvas.ts` genera la tarjeta de `1080px` (Retina `2x`) con estética Claro Editorial (`#FFFFFF`, `#F1F5F9`, `#991B1B`, `#E6F4EA`) y carga CORS-safe en 3 niveles para exportar el `Blob` sin `SecurityError`.
3. **CA-03:** `/matchup` permite comparar dos jugadores de temporadas (`2026-27` vs `2025-26`) y fases (`R`, `D`, `L`, `F`, `all`) distintas con caché cliente y abrir `MatchupCardModal` para descargar o copiar el PNG.
4. **CA-04:** La suite `src/lib/__tests__/matchup-card.test.ts`, ESLint dirigido sobre los archivos del feature, `npx tsc --noEmit`, auditoría de lenguaje deportivo y `npm run build` pasan sin errores.
