# Plan Técnico 024: Mejor Lineup Posible con lo Mejor Disponible (Roster Activo)

**Slug:** `024-best-available-lineup-optimizer`  
**Fecha:** 2026-11-13  

---

## 1. Validación Constitucional y Escalera Ponytail

1. **Artículo I (Causa Raíz y Fuente de Verdad):**
   - La obtención del roster activo se centraliza en `fetchTeamActiveRosterBatters` (`src/lib/game-center-service.ts`), el enriquecimiento de stats y elegibilidad multi-posición en `game-feed-service.ts`, y toda la lógica de selección óptima / posiciones / filtros en funciones puras dentro de `src/lib/tango-lineup-engine.ts` (reutilizadas por la UI y testeadas directamente).
   - Prohibido crear scripts temporales; se editan únicamente los archivos fuente canónicos.
2. **Artículo II (Minimalismo y Escalera Ponytail):**
   - **Reutilizar helpers existentes:** `optimizeTangoLineup`, `calculateLineupMetrics`, `resolvePlayerStats`, `buildTangoPlayerFromBattingStats`, `buildTangoPlayerFromMlbSeasonStats` (`src/lib/tango-lineup-engine.ts`), `getBattingStats` (`src/lib/supabase.ts`), `collectMlbPlayerMetaFromFeeds` (`src/lib/game-feed-service.ts`).
   - **Sin nuevas dependencias:** Cero paquetes npm nuevos (el algoritmo de backtracking con poda en TS puro resuelve un roster de ~15–25 jugadores en `< 1 ms`).
   - **Contratos 100% retrocompatibles:** Todos los campos añadidos a `BullpenAndLineupsData["lineups"]` y props de componentes son opcionales (`?`).
3. **Artículo IV (Invariantes Deportivos LVBP & Diseño Frontend `impeccable.md`):**
   - Cero cambios de esquema en Supabase.
   - 100% español en UI, sin palabras *"sabermétrico/a"* en títulos o botones, cero métricas Statcast.
   - Iconos exclusivos de `lucide-react`, contraste WCAG AA, paleta Dark Navy (`#0D152B` / `#070B19`) + Gold (`#FDB827`).
4. **Artículo V (Verificación Previa):**
   - Nueva suite `test/best-available-lineup.test.mjs` + suites existentes + `npx tsc --noEmit` + `npm run build`.

---

## 2. Contratos de Datos e Interfaces Exactas (Frontera Track A ↔ Track B)

### 2.1. `src/types/tango-lineup.ts`
```typescript
export type TangoPositionSlot =
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF"
  | "OF"
  | "DH";

export interface ActiveRosterBatter extends TangoPlayer {
  plateAppearances: number;
  atBats: number;
  gamesPlayed?: number;
  eligiblePositions: string[]; // ej. ["3B", "1B", "2B"]
  rosterStatus?: string;       // ej. "Active"
}

export type BestLineupConstraintMode = "defensive_valid" | "pure_bats";

export interface BuildBestAvailableLineupParams {
  pool: ActiveRosterBatter[];
  mode?: BestLineupConstraintMode;
  minPlateAppearances?: number;
  excludedPlayerIds?: number[];
  referenceLineup?: TangoPlayer[];
}

export interface BestAvailableLineupResult {
  optimization: TangoOptimizationResult;
  assignedPositions: Record<number, string>; // playerId -> posición asignada en el campo (ej. "3B", "DH")
  benchPlayers: ActiveRosterBatter[];        // jugadores activos no incluidos en los 9
  modeUsed: BestLineupConstraintMode;
  effectiveMinPa: number;                    // umbral PA aplicado realmente (puede bajar si < 9 elegibles)
  relaxedConstraintNote?: string;            // aviso si se relajó minPA o alguna posición por falta de cobertura
}
```

### 2.2. `src/types/bullpen.ts`
Importar `ActiveRosterBatter` desde `./tango-lineup` y extender `BullpenAndLineupsData["lineups"]` de forma opcional:
```typescript
lineups: {
  // ...campos existentes intactos...
  activeRosterPool?: ActiveRosterBatter[];
}
```

### 2.3. Contratos de Funciones Exportadas (Track A)

1. **`src/lib/game-center-service.ts`:**
   ```typescript
   export interface ActiveRosterMlbBatter {
     playerId: number;
     fullName: string;
     primaryPosition: string;
     batSide?: "R" | "L" | "S";
     rosterStatus?: string;
   }

   export async function fetchTeamActiveRosterBatters(
     teamId?: number,
     season?: number
   ): Promise<ActiveRosterMlbBatter[]>;
   ```

