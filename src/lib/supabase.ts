import { createClient } from "@supabase/supabase-js";
import {
  LVBP_TEAM_IDS,
  getTeam,
  calculatePythagorean,
  ACTIVE_SEASON,
  getPlayerHeadshotUrl,
} from "./constants";
import { isDayGame } from "./utils";
import { TeamStanding, GameSummary, SeasonKPIs, BattingStats, PitchingStats } from "@/types/sports";

export interface SupabaseGameRow {
  id: number;
  game_pk?: number;
  game_date?: string;
  game_datetime?: string;
  season?: number;
  game_type?: string;
  phase?: string;
  status?: string;
  home_team_id: number;
  away_team_id: number;
  home_score?: number;
  away_score?: number;
  current_inning?: number;
  inning_state?: string;
  is_day_game?: boolean;
  venue?: string;
}

export interface ExtractedPlayerRecord {
  id: number;
  full_name: string;
  team_id: number;
  position?: string;
  jersey_number?: string | null;
}

export interface ExtractedBattingRecord {
  game_id: number;
  player_id: number;
  team_id: number;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sb: number;
  cs: number;
  hbp: number;
  sf: number;
  sh: number;
  players?: { full_name: string };
  games?: { season: number; game_type: string; status: string };
}

export interface ExtractedPitchingRecord {
  game_id: number;
  player_id: number;
  team_id: number;
  ip_string: string;
  ip_decimal: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  hbp: number;
  wp: number;
  bk: number;
  players?: { full_name: string };
  games?: { season: number; game_type: string; status: string };
}

export interface ExtractedBoxscoreRows {
  gamePk: number;
  players: ExtractedPlayerRecord[];
  batting_stats: ExtractedBattingRecord[];
  pitching_stats: ExtractedPitchingRecord[];
}

interface RawBattingRow {
  game_id?: number | null;
  player_id: number;
  team_id: number;
  ab?: number | null;
  r?: number | null;
  h?: number | null;
  doubles?: number | null;
  triples?: number | null;
  hr?: number | null;
  rbi?: number | null;
  bb?: number | null;
  so?: number | null;
  sb?: number | null;
  cs?: number | null;
  hbp?: number | null;
  sf?: number | null;
  sh?: number | null;
  players?: { full_name?: string | null } | { full_name?: string | null }[] | null;
  games?:
    | { season?: number | null; game_type?: string | null; status?: string | null }
    | { season?: number | null; game_type?: string | null; status?: string | null }[]
    | null;
}

interface RawPitchingRow {
  game_id?: number | null;
  player_id: number;
  team_id: number;
  ip_decimal?: number | null;
  h?: number | null;
  r?: number | null;
  er?: number | null;
  bb?: number | null;
  hbp?: number | null;
  so?: number | null;
  hr?: number | null;
  players?: { full_name?: string | null } | { full_name?: string | null }[] | null;
  games?:
    | { season?: number | null; game_type?: string | null; status?: string | null }
    | { season?: number | null; game_type?: string | null; status?: string | null }[]
    | null;
}

export const FINALIZED_GAME_STATUSES = [
  "Final",
  "Completed",
  "Completed Early",
  "Game Over",
];

const FINALIZED_STATUS_SET = new Set(FINALIZED_GAME_STATUSES.map((s) => s.toLowerCase()));
const LIVE_STATUS_SET = new Set(["live", "in progress", "manager challenge"]);

const UNPLAYED_GAME_STATUSES = new Set([
  "scheduled",
  "pre-game",
  "warmup",
  "postponed",
  "cancelled",
  "canceled",
]);

const MLB_GAME_TYPE_TO_PHASE: Record<string, string> = {
  R: "regular",
  REGULAR: "regular",
  D: "wildcard_playin",
  WILDCARD_PLAYIN: "wildcard_playin",
  L: "round_robin",
  ROUND_ROBIN: "round_robin",
  W: "final",
  F: "final",
  FINAL: "final",
};

const PHASE_TO_MLB_GAME_TYPE: Record<string, string> = {
  regular: "R",
  wildcard_playin: "D",
  round_robin: "L",
  final: "F",
};

const MLB_FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RepublicaCaraquista/1.0",
};

const CANONICAL_SYNC_TTL_MS = 60_000;
const FEED_FETCH_CONCURRENCY = 5;
const UPSERT_BATCH_SIZE = 150;
const MAX_NO_DB_RECONCILE_GAMES = 25;

const seasonGamesCache = new Map<number, { expiresAt: number; games: SupabaseGameRow[] }>();
const seasonGamesInFlight = new Map<number, Promise<SupabaseGameRow[]>>();
export const reconciledBoxscoreCache = new Map<number, ExtractedBoxscoreRows>();
const checkedBoxscoreGameIds = new Set<number>();

/**
 * Limpia las cachés en memoria de sincronización canónica (útil para pruebas unitarias).
 */
export function clearCanonicalSyncCache(): void {
  seasonGamesCache.clear();
  seasonGamesInFlight.clear();
  reconciledBoxscoreCache.clear();
  checkedBoxscoreGameIds.clear();
}

function normalizePhase(rawType?: string | null): string {
  if (!rawType) return "regular";
  const trimmed = String(rawType).trim();
  if (!trimmed) return "regular";
  if (trimmed.toLowerCase() === "all") return "all";
  return MLB_GAME_TYPE_TO_PHASE[trimmed.toUpperCase()] || trimmed.toLowerCase();
}

function isFinalizedGameStatus(status?: string | null): boolean {
  if (!status) return false;
  return FINALIZED_STATUS_SET.has(status.trim().toLowerCase());
}

function isLiveGameStatus(status?: string | null): boolean {
  if (!status) return false;
  return LIVE_STATUS_SET.has(status.trim().toLowerCase());
}

function getGameStatusPriority(status?: string | null): number {
  const normalized = (status || "").trim().toLowerCase();
  if (FINALIZED_STATUS_SET.has(normalized)) return 3;
  if (LIVE_STATUS_SET.has(normalized)) return 2;
  if (normalized === "scheduled" || normalized === "pre-game" || normalized === "warmup") return 1;
  return 0;
}

/**
 * Determina si el estado de un juego corresponde a un partido disputado o en curso.
 */
export function isPlayedGameStatus(status?: string | null): boolean {
  if (!status) return true;
  return !UNPLAYED_GAME_STATUSES.has(status.trim().toLowerCase());
}

/**
 * Determina si una fila de `batting_stats` refleja participación real en el juego
 * (excluye filas de roster/banca en cero y lanzadores listados sin apariciones al plato).
 */
export function hasBatterAppearance(row: {
  ab?: number | null;
  bb?: number | null;
  hbp?: number | null;
  sf?: number | null;
  sh?: number | null;
  r?: number | null;
  sb?: number | null;
  cs?: number | null;
}): boolean {
  const pa =
    Number(row.ab || 0) +
    Number(row.bb || 0) +
    Number(row.hbp || 0) +
    Number(row.sf || 0) +
    Number(row.sh || 0);
  return (
    pa > 0 ||
    Number(row.r || 0) > 0 ||
    Number(row.sb || 0) > 0 ||
    Number(row.cs || 0) > 0
  );
}

/**
 * Determina si una fila de `pitching_stats` refleja participación real en el juego
 * (excluye filas de bullpen sin ver acción con 0.0 IP y todos los conteos en cero).
 */
export function hasPitcherAppearance(row: {
  ip_decimal?: number | null;
  h?: number | null;
  r?: number | null;
  er?: number | null;
  bb?: number | null;
  hbp?: number | null;
  so?: number | null;
  hr?: number | null;
}): boolean {
  return (
    Number(row.ip_decimal || 0) > 0 ||
    Number(row.h || 0) > 0 ||
    Number(row.r || 0) > 0 ||
    Number(row.er || 0) > 0 ||
    Number(row.bb || 0) > 0 ||
    Number(row.hbp || 0) > 0 ||
    Number(row.so || 0) > 0 ||
    Number(row.hr || 0) > 0
  );
}

