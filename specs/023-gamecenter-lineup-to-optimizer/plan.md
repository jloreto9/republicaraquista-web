# Plan Técnico 023: Lineup Diario de Game Center en Optimizador Tom Tango

**Slug:** `023-gamecenter-lineup-to-optimizer`  
**Fecha:** 2026-11-12  

---

## 1. Validación Constitucional y Escalera Ponytail

1. **Artículo I (Causa Raíz y Fuente de Verdad):**
   - El desfase de fecha en `getCaracasAvailableGames` se corrige en la fuente canónica reutilizando `getVenezuelanToday()` de `src/lib/utils.ts` (ya usada en calendario y validada en `test/calendar-today.test.mjs`).
   - La pérdida de estadísticas reales ocurre en `resolvePlayerStats` (`src/lib/tango-lineup-engine.ts`) y en la omisión de estadísticas de temporada en `getDynamicBullpenAndLineups` (`src/lib/game-feed-service.ts`). Se resuelve enriqueciendo desde la fuente real (`getBattingStats` + `computeWoba`/`computeWrcPlus` + MLB `feed/live`).
   - Prohibido crear scripts temporales; se editan únicamente los archivos fuente canónicos.
2. **Artículo II (Minimalismo y Escalera Ponytail):**
   - **Reutilizar helpers existentes:** `getVenezuelanToday` (`src/lib/utils.ts`), `getBattingStats` (`src/lib/supabase.ts`), `computeWoba` y `computeWrcPlus` (`src/lib/matchup-engine.ts`), `getCaracasAvailableGames` (`src/lib/game-center-service.ts`), `fetchGameLiveFeed` (`src/lib/game-feed-service.ts`).
   - **Contratos 100% retrocompatibles:** Todos los campos añadidos a interfaces existentes son opcionales (`?`).
   - **Sin nuevas dependencias:** Cero paquetes npm nuevos.
3. **Artículo IV (Invariantes Deportivos LVBP):**
   - Cero cambios de esquema en Supabase.
   - 100% español en labels y badges; cero términos *"sabermétrico/a"* en botones/títulos y cero métricas Statcast.
4. **Artículo V (Verificación Previa):**
   - Pruebas unitarias ejecutables en `test/` + `npx tsc --noEmit` + `npm run build`.

---

## 2. Contratos de Datos e Interfaces Exactas (Frontera Track A ↔ Track B)

### 2.1. `src/types/tango-lineup.ts`
Extender `TangoPlayer` (campos opcionales):
```typescript
export type TangoStatsSource = "supabase" | "mlb" | "canonical_map" | "synthetic";

export interface TangoPlayer {
  playerId: number;
  playerName: string;
  position: string;
  bats: 'R' | 'L' | 'S';
  avg: number;
  obp: number;
  slg: number;
  woba: number;
  wrcPlus: number;
  iso: number;
  headshot?: string;
  statsSource?: TangoStatsSource;
}
```

### 2.2. `src/types/bullpen.ts`
Extender `GameLineup` y `BullpenAndLineupsData["lineups"]` sin romper consumidores actuales:
```typescript
export interface TodayLineupStatus {
  hasGameToday: boolean;
  isPublished: boolean;
  gamePk?: number;
  gameDate?: string;
  opponent?: string;
  status?: "Live" | "Final" | "Preview";
  detailedState?: string;
  gameNumber?: number;
  message: string;
}

// Campos opcionales añadidos a GameLineup:
export interface GameLineup {
  gamePk: number;
  gameDate: string;
  opp: string;
  oppLogo?: string;
  isHome: boolean;
  leonesScore: number;
  oppScore: number;
  won: boolean;
  scoreStr: string;
  starters: StarterSlot[];
  status?: "Live" | "Final" | "Preview";
  isToday?: boolean;
  gameNumber?: number;
  detailedState?: string;
  teamId?: number;
  teamName?: string;
}

// Campos opcionales añadidos a BullpenAndLineupsData["lineups"]:
lineups: {
  // ...campos existentes intactos...
  todayLineup?: GameLineup | null;
  todayLineupStatus?: TodayLineupStatus;
  requestedLineup?: GameLineup | null;
  playerStatsMap?: Record<number, TangoPlayer>;
}
```

