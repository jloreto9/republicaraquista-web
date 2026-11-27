import { BattingStats, PitchingStats } from "@/types/sports";
import {
  PlayerCareerPostseasonEntry,
  PlayerCareerSeasonEntry,
  PlayerLvbpCareerResult,
} from "@/types/player-splits";
import { getPlayerHeadshotUrl, getTeam } from "./constants";

const LVBP_LEAGUE_ID = 135;
const MLB_FETCH_TIMEOUT_MS = 5000;
const CAREER_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

const MLB_FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RepublicaCaraquista/1.0",
};

interface CareerCacheEntry {
  data: PlayerLvbpCareerResult;
  expiresAt: number;
}

const playerCareerCache = new Map<string, CareerCacheEntry>();

export function clearPlayerCareerCache(): void {
  playerCareerCache.clear();
}

function decimalInningsToOuts(val: number): number {
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

export function parseInningsStringToOuts(ipVal?: string | number | null): number {
  if (ipVal === undefined || ipVal === null || ipVal === "") return 0;
  if (typeof ipVal === "number") return decimalInningsToOuts(ipVal);
  const parts = String(ipVal).trim().split(".");
  const whole = parseInt(parts[0], 10) || 0;
  const fracStr = parts[1] || "0";
  if (fracStr.length === 1) {
    const outs = parseInt(fracStr, 10) || 0;
    return whole * 3 + Math.min(2, Math.max(0, outs));
  }
  return decimalInningsToOuts(parseFloat(String(ipVal)) || 0);
}

export function outsToInningsDisplay(outs: number): string {
  if (!outs || outs <= 0) return "0.0";
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

interface MlbRawSplit {
  season?: string | number | null;
  stat?: Record<string, unknown> | null;
  team?: { id?: number | string | null; name?: string | null } | null;
  player?: { id?: number | string | null; fullName?: string | null } | null;
  league?: { id?: number | string | null; name?: string | null } | null;
  gameType?: string | null;
}

interface TeamMetaOverride {
  teamId: number;
  teamAbbr: string;
  teamName: string;
  teamLogo: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNonNegInt(value: unknown): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num);
}

function toFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function safeRate(numerator: number, denominator: number): number {
  if (!(denominator > 0)) return 0;
  return toFinite(numerator / denominator);
}

function resolveTeamMeta(
  rawTeam: MlbRawSplit["team"],
  override?: TeamMetaOverride
): TeamMetaOverride {
  if (override) return override;
  const teamId = toNonNegInt(rawTeam?.id);
  const known = getTeam(teamId);
  const rawName = typeof rawTeam?.name === "string" ? rawTeam.name.trim() : "";
  return {
    teamId,
    teamAbbr: known.abbreviation,
    teamName: known.id === teamId && !known.name.startsWith("Equipo ") ? known.name : rawName || known.name,
    teamLogo: teamId > 0 ? known.logoUrl : "",
  };
}

function resolvePlayerName(splits: MlbRawSplit[]): string {
  for (const s of splits) {
    const name = typeof s.player?.fullName === "string" ? s.player.fullName.trim() : "";
    if (name) return name;
  }
  return "Jugador";
}

function parseValidSeason(rawSeason: unknown): number | null {
  const text = String(rawSeason ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  const season = parseInt(text, 10);
  return Number.isInteger(season) && season > 1900 ? season : null;
}

function normalizeMlbCareerBySeason<TStats>(
  rawSplits: unknown[],
  getGames: (stat: Record<string, unknown>) => number,
  buildSingle: (split: MlbRawSplit, override?: TeamMetaOverride) => TStats,
  buildCombinedFromSplits: (splits: MlbRawSplit[], playerName: string, teamCount: number) => TStats
): PlayerCareerSeasonEntry<TStats>[] {
  if (!Array.isArray(rawSplits) || rawSplits.length === 0) return [];

  const bySeason = new Map<
    number,
    { combined: MlbRawSplit | null; teamsById: Map<number, MlbRawSplit> }
  >();

  for (const item of rawSplits) {
    if (!isRecord(item)) continue;
    const split = item as MlbRawSplit;
    if (Number(split.league?.id) !== LVBP_LEAGUE_ID) continue;

    const season = parseValidSeason(split.season);
    if (season === null) continue;

    if (!isRecord(split.stat)) continue;
    const games = getGames(split.stat);
    if (!(games > 0)) continue;

    let bucket = bySeason.get(season);
    if (!bucket) {
      bucket = { combined: null, teamsById: new Map<number, MlbRawSplit>() };
      bySeason.set(season, bucket);
    }

    const teamId = toNonNegInt(split.team?.id);
    if (teamId > 0) {
      if (!bucket.teamsById.has(teamId)) {
        bucket.teamsById.set(teamId, split);
      }
    } else if (!bucket.combined) {
      bucket.combined = split;
    }
  }

  const orderedSeasons = Array.from(bySeason.entries()).sort((a, b) => b[0] - a[0]);
  const entries: PlayerCareerSeasonEntry<TStats>[] = [];

  for (const [season, bucket] of orderedSeasons) {
    const teamRows = Array.from(bucket.teamsById.values());
    const playerName = resolvePlayerName(
      bucket.combined ? [bucket.combined, ...teamRows] : teamRows
    );

    if (teamRows.length === 1) {
      entries.push({
        season,
        stats: buildSingle(teamRows[0]),
        source: "mlb_api",
        isCombined: false,
        isTeamSplit: false,
      });
      continue;
    }

    if (teamRows.length >= 2) {
      const teamCount = teamRows.length;
      const combinedOverride: TeamMetaOverride = {
        teamId: 0,
        teamAbbr: `${teamCount}EQ`,
        teamName: `${teamCount}EQ`,
        teamLogo: "",
      };
      const combinedStats = bucket.combined
        ? buildSingle(bucket.combined, combinedOverride)
        : buildCombinedFromSplits(teamRows, playerName, teamCount);

      entries.push({
        season,
        stats: combinedStats,
        source: "mlb_api",
        isCombined: true,
        isTeamSplit: false,
        teamCount,
      });

      for (const teamSplit of teamRows) {
        entries.push({
          season,
          stats: buildSingle(teamSplit),
          source: "mlb_api",
          isCombined: false,
          isTeamSplit: true,
        });
      }
      continue;
    }

    if (bucket.combined) {
      entries.push({
        season,
        stats: buildSingle(bucket.combined, {
          teamId: 0,
          teamAbbr: "LVBP",
          teamName: "LVBP",
          teamLogo: "",
        }),
        source: "mlb_api",
        isCombined: false,
        isTeamSplit: false,
      });
    }
  }

  return entries;
}

function buildBattingStatsFromTotals(params: {
  playerId: number;
  playerName: string;
  team: TeamMetaOverride;
  games: number;
  plateAppearances: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  gidp: number;
  hbp: number;
  sf: number;
  sh: number;
}): BattingStats {
  const {
    playerId,
    playerName,
    team,
    games,
    plateAppearances,
    atBats,
    runs,
    hits,
    doubles,
    triples,
    homeRuns,
    rbi,
    walks,
    strikeouts,
    stolenBases,
    caughtStealing,
    gidp,
    hbp,
    sf,
    sh,
  } = params;

  const avg = safeRate(hits, atBats);
  const obpDen = atBats + walks + hbp + sf;
  const obp =
    obpDen > 0
      ? safeRate(hits + walks + hbp, obpDen)
      : safeRate(hits + walks + hbp, plateAppearances);
  const singles = Math.max(0, hits - doubles - triples - homeRuns);
  const tb = singles + 2 * doubles + 3 * triples + 4 * homeRuns;
  const slg = safeRate(tb, atBats);
  const ops = toFinite(obp + slg);
  const iso = toFinite(Math.max(0, slg - avg));
  const babipDen = atBats - strikeouts - homeRuns + sf;
  const babip = babipDen > 0 ? Math.max(0, safeRate(hits - homeRuns, babipDen)) : 0;

  return {
    playerId,
    playerName,
    playerAvatar: getPlayerHeadshotUrl(playerId),
    teamId: team.teamId,
    teamName: team.teamName,
    teamAbbr: team.teamAbbr,
    teamLogo: team.teamLogo,
    games,
    atBats,
    plateAppearances,
    pa: plateAppearances,
    runs,
    hits,
    doubles,
    triples,
    homeRuns,
    rbi,
    walks,
    strikeouts,
    stolenBases,
    caughtStealing,
    gidp,
    hbp,
    sf,
    sh,
    avg,
    obp,
    slg,
    ops,
    iso,
    babip,
  };
}

function extractBattingCounts(stat: Record<string, unknown>) {
  const games = toNonNegInt(stat.gamesPlayed ?? stat.games);
  const atBats = toNonNegInt(stat.atBats);
  const walks = toNonNegInt(stat.baseOnBalls);
  const hbp = toNonNegInt(stat.hitByPitch);
  const sf = toNonNegInt(stat.sacFlies);
  const sh = toNonNegInt(stat.sacBunts);
  const rawPa = toNonNegInt(stat.plateAppearances);
  const plateAppearances = rawPa > 0 ? rawPa : atBats + walks + hbp + sf + sh;

  return {
    games,
    plateAppearances,
    atBats,
    runs: toNonNegInt(stat.runs),
    hits: toNonNegInt(stat.hits),
    doubles: toNonNegInt(stat.doubles),
    triples: toNonNegInt(stat.triples),
    homeRuns: toNonNegInt(stat.homeRuns),
    rbi: toNonNegInt(stat.rbi),
    walks,
    strikeouts: toNonNegInt(stat.strikeOuts),
    stolenBases: toNonNegInt(stat.stolenBases),
    caughtStealing: toNonNegInt(stat.caughtStealing),
    gidp: toNonNegInt(stat.groundIntoDoublePlay),
    hbp,
    sf,
    sh,
  };
}

export function normalizeMlbCareerBatting(
  rawSplits: unknown[],
  playerId: number
): PlayerCareerSeasonEntry<BattingStats>[] {
  return normalizeMlbCareerBySeason<BattingStats>(
    rawSplits,
    (stat) => toNonNegInt(stat.gamesPlayed ?? stat.games),
    (split, override) => {
      const stat = split.stat as Record<string, unknown>;
      const counts = extractBattingCounts(stat);
      return buildBattingStatsFromTotals({
        playerId,
        playerName: resolvePlayerName([split]),
        team: resolveTeamMeta(split.team, override),
        ...counts,
      });
    },
    (teamSplits, playerName, teamCount) => {
      const totals = {
        games: 0,
        plateAppearances: 0,
        atBats: 0,
        runs: 0,
        hits: 0,
        doubles: 0,
        triples: 0,
        homeRuns: 0,
        rbi: 0,
        walks: 0,
        strikeouts: 0,
        stolenBases: 0,
        caughtStealing: 0,
        gidp: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
      };
      for (const s of teamSplits) {
        const c = extractBattingCounts(s.stat as Record<string, unknown>);
        totals.games += c.games;
        totals.plateAppearances += c.plateAppearances;
        totals.atBats += c.atBats;
        totals.runs += c.runs;
        totals.hits += c.hits;
        totals.doubles += c.doubles;
        totals.triples += c.triples;
        totals.homeRuns += c.homeRuns;
        totals.rbi += c.rbi;
        totals.walks += c.walks;
        totals.strikeouts += c.strikeouts;
        totals.stolenBases += c.stolenBases;
        totals.caughtStealing += c.caughtStealing;
        totals.gidp += c.gidp;
        totals.hbp += c.hbp;
        totals.sf += c.sf;
        totals.sh += c.sh;
      }
      return buildBattingStatsFromTotals({
        playerId,
        playerName,
        team: {
          teamId: 0,
          teamAbbr: `${teamCount}EQ`,
          teamName: `${teamCount}EQ`,
          teamLogo: "",
        },
        ...totals,
      });
    }
  );
}

function buildPitchingStatsFromTotals(params: {
  playerId: number;
  playerName: string;
  team: TeamMetaOverride;
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
}): PitchingStats {
  const {
    playerId,
    playerName,
    team,
    games,
    gamesStarted,
    outs,
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
  } = params;

  const ip = toFinite(outs / 3);
  const era = ip > 0 ? toFinite((earnedRuns * 9) / ip) : 0;
  const whip = ip > 0 ? toFinite((walks + hits) / ip) : 0;
  const kPer9 = ip > 0 ? toFinite((strikeouts * 9) / ip) : 0;
  const bbPer9 = ip > 0 ? toFinite((walks * 9) / ip) : 0;
  const kToBb =
    walks > 0 ? toFinite(strikeouts / walks) : strikeouts > 0 ? toFinite(strikeouts) : 0;

  return {
    playerId,
    playerName,
    playerAvatar: getPlayerHeadshotUrl(playerId),
    teamId: team.teamId,
    teamName: team.teamName,
    teamAbbr: team.teamAbbr,
    teamLogo: team.teamLogo,
    games,
    gamesStarted,
    inningsPitched: ip,
    inningsDisplay: outsToInningsDisplay(outs),
    hits,
    runs,
    earnedRuns,
    walks,
    strikeouts,
    homeRuns,
    gidp,
    hbp,
    era,
    whip,
    kPer9,
    bbPer9,
    kToBb,
    saves,
    wins,
    losses,
  };
}

function extractPitchingCounts(stat: Record<string, unknown>) {
  const parsedOuts = parseInningsStringToOuts(
    stat.inningsPitched as string | number | null | undefined
  );
  const outs = parsedOuts > 0 ? parsedOuts : toNonNegInt(stat.outs);

  return {
    games: toNonNegInt(stat.gamesPlayed ?? stat.gamesPitched ?? stat.games),
    gamesStarted: toNonNegInt(stat.gamesStarted),
    outs,
    hits: toNonNegInt(stat.hits),
    runs: toNonNegInt(stat.runs),
    earnedRuns: toNonNegInt(stat.earnedRuns),
    walks: toNonNegInt(stat.baseOnBalls),
    strikeouts: toNonNegInt(stat.strikeOuts),
    homeRuns: toNonNegInt(stat.homeRuns),
    gidp: toNonNegInt(stat.groundIntoDoublePlay),
    hbp: toNonNegInt(stat.hitBatsmen ?? stat.hitByPitch),
    wins: toNonNegInt(stat.wins),
    losses: toNonNegInt(stat.losses),
    saves: toNonNegInt(stat.saves),
  };
}

export function normalizeMlbCareerPitching(
  rawSplits: unknown[],
  playerId: number
): PlayerCareerSeasonEntry<PitchingStats>[] {
  return normalizeMlbCareerBySeason<PitchingStats>(
    rawSplits,
    (stat) => toNonNegInt(stat.gamesPlayed ?? stat.gamesPitched ?? stat.games),
    (split, override) => {
      const stat = split.stat as Record<string, unknown>;
      const counts = extractPitchingCounts(stat);
      return buildPitchingStatsFromTotals({
        playerId,
        playerName: resolvePlayerName([split]),
        team: resolveTeamMeta(split.team, override),
        ...counts,
      });
    },
    (teamSplits, playerName, teamCount) => {
      const totals = {
        games: 0,
        gamesStarted: 0,
        outs: 0,
        hits: 0,
        runs: 0,
        earnedRuns: 0,
        walks: 0,
        strikeouts: 0,
        homeRuns: 0,
        gidp: 0,
        hbp: 0,
        wins: 0,
        losses: 0,
        saves: 0,
      };
      for (const s of teamSplits) {
        const c = extractPitchingCounts(s.stat as Record<string, unknown>);
        totals.games += c.games;
        totals.gamesStarted += c.gamesStarted;
        totals.outs += c.outs;
        totals.hits += c.hits;
        totals.runs += c.runs;
        totals.earnedRuns += c.earnedRuns;
        totals.walks += c.walks;
        totals.strikeouts += c.strikeouts;
        totals.homeRuns += c.homeRuns;
        totals.gidp += c.gidp;
        totals.hbp += c.hbp;
        totals.wins += c.wins;
        totals.losses += c.losses;
        totals.saves += c.saves;
      }
      return buildPitchingStatsFromTotals({
        playerId,
        playerName,
        team: {
          teamId: 0,
          teamAbbr: `${teamCount}EQ`,
          teamName: `${teamCount}EQ`,
          teamLogo: "",
        },
        ...totals,
      });
    }
  );
}

function splitRowRank(entry: { isCombined?: boolean; isTeamSplit?: boolean }): number {
  if (entry.isCombined) return 0;
  if (entry.isTeamSplit) return 1;
  return 0;
}

export function mergeRegularCareerSeasons<T>(
  supabaseSeasons: Array<{ season: number; stats: T }>,
  mlbCareerEntries: PlayerCareerSeasonEntry<T>[]
): PlayerCareerSeasonEntry<T>[] {
  const supabaseSeasonSet = new Set(supabaseSeasons.map((s) => s.season));

  const merged: PlayerCareerSeasonEntry<T>[] = supabaseSeasons.map((s) => ({
    season: s.season,
    stats: s.stats,
    source: "supabase",
    isCombined: false,
    isTeamSplit: false,
  }));

  for (const entry of mlbCareerEntries) {
    if (!supabaseSeasonSet.has(entry.season)) {
      merged.push(entry);
    }
  }

  return merged.sort(
    (a, b) => b.season - a.season || splitRowRank(a) - splitRowRank(b)
  );
}

const POSTSEASON_PHASE_ORDER: Record<"D" | "L" | "F" | "P", number> = {
  F: 0,
  L: 1,
  D: 2,
  P: 3,
};

export function mergePostseasonCareerSeasons<T>(
  supabasePostseason: Array<{
    season: number;
    phase: "D" | "L" | "F";
    phaseLabel: string;
    stats: T;
  }>,
  mlbPostseasonEntries: PlayerCareerPostseasonEntry<T>[]
): PlayerCareerPostseasonEntry<T>[] {
  const supabaseSeasonSet = new Set(supabasePostseason.map((s) => s.season));

  const merged: PlayerCareerPostseasonEntry<T>[] = supabasePostseason.map((s) => ({
    season: s.season,
    phase: s.phase,
    phaseLabel: s.phaseLabel,
    stats: s.stats,
    source: "supabase",
    isCombined: false,
    isTeamSplit: false,
  }));

  for (const entry of mlbPostseasonEntries) {
    if (!supabaseSeasonSet.has(entry.season)) {
      merged.push(entry);
    }
  }

  return merged.sort(
    (a, b) =>
      b.season - a.season ||
      POSTSEASON_PHASE_ORDER[a.phase] - POSTSEASON_PHASE_ORDER[b.phase] ||
      splitRowRank(a) - splitRowRank(b)
  );
}

export async function fetchMlbLvbpYearByYear(
  playerId: number,
  group: "hitting" | "pitching",
  gameType: "R" | "P"
): Promise<unknown[]> {
  if (!Number.isInteger(playerId) || playerId <= 0) return [];

  const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=yearByYear&group=${group}&sportId=17&leagueId=${LVBP_LEAGUE_ID}&gameType=${gameType}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(MLB_FETCH_TIMEOUT_MS),
      headers: MLB_FETCH_HEADERS,
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      stats?: Array<{ splits?: unknown[] }>;
    };
    if (!Array.isArray(payload?.stats)) return [];

    const splits = payload.stats.flatMap((groupEntry) =>
      Array.isArray(groupEntry?.splits) ? groupEntry.splits : []
    );

    return splits.filter(
      (s) => isRecord(s) && Number((s as MlbRawSplit).league?.id) === LVBP_LEAGUE_ID
    );
  } catch {
    return [];
  }
}