function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return "";
  let clean = url.trim();
  // Quitar trailing slashes
  clean = clean.replace(/\/+$/, "");
  // Quitar /rest/v1 o /rest si fue pegado accidentalmente
  clean = clean.replace(/\/rest\/v1\/?$/, "").replace(/\/rest\/?$/, "");
  return clean.replace(/\/+$/, "");
}

const rawSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";
const supabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);

const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  ""
).trim();

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Cliente de servidor con privilegios administrativos (service_role) para mutaciones seguras
const supabaseServerKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  supabaseAnonKey
).trim();

export const supabaseAdmin =
  supabaseUrl && supabaseServerKey
    ? createClient(supabaseUrl, supabaseServerKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : supabase;

/**
 * Extrae registros normalizados de `players`, `batting_stats` y `pitching_stats`
 * a partir de un payload `/api/v1.1/game/{gamePk}/feed/live` de MLB Stats API.
 */
export function extractBoxscoreRowsFromFeed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feed: any,
  season = ACTIVE_SEASON,
  phase = "regular"
): ExtractedBoxscoreRows {
  const gamePk = Number(feed?.gamePk ?? feed?.gameData?.game?.pk ?? 0);
  if (!gamePk) {
    return { gamePk: 0, players: [], batting_stats: [], pitching_stats: [] };
  }

  const resolvedSeason = Number(season || feed?.gameData?.game?.season || ACTIVE_SEASON);
  const resolvedPhase = normalizePhase(feed?.gameData?.game?.type || phase);
  const gameStatus = String(feed?.gameData?.status?.detailedState || "Final");
  const teamsBox = feed?.liveData?.boxscore?.teams || {};

  const playersMap = new Map<number, ExtractedPlayerRecord>();
  const battingMap = new Map<string, ExtractedBattingRecord>();
  const pitchingMap = new Map<string, ExtractedPitchingRecord>();

  for (const side of ["home", "away"] as const) {
    const teamBox = teamsBox[side] || {};
    const teamId = Number(teamBox?.team?.id ?? feed?.gameData?.teams?.[side]?.id ?? 0);
    const playersObj = teamBox?.players || {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const pInfo of Object.values(playersObj) as any[]) {
      const playerId = Number(pInfo?.person?.id ?? 0);
      if (!playerId) continue;

      const fullName = String(pInfo?.person?.fullName || "Desconocido");
      const position = pInfo?.position?.abbreviation
        ? String(pInfo.position.abbreviation)
        : undefined;
      const jerseyNumber =
        pInfo?.jerseyNumber != null && String(pInfo.jerseyNumber).trim() !== ""
          ? String(pInfo.jerseyNumber)
          : null;

      playersMap.set(playerId, {
        id: playerId,
        full_name: fullName,
        team_id: teamId,
        position,
        jersey_number: jerseyNumber,
      });

      const bat = pInfo?.stats?.batting;
      if (bat && typeof bat === "object") {
        const batRecord: ExtractedBattingRecord = {
          game_id: gamePk,
          player_id: playerId,
          team_id: teamId,
          ab: Number(bat.atBats ?? 0),
          r: Number(bat.runs ?? 0),
          h: Number(bat.hits ?? 0),
          doubles: Number(bat.doubles ?? 0),
          triples: Number(bat.triples ?? 0),
          hr: Number(bat.homeRuns ?? 0),
          rbi: Number(bat.rbi ?? 0),
          bb: Number(bat.baseOnBalls ?? 0),
          so: Number(bat.strikeOuts ?? 0),
          sb: Number(bat.stolenBases ?? 0),
          cs: Number(bat.caughtStealing ?? 0),
          hbp: Number(bat.hitByPitch ?? 0),
          sf: Number(bat.sacFlies ?? 0),
          sh: Number(bat.sacBunts ?? 0),
          players: { full_name: fullName },
          games: { season: resolvedSeason, game_type: resolvedPhase, status: gameStatus },
        };

        if (hasBatterAppearance(batRecord) || Number(bat.plateAppearances ?? 0) > 0) {
          battingMap.set(`${gamePk}-${playerId}`, batRecord);
        }
      }

      const pit = pInfo?.stats?.pitching;
      if (pit && typeof pit === "object") {
        const ipString = String(pit.inningsPitched ?? "0.0");
        const ipParts = ipString.split(".");
        const wholeIp = Number(ipParts[0] || 0);
        const outs = Number(ipParts[1] || 0);
        const ipDecimal = Number((wholeIp + outs / 3).toFixed(2));

        const pitRecord: ExtractedPitchingRecord = {
          game_id: gamePk,
          player_id: playerId,
          team_id: teamId,
          ip_string: ipString,
          ip_decimal: Number.isFinite(ipDecimal) ? ipDecimal : 0,
          h: Number(pit.hits ?? 0),
          r: Number(pit.runs ?? 0),
          er: Number(pit.earnedRuns ?? 0),
          bb: Number(pit.baseOnBalls ?? 0),
          so: Number(pit.strikeOuts ?? 0),
          hr: Number(pit.homeRuns ?? 0),
          hbp: Number(pit.hitBatsmen ?? 0),
          wp: Number(pit.wildPitches ?? 0),
          bk: Number(pit.balks ?? 0),
          players: { full_name: fullName },
          games: { season: resolvedSeason, game_type: resolvedPhase, status: gameStatus },
        };

        if (
          hasPitcherAppearance(pitRecord) ||
          Number(pit.numberOfPitches ?? 0) > 0 ||
          Number(pit.battersFaced ?? 0) > 0
        ) {
          pitchingMap.set(`${gamePk}-${playerId}`, pitRecord);
        }
      }
    }
  }

  return {
    gamePk,
    players: Array.from(playersMap.values()),
    batting_stats: Array.from(battingMap.values()),
    pitching_stats: Array.from(pitchingMap.values()),
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function runWorker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

function canPerformWriteThrough(): boolean {
  if (!supabaseAdmin) return false;
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) || supabaseAdmin !== supabase;
}

async function upsertWithBatchAndFallback(
  table: string,
  rows: Record<string, unknown>[],
  getKey: (row: Record<string, unknown>) => string,
  onConflict: string
): Promise<void> {
  if (!canPerformWriteThrough() || !supabaseAdmin || rows.length === 0) return;

  const dedupedMap = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    dedupedMap.set(getKey(row), row);
  }
  const deduped = Array.from(dedupedMap.values());

  for (let i = 0; i < deduped.length; i += UPSERT_BATCH_SIZE) {
    const chunk = deduped.slice(i, i + UPSERT_BATCH_SIZE);
    let batchFailed = false;

    try {
      const { error } = await supabaseAdmin.from(table).upsert(chunk, { onConflict });
      if (error) {
        batchFailed = true;
        console.warn(`Error upsert lote en ${table} (${chunk.length} filas):`, error.message);
      }
    } catch (err) {
      batchFailed = true;
      console.warn(`Excepción upsert lote en ${table} (${chunk.length} filas):`, err);
    }

    if (batchFailed) {
      for (const singleRow of chunk) {
        try {
          const { error: singleErr } = await supabaseAdmin
            .from(table)
            .upsert(singleRow, { onConflict });
          if (singleErr) {
            console.warn(
              `Error upsert individual en ${table} (${getKey(singleRow)}):`,
              singleErr.message
            );
          }
        } catch (singleEx) {
          console.warn(
            `Excepción upsert individual en ${table} (${getKey(singleRow)}):`,
            singleEx
          );
        }
      }
    }
  }
}

function sortGamesChronologically(games: SupabaseGameRow[]): SupabaseGameRow[] {
  return [...games].sort((a, b) => {
    const dateCmp = (a.game_date || "").localeCompare(b.game_date || "");
    if (dateCmp !== 0) return dateCmp;
    const dtCmp = (a.game_datetime || "").localeCompare(b.game_datetime || "");
    if (dtCmp !== 0) return dtCmp;
    return Number(a.id) - Number(b.id);
  });
}