### 2.3. `src/types/game-center.ts`
Extender `GameCenterAvailableGame` y `GameCenterBoxscoreBatter` (campos opcionales):
```typescript
// En GameCenterAvailableGame:
gameNumber?: number;
isDoubleHeader?: boolean;
gameDatetime?: string;

// En GameCenterBoxscoreBatter:
bats?: "R" | "L" | "S";
obp?: string;
slg?: string;
```

### 2.4. Contratos de Props entre Componentes (Track A → Track B)
1. **`BullpenView` (`src/components/bullpen/bullpen-view.tsx`):**
   ```typescript
   interface BullpenViewProps {
     initialData: BullpenAndLineupsData;
     season?: number;
     initialTab?: "bullpen" | "budget" | "lineups";
     initialLineupSubtab?: "card" | "frequent" | "heatmap" | "player" | "optimizer";
     initialGamePk?: number;
     initialTeamId?: number;
   }
   ```
2. **`TangoLineupOptimizerTab` (`src/components/bullpen/tango-lineup-optimizer-tab.tsx`):**
   ```typescript
   interface TangoLineupOptimizerTabProps {
     gameLineups?: GameLineup[];
     topFrequentLineups?: TopLineup[];
     todayLineup?: GameLineup | null;
     todayLineupStatus?: TodayLineupStatus;
     requestedLineup?: GameLineup | null;
     playerStatsMap?: Record<number, TangoPlayer>;
     initialGamePk?: number;
     teamName?: string;
     season?: number;
   }
   ```
3. **`BoxscoreLineupsTab` (`src/components/game-center/boxscore-lineups-tab.tsx`):**
   ```typescript
   interface BoxscoreLineupsTabProps {
     gamePk?: number;
     homeTeam: GameCenterTeam;
     awayTeam: GameCenterTeam;
     awayBatters: GameCenterBoxscoreBatter[];
     homeBatters: GameCenterBoxscoreBatter[];
     awayPitchers: GameCenterBoxscorePitcher[];
     homePitchers: GameCenterBoxscorePitcher[];
   }
   ```

---

## 3. Diseño Técnico por Archivo y Módulos

### Track A — Backend, Servicios, Motor y Ruta `/bullpen`

1. **`src/lib/game-center-service.ts`:**
   - Importar `getVenezuelanToday` desde `./utils`.
   - En `getCaracasAvailableGames(season)`:
     - Cambiar `todayIso` a `getVenezuelanToday().dateString`.
     - Capturar `gameNumber: Number(g.gameNumber ?? 1)`, `isDoubleHeader: g.doubleHeader === "Y" || g.doubleHeader === "S"` y `gameDatetime: g.gameDate || ""`.
     - Ordenar `activeOrPlayed` con: `isLive` primero → `b.date.localeCompare(a.date)` → `(b.gameNumber ?? 1) - (a.gameNumber ?? 1)` → `b.gameDatetime.localeCompare(a.gameDatetime)`.
   - Exportar un helper puro/reutilizable `extractLineupFromSchedule(scheduleGame, isHome)` o resolver `schedule?hydrate=lineups` cuando `feed/live` tenga `boxTeam.batters` y `boxTeam.battingOrder` vacíos en estado `Pre-Game`/`Warmup`.
   - En `getGameCenterData`:
     - Incluir `"Warmup"` en `isPreview`: `abstractState === "Preview" || ["Scheduled", "Pre-Game", "Warmup"].includes(detailedState)`.
     - En `formatBatters(boxTeam, gamePlayersMap, fallbackLineupPlayers)`:
       - Si `boxTeam?.batters` no produce bateadores de posición, construir `rawBatters` desde `boxTeam?.battingOrder` (si `length > 0`) o desde `fallbackLineupPlayers` (`lineups.homePlayers`/`awayPlayers` del schedule).
       - Mapear `bats` desde `gameData.players["ID"+pId]?.batSide?.code` (`"R" | "L" | "S"`), `obp` y `slg` desde `p.seasonStats?.batting`.