2. **`src/lib/tango-lineup-engine.ts`:**
   ```typescript
   export const DEFENSIVE_LINEUP_SLOTS: readonly ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

   export function normalizeEligiblePositions(rawPositions: string[]): Set<string>;

   export function selectBestDefensiveNine(pool: ActiveRosterBatter[]): {
     selected: ActiveRosterBatter[];
     assignedPositions: Record<number, string>;
     relaxedNote?: string;
   };

   export function buildBestAvailableLineup(
     params: BuildBestAvailableLineupParams
   ): BestAvailableLineupResult;
   ```

3. **`src/lib/game-feed-service.ts`:**
   ```typescript
   export function buildActiveRosterPool(params: {
     activeRoster: ActiveRosterMlbBatter[];
     supabaseStats: BattingStats[];
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     feeds: Iterable<any>;
     teamId?: number;
     fallbackPool?: StarterSlot[][];
   }): ActiveRosterBatter[];
   ```
   Y `getDynamicBullpenAndLineups(season = 2026, options?)` adjunta `activeRosterPool` dentro de `data.lineups`.

### 2.4. Contratos de Props entre Componentes (Track A → Track B)

1. **`BullpenView` (`src/components/bullpen/bullpen-view.tsx`):**
   - Propaga `activeRosterPool={data.lineups.activeRosterPool}` hacia `<TangoLineupOptimizerTab />`.
2. **`TangoLineupOptimizerTab` (`src/components/bullpen/tango-lineup-optimizer-tab.tsx`):**
   ```typescript
   interface TangoLineupOptimizerTabProps {
     gameLineups?: GameLineup[];
     topFrequentLineups?: TopLineup[];
     todayLineup?: GameLineup | null;
     todayLineupStatus?: TodayLineupStatus;
     requestedLineup?: GameLineup | null;
     playerStatsMap?: Record<number, TangoPlayer>;
     activeRosterPool?: ActiveRosterBatter[];
     initialGamePk?: number;
     teamName?: string;
     season?: number;
   }
   ```

---

## 3. Diseño Técnico por Track y Archivo

### Track A — Backend, Servicios y Motor (`src/types/*`, `src/lib/*`)

1. **`src/types/tango-lineup.ts` y `src/types/bullpen.ts`:**
   - Declarar los tipos exactos definidos en §2.1 y §2.2.

2. **`src/lib/game-center-service.ts`:**
   - Añadir `fetchTeamActiveRosterBatters(teamId = 695, season = 2026)`:
     - Endpoint: `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&season=${season}&hydrate=person`.
     - `AbortSignal.timeout(8000)`.
     - Filtrar lanzadores (`position?.abbreviation === "P" || position?.code === "1"`).
     - Devolver `ActiveRosterMlbBatter[]` con `playerId`, `fullName`, `primaryPosition` (normalizada, fallback `"UTIL"`), `batSide` (`"R" | "L" | "S"`), `rosterStatus`.
     - Capturar errores de red / HTTP y devolver `[]`.