function filterGamesByPhase(games: SupabaseGameRow[], phase: string): SupabaseGameRow[] {
  const targetPhase = normalizePhase(phase);
  if (targetPhase === "all") return games;
  return games.filter((g) => normalizePhase(g.phase || g.game_type) === targetPhase);
}

async function reconcileSeasonGames(season: number): Promise<SupabaseGameRow[]> {
  const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${season}`;

  const [sbResult, mlbScheduleResult] = await Promise.all([
    supabase
      ? Promise.resolve(supabase.from("games").select("*").eq("season", season)).catch((err) => {
          console.warn("Error consultando games en Supabase:", err);
          return { data: null, error: err };
        })
      : Promise.resolve({ data: null, error: null }),
    fetch(scheduleUrl, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
      headers: MLB_FETCH_HEADERS,
    })
      .then(async (res) => (res.ok ? await res.json() : null))
      .catch((err) => {
        console.warn("Error consultando MLB schedule:", err);
        return null;
      }),
  ]);

  const sbOk = Boolean(supabase) && !sbResult.error;
  const mlbOk = mlbScheduleResult !== null;

  // 1. Indexar juegos de Supabase deduplicados por id
  const sbGamesById = new Map<number, SupabaseGameRow>();
  for (const row of ((sbResult.data || []) as SupabaseGameRow[])) {
    const id = Number(row.id ?? row.game_pk ?? 0);
    if (!id) continue;
    const prev = sbGamesById.get(id);
    if (!prev || getGameStatusPriority(row.status) >= getGameStatusPriority(prev.status)) {
      sbGamesById.set(id, {
        ...row,
        id,
        game_pk: Number(row.game_pk ?? id),
        season: Number(row.season ?? season),
        phase: normalizePhase(row.phase || row.game_type),
        game_type: normalizePhase(row.game_type || row.phase),
      });
    }
  }

  // 2. Indexar juegos de MLB Stats API deduplicados por gamePk (priorizando officialDate y estado)
  const mlbGamesById = new Map<number, SupabaseGameRow>();
  for (const dateEntry of mlbScheduleResult?.dates || []) {
    const entryDate = dateEntry?.date;
    for (const g of dateEntry?.games || []) {
      const gamePk = Number(g?.gamePk ?? 0);
      if (!gamePk) continue;

      const status = String(g?.status?.detailedState || "Scheduled");
      const officialDate = String(g?.officialDate || entryDate || g?.gameDate || "").slice(0, 10);
      const normalizedPhase = normalizePhase(g?.gameType);

      const candidate: SupabaseGameRow = {
        id: gamePk,
        game_pk: gamePk,
        game_date: officialDate,
        game_datetime: g?.gameDate ? String(g.gameDate) : undefined,
        season,
        game_type: normalizedPhase,
        phase: normalizedPhase,
        status,
        home_team_id: Number(g?.teams?.home?.team?.id ?? 0),
        away_team_id: Number(g?.teams?.away?.team?.id ?? 0),
        home_score:
          g?.teams?.home?.score !== undefined && g?.teams?.home?.score !== null
            ? Number(g.teams.home.score)
            : undefined,
        away_score:
          g?.teams?.away?.score !== undefined && g?.teams?.away?.score !== null
            ? Number(g.teams.away.score)
            : undefined,
        current_inning: g?.linescore?.currentInning ?? undefined,
        inning_state: g?.linescore?.inningState ?? undefined,
        venue: g?.venue?.name ? String(g.venue.name) : undefined,
      };

      const prev = mlbGamesById.get(gamePk);
      if (!prev) {
        mlbGamesById.set(gamePk, candidate);
      } else {
        const newPrio = getGameStatusPriority(candidate.status);
        const oldPrio = getGameStatusPriority(prev.status);
        if (
          newPrio > oldPrio ||
          (newPrio === oldPrio && (candidate.game_date || "") >= (prev.game_date || ""))
        ) {
          mlbGamesById.set(gamePk, candidate);
        }
      }
    }
  }

  // 3. Reconciliar ambas fuentes por id
  const mergedById = new Map<number, SupabaseGameRow>();
  const allGameIds = new Set<number>([...sbGamesById.keys(), ...mlbGamesById.keys()]);
  const gamesToUpsert: Record<string, unknown>[] = [];
  const gamesNeedingFeed: SupabaseGameRow[] = [];
  const recentFinalizedBothCandidates: SupabaseGameRow[] = [];

  for (const gameId of allGameIds) {
    const sbRow = sbGamesById.get(gameId);
    const mlbRow = mlbGamesById.get(gameId);

    if (mlbRow && !sbRow) {
      mergedById.set(gameId, mlbRow);
      if (isFinalizedGameStatus(mlbRow.status)) {
        gamesToUpsert.push({
          id: mlbRow.id,
          season: mlbRow.season ?? season,
          game_date: mlbRow.game_date || null,
          game_datetime: mlbRow.game_datetime || null,
          game_type: mlbRow.game_type || "regular",
          status: mlbRow.status || "Final",
          home_team_id: mlbRow.home_team_id,
          away_team_id: mlbRow.away_team_id,
          home_score: mlbRow.home_score ?? null,
          away_score: mlbRow.away_score ?? null,
          venue: mlbRow.venue || null,
        });
        if (!reconciledBoxscoreCache.has(gameId)) {
          gamesNeedingFeed.push(mlbRow);
        }
      }
      continue;
    }

    if (sbRow && !mlbRow) {
      mergedById.set(gameId, sbRow);
      continue;
    }

    if (mlbRow && sbRow) {
      const mlbPrio = getGameStatusPriority(mlbRow.status);
      const sbPrio = getGameStatusPriority(sbRow.status);
      const mlbWins = mlbPrio >= sbPrio;

      const merged: SupabaseGameRow = {
        ...sbRow,
        ...(mlbWins ? mlbRow : {}),
        id: gameId,
        game_pk: gameId,
        // Priorizar siempre officialDate de MLB para game_date (Lección 4)
        game_date: mlbRow.game_date || sbRow.game_date || "",
        game_datetime: mlbRow.game_datetime || sbRow.game_datetime,
        game_type: mlbRow.game_type || sbRow.game_type || "regular",
        phase: mlbRow.phase || sbRow.phase || "regular",
        status: mlbWins ? mlbRow.status : sbRow.status,
        home_score: mlbWins ? (mlbRow.home_score ?? sbRow.home_score) : sbRow.home_score,
        away_score: mlbWins ? (mlbRow.away_score ?? sbRow.away_score) : sbRow.away_score,
        current_inning: mlbRow.current_inning ?? sbRow.current_inning,
        inning_state: mlbRow.inning_state ?? sbRow.inning_state,
        is_day_game: sbRow.is_day_game,
        venue: mlbRow.venue || sbRow.venue,
      };
      mergedById.set(gameId, merged);

      if (isFinalizedGameStatus(mlbRow.status)) {
        const sbNotFinalized = !isFinalizedGameStatus(sbRow.status);
        const dateOrScoreDrifted =
          (mlbRow.game_date && sbRow.game_date !== mlbRow.game_date) ||
          (mlbRow.home_score !== undefined && sbRow.home_score !== mlbRow.home_score) ||
          (mlbRow.away_score !== undefined && sbRow.away_score !== mlbRow.away_score);

        if (sbNotFinalized || dateOrScoreDrifted) {
          gamesToUpsert.push({
            id: merged.id,
            season: merged.season ?? season,
            game_date: merged.game_date || null,
            game_datetime: merged.game_datetime || null,
            game_type: merged.game_type || "regular",
            status: merged.status || "Final",
            home_team_id: merged.home_team_id,
            away_team_id: merged.away_team_id,
            home_score: merged.home_score ?? null,
            away_score: merged.away_score ?? null,
            venue: merged.venue || null,
          });
        }

        if (sbNotFinalized) {
          if (!reconciledBoxscoreCache.has(gameId)) {
            gamesNeedingFeed.push(merged);
          }
        } else if (!reconciledBoxscoreCache.has(gameId) && !checkedBoxscoreGameIds.has(gameId)) {
          recentFinalizedBothCandidates.push(merged);
        }
      }
    }
  }

  // 4. Detectar juegos recién finalizados en `games` pero sin boxscores en `batting_stats`
  if (supabase && recentFinalizedBothCandidates.length > 0) {
    const recentCandidates = sortGamesChronologically(recentFinalizedBothCandidates).slice(-8);
    const candidateIds = recentCandidates.map((g) => g.id);
    try {
      const { data: existingBatRows, error: batCheckErr } = await supabase
        .from("batting_stats")
        .select("game_id")
        .in("game_id", candidateIds);

      if (!batCheckErr && Array.isArray(existingBatRows)) {
        const presentGameIds = new Set(existingBatRows.map((r) => Number(r.game_id)));
        for (const candidate of recentCandidates) {
          if (presentGameIds.has(candidate.id)) {
            checkedBoxscoreGameIds.add(candidate.id);
          } else {
            gamesNeedingFeed.push(candidate);
          }
        }
      }
    } catch {
      // Si el cliente mock o red falla al verificar batting_stats, no bloquear lecturas
    }
  }

  // 5. Descargar feed/live para juegos recién finalizados y poblar caché + write-through
  let feedTargets = sortGamesChronologically(gamesNeedingFeed).reverse();
  if (!supabase && feedTargets.length > MAX_NO_DB_RECONCILE_GAMES) {
    feedTargets = feedTargets.slice(0, MAX_NO_DB_RECONCILE_GAMES);
  }

  const playersToUpsert: Record<string, unknown>[] = [];
  const battingToUpsert: Record<string, unknown>[] = [];
  const pitchingToUpsert: Record<string, unknown>[] = [];

  if (feedTargets.length > 0) {
    await mapWithConcurrency(feedTargets, FEED_FETCH_CONCURRENCY, async (game) => {
      try {
        const res = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${game.id}/feed/live`, {
          signal: AbortSignal.timeout(8000),
          headers: MLB_FETCH_HEADERS,
        });
        if (!res.ok) return;
        const feed = await res.json();
        const extracted = extractBoxscoreRowsFromFeed(
          feed,
          season,
          game.phase || game.game_type || "regular"
        );
        if (extracted.gamePk) {
          reconciledBoxscoreCache.set(extracted.gamePk, extracted);
          for (const p of extracted.players) {
            playersToUpsert.push({ ...p });
          }
          for (const b of extracted.batting_stats) {
            battingToUpsert.push({
              game_id: b.game_id,
              player_id: b.player_id,
              team_id: b.team_id,
              ab: b.ab,
              r: b.r,
              h: b.h,
              doubles: b.doubles,
              triples: b.triples,
              hr: b.hr,
              rbi: b.rbi,
              bb: b.bb,
              so: b.so,
              sb: b.sb,
              cs: b.cs,
              hbp: b.hbp,
              sf: b.sf,
              sh: b.sh,
            });
          }
          for (const p of extracted.pitching_stats) {
            pitchingToUpsert.push({
              game_id: p.game_id,
              player_id: p.player_id,
              team_id: p.team_id,
              ip_string: p.ip_string,
              ip_decimal: p.ip_decimal,
              h: p.h,
              r: p.r,
              er: p.er,
              bb: p.bb,
              so: p.so,
              hr: p.hr,
              hbp: p.hbp,
              wp: p.wp,
              bk: p.bk,
            });
          }
        }
      } catch (feedErr) {
        console.warn(`Error reconciliando feed/live para juego ${game.id}:`, feedErr);
      }
    });
  }

  // 6. Write-through en orden referencial seguro (games -> players -> batting_stats -> pitching_stats)
  if (
    canPerformWriteThrough() &&
    (gamesToUpsert.length > 0 ||
      playersToUpsert.length > 0 ||
      battingToUpsert.length > 0 ||
      pitchingToUpsert.length > 0)
  ) {
    await upsertWithBatchAndFallback("games", gamesToUpsert, (r) => String(r.id), "id");
    await upsertWithBatchAndFallback("players", playersToUpsert, (r) => String(r.id), "id");
    await upsertWithBatchAndFallback(
      "batting_stats",
      battingToUpsert,
      (r) => `${r.game_id}-${r.player_id}`,
      "game_id,player_id"
    );
    await upsertWithBatchAndFallback(
      "pitching_stats",
      pitchingToUpsert,
      (r) => `${r.game_id}-${r.player_id}`,
      "game_id,player_id"
    );
  }

  const allGames = sortGamesChronologically(Array.from(mergedById.values()));
  if (sbOk || mlbOk) {
    seasonGamesCache.set(season, {
      expiresAt: Date.now() + CANONICAL_SYNC_TTL_MS,
      games: allGames,
    });
  }

  return allGames;
}