2. **`src/lib/tango-lineup-engine.ts`:**
   - Exportar helper `buildTangoPlayerFromBattingStats(stats: BattingStats, batSide?: "R" | "L" | "S", position?: string): TangoPlayer` (o equivalente puro) que use `computeWoba` y `computeWrcPlus` de `./matchup-engine` y calcule `iso = Number(Math.max(0, stats.slg - stats.avg).toFixed(3))`.
   - Exportar helper `buildTangoPlayerFromMlbSeasonStats(...)` para mapear `seasonStats.batting` del feed MLB (`avg`, `obp`, `slg`, `atBats`, `hits`, `doubles`, `triples`, `homeRuns`, `baseOnBalls`, `hitByPitch`, `sacFlies`) a `TangoPlayer` usando `computeWoba` y `computeWrcPlus`.
   - Actualizar `resolvePlayerStats(name, position = "UTIL", playerId?: number, defaultOrder = 5, realStatsLookup?: Record<number, TangoPlayer>)`:
     1. Si `playerId && realStatsLookup?.[playerId]` (y `statsSource !== "synthetic"`): retornar ese `TangoPlayer` combinando `position` si se provee uno específico (`position !== "UTIL" && position !== "-"`), y heredando `bats` de `LEONES_REAL_STATS_MAP` si faltara.
     2. Fallback existente por nombre normalizado o `playerId` en `LEONES_REAL_STATS_MAP` (marcando `statsSource: "canonical_map"`).
     3. Último recurso sintético (marcando `statsSource: "synthetic"`).

3. **`src/lib/game-feed-service.ts`:**
   - Añadir helper `resolveTodayAndRequestedLineups(season, teamId, targetGamePk?, existingFeeds?)`:
     - Usa `getCaracasAvailableGames(season)` y `getVenezuelanToday().dateString` para identificar los juegos de Leones de la fecha VET de hoy.
     - Para juegos de hoy (priorizando `isLive` → mayor `gameNumber` con lineup): consulta `fetchGameLiveFeed(gamePk)` (y fallback `schedule?date=todayStr&hydrate=lineups` si el feed aún no trae `battingOrder`/`batters`).
     - Extrae `StarterSlot[]` (9 titulares ordenados 1..9, excluyendo lanzadores sin rol ofensivo).
     - Construye `todayLineup` (`status: "Live" | "Final" | "Preview"`, `isToday: true`, `gameNumber`, `detailedState`) y `todayLineupStatus` con mensaje claro en español.
     - Si se solicita `targetGamePk` (desde `/bullpen?gamePk=...`) y no coincide con `todayLineup` ni con los `luRecords` ya cargados (o si `teamId !== 695`), descarga el feed de `targetGamePk` para construir `requestedLineup` con los 9 titulares del equipo correspondiente (Leones por defecto, o `teamId` si se indica).
   - Construir `playerStatsMap: Record<number, TangoPlayer>`:
     - Recolectar los `playerId` de `todayLineup`, `requestedLineup` y `gameLineups`/`topFrequentLineups`.
     - Consultar `getBattingStats(season, "R", targetTeamId, 250, 0)` (y si hay jugadores rivales o de otro equipo, o `teamId = "all"` con `limit = 400` en 1 sola query — ¡una sola consulta en paralelo con `Promise.all` cubre a todos los bateadores de la LVBP!).
     - Enriquecer `bats` (`batSide.code`) y fallback `seasonStats.batting` desde los feeds ya descargados (`feeds` + `todayFeed` + `requestedFeed`).
     - Adjuntar `todayLineup`, `todayLineupStatus`, `requestedLineup` y `playerStatsMap` en `lineups` retornado por `getDynamicBullpenAndLineups`.
   - También exportar un helper `getRequestedGameLineupAndStats(gamePk, season, teamId)` si `season < 2026` o si `/api/bullpen` / `page.tsx` necesita enriquecer cuando usa `getBullpenAndLineups`.

4. **`src/app/api/game-center/route.ts`:**
   - Ajustar `Cache-Control`:
     - `data.status === "Live"` → `"public, s-maxage=5, stale-while-revalidate=2"`
     - `data.status === "Preview"` → `"public, s-maxage=30, stale-while-revalidate=15"`
     - `"Final"` → `"public, s-maxage=300, stale-while-revalidate=60"`

