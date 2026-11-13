# Spec 024: Mejor Lineup Posible con lo Mejor Disponible (Roster Activo)

**Slug:** `024-best-available-lineup-optimizer`  
**Autor:** Spec-Kit Architect & Jorge Leonardo Loreto  
**Fecha:** 2026-11-13  
**Estado:** Especificado (Fase 1 de Spec-Kit)  
**Relacionados:** [Spec 013](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/013-tango-lineup-optimizer/spec.md) · [Spec 023](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/023-gamecenter-lineup-to-optimizer/spec.md)

---

## 1. Contexto y Problema

Tras [Spec 023](file:///c:/Users/Administrator/Projets/republicaraquista-web/specs/023-gamecenter-lineup-to-optimizer/spec.md), el **Optimizador de Lineups (Tom Tango - The Book)** en `/bullpen?tab=lineups&subtab=optimizer` ya carga automáticamente la alineación publicada hoy en el Game Center y permite reordenar del 1 al 9 a esos **mismos 9 titulares** que salieron al terreno.

Sin embargo, los analistas y aficionados caraquistas necesitan responder una pregunta distinta y de alto valor táctico:

> *"Dado todo el roster activo disponible hoy (incluyendo peloteros en la banca o descansando respecto al lineup publicado), ¿cuál es el **mejor lineup de 9 bateadores** que puede armar el mánager, cuánto mejora en carreras proyectadas (`R/J` y `R/56J`) respecto al lineup real de hoy, y qué cambios de titulares implica?"*

Actualmente existen cuatro brechas para responder esto:

1. **Ausencia de pool del Roster Activo:** `getDynamicBullpenAndLineups` (`src/lib/game-feed-service.ts`) no consulta el roster activo vigente en MLB Stats API (`teams/{teamId}/roster?rosterType=active`) ni expone `plateAppearances` y posiciones elegibles observadas por jugador.
2. **Motor limitado a reordenar 9 fijos:** `optimizeTangoLineup` (`src/lib/tango-lineup-engine.ts`) recibe exactamente 9 `TangoPlayer` y solo permuta sus turnos 1–9; no selecciona los mejores 9 dentro de un roster de ~15–20 bateadores respetando las 9 posiciones reglamentarias (`C, 1B, 2B, 3B, SS, LF, CF, RF, DH`).
3. **Sin control de muestra mínima ni bajas manuales:** Muestras de 1–4 PA suelen inflar `wOBA`/`OPS` artificialmente (ej. `.500+` en 2 turnos), y en la práctica diaria algunos jugadores activos descansan o están tocados físicamente.
4. **Sin comparativa frente al Lineup de Hoy del Game Center:** La interfaz de `TangoLineupOptimizerTab` solo compara un orden de 9 contra esos mismos 9 reordenados; no permite alternar al modo *"Mejor Posible (Roster Activo)"* para compararlo directamente contra la alineación titular publicada hoy.

---

## 2. Decisiones de Diseño Confirmadas (`/grill-me`)

1. **Pool de jugadores (Roster Activo en vivo + Estadísticas Reales):**
   - Consultar `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&season=${season}&hydrate=person` filtrando lanzadores puros (`P` / código `"1"`).
   - Cruzar contra estadísticas reales de temporada (`Supabase batting_stats` → `MLB seasonStats.batting` → `LEONES_REAL_STATS_MAP` → fallback sintético), exponiendo `plateAppearances`, `atBats`, `gamesPlayed`, `eligiblePositions` y `rosterStatus`.
   - Si el endpoint de roster activo retorna vacío (p. ej. fuera de temporada o error de red), hacer fallback controlado con los bateadores del equipo con mayor actividad en `supabaseStats` (y/o jugadores vistos en lineups de la temporada) para no romper `/bullpen`.

2. **Restricciones defensivas (Modo Dual con Toggle):**
   - **Por defecto — `9 Posiciones Válidas` (`defensive_valid`):** llena los 9 puestos reglamentarios (`C`, `1B`, `2B`, `3B`, `SS`, `LF`, `CF`, `RF`, `DH`) usando elegibilidad multi-posición observada en los juegos disputados de la temporada (`boxscore.players[].allPositions` / `position`) unida a la posición primaria del roster activo.
   - **Alternativo — `Top 9 Bates Puros` (`pure_bats`):** selecciona los 9 bateadores con mayor `wOBA` sin restricción defensiva y los ordena según Tom Tango (*The Book*).

3. **Ubicación e Integración en UI:**
   - Selector de modo segmentado en la cabecera de `TangoLineupOptimizerTab`:
     - **`Del Juego / Orden del Día`** (comportamiento actual intacto: reordena los 9 titulares del juego seleccionado o de hoy).
     - **`Mejor Posible (Roster Activo)`** (nuevo modo de selección óptima desde el roster activo).
   - Comparativa lado a lado frente al lineup de referencia (Lineup de Hoy en Game Center si está publicado, o la alineación base seleccionada), marcando con un badge sutil **`Nuevo en el 9`** a quienes entran respecto al lineup de referencia y mostrando sección inferior de **Banca / No incluidos en este 9**.

4. **Muestra mínima y exclusiones manuales:**
   - Filtro ajustable de apariciones mínimas al plato (`PA`): **`Mín. 10 PA`** por defecto (`0 / 10 / 20 / 35 PA`).
   - Relajación automática progresiva (`minPA → 5 → 0`) si el umbral seleccionado deja menos de 9 bateadores elegibles, informando al usuario mediante `effectiveMinPa` y `relaxedConstraintNote`.
   - Chips interactivos por jugador activo en un panel compacto/colapsable **"Disponibles en Roster Activo (N)"** para excluir o reactivar peloteros por descanso o lesión con recálculo instantáneo en el cliente.

---

## 3. Requerimientos Funcionales

### RF-01: Contratos de Datos Retrocompatibles (`src/types/tango-lineup.ts`, `src/types/bullpen.ts`)
- Extender `src/types/tango-lineup.ts` sin alterar las propiedades obligatorias existentes de `TangoPlayer` ni `TangoOptimizationResult`:
  - `TangoPositionSlot`: `"C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "OF" | "DH"`.
  - `ActiveRosterBatter extends TangoPlayer`: añade `plateAppearances: number`, `atBats: number`, `gamesPlayed?: number`, `eligiblePositions: string[]`, `rosterStatus?: string`.
  - `BestLineupConstraintMode`: `"defensive_valid" | "pure_bats"`.
  - `BuildBestAvailableLineupParams`: `{ pool: ActiveRosterBatter[]; mode?: BestLineupConstraintMode; minPlateAppearances?: number; excludedPlayerIds?: number[]; referenceLineup?: TangoPlayer[] }`.
  - `BestAvailableLineupResult`: `{ optimization: TangoOptimizationResult; assignedPositions: Record<number, string>; benchPlayers: ActiveRosterBatter[]; modeUsed: BestLineupConstraintMode; effectiveMinPa: number; relaxedConstraintNote?: string }`.
- Extender `BullpenAndLineupsData["lineups"]` en `src/types/bullpen.ts` añadiendo el campo opcional `activeRosterPool?: ActiveRosterBatter[]`.

### RF-02: Obtención del Roster Activo MLB (`src/lib/game-center-service.ts`)
- Exportar `fetchTeamActiveRosterBatters(teamId = 695, season = 2026)` con timeout explícito (`AbortSignal.timeout(8000)`).
- Consultar `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&season=${season}&hydrate=person`.
- Filtrar lanzadores puros (`position?.abbreviation === "P"` o `position?.code === "1"`).
- Extraer `playerId`, `fullName`, `primaryPosition`, `batSide` (`"R" | "L" | "S"` desde `person.batSide.code`) y `rosterStatus` (`status.description`).
- Ante cualquier error HTTP, timeout o payload inválido, capturar el fallo de forma segura y retornar `[]`.

### RF-03: Enriquecimiento Multi-Posición y Construcción del Pool (`src/lib/game-feed-service.ts`)
- Ampliar `collectMlbPlayerMetaFromFeeds(feeds)` para recolectar adicionalmente:
  - `playedPositions: Set<string>` desde `box.players["ID"+id].position?.abbreviation` y `allPositions[].abbreviation` (excluyendo `"P"`, `"PH"` y `"PR"`, conservando `"DH"` y posiciones defensivas de campo).
  - `plateAppearances`, `atBats` y `gamesPlayed` desde `seasonStats.batting`.
- Exportar `buildActiveRosterPool(params)` para construir `ActiveRosterBatter[]`:
  - Usa `activeRoster` como base cuando no está vacío; si está vacío, hace fallback a los bateadores del equipo en `supabaseStats` (y opcionalmente jugadores de `fallbackPool`).
  - Resuelve estadísticas reales en orden estricto (`Supabase batting_stats` → `MLB seasonStats.batting` → `LEONES_REAL_STATS_MAP` → sintético) y adjunta `plateAppearances`, `atBats`, `gamesPlayed`, `eligiblePositions` y `rosterStatus`.
  - Construye `eligiblePositions` uniendo `[primaryPosition, ...playedPositions]` normalizados (eliminando duplicados y valores vacíos/inválidos como `"P"`, `"PH"`, `"PR"`).
  - Ordena el pool por `woba` descendente (desempate `plateAppearances` descendente).
- Exponer `activeRosterPool` dentro de `lineups` en `getDynamicBullpenAndLineups(season, options)`.

### RF-04: Algoritmo Determinista de Selección Óptima y Posiciones Válidas (`src/lib/tango-lineup-engine.ts`)
- Exportar `normalizeEligiblePositions(rawPositions: string[]): Set<string>`:
  - Mapea posiciones exactas (`C`, `1B`, `2B`, `3B`, `SS`, `LF`, `CF`, `RF`, `DH`).
  - Aplica expansiones estándar de béisbol:
    - `OF` → cubre `LF`, `CF`, `RF`.
    - `LF` / `CF` / `RF` → cubren su slot natural y los demás jardines como flexibilidad controlada cuando haga falta (o `OF` genérico), priorizando su slot natural al asignar.
    - `IF` → cubre `1B`, `2B`, `3B`, `SS`.
    - Todo bateador es elegible para `DH`.
- Exportar `selectBestDefensiveNine(pool: ActiveRosterBatter[])`:
  - Slots requeridos: `["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"]`.
  - Ejecuta búsqueda exacta con backtracking y poda por cota superior sobre los candidatos ordenados por `woba` descendente (garantizando latencia `< 5 ms` en rosters activos típicos de 15–25 jugadores):
    - Maximiza la suma ofensiva $\sum \text{wOBA}_i$ (desempate por suma de OPS y afinidad por posición primaria natural para evitar desplazamientos innecesarios).
  - **Fallback controlado:** si con elegibilidad estricta alguna posición específica queda sin cobertura (ej. `3B` natural cuando nadie jugó `3B` aún), habilita flexibilidad secundaria estándar (`2B/SS ↔ 3B`, `3B/LF/RF ↔ 1B`, `LF/CF/RF` intercambiables en `OF`, y en último extremo cualquier jugador de campo restante) registrando un mensaje claro en español en `relaxedNote`.
- Exportar `buildBestAvailableLineup(params: BuildBestAvailableLineupParams): BestAvailableLineupResult`:
  - Excluye jugadores en `excludedPlayerIds`.
  - Aplica `minPlateAppearances` (por defecto `10`). Si quedan `< 9` elegibles tras excluir y filtrar, reduce progresivamente (`minPA → 5 → 0`) hasta alcanzar 9 jugadores (o todos los disponibles si el roster completo tras exclusiones tiene `< 9`), documentando `effectiveMinPa` y `relaxedConstraintNote`.
  - En modo `"defensive_valid"`, invoca `selectBestDefensiveNine` y asigna a cada jugador su posición de campo en `assignedPositions[playerId]` (actualizando la posición mostrada en la optimización si corresponde, o preservándola vía `assignedPositions`).
  - En modo `"pure_bats"`, toma los 9 de mayor `woba` (desempate `wrcPlus`, `obp`) y asigna sus posiciones primarias en `assignedPositions`.
  - Ordena los 9 elegidos con `optimizeTangoLineup()`.
  - Si se provee `referenceLineup` con al menos 9 jugadores (p. ej. el Lineup de Hoy del Game Center), recalcula `currentLineup`, `currentMetrics`, `deltaRunsPerGame` y `deltaRunsPerSeason` comparando el **Mejor Lineup Posible** (`optimizedMetrics`) frente a `referenceLineup` (`currentMetrics`).

### RF-05: Interfaz Dual y Controles Interactivos en `/bullpen` (`bullpen-view.tsx`, `tango-lineup-optimizer-tab.tsx`)
- `BullpenView` propaga `activeRosterPool={data.lineups.activeRosterPool}` hacia `TangoLineupOptimizerTab`.
- `TangoLineupOptimizerTab` acepta `activeRosterPool?: ActiveRosterBatter[]`.
- **Selector de modo en cabecera:**
  - `"Del Juego / Orden del Día"` (modo existente intacto).
  - `"Mejor Posible (Roster Activo)"` (disponible cuando `activeRosterPool` tiene al menos 9 jugadores; si no hay pool suficiente, muestra estado explicativo amigable).
- **Controles del modo `"Mejor Posible (Roster Activo)"`:**
  - Toggle de reglas defensivas: **`9 Posiciones Válidas`** (`defensive_valid`, por defecto) vs **`Top 9 Bates Puros`** (`pure_bats`).
  - Selector de muestra mínima: **`Mín. 10 PA`** (por defecto), `Todos (0 PA)`, `Mín. 20 PA`, `Mín. 35 PA`.
  - Panel colapsable/compacto **"Disponibles en Roster Activo (N)"** con chips interactivos por jugador (`Nombre · Posición · PA · wOBA`) para activar/desactivar exclusiones por lesión o descanso.
  - Aviso contextual cuando `relaxedConstraintNote` está presente (relajación de PA o cobertura posicional).
- **Comparativa lado a lado y Banca:**
  - Columna Izquierda: **Lineup de Referencia** (Lineup de Hoy en Game Center si está publicado, o la alineación seleccionada en el selector base), con su `R/J`, `R/56J`, `wOBA` y `Balance Z/D`.
  - Columna Derecha: **Mejor Lineup Posible (Roster Activo)** con la posición asignada (`C, 1B, 2B, 3B, SS, LF, CF, RF, DH`), badge sutil **`Nuevo en el 9`** cuando `player.playerId` no está en el lineup de referencia, fuente de stats y ganancia neta (`+Δ Carreras/Juego`, `+Δ Carreras/56J`).
  - Sección inferior **"Banca / No incluidos en este 9"** mostrando los peloteros activos que quedaron fuera (y los excluidos manualmente) con `Posiciones`, `PA`, `AVG/OBP/SLG` y `wOBA`.

---

## 4. Restricciones de Dominio y No Regresión

1. **Idioma 100% en español:** Todos los títulos, botones, chips, tooltips, avisos de relajación y etiquetas deben estar en español. **Prohibido** usar *"sabermétrico"*, *"sabermétrica"* o *"sabermetría"* en títulos, subtítulos o botones de interfaz.
2. **Prohibición estricta de Statcast en LVBP:** No incluir Exit Velocity, Launch Angle, Barrels ni Sprint Speed.
3. **Retrocompatibilidad total:** Todos los campos nuevos en interfaces existentes (`ActiveRosterBatter`, `BullpenAndLineupsData["lineups"].activeRosterPool`, props de `TangoLineupOptimizerTab`) son opcionales o aditivos; el modo `"Del Juego / Orden del Día"` debe mantener exactamente su comportamiento actual.
4. **Esquemas de Supabase inmutables:** Cero alteraciones de tablas/columnas en Supabase.
5. **Política de red:** Todo `fetch` externo a MLB Stats API usa `AbortSignal.timeout(...)` explícito y fallback seguro.
6. **Diseño visual (`impeccable.md`):** Mantener estética Dark Navy (`#0D152B` / `#070B19`) + Gold (`#FDB827`), iconos de `lucide-react` (sin emojis usados como iconos de UI), sin kicker chips sobre encabezados ni cards anidadas innecesarias.

---

## 5. Criterios de Aceptación (Definición de Terminado)

1. **CA-01 (Roster Activo + Stats Reales):** `fetchTeamActiveRosterBatters` excluye lanzadores y retorna `[]` ante fallo de red; `buildActiveRosterPool` cruza roster activo con Supabase/MLB/canónico y expone `plateAppearances` y `eligiblePositions` en `activeRosterPool`.
2. **CA-02 (9 Posiciones Válidas vs Top 9 Bates Puros):** En modo `"defensive_valid"`, `selectBestDefensiveNine` asigna exactamente los 9 slots (`C, 1B, 2B, 3B, SS, LF, CF, RF, DH`) maximizando la suma de `wOBA` sin repetir jugador ni elegir, por ejemplo, 4 receptores o 4 campocortos simultáneos; en `"pure_bats"`, elige los 9 mejores por `wOBA`.
3. **CA-03 (Muestra Mínima y Relajación Progresiva):** Con `minPlateAppearances = 10`, jugadores con 2 PA y wOBA inflado quedan excluidos cuando hay >= 9 jugadores calificados; si quedan `< 9`, el umbral baja automáticamente (`10 → 5 → 0`) e informa `effectiveMinPa` + `relaxedConstraintNote`.
4. **CA-04 (Exclusiones Manuales):** Al pasar `excludedPlayerIds`, el jugador excluido sale del 9 óptimo, aparece en `benchPlayers` (o excluido en UI) y entra el siguiente mejor candidato válido para mantener las 9 posiciones.
5. **CA-05 (Comparativa vs Lineup de Hoy):** `buildBestAvailableLineup` con `referenceLineup` calcula `deltaRunsPerGame` y `deltaRunsPerSeason` respecto al lineup de referencia (Game Center de hoy), y la UI marca **`Nuevo en el 9`** en los peloteros que no figuran en dicha referencia.
6. **CA-06 (Verificación Técnica):** `node test/best-available-lineup.test.mjs`, `node test/calendar-today.test.mjs` y `node test/gamecenter-lineup-optimizer.test.mjs` pasan al 100%; `npx tsc --noEmit` sin errores nuevos en los archivos modificados; `npm run build` exitoso (exit 0).