/**
 * Retorna los juegos canónicos de la temporada reconciliando Supabase y MLB Stats API
 * (con caché TTL de 60s, deduplicación de promesas en vuelo y write-through de boxscores).
 */
export async function getCanonicalSeasonGames(
  season = ACTIVE_SEASON,
  phase = "regular"
): Promise<SupabaseGameRow[]> {
  const cached = seasonGamesCache.get(season);
  if (cached && Date.now() < cached.expiresAt) {
    return filterGamesByPhase(cached.games, phase);
  }

  let inFlight = seasonGamesInFlight.get(season);
  if (!inFlight) {
    inFlight = reconcileSeasonGames(season).finally(() => {
      seasonGamesInFlight.delete(season);
    });
    seasonGamesInFlight.set(season, inFlight);
  }

  const allGames = await inFlight;
  return filterGamesByPhase(allGames, phase);
}

/**
 * Retorna los juegos finalizados (y opcionalmente en vivo) de una temporada/fase/equipo.
 */
export async function getCanonicalPlayedGames(
  season = ACTIVE_SEASON,
  options?: { phase?: string; teamId?: number; includeLive?: boolean }
): Promise<SupabaseGameRow[]> {
  const phase = options?.phase || "regular";
  const games = await getCanonicalSeasonGames(season, phase);

  return games.filter((g) => {
    const isFinal = isFinalizedGameStatus(g.status);
    const isLive = Boolean(options?.includeLive) && isLiveGameStatus(g.status);
    if (!isFinal && !isLive) return false;

    if (options?.teamId !== undefined && options?.teamId !== null) {
      const targetId = Number(options.teamId);
      return Number(g.home_team_id) === targetId || Number(g.away_team_id) === targetId;
    }
    return true;
  });
}

/**
 * Obtiene filas de boxscore (`batting_stats` y `pitching_stats`) combinando Supabase
 * y `reconciledBoxscoreCache` para asegurar disponibilidad inmediata tras el out 27.
 */
