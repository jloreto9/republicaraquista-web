import { createClient } from "@supabase/supabase-js";
import {
  LVBP_TEAM_IDS,
  getTeam,
  calculatePythagorean,
  ACTIVE_SEASON,
  getPlayerHeadshotUrl,
} from "./constants";
import { isDayGame, getVenezuelanToday } from "./utils";
import { TeamStanding, GameSummary, SeasonKPIs, BattingStats, PitchingStats, FieldingStats } from "@/types/sports";

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
    | { season?: number | null; game_type?: string | null; status?: string | null; game_date?: string | null }
    | { season?: number | null; game_type?: string | null; status?: string | null; game_date?: string | null }[]
    | null;
}

interface RawPitchingRow {
  game_id?: number | null;
  player_id: number;
  team_id: number;
  ip_string?: string | null;
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
    | { season?: number | null; game_type?: string | null; status?: string | null; game_date?: string | null }
    | { season?: number | null; game_type?: string | null; status?: string | null; game_date?: string | null }[]
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

/**
 * Determina si `game_type` o `phase` corresponde a un encuentro de exhibición ('E'/'e').
 */
export function isExhibitionGameType(rawType?: string | null): boolean {
  if (!rawType) return false;
  const trimmed = String(rawType).trim().toLowerCase();
  return trimmed === "e" || trimmed === "exhibition";
}

function toCanonicalMlbGameType(rawType?: string | null): string {
  if (isExhibitionGameType(rawType)) return "E";
  const phase = normalizePhase(rawType);
  if (phase === "all") return "R";
  return PHASE_TO_MLB_GAME_TYPE[phase] || (rawType ? String(rawType).trim().toUpperCase() : "R");
}

/**
 * Convierte innings decimales o en notación decimal/béisbol a outs enteros exactos.
 */
export function decimalInningsToOuts(val: number): number {
  if (!val || !Number.isFinite(val) || val <= 0) return 0;
  const whole = Math.floor(val + 1e-6);
  const frac = val - whole;
  let outs = 0;
  if (frac >= 0.55) outs = 2;
  else if (frac >= 0.25) outs = 1;
  else if (Math.abs(frac - 0.2) < 0.04) outs = 2;
  else if (Math.abs(frac - 0.1) < 0.04) outs = 1;
  return whole * 3 + outs;
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

export interface SupabaseQueryResult<T> {
  data: T[] | null;
  error: unknown;
  count?: number | null;
}

export interface SupabasePaginationOptions {
  pageSize?: number;
  orderColumn?: string | null;
  ascending?: boolean;
  concurrency?: number;
}

const DEFAULT_SUPABASE_PAGE_SIZE = 1000;
const DEFAULT_SUPABASE_PAGE_CONCURRENCY = 6;

/**
 * Ejecuta una consulta Supabase paginada de forma determinística (`.order()` + `.range()`),
 * usando `count: "exact"` para cargar páginas restantes en paralelo con concurrencia acotada
 * y manteniendo compatibilidad con mocks de test que no implementen `.range()` o `.order()`.
 */
export async function fetchAllSupabasePages<T = Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildQuery: () => any,
  options?: SupabasePaginationOptions
): Promise<{ data: T[] | null; error: unknown }> {
  const pageSize = Math.max(1, options?.pageSize ?? DEFAULT_SUPABASE_PAGE_SIZE);
  const orderColumn = options?.orderColumn === undefined ? "id" : options.orderColumn;
  const ascending = options?.ascending ?? true;
  const concurrency = Math.max(1, options?.concurrency ?? DEFAULT_SUPABASE_PAGE_CONCURRENCY);

  const prepareQuery = () => {
    let q = buildQuery();
    if (orderColumn && typeof q?.order === "function") {
      q = q.order(orderColumn, { ascending });
    }
    return q;
  };

  try {
    let firstQuery = prepareQuery();
    const supportsRange = typeof firstQuery?.range === "function";
    if (supportsRange) {
      firstQuery = firstQuery.range(0, pageSize - 1);
    }

    const firstRes = (await firstQuery) as SupabaseQueryResult<T>;
    if (firstRes?.error) {
      return { data: null, error: firstRes.error };
    }

    const firstRows = Array.isArray(firstRes?.data) ? firstRes.data : [];
    if (!supportsRange || firstRows.length === 0) {
      return { data: firstRows, error: null };
    }

    const totalCount =
      typeof firstRes?.count === "number" && Number.isFinite(firstRes.count)
        ? firstRes.count
        : null;

    if (totalCount !== null) {
      if (firstRows.length >= totalCount) {
        return { data: firstRows, error: null };
      }

      const step = firstRows.length;
      const ranges: Array<{ from: number; to: number }> = [];
      for (let offset = step; offset < totalCount; offset += step) {
        ranges.push({
          from: offset,
          to: offset + step - 1,
        });
      }

      const pageResults = await mapWithConcurrency(ranges, concurrency, async ({ from, to }) => {
        const pageQuery = prepareQuery().range(from, to);
        return (await pageQuery) as SupabaseQueryResult<T>;
      });

      const collected: T[] = [...firstRows];
      for (const pageRes of pageResults) {
        if (pageRes?.error) {
          return { data: null, error: pageRes.error };
        }
        if (Array.isArray(pageRes?.data)) {
          collected.push(...pageRes.data);
        }
      }
      return { data: collected, error: null };
    }

    if (firstRows.length < pageSize) {
      return { data: firstRows, error: null };
    }

    const collected: T[] = [...firstRows];
    let offset = firstRows.length;
    while (true) {
      const pageRes = (await prepareQuery().range(
        offset,
        offset + pageSize - 1
      )) as SupabaseQueryResult<T>;
      if (pageRes?.error) {
        return { data: null, error: pageRes.error };
      }
      const rows = Array.isArray(pageRes?.data) ? pageRes.data : [];
      if (rows.length === 0) break;
      collected.push(...rows);
      if (rows.length < pageSize) break;
      offset += rows.length;
    }

    return { data: collected, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
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
  if (targetPhase === "all") {
    return games.filter((g) => !isExhibitionGameType(g.phase || g.game_type));
  }
  return games.filter((g) => normalizePhase(g.phase || g.game_type) === targetPhase);
}

async function reconcileSeasonGames(season: number): Promise<SupabaseGameRow[]> {
  const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${season}`;

  const [sbResult, mlbScheduleResult] = await Promise.all([
    supabase
      ? fetchAllSupabasePages<SupabaseGameRow>(
          () => supabase!.from("games").select("*", { count: "exact" }).eq("season", season)
        ).catch((err) => {
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
          game_type: toCanonicalMlbGameType(mlbRow.phase || mlbRow.game_type),
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
            game_type: toCanonicalMlbGameType(merged.phase || merged.game_type),
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
      const GAME_ID_CHUNK_SIZE = 30;
      const gameIdChunks: number[][] = [];
      for (let i = 0; i < targetGameIds.length; i += GAME_ID_CHUNK_SIZE) {
        gameIdChunks.push(targetGameIds.slice(i, i + GAME_ID_CHUNK_SIZE));
      }

      const [batChunkRows, pitChunkRows] = await Promise.all([
        mapWithConcurrency(gameIdChunks, 4, async (chunkIds) => {
          const res = await fetchAllSupabasePages(() => {
            let q = supabase!
              .from("batting_stats")
              .select("*, players(full_name)", { count: "exact" })
              .in("game_id", chunkIds);
            if (teamId !== undefined && teamId !== null) {
              q = q.eq("team_id", Number(teamId));
            }
            return q;
          });
          if (res.error) {
            console.warn("Error consultando batting_stats en getCanonicalGameBoxscoreRows:", res.error);
            return [];
          }
          return res.data || [];
        }),
        mapWithConcurrency(gameIdChunks, 4, async (chunkIds) => {
          const res = await fetchAllSupabasePages(() => {
            let q = supabase!
              .from("pitching_stats")
              .select("*, players(full_name)", { count: "exact" })
              .in("game_id", chunkIds);
            if (teamId !== undefined && teamId !== null) {
              q = q.eq("team_id", Number(teamId));
            }
            return q;
          });
          if (res.error) {
            console.warn("Error consultando pitching_stats en getCanonicalGameBoxscoreRows:", res.error);
            return [];
          }
          return res.data || [];
        }),
      ]);

      dbBatRows = batChunkRows.flat();
      dbPitRows = pitChunkRows.flat();
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

interface MlbSeasonPitchingMeta {
  gidp: number;
  wins: number;
  losses: number;
  saves: number;
  gamesStarted: number;
  hbp: number;
}

async function fetchMlbSeasonStatsSplits(
  season: number,
  phase: string,
  group: "hitting" | "pitching" | "fielding"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
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
      return Array.isArray(data?.stats?.[0]?.splits) ? data.stats[0].splits : [];
    }
  } catch (err) {
    console.warn(`Error fetching MLB season stats (${group}):`, err);
  }
  return [];
}

async function fetchMlbSeasonGidpMap(
  season: number,
  phase: string,
  group: "hitting" | "pitching"
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  const splits = await fetchMlbSeasonStatsSplits(season, phase, group);
  for (const s of splits) {
    const pId = Number(s?.player?.id);
    const gidp = Number(s?.stat?.groundIntoDoublePlay ?? 0);
    if (pId) {
      map.set(pId, gidp);
    }
  }
  return map;
}

async function fetchMlbSeasonPitchingMetaMap(
  season: number,
  phase: string
): Promise<Map<number, MlbSeasonPitchingMeta>> {
  const map = new Map<number, MlbSeasonPitchingMeta>();
  const splits = await fetchMlbSeasonStatsSplits(season, phase, "pitching");
  for (const s of splits) {
    const pId = Number(s?.player?.id);
    if (!pId) continue;
    const st = s?.stat || {};
    map.set(pId, {
      gidp: Number(st.groundIntoDoublePlay ?? 0),
      wins: Number(st.wins ?? 0),
      losses: Number(st.losses ?? 0),
      saves: Number(st.saves ?? 0),
      gamesStarted: Number(st.gamesStarted ?? 0),
      hbp: Number(st.hitBatsmen ?? 0),
    });
  }
  return map;
}

export const INVALID_DATE_RANGE_ERROR =
  "Rango de fechas inválido. Usa formato YYYY-MM-DD y verifica que la fecha inicial sea menor o igual a la final.";

function isValidIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Extrae y valida `startDate` y `endDate` desde los parámetros de búsqueda de la API.
 */
export function parseStatsDateRange(searchParams: URLSearchParams):
  | { ok: true; startDate?: string; endDate?: string }
  | { ok: false; error: string } {
  const startDate = searchParams.get("startDate")?.trim() || undefined;
  const endDate = searchParams.get("endDate")?.trim() || undefined;

  if (!startDate && !endDate) {
    return { ok: true };
  }

  if (
    !startDate ||
    !endDate ||
    !isValidIsoDateString(startDate) ||
    !isValidIsoDateString(endDate) ||
    startDate > endDate
  ) {
    return { ok: false, error: INVALID_DATE_RANGE_ERROR };
  }

  return { ok: true, startDate, endDate };
}

/**
 * Calcula el encabezado `Cache-Control` según si `endDate` ya cerró (anterior a hoy en VET UTC-4).
 */
export function getStatsCacheControlHeader(endDate?: string): string {
  const todayVet = getVenezuelanToday().dateString;
  if (endDate && endDate < todayVet) {
    return "public, max-age=3600, s-maxage=3600, stale-while-revalidate=300";
  }
  return "public, max-age=300, s-maxage=300, stale-while-revalidate=60";
}

function getDateRangeRevalidateSeconds(endDate?: string): number {
  const todayVet = getVenezuelanToday().dateString;
  return endDate && endDate < todayVet ? 3600 : 300;
}

function parseTargetTeamId(teamId: string | number = "all"): number | null {
  if (teamId === undefined || teamId === null || teamId === "all" || teamId === "") {
    return null;
  }
  const parsed = Number(teamId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseFiniteStatNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Pesos lineales canónicos LVBP (temporada base 2025-2026),
 * alineados con `src/lib/awards-engine.ts` para cálculo de wOBA y wRC+.
 */
const LVBP_WOBA_WEIGHTS = {
  bb: 0.69,
  hbp: 0.72,
  single: 0.888,
  double: 1.271,
  triple: 1.616,
  hr: 2.101,
  scale: 1.15,
} as const;

/**
 * Enriquece un pool completo de bateadores con wOBA e índices ajustados a la liga (AVG+, OBP+, SLG+, OPS+, wOBA+, wRC+).
 * Debe ejecutarse sobre todo el pool antes de aplicar filtros de mínimos (`minAb`) o límite (`limit`).
 */
export function enrichBattingStatsWithPlus(batters: BattingStats[]): BattingStats[] {
  if (!batters || batters.length === 0) {
    return [];
  }

  let sumAb = 0;
  let sumHits = 0;
  let sumObpNum = 0;
  let sumTotalBases = 0;
  let sumWobaNum = 0;
  let sumWobaDen = 0;
  let sumRuns = 0;
  let sumPa = 0;

  const perBatter = batters.map((b) => {
    const ab = Number(b.atBats || 0);
    const hits = Number(b.hits || 0);
    const doubles = Number(b.doubles || 0);
    const triples = Number(b.triples || 0);
    const homeRuns = Number(b.homeRuns || 0);
    const walks = Number(b.walks || 0);
    const hbp = Number(b.hbp ?? 0);
    const sf = Number(b.sf ?? 0);
    const sh = Number(b.sh ?? 0);
    const runs = Number(b.runs || 0);
    const pa = Number((b.plateAppearances ?? b.pa ?? ab + walks + hbp + sf + sh) || 0);

    const singles = Math.max(0, hits - doubles - triples - homeRuns);
    const wobaDen = ab + walks + hbp + sf;
    const wobaNum =
      LVBP_WOBA_WEIGHTS.bb * walks +
      LVBP_WOBA_WEIGHTS.hbp * hbp +
      LVBP_WOBA_WEIGHTS.single * singles +
      LVBP_WOBA_WEIGHTS.double * doubles +
      LVBP_WOBA_WEIGHTS.triple * triples +
      LVBP_WOBA_WEIGHTS.hr * homeRuns;
    const wobaRaw = wobaDen > 0 ? wobaNum / wobaDen : 0;
    const woba = Number(wobaRaw.toFixed(3));
    const totalBases = singles + 2 * doubles + 3 * triples + 4 * homeRuns;

    sumAb += ab;
    sumHits += hits;
    sumObpNum += hits + walks + hbp;
    sumTotalBases += totalBases;
    sumWobaNum += wobaNum;
    sumWobaDen += wobaDen;
    sumRuns += runs;
    sumPa += pa;

    return { b, ab, wobaDen, wobaRaw, woba };
  });

  const lgAvg = sumAb > 0 ? sumHits / sumAb : 0.270;
  const lgObp = sumWobaDen > 0 ? sumObpNum / sumWobaDen : 0.340;
  const lgSlg = sumAb > 0 ? sumTotalBases / sumAb : 0.410;
  const lgWoba = sumWobaDen > 0 ? sumWobaNum / sumWobaDen : 0.330;
  const lgRunsPerPa = sumPa > 0 ? sumRuns / sumPa : 0.125;

  return perBatter.map(({ b, ab, wobaDen, wobaRaw, woba }) => {
    const avg = Number(b.avg || 0);
    const obp = Number(b.obp || 0);
    const slg = Number(b.slg || 0);

    const avgPlus = ab > 0 && lgAvg > 0 ? Math.round(100 * (avg / lgAvg)) : 0;
    const obpPlus = wobaDen > 0 && lgObp > 0 ? Math.round(100 * (obp / lgObp)) : 0;
    const slgPlus = ab > 0 && lgSlg > 0 ? Math.round(100 * (slg / lgSlg)) : 0;
    const opsPlus =
      wobaDen > 0 && ab > 0 && lgObp > 0 && lgSlg > 0
        ? Math.max(0, Math.round(100 * (obp / lgObp + slg / lgSlg - 1)))
        : 0;
    const wobaPlus = wobaDen > 0 && lgWoba > 0 ? Math.round(100 * (wobaRaw / lgWoba)) : 0;
    const wrcPlus =
      wobaDen > 0 && lgRunsPerPa > 0
        ? Math.max(
            0,
            Math.round(
              100 * (((wobaRaw - lgWoba) / LVBP_WOBA_WEIGHTS.scale + lgRunsPerPa) / lgRunsPerPa)
            )
          )
        : 0;

    return {
      ...b,
      woba,
      avgPlus,
      obpPlus,
      slgPlus,
      opsPlus,
      wobaPlus,
      wrcPlus,
    };
  });
}

/**
 * Enriquece un pool completo de lanzadores con FIP e índices ajustados a la liga (ERA+, WHIP+, FIP+).
 * Usa la escala estándar donde 100 equivale al promedio del circuito y valores mayores a 100 indican mejor rendimiento.
 * Debe ejecutarse sobre todo el pool antes de aplicar filtros de mínimos (`minIp`) o límite (`limit`).
 */
export function enrichPitchingStatsWithPlus(pitchers: PitchingStats[]): PitchingStats[] {
  if (!pitchers || pitchers.length === 0) {
    return [];
  }

  let totalIp = 0;
  let totalEr = 0;
  let totalHits = 0;
  let totalWalks = 0;
  let totalHbp = 0;
  let totalSo = 0;
  let totalHr = 0;

  for (const p of pitchers) {
    totalIp += Number(p.inningsPitched || 0);
    totalEr += Number(p.earnedRuns || 0);
    totalHits += Number(p.hits || 0);
    totalWalks += Number(p.walks || 0);
    totalHbp += Number(p.hbp ?? 0);
    totalSo += Number(p.strikeouts || 0);
    totalHr += Number(p.homeRuns || 0);
  }

  const lgEra = totalIp > 0 ? (totalEr * 9) / totalIp : 4.50;
  const lgWhip = totalIp > 0 ? (totalHits + totalWalks) / totalIp : 1.45;
  const lgFipCore =
    totalIp > 0 ? (13 * totalHr + 3 * (totalWalks + totalHbp) - 2 * totalSo) / totalIp : 0.70;
  const cFip = lgEra - lgFipCore;

  return pitchers.map((p) => {
    const ip = Number(p.inningsPitched || 0);
    if (ip <= 0) {
      return {
        ...p,
        fip: 0,
        eraPlus: 0,
        whipPlus: 0,
        fipPlus: 0,
      };
    }

    const hr = Number(p.homeRuns || 0);
    const walks = Number(p.walks || 0);
    const hbp = Number(p.hbp ?? 0);
    const strikeouts = Number(p.strikeouts || 0);
    const era = Number(p.era || 0);
    const whip = Number(p.whip || 0);

    const fipRaw = Math.max(0, (13 * hr + 3 * (walks + hbp) - 2 * strikeouts) / ip + cFip);
    const fip = Number(fipRaw.toFixed(2));
    const eraPlus = lgEra > 0 ? Math.min(500, Math.round(100 * (lgEra / Math.max(0.15, era)))) : 0;
    const whipPlus =
      lgWhip > 0 ? Math.min(500, Math.round(100 * (lgWhip / Math.max(0.10, whip)))) : 0;
    const fipPlus = lgEra > 0 ? Math.min(500, Math.round(100 * (lgEra / Math.max(0.15, fip)))) : 0;

    return {
      ...p,
      fip,
      eraPlus,
      whipPlus,
      fipPlus,
    };
  });
}

function aggregateBattingRows(
  mergedRows: RawBattingRow[],
  gidpMap: Map<number, number>,
  minAb: number,
  limit: number,
  dateFilter?: { startDate: string; endDate: string }
): BattingStats[] {
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
    if (isExhibitionGameType(gObj?.game_type)) return;
    if (!isPlayedGameStatus(gObj?.status)) return;
    if (dateFilter && gObj?.game_date) {
      const gDate = String(gObj.game_date).slice(0, 10);
      if (!gDate || gDate < dateFilter.startDate || gDate > dateFilter.endDate) return;
    }
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

  const enrichedResults = enrichBattingStatsWithPlus(results);

  // Filtrar clasificados por minAb y ordenar por OPS descendente
  const qualified = minAb > 0 ? enrichedResults.filter((p) => p.atBats >= minAb) : enrichedResults;
  qualified.sort((a, b) => b.ops - a.ops || b.hits - a.hits);
  return limit ? qualified.slice(0, limit) : qualified;
}

/**
 * Obtiene estadísticas agregadas de bateo por jugador para una temporada y fase (o rango de fechas).
 */
export async function getBattingStats(
  season = ACTIVE_SEASON,
  phase = "R",
  teamId: string | number = "all",
  limit = 250,
  minAb = 0,
  startDate?: string,
  endDate?: string
): Promise<BattingStats[]> {
  if (startDate && endDate) {
    const targetTeamId = parseTargetTeamId(teamId);
    if (targetTeamId !== null && !LVBP_TEAM_IDS.includes(targetTeamId)) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mlbSplits: any[] = [];
    let mlbOk = false;

    try {
      const url = `https://statsapi.mlb.com/api/v1/stats?stats=byDateRange&sportId=17&leagueId=135&group=hitting&season=${season}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&playerPool=all&limit=1000`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        next: { revalidate: getDateRangeRevalidateSeconds(endDate) },
        headers: MLB_FETCH_HEADERS,
      });
      if (res.ok) {
        const data = await res.json();
        mlbSplits = Array.isArray(data?.stats?.[0]?.splits) ? data.stats[0].splits : [];
        mlbOk = mlbSplits.length > 0;
      }
    } catch (err) {
      console.warn("Error fetching MLB batting stats byDateRange:", err);
    }