3. **`src/lib/tango-lineup-engine.ts`:**
   - `normalizeEligiblePositions(rawPositions: string[]): Set<string>`:
     - Normaliza mayúsculas, mapea alias (`"2B/SS"`, `"OF"`, `"IF"`, `"DH"`, `"C"`, `"1B"`, `"2B"`, `"3B"`, `"SS"`, `"LF"`, `"CF"`, `"RF"`), excluye `"P"`, `"PH"`, `"PR"`.
     - Expande `"OF"` → `LF, CF, RF`; `"IF"` → `1B, 2B, 3B, SS`; todo jugador de posición incluye `"DH"`.
   - `selectBestDefensiveNine(pool: ActiveRosterBatter[])`:
     - Slots requeridos en orden de escasez posicional (MRV / heurística para podar rápido): p. ej. `["C", "SS", "2B", "3B", "CF", "1B", "LF", "RF", "DH"]`.
     - **Paso 1 (Elegibilidad estricta):** para cada candidato ordenado por `woba` descendente, verifica si cubre el slot actual (`eligibleSet.has(slot)`). Usa cota superior optimista (`sumTopRemainingWoba`) para podar ramas subóptimas en `< 1 ms`. En caso de empate exacto de `wOBA`, prioriza suma de OPS y afinidad por posición primaria (`player.position === slot`).
     - **Paso 2 (Flexibilidad controlada de respaldo):** si el Paso 1 no encuentra cobertura completa para los 9 slots (por ejemplo, ningún `3B` natural o falta un jardín específico), permite:
       - Flexibilidad de jardines (`LF`/`CF`/`RF` ↔ cualquier `OF`),
       - Flexibilidad de cuadro (`2B`/`SS` ↔ `3B`, `3B`/`C`/`OF` ↔ `1B`, `2B` ↔ `SS`),
       - Y en último recurso, si aún falta algún slot y hay al menos 9 bateadores, asigna al mejor bateador disponible marcando claramente en `relaxedNote` qué posición(es) se cubrieron por flexibilidad.
   - `buildBestAvailableLineup(params)`:
     - Excluye `excludedPlayerIds`.
     - Filtra por `plateAppearances >= threshold` con cascada de relajación `[requestedMinPa, 5, 0]` (deduplicada y descendente) hasta tener `>= 9` elegibles (o el máximo posible si el pool neto tiene `< 9`).
     - Si `selected.length < 9`, retorna resultado seguro vacío (sin lanzar excepción) con `relaxedConstraintNote` indicando cuántos jugadores elegibles quedaron.
     - En modo `"defensive_valid"`, llama `selectBestDefensiveNine`, clona los 9 elegidos actualizando su `position` mostrada al slot asignado (o manteniéndolo en `assignedPositions[playerId]`) y los ordena con `optimizeTangoLineup()`.
     - En modo `"pure_bats"`, ordena por `woba` descendente (desempate `wrcPlus`, `obp`), toma los 9 primeros, asigna `assignedPositions[p.playerId] = p.position || "DH"` y los ordena con `optimizeTangoLineup()`.
     - Si `referenceLineup && referenceLineup.length >= 9`: recalcula `currentMetrics = calculateLineupMetrics(referenceLineup.slice(0, 9))`, sustituye `currentLineup = currentMetrics.contributions`, `currentMetrics`, y recalcula `deltaRunsPerGame` y `deltaRunsPerSeason` contra `optimizedMetrics`.
     - Calcula `benchPlayers` como los jugadores del `pool` original (excluyendo `excludedPlayerIds` o marcando el resto de disponibles) que no entraron en el 9 óptimo, ordenados por `woba` descendente.

4. **`src/lib/game-feed-service.ts`:**
   - Ampliar `MlbPlayerFeedMeta` con `playedPositions: Set<string>`, `plateAppearances?: number`, `atBats?: number`, `gamesPlayed?: number`.
   - En `collectMlbPlayerMetaFromFeeds`:
     - Recorrer `bPlayer?.position?.abbreviation` y `bPlayer?.allPositions` (si es array) agregando posiciones válidas (excluyendo `"P"`, `"PH"`, `"PR"`) a `playedPositions`.
     - Capturar `plateAppearances` (`seasonStats.batting.plateAppearances ?? atBats + baseOnBalls + hitByPitch + sacFlies`), `atBats` y `gamesPlayed`.
   - Implementar `buildActiveRosterPool(...)`:
     - Si `activeRoster.length > 0`, iterar sus bateadores; si no, construir lista base desde `supabaseStats` filtrando por `teamId` (cuando `teamId` > 0) y enriquecer con `fallbackPool` si hiciera falta.
     - Para cada bateador, obtener `stats` desde `resolvePlayerStats` (pasando un `playerStatsMap` armado con `supabaseStats` + `feeds`), y extraer `plateAppearances`, `atBats`, `gamesPlayed` desde `supabaseStat` o `mlbMeta.seasonBatting`.
     - Unir `[primaryPosition, ...mlbMeta.playedPositions]` filtrando posiciones no defensivas (`P`, `PH`, `PR`) como `eligiblePositions`.
     - Ordenar por `woba` descendente, luego `plateAppearances` descendente.
   - En `getDynamicBullpenAndLineups(season, options)`:
     - Ejecutar `fetchTeamActiveRosterBatters(targetTeamId, season)` en el `Promise.all` inicial (junto con `feeds`, `availableGames`, `supabaseStats`).
     - Construir `activeRosterPool` con `allFeeds` y adjuntarlo en `lineups.activeRosterPool`.

---

### Track B — Frontend / UI (`src/components/bullpen/*`)