export async function getCanonicalGameBoxscoreRows(
  season: number,
  gameIds: number[],
  teamId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ battingRows: any[]; pitchingRows: any[] }> {
  const targetGameIds = Array.from(
    new Set((gameIds || []).map(Number).filter((id) => Number.isFinite(id) && id > 0))
  );
  if (targetGameIds.length === 0) {
    return { battingRows: [], pitchingRows: [] };
  }

  await getCanonicalSeasonGames(season, "all");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dbBatRows: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dbPitRows: any[] = [];

  if (supabase) {
    try {
      let batQuery = supabase
        .from("batting_stats")
        .select("*, players(full_name)")
        .in("game_id", targetGameIds)
        .limit(5000);
      let pitQuery = supabase
        .from("pitching_stats")
        .select("*, players(full_name)")
        .in("game_id", targetGameIds)
        .limit(5000);

      if (teamId !== undefined && teamId !== null) {
        batQuery = batQuery.eq("team_id", Number(teamId));
        pitQuery = pitQuery.eq("team_id", Number(teamId));
      }

      const [batRes, pitRes] = await Promise.all([batQuery, pitQuery]);
      if (!batRes.error && Array.isArray(batRes.data)) {
        dbBatRows = batRes.data;
      }
      if (!pitRes.error && Array.isArray(pitRes.data)) {
        dbPitRows = pitRes.data;
      }
    } catch (err) {
      console.warn("Error consultando boxscores en Supabase:", err);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const battingRows: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pitchingRows: any[] = [];
  const seenBat = new Set<string>();
  const seenPit = new Set<string>();

  for (const row of dbBatRows) {
    const key = `${Number(row.game_id)}-${Number(row.player_id)}`;
    if (!seenBat.has(key)) {
      seenBat.add(key);
      battingRows.push(row);
    }
  }

  for (const row of dbPitRows) {
    const key = `${Number(row.game_id)}-${Number(row.player_id)}`;
    if (!seenPit.has(key)) {
      seenPit.add(key);
      pitchingRows.push(row);
    }
  }

  for (const gId of targetGameIds) {
    const cached = reconciledBoxscoreCache.get(gId);
    if (!cached) continue;

    for (const row of cached.batting_stats) {
      if (teamId !== undefined && teamId !== null && Number(row.team_id) !== Number(teamId)) {
        continue;
      }
      const key = `${Number(row.game_id)}-${Number(row.player_id)}`;
      if (!seenBat.has(key)) {
        seenBat.add(key);
        battingRows.push(row);
      }
    }

    for (const row of cached.pitching_stats) {
      if (teamId !== undefined && teamId !== null && Number(row.team_id) !== Number(teamId)) {
        continue;
      }
      const key = `${Number(row.game_id)}-${Number(row.player_id)}`;
      if (!seenPit.has(key)) {
        seenPit.add(key);
        pitchingRows.push(row);
      }
    }
  }

  return { battingRows, pitchingRows };
}

/**
 * Obtiene los standings calculados a partir de los partidos finalizados canónicos (Supabase + MLB).
 */
export async function getStandings(
  season = ACTIVE_SEASON,
  phase = "regular"
): Promise<TeamStanding[]> {
  const defaultStandings = () =>
    LVBP_TEAM_IDS.map((teamId) => {
      const team = getTeam(teamId);
      return {
        teamId,
        teamName: team.name,
        abbreviation: team.abbreviation,
        logoUrl: team.logoUrl,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pct: 0,
        gamesBack: 0,
        runsScored: 0,
        runsAllowed: 0,
        runDifferential: 0,
        homeRecord: "0-0",
        awayRecord: "0-0",
        streak: "-",
        last10: "0-0",
        pythagoreanPct: 0.5,
        expectedWins: 0,
        expectedLosses: 0,
        eloRating: 1500,
      };
    });

  let games: SupabaseGameRow[] = [];
  try {
    games = await getCanonicalPlayedGames(season, { phase });
  } catch (err) {
    console.error("Error obteniendo juegos canónicos para standings:", err);
    return defaultStandings();
  }

  // Filtrar solo juegos donde participen equipos LVBP
  const validGames = games.filter(
    (g: SupabaseGameRow) =>
      LVBP_TEAM_IDS.includes(Number(g.home_team_id)) ||
      LVBP_TEAM_IDS.includes(Number(g.away_team_id))
  );

  // Inicializar acumuladores por equipo
  const recordsMap: Record<
    number,
    {
      wins: number;
      losses: number;
      runsFor: number;
      runsAgainst: number;
      homeWins: number;
      homeLosses: number;
      awayWins: number;
      awayLosses: number;
      recentGames: boolean[]; // true = win, false = loss
    }
  > = {};

  LVBP_TEAM_IDS.forEach((id) => {
    recordsMap[id] = {
      wins: 0,
      losses: 0,
      runsFor: 0,
      runsAgainst: 0,
      homeWins: 0,
      homeLosses: 0,
      awayWins: 0,
      awayLosses: 0,
      recentGames: [],
    };
  });

  // Ordenar por fecha cronológica para racha, L10 y ELO
  const sortedGames = sortGamesChronologically(validGames);

  sortedGames.forEach((g: SupabaseGameRow) => {
    const homeId = Number(g.home_team_id);
    const awayId = Number(g.away_team_id);
    const homeScore = Number(g.home_score ?? 0);
    const awayScore = Number(g.away_score ?? 0);

    if (homeScore === awayScore) return; // Empates o suspendidos

    const homeWon = homeScore > awayScore;

    if (recordsMap[homeId]) {
      recordsMap[homeId].runsFor += homeScore;
      recordsMap[homeId].runsAgainst += awayScore;
      if (homeWon) {
        recordsMap[homeId].wins += 1;
        recordsMap[homeId].homeWins += 1;
        recordsMap[homeId].recentGames.push(true);
      } else {
        recordsMap[homeId].losses += 1;
        recordsMap[homeId].homeLosses += 1;
        recordsMap[homeId].recentGames.push(false);
      }
    }

    if (recordsMap[awayId]) {
      recordsMap[awayId].runsFor += awayScore;
      recordsMap[awayId].runsAgainst += homeScore;
      if (!homeWon) {
        recordsMap[awayId].wins += 1;
        recordsMap[awayId].awayWins += 1;
        recordsMap[awayId].recentGames.push(true);
      } else {
        recordsMap[awayId].losses += 1;
        recordsMap[awayId].awayLosses += 1;
        recordsMap[awayId].recentGames.push(false);
      }
    }
  });

  // Calcular Rating ELO dinámico secuencial oficial (K=24, ventaja local = +35)
  const dynamicEloMap: Record<number, number> = {};
  LVBP_TEAM_IDS.forEach((id) => {
    dynamicEloMap[id] = 1500;
  });

  sortedGames.forEach((g: SupabaseGameRow) => {
    const homeId = Number(g.home_team_id);
    const awayId = Number(g.away_team_id);
    const homeScore = Number(g.home_score ?? 0);
    const awayScore = Number(g.away_score ?? 0);
    if (homeScore === awayScore) return;

    const rHome = dynamicEloMap[homeId] ?? 1500;
    const rAway = dynamicEloMap[awayId] ?? 1500;
    const eHome = 1.0 / (1.0 + Math.pow(10, (rAway - (rHome + 35)) / 400.0));
    const eAway = 1.0 - eHome;

    const sHome = homeScore > awayScore ? 1.0 : 0.0;
    const sAway = 1.0 - sHome;

    const k = 24;
    dynamicEloMap[homeId] = rHome + k * (sHome - eHome);
    dynamicEloMap[awayId] = rAway + k * (sAway - eAway);
  });

  // Construir tabla
  const standings: TeamStanding[] = LVBP_TEAM_IDS.map((teamId) => {
    const team = getTeam(teamId);
    const rec = recordsMap[teamId];
    const gamesPlayed = rec.wins + rec.losses;
    const pct = gamesPlayed > 0 ? rec.wins / gamesPlayed : 0.0;
    const pythPct = calculatePythagorean(rec.runsFor, rec.runsAgainst);

    // Racha
    let streak = "-";
    if (rec.recentGames.length > 0) {
      const lastResult = rec.recentGames[rec.recentGames.length - 1];
      let count = 0;
      for (let i = rec.recentGames.length - 1; i >= 0; i--) {
        if (rec.recentGames[i] === lastResult) count++;
        else break;
      }
      streak = `${lastResult ? "G" : "P"}${count}`;
    }

    // L10
    const last10Games = rec.recentGames.slice(-10);
    const l10Wins = last10Games.filter(Boolean).length;
    const l10Losses = last10Games.length - l10Wins;
    const last10 = `${l10Wins}-${l10Losses}`;

    // Rating ELO dinámico secuencial oficial
    const eloRating = Math.round((dynamicEloMap[teamId] ?? 1500) * 10) / 10;

    return {
      teamId,
      teamName: team.name,
      abbreviation: team.abbreviation,
      logoUrl: team.logoUrl,
      gamesPlayed,
      wins: rec.wins,
      losses: rec.losses,
      pct,
      gamesBack: 0,
      runsScored: rec.runsFor,
      runsAllowed: rec.runsAgainst,
      runDifferential: rec.runsFor - rec.runsAgainst,
      homeRecord: `${rec.homeWins}-${rec.homeLosses}`,
      awayRecord: `${rec.awayWins}-${rec.awayLosses}`,
      streak,
      last10,
      pythagoreanPct: pythPct,
      expectedWins: Math.round(pythPct * gamesPlayed),
      expectedLosses: gamesPlayed - Math.round(pythPct * gamesPlayed),
      eloRating,
    };
  });

  // Ordenar por PCT desc, luego Run Diff desc
  standings.sort((a, b) => b.pct - a.pct || b.runDifferential - a.runDifferential);

  // Calcular Games Back (DIF)
  if (standings.length > 0) {
    const leaderWins = standings[0].wins;
    const leaderLosses = standings[0].losses;

    standings.forEach((team, index) => {
      if (index === 0) {
        team.gamesBack = "-";
      } else {
        const gb = (leaderWins - team.wins + (team.losses - leaderLosses)) / 2;
        team.gamesBack = gb % 1 === 0 ? gb.toString() : gb.toFixed(1);
      }
    });
  }

  // Fallback adicional con MLB Stats API /standings solo para temporada regular
  if (normalizePhase(phase) === "regular") {
    try {
      const mlbStandingsRes = await fetch(
        `https://statsapi.mlb.com/api/v1/standings?leagueId=135&season=${season}`,
        {
          signal: AbortSignal.timeout(3500),
          next: { revalidate: 60 },
          headers: MLB_FETCH_HEADERS,
        }
      );
      if (mlbStandingsRes.ok) {
        const mlbData = await mlbStandingsRes.json();
        const officialRecords = new Map<
          number,
          { wins: number; losses: number; streak?: string; gamesBack?: string }
        >();
        for (const rec of mlbData.records || []) {
          for (const t of rec.teamRecords || []) {
            const teamId = Number(t.team?.id);
            officialRecords.set(teamId, {
              wins: Number(t.wins ?? 0),
              losses: Number(t.losses ?? 0),
              streak: t.streak?.streakCode,
              gamesBack: t.gamesBack,
            });
          }
        }

        const totalComputedGames = standings.reduce((acc, t) => acc + t.gamesPlayed, 0);
        let totalMlbGames = 0;
        officialRecords.forEach((r) => {
          totalMlbGames += r.wins + r.losses;
        });

        if (totalMlbGames > totalComputedGames) {
          standings.forEach((team) => {
            const off = officialRecords.get(team.teamId);
            if (off && off.wins + off.losses >= team.gamesPlayed) {
              team.wins = off.wins;
              team.losses = off.losses;
              team.gamesPlayed = off.wins + off.losses;
              team.pct = team.gamesPlayed > 0 ? team.wins / team.gamesPlayed : 0.0;
              if (off.streak) team.streak = off.streak;
              if (off.gamesBack !== undefined) team.gamesBack = off.gamesBack;
            }
          });
          standings.sort((a, b) => b.pct - a.pct || b.runDifferential - a.runDifferential);
        }
      }
    } catch {
      // Si MLB Stats API falla o hay timeout, se preserva el cálculo canónico
    }
  }

  return standings;
}

/**
 * Consulta los juegos programados pendientes (Scheduled) de la temporada regular.
 */
export async function getScheduledGames(
  season = ACTIVE_SEASON
): Promise<[number, number][]> {
  try {
    const games = await getCanonicalSeasonGames(season, "regular");
    return games
      .filter(
        (g) =>
          (g.status || "").trim().toLowerCase() === "scheduled" &&
          g.home_team_id &&
          g.away_team_id
      )
      .map((g) => [Number(g.home_team_id), Number(g.away_team_id)]);
  } catch (err) {
    console.warn("Error al consultar juegos programados canónicos:", err);
    return [];
  }
}

/**
 * Obtiene los últimos encuentros disputados o finalizados.
 */
export async function getRecentGames(
  season = ACTIVE_SEASON,
  limit = 8
): Promise<GameSummary[]> {
  try {
    const playedGames = await getCanonicalPlayedGames(season, { phase: "all" });
    const sorted = [...playedGames].sort((a, b) => {
      const dateCmp = (b.game_date || "").localeCompare(a.game_date || "");
      if (dateCmp !== 0) return dateCmp;
      const dtCmp = (b.game_datetime || "").localeCompare(a.game_datetime || "");
      if (dtCmp !== 0) return dtCmp;
      return Number(b.id) - Number(a.id);
    });

    return sorted.slice(0, limit).map((g: SupabaseGameRow) => {
      const homeTeam = getTeam(Number(g.home_team_id));
      const awayTeam = getTeam(Number(g.away_team_id));
      return {
        id: Number(g.id),
        gamePk: Number(g.game_pk ?? g.id),
        gameDate: g.game_date || "",
        season: Number(g.season ?? season),
        gameType: g.game_type || "R",
        status: g.status || "Final",
        homeTeamId: homeTeam.id,
        homeTeamName: homeTeam.name,
        homeTeamAbbr: homeTeam.abbreviation,
        homeTeamLogo: homeTeam.logoUrl,
        homeScore: Number(g.home_score ?? 0),
        awayTeamId: awayTeam.id,
        awayTeamName: awayTeam.name,
        awayTeamAbbr: awayTeam.abbreviation,
        awayTeamLogo: awayTeam.logoUrl,
        awayScore: Number(g.away_score ?? 0),
        currentInning: g.current_inning,
        inningState: g.inning_state,
        isDayGame: isDayGame(g.game_datetime, g.is_day_game),
      };
    });
  } catch (err) {
    console.error("Error en consulta de juegos recientes:", err);
    return [];
  }
}

/**
 * Obtiene los KPIs de resumen de los Leones del Caracas para la temporada.
 */
export async function getSeasonKPIs(season = ACTIVE_SEASON): Promise<SeasonKPIs> {
  const [standings, caracasGames] = await Promise.all([
    getStandings(season),
    getCanonicalPlayedGames(season, { phase: "regular", teamId: 695 }),
  ]);

  const caracasStanding = standings.find((s) => s.teamId === 695);
  const pos = standings.findIndex((s) => s.teamId === 695) + 1;

  let dayWins = 0;
  let dayLosses = 0;
  let nightWins = 0;
  let nightLosses = 0;

  caracasGames.forEach((g: SupabaseGameRow) => {
    const isHome = Number(g.home_team_id) === 695;
    const caracasScore = isHome ? Number(g.home_score ?? 0) : Number(g.away_score ?? 0);
    const oppScore = isHome ? Number(g.away_score ?? 0) : Number(g.home_score ?? 0);
    if (caracasScore === oppScore) return;
    const won = caracasScore > oppScore;
    const isDay = isDayGame(g.game_datetime, g.is_day_game);

    if (isDay) {
      if (won) dayWins++;
      else dayLosses++;
    } else {
      if (won) nightWins++;
      else nightLosses++;
    }
  });

  return {
    season,
    totalGames: caracasStanding?.gamesPlayed || 0,
    caracasWins: caracasStanding?.wins || 0,
    caracasLosses: caracasStanding?.losses || 0,
    caracasPct: caracasStanding?.pct || 0.0,
    caracasStreak: caracasStanding?.streak || "-",
    caracasRunDiff: caracasStanding?.runDifferential || 0,
    caracasPosition: pos || 8,
    dayWins,
    dayLosses,
    nightWins,
    nightLosses,
  };
}

async function fetchMlbSeasonGidpMap(
  season: number,
  phase: string,
  group: "hitting" | "pitching"
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  try {
    const normalizedPhase = normalizePhase(phase);
    const mlbGameType =
      normalizedPhase && normalizedPhase !== "all"
        ? PHASE_TO_MLB_GAME_TYPE[normalizedPhase] || phase
        : "";
    const gameTypeParam = mlbGameType ? `&gameType=${mlbGameType}` : "";
    const url = `https://statsapi.mlb.com/api/v1/stats?stats=season&sportId=17&leagueId=135&group=${group}&season=${season}${gameTypeParam}&playerPool=all&limit=1000`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 },
      headers: MLB_FETCH_HEADERS,
    });
    if (res.ok) {
      const data = await res.json();
      const splits = data.stats?.[0]?.splits || [];
      for (const s of splits) {
        const pId = Number(s.player?.id);
        const gidp = Number(s.stat?.groundIntoDoublePlay ?? 0);
        if (pId) {
          map.set(pId, gidp);
        }
      }
    }
  } catch (err) {
    console.warn(`Error fetching MLB season GIDP map (${group}):`, err);
  }
  return map;
}