    if (mlbOk) {
      const playerMap = new Map<
        number,
        {
          playerId: number;
          playerName: string;
          teamsWeight: Record<number, number>;
          splitCount: number;
          games: number;
          pa: number;
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
          gidp: number;
          hbp: number;
          sf: number;
          sh: number;
          singleAvg: number | null;
          singleObp: number | null;
          singleSlg: number | null;
          singleOps: number | null;
          singleBabip: number | null;
        }
      >();

      for (const s of mlbSplits) {
        if (s?.sport?.id !== undefined && Number(s.sport.id) !== 17) continue;
        const pId = Number(s?.player?.id || 0);
        const tId = Number(s?.team?.id || 0);
        if (!pId || !LVBP_TEAM_IDS.includes(tId)) continue;
        if (targetTeamId !== null && tId !== targetTeamId) continue;

        const st = s?.stat || {};
        const games = Number(st.gamesPlayed ?? st.games ?? 0);
        const ab = Number(st.atBats ?? 0);
        const r = Number(st.runs ?? 0);
        const h = Number(st.hits ?? 0);
        const doubles = Number(st.doubles ?? 0);
        const triples = Number(st.triples ?? 0);
        const hr = Number(st.homeRuns ?? 0);
        const rbi = Number(st.rbi ?? 0);
        const bb = Number(st.baseOnBalls ?? 0);
        const so = Number(st.strikeOuts ?? 0);
        const sb = Number(st.stolenBases ?? 0);
        const cs = Number(st.caughtStealing ?? 0);
        const gidp = Number(st.groundIntoDoublePlay ?? 0);
        const hbp = Number(st.hitByPitch ?? 0);
        const sf = Number(st.sacFlies ?? 0);
        const sh = Number(st.sacBunts ?? 0);
        const pa = parseFiniteStatNumber(st.plateAppearances) ?? ab + bb + hbp + sf + sh;

        if (games === 0 && pa === 0 && r === 0 && sb === 0 && cs === 0) continue;

        const existing = playerMap.get(pId);
        if (!existing) {
          playerMap.set(pId, {
            playerId: pId,
            playerName: String(s?.player?.fullName || "Desconocido"),
            teamsWeight: { [tId]: Math.max(1, pa || games) },
            splitCount: 1,
            games,
            pa,
            ab,
            r,
            h,
            doubles,
            triples,
            hr,
            rbi,
            bb,
            so,
            sb,
            cs,
            gidp,
            hbp,
            sf,
            sh,
            singleAvg: parseFiniteStatNumber(st.avg),
            singleObp: parseFiniteStatNumber(st.obp),
            singleSlg: parseFiniteStatNumber(st.slg),
            singleOps: parseFiniteStatNumber(st.ops),
            singleBabip: parseFiniteStatNumber(st.babip),
          });
        } else {
          existing.splitCount += 1;
          existing.teamsWeight[tId] = (existing.teamsWeight[tId] || 0) + Math.max(1, pa || games);
          existing.games += games;
          existing.pa += pa;
          existing.ab += ab;
          existing.r += r;
          existing.h += h;
          existing.doubles += doubles;
          existing.triples += triples;
          existing.hr += hr;
          existing.rbi += rbi;
          existing.bb += bb;
          existing.so += so;
          existing.sb += sb;
          existing.cs += cs;
          existing.gidp += gidp;
          existing.hbp += hbp;
          existing.sf += sf;
          existing.sh += sh;
        }
      }

      const results: BattingStats[] = Array.from(playerMap.values()).map((p) => {
        let primaryTeamId = targetTeamId ?? 695;
        let maxWeight = -1;
        for (const [tidStr, weight] of Object.entries(p.teamsWeight)) {
          if (weight > maxWeight) {
            maxWeight = weight;
            primaryTeamId = Number(tidStr);
          }
        }

        const team = getTeam(primaryTeamId);
        const calcAvg = p.ab > 0 ? Number((p.h / p.ab).toFixed(3)) : 0.0;
        const obpDen = p.ab + p.bb + p.hbp + p.sf;
        const calcObp = obpDen > 0 ? Number(((p.h + p.bb + p.hbp) / obpDen).toFixed(3)) : 0.0;
        const calcSlg =
          p.ab > 0
            ? Number(((p.h + p.doubles + 2 * p.triples + 3 * p.hr) / p.ab).toFixed(3))
            : 0.0;
        const babipDen = p.ab - p.so - p.hr + p.sf;
        const calcBabip =
          babipDen > 0 ? Number(((p.h - p.hr) / babipDen).toFixed(3)) : 0.0;

        const useSingle = p.splitCount === 1;
        const avg = useSingle && p.singleAvg !== null ? Number(p.singleAvg.toFixed(3)) : calcAvg;
        const obp = useSingle && p.singleObp !== null ? Number(p.singleObp.toFixed(3)) : calcObp;
        const slg = useSingle && p.singleSlg !== null ? Number(p.singleSlg.toFixed(3)) : calcSlg;
        const ops =
          useSingle && p.singleOps !== null
            ? Number(p.singleOps.toFixed(3))
            : Number((obp + slg).toFixed(3));
        const babip =
          useSingle && p.singleBabip !== null ? Number(p.singleBabip.toFixed(3)) : calcBabip;
        const iso = Number((slg - avg).toFixed(3));

        return {
          playerId: p.playerId,
          playerName: p.playerName,
          playerAvatar: getPlayerHeadshotUrl(p.playerId),
          teamId: team.id,
          teamName: team.name,
          teamAbbr: team.abbreviation,
          teamLogo: team.logoUrl,
          games: p.games,
          atBats: p.ab,
          plateAppearances: p.pa,
          pa: p.pa,
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
          gidp: p.gidp,
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

      const enrichedResults = enrichBattingStatsWithPlus(results);

      const qualified = minAb > 0 ? enrichedResults.filter((p) => p.atBats >= minAb) : enrichedResults;
      qualified.sort((a, b) => b.ops - a.ops || b.hits - a.hits);
      return limit ? qualified.slice(0, limit) : qualified;
    }

    // Fallback a Supabase batting_stats unido con games filtrado por game_date
    const fallbackRows: RawBattingRow[] = [];
    if (supabase) {
      try {
        const dbResult = await fetchAllSupabasePages<RawBattingRow>(() => {
          let query = supabase!
            .from("batting_stats")
            .select(
              "game_id, player_id, team_id, ab, r, h, doubles, triples, hr, rbi, bb, so, sb, cs, hbp, sf, sh, players!inner(full_name), games!inner(season, game_type, status, game_date)",
              { count: "exact" }
            )
            .eq("games.season", season)
            .gte("games.game_date", startDate)
            .lte("games.game_date", endDate);

          if (targetTeamId !== null) {
            query = query.eq("team_id", targetTeamId);
          }

          return query;
        });
        if (dbResult.error) {
          console.error("Error al consultar batting_stats por rango de fechas:", dbResult.error);
        }
        if (Array.isArray(dbResult.data)) {
          fallbackRows.push(...dbResult.data);
        }
      } catch (err) {
        console.error("Error en fallback de batting_stats por rango de fechas:", err);
      }
    }

    const cachedGames = seasonGamesCache.get(season)?.games || [];
    for (const game of cachedGames) {
      const gDate = String(game.game_date || "").slice(0, 10);
      if (!gDate || gDate < startDate || gDate > endDate) continue;
      const cached =
        reconciledBoxscoreCache.get(Number(game.id)) ||
        (game.game_pk ? reconciledBoxscoreCache.get(Number(game.game_pk)) : undefined);
      if (!cached) continue;
      for (const bRow of cached.batting_stats) {
        if (targetTeamId !== null && Number(bRow.team_id) !== targetTeamId) continue;
        fallbackRows.push({
          ...bRow,
          games: {
            ...(bRow.games || { season, game_type: "regular", status: game.status || "Final" }),
            game_date: gDate,
          },
        });
      }
    }

    return aggregateBattingRows(fallbackRows, new Map(), minAb, limit, { startDate, endDate });
  }

  let dbPromise: Promise<{ data: RawBattingRow[] | null; error: unknown }> = Promise.resolve({
    data: null,
    error: null,
  });

  if (supabase) {
    dbPromise = fetchAllSupabasePages<RawBattingRow>(() => {
      let query = supabase!
        .from("batting_stats")
        .select(
          "game_id, player_id, team_id, ab, r, h, doubles, triples, hr, rbi, bb, so, sb, cs, hbp, sf, sh, players!inner(full_name), games!inner(season, game_type, status)",
          { count: "exact" }
        )
        .eq("games.season", season);

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

      return query;
    }).catch((err) => ({ data: null, error: err }));
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

  return aggregateBattingRows(mergedRows, gidpMap, minAb, limit);
}

function aggregatePitchingRows(
  mergedRows: RawPitchingRow[],
  pitchingMetaMap: Map<number, MlbSeasonPitchingMeta>,
  minIp: number,
  limit: number,
  dateFilter?: { startDate: string; endDate: string }
): PitchingStats[] {
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
      totalOuts: number;
      hits: number;
      runs: number;
      earnedRuns: number;
      walks: number;
      hbp: number;
      strikeouts: number;
      homeRuns: number;
    }
  > = {};

  mergedRows.forEach((row: RawPitchingRow) => {
    const gObj = Array.isArray(row.games) ? row.games[0] : row.games;
    if (isExhibitionGameType(gObj?.game_type)) return;
    if (!isPlayedGameStatus(gObj?.status)) return;
    if (dateFilter && gObj?.game_date) {
      const gDate = String(gObj.game_date).slice(0, 10);
      if (!gDate || gDate < dateFilter.startDate || gDate > dateFilter.endDate) return;
    }
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
        totalOuts: 0,
        hits: 0,
        runs: 0,
        earnedRuns: 0,
        walks: 0,
        hbp: 0,
        strikeouts: 0,
        homeRuns: 0,
      };
    }

    const p = pitcherMap[pId];
    p.appearances += 1;
    p.teamsCount[tId] = (p.teamsCount[tId] || 0) + 1;
    const rowOuts =
      row.ip_string !== undefined && row.ip_string !== null && String(row.ip_string).trim() !== ""
        ? Math.round(parseBaseballInningsToDecimal(row.ip_string) * 3)
        : decimalInningsToOuts(Number(row.ip_decimal || 0));
    p.totalOuts += rowOuts;
    p.hits += Number(row.h || 0);
    p.runs += Number(row.r || 0);
    p.earnedRuns += Number(row.er || 0);
    p.walks += Number(row.bb || 0);
    p.hbp += Number(row.hbp || 0);
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
    const ipExact = p.totalOuts / 3;
    const ip = Number(ipExact.toFixed(2));
    const inningsDisplay = formatDecimalToBaseballInnings(ipExact);

    const era = ipExact > 0 ? Number(((p.earnedRuns * 9) / ipExact).toFixed(2)) : 0.0;
    const whip = ipExact > 0 ? Number(((p.hits + p.walks) / ipExact).toFixed(2)) : 0.0;
    const kPer9 = ipExact > 0 ? Number(((p.strikeouts * 9) / ipExact).toFixed(2)) : 0.0;
    const bbPer9 = ipExact > 0 ? Number(((p.walks * 9) / ipExact).toFixed(2)) : 0.0;
    const kToBb = p.walks > 0 ? Number((p.strikeouts / p.walks).toFixed(2)) : p.strikeouts;
    const pitchMeta = pitchingMetaMap.get(p.playerId);

    return {
      playerId: p.playerId,
      playerName: p.playerName,
      playerAvatar: getPlayerHeadshotUrl(p.playerId),
      teamId: team.id,
      teamName: team.name,
      teamAbbr: team.abbreviation,
      teamLogo: team.logoUrl,
      games: p.appearances,
      gamesStarted: pitchMeta?.gamesStarted ?? 0,
      inningsPitched: ip,
      inningsDisplay,
      hits: p.hits,
      runs: p.runs,
      earnedRuns: p.earnedRuns,
      walks: p.walks,
      strikeouts: p.strikeouts,
      homeRuns: p.homeRuns,
      gidp: pitchMeta?.gidp ?? 0,
      hbp: p.hbp > 0 ? p.hbp : (pitchMeta?.hbp ?? 0),
      wins: pitchMeta?.wins ?? 0,
      losses: pitchMeta?.losses ?? 0,
      saves: pitchMeta?.saves ?? 0,
      era,
      whip,
      kPer9,
      bbPer9,
      kToBb,
    };
  });