export async function getPlayerLvbpCareer(
  playerId: number,
  type: "batter" | "pitcher"
): Promise<PlayerLvbpCareerResult> {
  const cacheKey = `${playerId}:${type}`;
  const now = Date.now();
  const cached = playerCareerCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  if (!Number.isInteger(playerId) || playerId <= 0) {
    return {
      playerId,
      type,
      regularBatting: [],
      regularPitching: [],
      postseasonBatting: [],
      postseasonPitching: [],
      fetchedAt: new Date().toISOString(),
    };
  }

  const group = type === "pitcher" ? "pitching" : "hitting";
  const [rawRegular, rawPostseason] = await Promise.all([
    fetchMlbLvbpYearByYear(playerId, group, "R"),
    fetchMlbLvbpYearByYear(playerId, group, "P"),
  ]);

  const regularBatting =
    type === "batter" ? normalizeMlbCareerBatting(rawRegular, playerId) : [];
  const regularPitching =
    type === "pitcher" ? normalizeMlbCareerPitching(rawRegular, playerId) : [];
  const postseasonBatting: PlayerCareerPostseasonEntry<BattingStats>[] =
    type === "batter"
      ? normalizeMlbCareerBatting(rawPostseason, playerId).map((entry) => ({
          ...entry,
          phase: "P" as const,
          phaseLabel: "Postemporada",
        }))
      : [];
  const postseasonPitching: PlayerCareerPostseasonEntry<PitchingStats>[] =
    type === "pitcher"
      ? normalizeMlbCareerPitching(rawPostseason, playerId).map((entry) => ({
          ...entry,
          phase: "P" as const,
          phaseLabel: "Postemporada",
        }))
      : [];

  const result: PlayerLvbpCareerResult = {
    playerId,
    type,
    regularBatting,
    regularPitching,
    postseasonBatting,
    postseasonPitching,
    fetchedAt: new Date().toISOString(),
  };

  playerCareerCache.set(cacheKey, {
    data: result,
    expiresAt: now + CAREER_CACHE_TTL_MS,
  });

  return result;
}