/**
 * Obtiene estadísticas agregadas de bateo por jugador para una temporada y fase.
 */
export async function getBattingStats(
  season = ACTIVE_SEASON,
  phase = "R",
  teamId: string | number = "all",
  limit = 250,
  minAb = 0
): Promise<BattingStats[]> {
  let dbPromise: Promise<{ data: unknown[] | null; error: unknown }> = Promise.resolve({
    data: null,
    error: null,
  });

  if (supabase) {
    let query = supabase
      .from("batting_stats")
      .select(
        "game_id, player_id, team_id, ab, r, h, doubles, triples, hr, rbi, bb, so, sb, cs, hbp, sf, sh, players!inner(full_name), games!inner(season, game_type, status)"
      )
      .eq("games.season", season)
      .limit(10000);

    if (phase && phase !== "all") {
      const normalized = normalizePhase(phase);
      const targetTypes =
        normalized === "regular"
          ? ["R", "regular"]
          : normalized === "round_robin"
          ? ["L", "round_robin"]
          : normalized === "final"
          ? ["F", "W", "final"]
          : normalized === "wildcard_playin"
          ? ["D", "wildcard_playin"]
          : [phase];
      query = query.in("games.game_type", targetTypes);
    }

    if (teamId && teamId !== "all") {
      query = query.eq("team_id", Number(teamId));
    }

    dbPromise = Promise.resolve(query).catch((err) => ({ data: null, error: err }));
  }

  const [canonicalPlayedGames, dbResult, gidpMap] = await Promise.all([
    getCanonicalPlayedGames(season, { phase }),
    dbPromise,
    fetchMlbSeasonGidpMap(season, phase, "hitting"),
  ]);

  if (dbResult.error) {
    console.error("Error al consultar batting_stats:", dbResult.error);
  }

  const dbRows = (dbResult.data || []) as RawBattingRow[];
  const mergedRows: RawBattingRow[] = [...dbRows];

  const hasTeamFilter = teamId !== undefined && teamId !== null && teamId !== "all";
  const targetTeamId = hasTeamFilter ? Number(teamId) : null;

  for (const game of canonicalPlayedGames) {
    const cached =
      reconciledBoxscoreCache.get(Number(game.id)) ||
      (game.game_pk ? reconciledBoxscoreCache.get(Number(game.game_pk)) : undefined);
    if (!cached) continue;

    for (const bRow of cached.batting_stats) {
      if (targetTeamId !== null && Number(bRow.team_id) !== targetTeamId) continue;
      mergedRows.push(bRow);
    }
  }

  if (mergedRows.length === 0) {
    return [];
  }

  // Agrupar por player_id filtrando únicamente juegos con participación real
  const seenPlayerGame = new Set<string>();
  const playerMap: Record<
    number,
    {
      playerId: number;
      playerName: string;
      teamsCount: Record<number, number>;
      gamesCount: number;
      ab: number;
      r: number;
      h: number;
      doubles: number;
      triples: number;
      hr: number;
      rbi: number;
      bb: number;
      so: number;
      sb: number;
      cs: number;
      hbp: number;
      sf: number;
      sh: number;
    }
  > = {};

  mergedRows.forEach((row: RawBattingRow) => {
    const gObj = Array.isArray(row.games) ? row.games[0] : row.games;
    if (!isPlayedGameStatus(gObj?.status)) return;
    if (!hasBatterAppearance(row)) return;

    const pId = Number(row.player_id);
    if (row.game_id != null) {
      const pgKey = `${pId}-${row.game_id}`;
      if (seenPlayerGame.has(pgKey)) return;
      seenPlayerGame.add(pgKey);
    }

    const pObj = Array.isArray(row.players) ? row.players[0] : row.players;
    const pName = pObj?.full_name || "Desconocido";
    const tId = Number(row.team_id);

    if (!playerMap[pId]) {
      playerMap[pId] = {
        playerId: pId,
        playerName: pName,
        teamsCount: {},
        gamesCount: 0,
        ab: 0,
        r: 0,
        h: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        bb: 0,
        so: 0,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
      };
    }

    const p = playerMap[pId];
    p.gamesCount += 1;
    p.teamsCount[tId] = (p.teamsCount[tId] || 0) + 1;
    p.ab += Number(row.ab || 0);
    p.r += Number(row.r || 0);
    p.h += Number(row.h || 0);
    p.doubles += Number(row.doubles || 0);
    p.triples += Number(row.triples || 0);
    p.hr += Number(row.hr || 0);
    p.rbi += Number(row.rbi || 0);
    p.bb += Number(row.bb || 0);
    p.so += Number(row.so || 0);
    p.sb += Number(row.sb || 0);
    p.cs += Number(row.cs || 0);
    p.hbp += Number(row.hbp || 0);
    p.sf += Number(row.sf || 0);
    p.sh += Number(row.sh || 0);
  });

  const results: BattingStats[] = Object.values(playerMap).map((p) => {
    // Determinar equipo primario (modal)
    let primaryTeamId = 695;
    let maxCount = -1;
    for (const [tidStr, count] of Object.entries(p.teamsCount)) {
      if (count > maxCount) {
        maxCount = count;
        primaryTeamId = Number(tidStr);
      }
    }

    const team = getTeam(primaryTeamId);
    const avg = p.ab > 0 ? Number((p.h / p.ab).toFixed(3)) : 0.0;
    const obpDen = p.ab + p.bb + p.hbp + p.sf;
    const obp = obpDen > 0 ? Number(((p.h + p.bb + p.hbp) / obpDen).toFixed(3)) : 0.0;
    const slg =
      p.ab > 0
        ? Number(((p.h + p.doubles + 2 * p.triples + 3 * p.hr) / p.ab).toFixed(3))
        : 0.0;
    const ops = Number((obp + slg).toFixed(3));
    const iso = Number((slg - avg).toFixed(3));
    const babipDen = p.ab - p.so - p.hr + p.sf;
    const babip = babipDen > 0 ? Number(((p.h - p.hr) / babipDen).toFixed(3)) : 0.0;
    const pa = p.ab + p.bb + p.hbp + p.sf + p.sh;

    return {
      playerId: p.playerId,
      playerName: p.playerName,
      playerAvatar: getPlayerHeadshotUrl(p.playerId),
      teamId: team.id,
      teamName: team.name,
      teamAbbr: team.abbreviation,
      teamLogo: team.logoUrl,
      games: p.gamesCount,
      atBats: p.ab,
      plateAppearances: pa,
      pa,
      runs: p.r,
      hits: p.h,
      doubles: p.doubles,
      triples: p.triples,
      homeRuns: p.hr,
      rbi: p.rbi,
      walks: p.bb,
      strikeouts: p.so,
      stolenBases: p.sb,
      caughtStealing: p.cs,
      gidp: gidpMap.get(p.playerId) ?? 0,
      hbp: p.hbp,
      sf: p.sf,
      sh: p.sh,
      avg,
      obp,
      slg,
      ops,
      iso,
      babip,
    };
  });

  // Filtrar clasificados por minAb y ordenar por OPS descendente
  const qualified = minAb > 0 ? results.filter((p) => p.atBats >= minAb) : results;
  qualified.sort((a, b) => b.ops - a.ops || b.hits - a.hits);
  return limit ? qualified.slice(0, limit) : qualified;
}