  const enrichedResults = enrichPitchingStatsWithPlus(results);

  // Filtrar clasificados por minIp y ordenar por ERA ascendente
  const qualified = minIp > 0 ? enrichedResults.filter((p) => p.inningsPitched >= minIp) : enrichedResults;
  qualified.sort((a, b) => a.era - b.era || b.strikeouts - a.strikeouts);
  return limit ? qualified.slice(0, limit) : qualified;
}

/**
 * Obtiene estadísticas agregadas de pitcheo por jugador para una temporada y fase (o rango de fechas).
 */
export async function getPitchingStats(
  season = ACTIVE_SEASON,
  phase = "R",
  teamId: string | number = "all",
  limit = 250,
  minIp = 0.0,
  startDate?: string,
  endDate?: string
): Promise<PitchingStats[]> {
  if (startDate && endDate) {
    const targetTeamId = parseTargetTeamId(teamId);
    if (targetTeamId !== null && !LVBP_TEAM_IDS.includes(targetTeamId)) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mlbSplits: any[] = [];
    let mlbOk = false;

    try {
      const url = `https://statsapi.mlb.com/api/v1/stats?stats=byDateRange&sportId=17&leagueId=135&group=pitching&season=${season}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&playerPool=all&limit=1000`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        next: { revalidate: getDateRangeRevalidateSeconds(endDate) },
        headers: MLB_FETCH_HEADERS,
      });
      if (res.ok) {
        const data = await res.json();
        mlbSplits = Array.isArray(data?.stats?.[0]?.splits) ? data.stats[0].splits : [];
        mlbOk = mlbSplits.length > 0;
      }
    } catch (err) {
      console.warn("Error fetching MLB pitching stats byDateRange:", err);
    }

    if (mlbOk) {
      const pitcherMap = new Map<
        number,
        {
          playerId: number;
          playerName: string;
          teamsWeight: Record<number, number>;
          splitCount: number;
          games: number;
          gamesStarted: number;
          outs: number;
          hits: number;
          runs: number;
          earnedRuns: number;
          walks: number;
          strikeouts: number;
          homeRuns: number;
          gidp: number;
          hbp: number;
          wins: number;
          losses: number;
          saves: number;
          singleEra: number | null;
          singleWhip: number | null;
          singleK9: number | null;
          singleBb9: number | null;
          singleKToBb: number | null;
        }
      >();

      for (const s of mlbSplits) {
        if (s?.sport?.id !== undefined && Number(s.sport.id) !== 17) continue;
        const pId = Number(s?.player?.id || 0);
        const tId = Number(s?.team?.id || 0);
        if (!pId || !LVBP_TEAM_IDS.includes(tId)) continue;
        if (targetTeamId !== null && tId !== targetTeamId) continue;

        const st = s?.stat || {};
        const games = Number(st.gamesPitched ?? st.gamesPlayed ?? st.games ?? 0);
        const gamesStarted = Number(st.gamesStarted ?? 0);
        const rawIp = st.inningsPitched;
        const splitOuts =
          rawIp !== undefined && rawIp !== null && String(rawIp).trim() !== ""
            ? Math.round(parseBaseballInningsToDecimal(rawIp) * 3)
            : Number(st.outsPitched ?? st.outs ?? 0);
        const hits = Number(st.hits ?? 0);
        const runs = Number(st.runs ?? 0);
        const earnedRuns = Number(st.earnedRuns ?? 0);
        const walks = Number(st.baseOnBalls ?? 0);
        const strikeouts = Number(st.strikeOuts ?? 0);
        const homeRuns = Number(st.homeRuns ?? 0);
        const gidp = Number(st.groundIntoDoublePlay ?? 0);
        const hbp = Number(st.hitBatsmen ?? st.hitByPitch ?? 0);
        const wins = Number(st.wins ?? 0);
        const losses = Number(st.losses ?? 0);
        const saves = Number(st.saves ?? 0);

        if (
          games === 0 &&
          splitOuts === 0 &&
          hits === 0 &&
          runs === 0 &&
          earnedRuns === 0 &&
          walks === 0 &&
          strikeouts === 0 &&
          homeRuns === 0 &&
          hbp === 0
        ) {
          continue;
        }

        const existing = pitcherMap.get(pId);
        if (!existing) {
          pitcherMap.set(pId, {
            playerId: pId,
            playerName: String(s?.player?.fullName || "Desconocido"),
            teamsWeight: { [tId]: Math.max(1, splitOuts || games) },
            splitCount: 1,
            games,
            gamesStarted,
            outs: splitOuts,
            hits,
            runs,
            earnedRuns,
            walks,
            strikeouts,
            homeRuns,
            gidp,
            hbp,
            wins,
            losses,
            saves,
            singleEra: parseFiniteStatNumber(st.era),
            singleWhip: parseFiniteStatNumber(st.whip),
            singleK9: parseFiniteStatNumber(st.strikeoutsPer9Inn),
            singleBb9: parseFiniteStatNumber(st.walksPer9Inn),
            singleKToBb: parseFiniteStatNumber(st.strikeoutWalkRatio),
          });
        } else {
          existing.splitCount += 1;
          existing.teamsWeight[tId] =
            (existing.teamsWeight[tId] || 0) + Math.max(1, splitOuts || games);
          existing.games += games;
          existing.gamesStarted += gamesStarted;
          existing.outs += splitOuts;
          existing.hits += hits;
          existing.runs += runs;
          existing.earnedRuns += earnedRuns;
          existing.walks += walks;
          existing.strikeouts += strikeouts;
          existing.homeRuns += homeRuns;
          existing.gidp += gidp;
          existing.hbp += hbp;
          existing.wins += wins;
          existing.losses += losses;
          existing.saves += saves;
        }
      }

      const results: PitchingStats[] = Array.from(pitcherMap.values()).map((p) => {
        let primaryTeamId = targetTeamId ?? 695;
        let maxWeight = -1;
        for (const [tidStr, weight] of Object.entries(p.teamsWeight)) {
          if (weight > maxWeight) {
            maxWeight = weight;
            primaryTeamId = Number(tidStr);
          }
        }

        const team = getTeam(primaryTeamId);
        const ipDecimal = p.outs / 3;
        const inningsPitched = Number(ipDecimal.toFixed(2));
        const inningsDisplay = formatDecimalToBaseballInnings(ipDecimal);

        const calcEra = ipDecimal > 0 ? Number(((p.earnedRuns * 9) / ipDecimal).toFixed(2)) : 0.0;
        const calcWhip =
          ipDecimal > 0 ? Number(((p.hits + p.walks) / ipDecimal).toFixed(2)) : 0.0;
        const calcK9 =
          ipDecimal > 0 ? Number(((p.strikeouts * 9) / ipDecimal).toFixed(2)) : 0.0;
        const calcBb9 = ipDecimal > 0 ? Number(((p.walks * 9) / ipDecimal).toFixed(2)) : 0.0;
        const calcKToBb =
          p.walks > 0 ? Number((p.strikeouts / p.walks).toFixed(2)) : p.strikeouts;

        const useSingle = p.splitCount === 1;
        const era =
          useSingle && p.singleEra !== null ? Number(p.singleEra.toFixed(2)) : calcEra;
        const whip =
          useSingle && p.singleWhip !== null ? Number(p.singleWhip.toFixed(2)) : calcWhip;
        const kPer9 =
          useSingle && p.singleK9 !== null ? Number(p.singleK9.toFixed(2)) : calcK9;
        const bbPer9 =
          useSingle && p.singleBb9 !== null ? Number(p.singleBb9.toFixed(2)) : calcBb9;
        const kToBb =
          useSingle && p.singleKToBb !== null ? Number(p.singleKToBb.toFixed(2)) : calcKToBb;

        return {
          playerId: p.playerId,
          playerName: p.playerName,
          playerAvatar: getPlayerHeadshotUrl(p.playerId),
          teamId: team.id,
          teamName: team.name,
          teamAbbr: team.abbreviation,
          teamLogo: team.logoUrl,
          games: p.games,
          gamesStarted: p.gamesStarted,
          inningsPitched,
          inningsDisplay,
          hits: p.hits,
          runs: p.runs,
          earnedRuns: p.earnedRuns,
          walks: p.walks,
          strikeouts: p.strikeouts,
          homeRuns: p.homeRuns,
          gidp: p.gidp,
          hbp: p.hbp,
          wins: p.wins,
          losses: p.losses,
          saves: p.saves,
          era,
          whip,
          kPer9,
          bbPer9,
          kToBb,
        };
      });

      const enrichedResults = enrichPitchingStatsWithPlus(results);

      const qualified = minIp > 0 ? enrichedResults.filter((p) => p.inningsPitched >= minIp) : enrichedResults;
      qualified.sort((a, b) => a.era - b.era || b.strikeouts - a.strikeouts);
      return limit ? qualified.slice(0, limit) : qualified;
    }

    // Fallback a Supabase pitching_stats unido con games filtrado por game_date
    const fallbackRows: RawPitchingRow[] = [];
    if (supabase) {
      try {
        const dbResult = await fetchAllSupabasePages<RawPitchingRow>(() => {
          let query = supabase!
            .from("pitching_stats")
            .select(
              "game_id, player_id, team_id, ip_decimal, h, r, er, bb, hbp, so, hr, players!inner(full_name), games!inner(season, game_type, status, game_date)",
              { count: "exact" }
            )
            .eq("games.season", season)
            .gte("games.game_date", startDate)
            .lte("games.game_date", endDate);

          if (targetTeamId !== null) {
            query = query.eq("team_id", targetTeamId);
          }

          return query;
        });
        if (dbResult.error) {
          console.error("Error al consultar pitching_stats por rango de fechas:", dbResult.error);
        }
        if (Array.isArray(dbResult.data)) {
          fallbackRows.push(...dbResult.data);
        }
      } catch (err) {
        console.error("Error en fallback de pitching_stats por rango de fechas:", err);
      }
    }

    const cachedGames = seasonGamesCache.get(season)?.games || [];
    for (const game of cachedGames) {
      const gDate = String(game.game_date || "").slice(0, 10);
      if (!gDate || gDate < startDate || gDate > endDate) continue;
      const cached =
        reconciledBoxscoreCache.get(Number(game.id)) ||
        (game.game_pk ? reconciledBoxscoreCache.get(Number(game.game_pk)) : undefined);
      if (!cached) continue;
      for (const pRow of cached.pitching_stats) {
        if (targetTeamId !== null && Number(pRow.team_id) !== targetTeamId) continue;
        fallbackRows.push({
          ...pRow,
          games: {
            ...(pRow.games || { season, game_type: "regular", status: game.status || "Final" }),
            game_date: gDate,
          },
        });
      }
    }

    return aggregatePitchingRows(fallbackRows, new Map(), minIp, limit, { startDate, endDate });
  }

  let dbPromise: Promise<{ data: RawPitchingRow[] | null; error: unknown }> = Promise.resolve({
    data: null,
    error: null,
  });

  if (supabase) {
    dbPromise = fetchAllSupabasePages<RawPitchingRow>(() => {
      let query = supabase!
        .from("pitching_stats")
        .select(
          "game_id, player_id, team_id, ip_decimal, h, r, er, bb, hbp, so, hr, players!inner(full_name), games!inner(season, game_type, status)",
          { count: "exact" }
        )
        .eq("games.season", season);

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

      return query;
    }).catch((err) => ({ data: null, error: err }));
  }

  const [canonicalPlayedGames, dbResult, pitchingMetaMap] = await Promise.all([
    getCanonicalPlayedGames(season, { phase }),
    dbPromise,
    fetchMlbSeasonPitchingMetaMap(season, phase),
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

  return aggregatePitchingRows(mergedRows, pitchingMetaMap, minIp, limit);
}

/**
 * Obtiene los juegos disputados y porcentaje de victorias por franquicia, más el máximo de juegos en la fase o rango de fechas.
 */
export async function getTeamGamesMap(
  season = ACTIVE_SEASON,
  phase = "R",
  startDate?: string,
  endDate?: string
): Promise<{
  teamGamesMap: Record<number, number>;
  teamWinPctMap: Record<number, number>;
  maxGames: number;
}> {
  if (startDate && endDate) {
    const teamGamesMap: Record<number, number> = {};
    const teamWinPctMap: Record<number, number> = {};
    const revalidate = getDateRangeRevalidateSeconds(endDate);
    const encStart = encodeURIComponent(startDate);
    const encEnd = encodeURIComponent(endDate);

    const hittingUrl = `https://statsapi.mlb.com/api/v1/teams/stats?season=${season}&sportIds=17&leagueIds=135&group=hitting&stats=byDateRange&startDate=${encStart}&endDate=${encEnd}`;
    const pitchingUrl = `https://statsapi.mlb.com/api/v1/teams/stats?season=${season}&sportIds=17&leagueIds=135&group=pitching&stats=byDateRange&startDate=${encStart}&endDate=${encEnd}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchTeamSplits = async (url: string): Promise<any[]> => {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(5000),
          next: { revalidate },
          headers: MLB_FETCH_HEADERS,
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data?.stats?.[0]?.splits) ? data.stats[0].splits : [];
      } catch (err) {
        console.warn("Error fetching MLB teams/stats byDateRange:", err);
        return [];
      }
    };

    const [hittingSplits, pitchingSplits] = await Promise.all([
      fetchTeamSplits(hittingUrl),
      fetchTeamSplits(pitchingUrl),
    ]);

    let hasMlbTeamData = false;

    for (const s of hittingSplits) {
      const tid = Number(s?.team?.id || 0);
      if (!LVBP_TEAM_IDS.includes(tid)) continue;
      hasMlbTeamData = true;
      teamGamesMap[tid] = Number(s?.stat?.gamesPlayed ?? 0);
    }

    for (const s of pitchingSplits) {
      const tid = Number(s?.team?.id || 0);
      if (!LVBP_TEAM_IDS.includes(tid)) continue;
      hasMlbTeamData = true;
      const gp = Number(s?.stat?.gamesPlayed ?? 0);
      if (teamGamesMap[tid] === undefined || (teamGamesMap[tid] === 0 && gp > 0)) {
        teamGamesMap[tid] = gp;
      }
      const wins = Number(s?.stat?.wins ?? 0);
      const losses = Number(s?.stat?.losses ?? 0);
      const dec = wins + losses;
      teamWinPctMap[tid] = dec > 0 ? wins / dec : 0.0;
    }

    if (hasMlbTeamData) {
      for (const tid of LVBP_TEAM_IDS) {
        if (teamGamesMap[tid] === undefined) teamGamesMap[tid] = 0;
        if (teamWinPctMap[tid] === undefined) teamWinPctMap[tid] = 0.0;
      }
      const maxGames = Math.max(...Object.values(teamGamesMap), 0);
      return { teamGamesMap, teamWinPctMap, maxGames };
    }

    // Fallback a getCanonicalPlayedGames(season, { phase: "all" }) filtrado por game_date
    try {
      const playedGames = await getCanonicalPlayedGames(season, { phase: "all" });
      const winsMap: Record<number, number> = {};
      const lossesMap: Record<number, number> = {};
      for (const tid of LVBP_TEAM_IDS) {
        teamGamesMap[tid] = 0;
        teamWinPctMap[tid] = 0.0;
        winsMap[tid] = 0;
        lossesMap[tid] = 0;
      }

      for (const g of playedGames) {
        const gDate = String(g.game_date || "").slice(0, 10);
        if (!gDate || gDate < startDate || gDate > endDate) continue;

        const homeId = Number(g.home_team_id);
        const awayId = Number(g.away_team_id);
        const homeScore = Number(g.home_score ?? 0);
        const awayScore = Number(g.away_score ?? 0);
        const hasWinner = homeScore !== awayScore;

        if (LVBP_TEAM_IDS.includes(homeId)) {
          teamGamesMap[homeId] += 1;
          if (hasWinner) {
            if (homeScore > awayScore) winsMap[homeId] += 1;
            else lossesMap[homeId] += 1;
          }
        }
        if (LVBP_TEAM_IDS.includes(awayId)) {
          teamGamesMap[awayId] += 1;
          if (hasWinner) {
            if (awayScore > homeScore) winsMap[awayId] += 1;
            else lossesMap[awayId] += 1;
          }
        }
      }

      for (const tid of LVBP_TEAM_IDS) {
        const dec = winsMap[tid] + lossesMap[tid];
        teamWinPctMap[tid] = dec > 0 ? winsMap[tid] / dec : 0.0;
      }

      const maxGames = Math.max(...Object.values(teamGamesMap), 0);
      return { teamGamesMap, teamWinPctMap, maxGames };
    } catch (err) {
      console.warn("Error en fallback de getTeamGamesMap por rango de fechas:", err);
      for (const tid of LVBP_TEAM_IDS) {
        teamGamesMap[tid] = 0;
        teamWinPctMap[tid] = 0.0;
      }
      return { teamGamesMap, teamWinPctMap, maxGames: 0 };
    }
  }

  const phaseKey =
    phase === "L" ? "round_robin" : phase === "F" ? "final" : phase === "all" ? "all" : "regular";
  const standings = await getStandings(season, phaseKey);
  const teamGamesMap: Record<number, number> = {};
  const teamWinPctMap: Record<number, number> = {};
  standings.forEach((s) => {
    teamGamesMap[s.teamId] = s.gamesPlayed;
    teamWinPctMap[s.teamId] = s.pct;
  });
  const maxGames = Math.max(...standings.map((s) => s.gamesPlayed), 0);
  return { teamGamesMap, teamWinPctMap, maxGames };
}

const NON_DEFENSIVE_POSITIONS = new Set(["DH", "PH", "PR"]);

/**
 * Convierte innings en notación de béisbol ("9.2") a valor decimal exacto (9.6667).
 */
export function parseBaseballInningsToDecimal(inn?: string | number | null): number {
  if (inn === null || inn === undefined) return 0;
  const raw = String(inn).trim();
  if (!raw) return 0;
  const [wholeStr, fracStr = "0"] = raw.split(".");
  const whole = parseInt(wholeStr, 10);
  const partialOuts = parseInt(fracStr[0] || "0", 10);
  if (!Number.isFinite(whole) || whole < 0) return 0;
  const safeOuts = Number.isFinite(partialOuts) && partialOuts >= 0 ? Math.min(partialOuts, 2) : 0;
  return whole + safeOuts / 3;
}

/**
 * Convierte innings decimales a notación estándar de béisbol ("15.0", "15.1", "15.2").
 */
export function formatDecimalToBaseballInnings(ipDecimal: number): string {
  if (!Number.isFinite(ipDecimal) || ipDecimal <= 0) return "0.0";
  const totalOuts = Math.round(ipDecimal * 3);
  const whole = Math.floor(totalOuts / 3);
  const rem = totalOuts % 3;
  return `${whole}.${rem}`;
}

function aggregateFieldingSplits(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  splits: any[],
  targetTeamId: number | null,
  limit: number,
  minChances: number
): FieldingStats[] {
  if (!splits.length) return [];

  const grouped = new Map<
    string,
    {
      playerId: number;
      playerName: string;
      teamId: number;
      position: string;
      games: number;
      gamesStarted: number;
      outs: number;
      putouts: number;
      assists: number;
      errors: number;
      doublePlays: number;
      triplePlays: number;
      caughtStealing: number;
      stolenBases: number;
      passedBalls: number;
      fallbackRf9: number;
    }
  >();

  for (const s of splits) {
    const pId = Number(s?.player?.id || 0);
    const tId = Number(s?.team?.id || 0);
    if (!pId || !LVBP_TEAM_IDS.includes(tId)) continue;
    if (targetTeamId !== null && tId !== targetTeamId) continue;

    const posAbbr = String(
      s?.stat?.position?.abbreviation || s?.position?.abbreviation || "UT"
    )
      .trim()
      .toUpperCase();
    if (NON_DEFENSIVE_POSITIONS.has(posAbbr)) continue;

    const st = s?.stat || {};
    const games = Number(st.gamesPlayed ?? st.games ?? 0);
    const putouts = Number(st.putOuts ?? 0);
    const assists = Number(st.assists ?? 0);
    const errors = Number(st.errors ?? 0);
    const chances = Number(st.chances ?? putouts + assists + errors);

    if (games === 0 && chances === 0) continue;

    const key = `${pId}-${tId}-${posAbbr}`;
    const outs = Math.round(parseBaseballInningsToDecimal(st.innings) * 3);

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        playerId: pId,
        playerName: String(s?.player?.fullName || "Desconocido"),
        teamId: tId,
        position: posAbbr,
        games,
        gamesStarted: Number(st.gamesStarted ?? 0),
        outs,
        putouts,
        assists,
        errors,
        doublePlays: Number(st.doublePlays ?? 0),
        triplePlays: Number(st.triplePlays ?? 0),
        caughtStealing: Number(st.caughtStealing ?? 0),
        stolenBases: Number(st.stolenBases ?? 0),
        passedBalls: Number(st.passedBall ?? 0),
        fallbackRf9: Number(st.rangeFactorPer9Inn ?? 0),
      });
    } else {
      existing.games += games;
      existing.gamesStarted += Number(st.gamesStarted ?? 0);
      existing.outs += outs;
      existing.putouts += putouts;
      existing.assists += assists;
      existing.errors += errors;
      existing.doublePlays += Number(st.doublePlays ?? 0);
      existing.triplePlays += Number(st.triplePlays ?? 0);
      existing.caughtStealing += Number(st.caughtStealing ?? 0);
      existing.stolenBases += Number(st.stolenBases ?? 0);
      existing.passedBalls += Number(st.passedBall ?? 0);
    }
  }

  const results: FieldingStats[] = Array.from(grouped.values()).map((f) => {
    const team = getTeam(f.teamId);
    const totalChances = f.putouts + f.assists + f.errors;
    const inningsDecimal = f.outs / 3;
    const innings = formatDecimalToBaseballInnings(inningsDecimal);
    const fieldingPct =
      totalChances > 0 ? Number(((f.putouts + f.assists) / totalChances).toFixed(3)) : 0.0;
    const rangeFactorPer9 =
      inningsDecimal > 0
        ? Number((((f.putouts + f.assists) * 9) / inningsDecimal).toFixed(2))
        : Number((Number.isFinite(f.fallbackRf9) ? f.fallbackRf9 : 0).toFixed(2));
    const sbAttempts = f.caughtStealing + f.stolenBases;
    const caughtStealingPct =
      sbAttempts > 0 ? Number((f.caughtStealing / sbAttempts).toFixed(3)) : 0.0;

    return {
      playerId: f.playerId,
      playerName: f.playerName,
      playerAvatar: getPlayerHeadshotUrl(f.playerId),
      teamId: team.id,
      teamName: team.name,
      teamAbbr: team.abbreviation,
      teamLogo: team.logoUrl,
      position: f.position,
      games: f.games,
      gamesStarted: f.gamesStarted,
      innings,
      inningsDecimal: Number(inningsDecimal.toFixed(2)),
      putouts: f.putouts,
      assists: f.assists,
      errors: f.errors,
      totalChances,
      fieldingPct,
      doublePlays: f.doublePlays,
      triplePlays: f.triplePlays,
      rangeFactorPer9,
      caughtStealing: f.caughtStealing,
      stolenBases: f.stolenBases,
      caughtStealingPct,
      passedBalls: f.passedBalls,
    };
  });

  const qualified =
    minChances > 0 ? results.filter((f) => f.totalChances >= minChances) : results;
  qualified.sort(
    (a, b) =>
      b.totalChances - a.totalChances ||
      b.fieldingPct - a.fieldingPct ||
      b.games - a.games
  );
  return limit ? qualified.slice(0, limit) : qualified;
}

/**
 * Obtiene estadísticas individuales de fildeo desde MLB Stats API por temporada, fase y equipo (o rango de fechas).
 */
export async function getFieldingStats(
  season = ACTIVE_SEASON,
  phase = "R",
  teamId: string | number = "all",
  limit = 1000,
  minChances = 0,
  startDate?: string,
  endDate?: string
): Promise<FieldingStats[]> {
  const targetTeamId = parseTargetTeamId(teamId);
  if (targetTeamId !== null && !LVBP_TEAM_IDS.includes(targetTeamId)) {
    return [];
  }

  if (startDate && endDate) {
    const teamsToFetch = targetTeamId !== null ? [targetTeamId] : LVBP_TEAM_IDS;
    const revalidate = getDateRangeRevalidateSeconds(endDate);
    const encStart = encodeURIComponent(startDate);
    const encEnd = encodeURIComponent(endDate);

    const perTeamSplits = await Promise.all(
      teamsToFetch.map(async (tid) => {
        try {
          const url = `https://statsapi.mlb.com/api/v1/teams/${tid}/roster/fullSeason?season=${season}&hydrate=person(stats(type=byDateRange,group=fielding,startDate=${encStart},endDate=${encEnd},season=${season},sportId=17))`;
          const res = await fetch(url, {
            signal: AbortSignal.timeout(5000),
            next: { revalidate },
            headers: MLB_FETCH_HEADERS,
          });
          if (!res.ok) return [];
          const data = await res.json();
          const roster = Array.isArray(data?.roster) ? data.roster : [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extracted: any[] = [];
          for (const item of roster) {
            const person = item?.person;
            const pId = Number(person?.id || 0);
            if (!pId) continue;
            const fullName = String(person?.fullName || "Desconocido");
            const statBlocks = Array.isArray(person?.stats) ? person.stats : [];
            for (const block of statBlocks) {
              const blockSplits = Array.isArray(block?.splits) ? block.splits : [];
              for (const sp of blockSplits) {
                if (sp?.sport?.id !== undefined && Number(sp.sport.id) !== 17) continue;
                const stTeamId = Number(sp?.team?.id || 0);
                if (!stTeamId || !LVBP_TEAM_IDS.includes(stTeamId) || stTeamId !== tid) {
                  continue;
                }
                const posAbbr = String(
                  sp?.stat?.position?.abbreviation || sp?.position?.abbreviation || "UT"
                ).trim();
                extracted.push({
                  player: { id: pId, fullName },
                  team: { id: stTeamId },
                  position: { abbreviation: posAbbr },
                  stat: sp?.stat || {},
                });
              }
            }
          }
          return extracted;
        } catch (err) {
          console.warn(`Error fetching MLB fielding roster byDateRange (team ${tid}):`, err);
          return [];
        }
      })
    );

    return aggregateFieldingSplits(perTeamSplits.flat(), targetTeamId, limit, minChances);
  }

  const normalized = normalizePhase(phase);
  const splits =
    normalized === "all"
      ? (
          await Promise.all([
            fetchMlbSeasonStatsSplits(season, "R", "fielding"),
            fetchMlbSeasonStatsSplits(season, "L", "fielding"),
            fetchMlbSeasonStatsSplits(season, "F", "fielding"),
          ])
        ).flat()
      : await fetchMlbSeasonStatsSplits(season, phase, "fielding");

  return aggregateFieldingSplits(splits, targetTeamId, limit, minChances);
}