5. **`src/app/bullpen/page.tsx` y `src/app/api/bullpen/route.ts`:**
   - `page.tsx` recibe `searchParams: Promise<{ tab?: string; subtab?: string; gamePk?: string; teamId?: string }>` (Next.js 16 async `searchParams`), parsea valores válidos (`tab`: `"bullpen" | "budget" | "lineups"`, `subtab`: `"card" | "frequent" | "heatmap" | "player" | "optimizer"`, `gamePk` numérico, `teamId` numérico).
   - Pasa `targetGamePk` y `targetTeamId` a la resolución de datos y entrega `initialTab`, `initialLineupSubtab`, `initialGamePk`, `initialTeamId` a `<BullpenView />`.
   - `api/bullpen/route.ts` acepta opcionalmente `?gamePk=` para mantener paridad cuando `BullpenView` recarga por cambio de equipo/temporada.

---

### Track B — Frontend / UI (`src/components/bullpen/*` y `src/components/game-center/*`)

1. **`src/components/bullpen/bullpen-view.tsx`:**
   - Inicializar `activeTab`, `lineupSubtab`, `currentTeamId` desde `initialTab`, `initialLineupSubtab`, `initialTeamId`.
   - Propagar `todayLineup`, `todayLineupStatus`, `requestedLineup`, `playerStatsMap` y `initialGamePk` a `<TangoLineupOptimizerTab />`.
   - Cuidar que el `useEffect` inicial (`data.lineups.gameLineups.length <= 1`) no sobrescriba ni pierda `requestedLineup` / `todayLineup` si ya vienen cargados desde SSR.

2. **`src/components/bullpen/tango-lineup-optimizer-tab.tsx`:**
   - Lógica de clave por defecto (`defaultKey`):
     1. Si `initialGamePk` existe y coincide con `requestedLineup?.gamePk` → `"requested"`, con `todayLineup?.gamePk` → `"today"`, o con un índice en `gameLineups` → `"game_${idx}"`.
     2. Si no hay `initialGamePk` y `todayLineup?.starters.length >= 9` → `"today"`.
     3. En caso contrario → `"top_0"` (si hay `topFrequentLineups`), si no `"game_0"`.
   - En el `<select>`:
     - `<optgroup label="Lineup de Hoy (Game Center)">` cuando `todayLineup` está disponible.
     - `<optgroup label="Lineup Seleccionado desde Game Center">` cuando `requestedLineup` existe y difiere de `todayLineup`.
     - Mantener los optgroups existentes de `topFrequentLineups` y `gameLineups`.
   - Banner/badge de estado en español cuando `!todayLineup` (es decir, `!todayLineupStatus?.hasGameToday || !todayLineupStatus?.isPublished`), explicando que el lineup de hoy aún no está publicado o no hay partido hoy y que se muestra la alineación más frecuente.
   - Pasar `playerStatsMap` como 5to argumento a `resolvePlayerStats(...)` al construir `initialPlayers`.
   - Mantener estrictamente diseño Dark Navy `#0D152B` / `#070B19` / Gold `#FDB827`, texto 100% en español, sin palabras prohibidas (*sabermétrico/a*) ni Statcast.

3. **`src/components/game-center/game-center-view.tsx` y `src/components/game-center/boxscore-lineups-tab.tsx`:**
   - `GameCenterView` pasa `gamePk={gameData.gamePk}` a `<BoxscoreLineupsTab />`.
   - En `GameCenterView`: corregir el texto de estado cuando `gameData.status === "Preview"` y habilitar polling cada 30s en estado `"Preview"`.
   - En `BoxscoreLineupsTab`: cuando `gamePk` exista y `startersCount >= 9`, renderizar botón/enlace `<Link href={...}>` **"Optimizar este Lineup"** (icono `Sparkles`) hacia `/bullpen?tab=lineups&subtab=optimizer&gamePk=${gamePk}` (agregando `&teamId=${currentTeam.id}` si `currentTeam.id !== 695`).

---

## 4. Plan de Rollback

1. Revertir los commits de la rama/feature con `git revert` o `git checkout main`.
2. Cero cambios de esquema en Supabase y cero modificaciones en JSON snapshots históricos (`src/data/lvbp_season_*.json`).
3. Todos los campos nuevos en TypeScript son opcionales, garantizando rollback sin efectos colaterales en páginas existentes.