1. **`src/components/bullpen/bullpen-view.tsx`:**
   - Pasar `activeRosterPool={data.lineups.activeRosterPool}` a `<TangoLineupOptimizerTab />`.

2. **`src/components/bullpen/tango-lineup-optimizer-tab.tsx`:**
   - **Estado del modo dual:**
     - `optimizerMode`: `"game_lineup" | "best_available"` (por defecto `"game_lineup"` para preservar la entrada directa desde Game Center y vista diaria).
     - `constraintMode`: `BestLineupConstraintMode` (`"defensive_valid"` por defecto).
     - `minPa`: `number` (`10` por defecto; opciones `0`, `10`, `20`, `35`).
     - `excludedPlayerIds`: `number[]` (`[]` por defecto).
     - `showRosterPanel`: `boolean` para expandir/colapsar los chips del roster activo (abierto o toggleable con contador visible `Disponibles en Roster Activo (N)`).
   - **Selector de modo segmentado en la cabecera:**
     - Botón 1: **`Del Juego / Orden del Día`**
     - Botón 2: **`Mejor Posible (Roster Activo)`** (con badge de disponibilidad si `activeRosterPool.length >= 9`).
   - **Lineup de Referencia en modo `"Mejor Posible"`:**
     - Si `hasTodayLineup` (o `hasRequestedLineup` cuando viene `initialGamePk`), se usa ese lineup como `referenceLineup` para comparar contra el Mejor Lineup Posible; en su defecto se usa `initialPlayers` (el lineup seleccionado en el dropdown).
     - Se crea un `Set<number>` con los `playerId` del `referenceLineup` para marcar con badge **`Nuevo en el 9`** a cada bateador entrante en el lineup óptimo.
   - **Renderizado en modo `"Mejor Posible (Roster Activo)"`:**
     - Controles: Toggle **`9 Posiciones Válidas`** vs **`Top 9 Bates Puros`**, selector de muestra **`Mín. 10 PA` / `Todos (0 PA)` / `Mín. 20 PA` / `Mín. 35 PA`**, y panel de chips interactivos del roster activo con botón *"Restablecer todos"* cuando hay exclusiones.
     - Banner informativo si `bestResult.relaxedConstraintNote` está definido.
     - KPIs superiores: Carreras Proyectadas (`R/J` y `R/56J` del Mejor Posible vs Referencia), `wOBA` colectivo y `Balance Z/D`, con ganancia neta `+Δ`.
     - Comparativa lado a lado:
       - Izquierda: **Lineup de Referencia** (ej. Lineup de Hoy en Game Center o base seleccionada).
       - Derecha: **Mejor Lineup Posible (Roster Activo)** mostrando orden 1–9, posición asignada (`assignedPositions[playerId]`), badge **`Nuevo en el 9`** si no estaba en referencia, `wOBA`, `OBP`/`SLG` y aporte en carreras.
     - Sección inferior **"Banca / No incluidos en este 9"** listando `bestResult.benchPlayers` + excluidos manualmente (con badge *"Excluido"*) y opción de reactivar directamente.
   - **Reglas de estilo y dominio:**
     - 100% español, sin *"sabermétrico/a"* en títulos/botones, sin Statcast, iconos `lucide-react`, sin kicker chips encima de títulos ni tarjetas anidadas excesivas.

---

### Track C — Pruebas y Verificación (`test/*`, TypeScript, Build, `implementation.md`)

1. **`test/best-available-lineup.test.mjs`:**
   - Suite unitaria independiente (sin red) probando `normalizeEligiblePositions`, `selectBestDefensiveNine`, `buildBestAvailableLineup` y `buildActiveRosterPool`.
2. **Regresión y Build:**
   - `node test/calendar-today.test.mjs`
   - `node test/gamecenter-lineup-optimizer.test.mjs`
   - `npx tsc --noEmit`
   - `npm run build`
3. **Cierre Spec-Kit:**
   - Actualizar checkboxes en `tasks.md` y redactar `specs/024-best-available-lineup-optimizer/implementation.md`.

---

## 4. Plan de Rollback

1. Revertir los cambios mediante `git revert` o `git checkout` por archivo.
2. Cero alteraciones de esquema en Supabase ni en snapshots JSON históricos (`src/data/lvbp_season_*.json`).
3. La adición de `activeRosterPool?` y el nuevo modo `"best_available"` son puramente aditivos; el modo `"Del Juego / Orden del Día"` permanece intacto.