/**
 * Obtiene estadísticas agregadas de pitcheo por jugador para una temporada y fase.
 */
export async function getPitchingStats(
  season = ACTIVE_SEASON,
  phase = "R",
  teamId: string | number = "all",
  limit = 250,
  minIp = 0.0
): Promise<PitchingStats[]> {
  let dbPromise: Promise<{ data: unknown[] | null; error: unknown }> = Promise.resolve({
    data: null,
    error: null,
  });

  if (supabase) {
    let query = supabase
      .from("pitching_stats")
      .select(
        "game_id, player_id, team_id, ip_decimal, h, r, er, bb, hbp, so, hr, players!inner(full_name), games!inner(season, game_type, status)"
      )
      .eq("games.season", season)
      .limit(10000);

    if (phase && phase !== "all") {
      const normalized = normalizePhase(phase);
      const targetTypes =
        normalized === "regular"
          ? ["R", "regular"]
          : normalized === "round_robin"
          ? ["L", "round_robin"]
          : normalized === "final"
          ? ["F", "W", "final"]
          : normalized === "wildcard_playin"
          ? ["D", "wildcard_playin"]
          : [phase];
      query = query.in("games.game_type", targetTypes);
    }

    if (teamId && teamId !== "all") {
      query = query.eq("team_id", Number(teamId));
    }

    dbPromise = Promise.resolve(query).catch((err) => ({ data: null, error: err }));
  }

  const [canonicalPlayedGames, dbResult, gidpMap] = await Promise.all([
    getCanonicalPlayedGames(season, { phase }),
    dbPromise,
    fetchMlbSeasonGidpMap(season, phase, "pitching"),
  ]);

  if (dbResult.error) {
    console.error("Error al consultar pitching_stats:", dbResult.error);
  }

  const dbRows = (dbResult.data || []) as RawPitchingRow[];
  const mergedRows: RawPitchingRow[] = [...dbRows];

  const hasTeamFilter = teamId !== undefined && teamId !== null && teamId !== "all";
  const targetTeamId = hasTeamFilter ? Number(teamId) : null;

  for (const game of canonicalPlayedGames) {
    const cached =
      reconciledBoxscoreCache.get(Number(game.id)) ||
      (game.game_pk ? reconciledBoxscoreCache.get(Number(game.game_pk)) : undefined);
    if (!cached) continue;

    for (const pRow of cached.pitching_stats) {
      if (targetTeamId !== null && Number(pRow.team_id) !== targetTeamId) continue;
      mergedRows.push(pRow);
    }
  }

  if (mergedRows.length === 0) {
    return [];
  }

  // Agrupar por player_id filtrando únicamente juegos con participación real
  const seenPitcherGame = new Set<string>();
  const pitcherMap: Record<
    number,
    {
      playerId: number;
      playerName: string;
      teamsCount: Record<number, number>;
      appearances: number;
      inningsDecimal: number;
      hits: number;
      runs: number;
      earnedRuns: number;
      walks: number;
      strikeouts: number;
      homeRuns: number;
    }
  > = {};

  mergedRows.forEach((row: RawPitchingRow) => {
    const gObj = Array.isArray(row.games) ? row.games[0] : row.games;
    if (!isPlayedGameStatus(gObj?.status)) return;
    if (!hasPitcherAppearance(row)) return;

    const pId = Number(row.player_id);
    if (row.game_id != null) {
      const pgKey = `${pId}-${row.game_id}`;
      if (seenPitcherGame.has(pgKey)) return;
      seenPitcherGame.add(pgKey);
    }

    const pObj = Array.isArray(row.players) ? row.players[0] : row.players;
    const pName = pObj?.full_name || "Desconocido";
    const tId = Number(row.team_id);

    if (!pitcherMap[pId]) {
      pitcherMap[pId] = {
        playerId: pId,
        playerName: pName,
        teamsCount: {},
        appearances: 0,
        inningsDecimal: 0,
        hits: 0,
        runs: 0,
        earnedRuns: 0,
        walks: 0,
        strikeouts: 0,
        homeRuns: 0,
      };
    }

    const p = pitcherMap[pId];
    p.appearances += 1;
    p.teamsCount[tId] = (p.teamsCount[tId] || 0) + 1;
    p.inningsDecimal += Number(row.ip_decimal || 0);
    p.hits += Number(row.h || 0);
    p.runs += Number(row.r || 0);
    p.earnedRuns += Number(row.er || 0);
    p.walks += Number(row.bb || 0);
    p.strikeouts += Number(row.so || 0);
    p.homeRuns += Number(row.hr || 0);
  });

  const results: PitchingStats[] = Object.values(pitcherMap).map((p) => {
    let primaryTeamId = 695;
    let maxCount = -1;
    for (const [tidStr, count] of Object.entries(p.teamsCount)) {
      if (count > maxCount) {
        maxCount = count;
        primaryTeamId = Number(tidStr);
      }
    }

    const team = getTeam(primaryTeamId);
    const ip = Number(p.inningsDecimal.toFixed(1));
    const fullInnings = Math.floor(ip);
    const fraction = Math.round((ip - fullInnings) * 10) / 10;
    const displayPart = fraction >= 0.6 ? 2 : fraction >= 0.3 ? 1 : 0;
    const inningsDisplay = `${fullInnings}.${displayPart}`;

    const era = ip > 0 ? Number(((p.earnedRuns * 9) / ip).toFixed(2)) : 0.0;
    const whip = ip > 0 ? Number(((p.hits + p.walks) / ip).toFixed(2)) : 0.0;
    const kPer9 = ip > 0 ? Number(((p.strikeouts * 9) / ip).toFixed(2)) : 0.0;
    const bbPer9 = ip > 0 ? Number(((p.walks * 9) / ip).toFixed(2)) : 0.0;
    const kToBb = p.walks > 0 ? Number((p.strikeouts / p.walks).toFixed(2)) : p.strikeouts;

    return {
      playerId: p.playerId,
      playerName: p.playerName,
      playerAvatar: getPlayerHeadshotUrl(p.playerId),
      teamId: team.id,
      teamName: team.name,
      teamAbbr: team.abbreviation,
      teamLogo: team.logoUrl,
      games: p.appearances,
      gamesStarted: 0,
      inningsPitched: ip,
      inningsDisplay,
      hits: p.hits,
      runs: p.runs,
      earnedRuns: p.earnedRuns,
      walks: p.walks,
      strikeouts: p.strikeouts,
      homeRuns: p.homeRuns,
      gidp: gidpMap.get(p.playerId) ?? 0,
      era,
      whip,
      kPer9,
      bbPer9,
      kToBb,
    };
  });

  // Filtrar clasificados por minIp y ordenar por ERA ascendente
  const qualified = minIp > 0 ? results.filter((p) => p.inningsPitched >= minIp) : results;
  qualified.sort((a, b) => a.era - b.era || b.strikeouts - a.strikeouts);
  return limit ? qualified.slice(0, limit) : qualified;
}

/**
 * Obtiene los juegos disputados por franquicia y el máximo de juegos en la fase.
 */
export async function getTeamGamesMap(
  season = ACTIVE_SEASON,
  phase = "R"
): Promise<{ teamGamesMap: Record<number, number>; maxGames: number }> {
  const phaseKey =
    phase === "L" ? "round_robin" : phase === "F" ? "final" : phase === "all" ? "all" : "regular";
  const standings = await getStandings(season, phaseKey);
  const teamGamesMap: Record<number, number> = {};
  standings.forEach((s) => {
    teamGamesMap[s.teamId] = s.gamesPlayed;
  });
  const maxGames = Math.max(...standings.map((s) => s.gamesPlayed), 0);
  return { teamGamesMap, maxGames };
}
