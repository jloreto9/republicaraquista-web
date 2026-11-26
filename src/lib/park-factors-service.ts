import {
  ParkFactorMetricKey,
  ParkFactorScope,
  ParkFactorsResponse,
  ParkMetricFactor,
  StadiumParkFactorRow,
  AlternateVenueNotice,
} from "@/types/park-factors";
import { ACTIVE_SEASON, LVBP_TEAM_IDS } from "./constants";
import { LVBP_STADIUMS } from "./stadiums-service";
import { FINALIZED_GAME_STATUSES, fetchAllSupabasePages, supabase } from "./supabase";

export const PARK_FACTOR_PRIOR_WEIGHT = 30;
export const VALID_PARK_FACTOR_SCOPES: readonly ParkFactorScope[] = [
  "multi",
  "2026",
  "2025",
  "2024",
];

const MLB_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RepublicaCaraquista/1.0",
};

const FINALIZED_SET = new Set(
  FINALIZED_GAME_STATUSES.map((s) => s.toLowerCase())
);
const LVBP_TEAM_SET = new Set(LVBP_TEAM_IDS);
const CACHE_TTL_ACTIVE_MS = 15 * 60 * 1000;
const CACHE_TTL_PAST_MS = 6 * 60 * 60 * 1000;

const parkFactorsCache = new Map<
  ParkFactorScope,
  { expiresAt: number; data: ParkFactorsResponse }
>();

export function clearParkFactorsCache(): void {
  parkFactorsCache.clear();
}

export interface ParkFactorGameRecord {
  gameId: number;
  season: number;
  venueId: string;
  venueDisplayName: string;
  homeTeamId: number;
  awayTeamId: number;
  metrics: Record<ParkFactorMetricKey, number>;
}

const DEFAULT_TEAM_VENUE_ID: Record<number, string> = {
  695: "monumental",
  696: "valencia",
  698: "macuto",
  693: "barquisimeto",
  699: "maracay",
  692: "maracaibo",
  694: "plc",
  697: "margarita",
};

/**
 * Normaliza cualquier nombre de estadio devuelto por MLB Stats API o Supabase
 * hacia el ID canónico de `LVBP_STADIUMS` (o identificador de plaza alterna).
 */
export function resolveCanonicalVenueId(
  venueName?: string | null,
  fallbackHomeTeamId?: number
): { venueId: string; displayName: string } {
  const raw = String(venueName || "").trim();
  const norm = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"“”]/g, "");

  if (norm.includes("monumental") || norm.includes("rinconada")) {
    return {
      venueId: "monumental",
      displayName: LVBP_STADIUMS.monumental.name,
    };
  }
  if (norm.includes("universitario") || norm.includes("ucv")) {
    return {
      venueId: "universitario",
      displayName: LVBP_STADIUMS.universitario.name,
    };
  }
  if (norm.includes("bernardo perez") || norm.includes("valencia")) {
    return { venueId: "valencia", displayName: LVBP_STADIUMS.valencia.name };
  }
  if (norm.includes("herrera") || norm.includes("barquisimeto")) {
    return {
      venueId: "barquisimeto",
      displayName: LVBP_STADIUMS.barquisimeto.name,
    };
  }
  if (norm.includes("perez colmenares") || norm.includes("maracay")) {
    return { venueId: "maracay", displayName: LVBP_STADIUMS.maracay.name };
  }
  if (norm.includes("aparicio") || norm.includes("maracaibo")) {
    return { venueId: "maracaibo", displayName: LVBP_STADIUMS.maracaibo.name };
  }
  if (
    norm.includes("carrasquel") ||
    norm.includes("chico") ||
    norm.includes("puerto la cruz")
  ) {
    return { venueId: "plc", displayName: LVBP_STADIUMS.plc.name };
  }
  if (
    norm.includes("garcia carneiro") ||
    norm.includes("forum") ||
    norm.includes("macuto") ||
    norm.includes("la guaira")
  ) {
    return { venueId: "macuto", displayName: LVBP_STADIUMS.macuto.name };
  }
  if (
    norm.includes("nueva esparta") ||
    norm.includes("guatamare") ||
    norm.includes("porlamar") ||
    norm.includes("margarita")
  ) {
    return { venueId: "margarita", displayName: LVBP_STADIUMS.margarita.name };
  }

  if (raw) {
    const slug = norm.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    return { venueId: slug || "alterno", displayName: raw };
  }

  if (fallbackHomeTeamId && DEFAULT_TEAM_VENUE_ID[fallbackHomeTeamId]) {
    const vid = DEFAULT_TEAM_VENUE_ID[fallbackHomeTeamId];
    return { venueId: vid, displayName: LVBP_STADIUMS[vid].name };
  }

  return { venueId: "desconocido", displayName: "Estadio Desconocido" };
}

/**
 * Calcula factores de parque controlados simultáneamente por fuerza de local y visitante
 * por temporada, con estabilización bayesiana hacia 1.000 (`priorWeight = 30`).
 */
export function computeIterativeParkFactors(
  games: ParkFactorGameRecord[],
  metric: ParkFactorMetricKey,
  priorWeight = PARK_FACTOR_PRIOR_WEIGHT
): Map<string, ParkMetricFactor & { games: number }> {
  const result = new Map<string, ParkMetricFactor & { games: number }>();
  if (games.length === 0) return result;

  const venueGames = new Map<string, number>();
  const venueSum = new Map<string, number>();
  const seasonSum = new Map<number, number>();
  const seasonCount = new Map<number, number>();

  for (const g of games) {
    const val = Number(g.metrics[metric] ?? 0);
    venueGames.set(g.venueId, (venueGames.get(g.venueId) ?? 0) + 1);
    venueSum.set(g.venueId, (venueSum.get(g.venueId) ?? 0) + val);
    seasonSum.set(g.season, (seasonSum.get(g.season) ?? 0) + val);
    seasonCount.set(g.season, (seasonCount.get(g.season) ?? 0) + 1);
  }

  const venues = Array.from(venueGames.keys());
  const pf = new Map<string, number>();
  for (const v of venues) pf.set(v, 1.0);

  const seasonMu = new Map<number, number>();
  for (const [s, sum] of seasonSum.entries()) {
    const count = seasonCount.get(s) ?? 1;
    seasonMu.set(s, Math.max(0.01, sum / count));
  }

  const teamFactors = new Map<string, number>();
  const getTeamKey = (season: number, teamId: number) => `${season}-${teamId}`;
  const getTeamFactor = (season: number, teamId: number) =>
    teamFactors.get(getTeamKey(season, teamId)) ?? 1.0;

  for (let iter = 0; iter < 40; iter++) {
    const tNum = new Map<string, number>();
    const tDen = new Map<string, number>();

    for (const g of games) {
      const mu = seasonMu.get(g.season) ?? 1;
      const val = Number(g.metrics[metric] ?? 0);
      const parkF = pf.get(g.venueId) ?? 1.0;
      const kh = getTeamKey(g.season, g.homeTeamId);
      const ka = getTeamKey(g.season, g.awayTeamId);
      const fh = teamFactors.get(kh) ?? 1.0;
      const fa = teamFactors.get(ka) ?? 1.0;

      tNum.set(kh, (tNum.get(kh) ?? 0) + val);
      tDen.set(kh, (tDen.get(kh) ?? 0) + mu * parkF * fa);

      tNum.set(ka, (tNum.get(ka) ?? 0) + val);
      tDen.set(ka, (tDen.get(ka) ?? 0) + mu * parkF * fh);
    }

    for (const [k, num] of tNum.entries()) {
      const den = tDen.get(k) ?? 0;
      if (den > 0) {
        teamFactors.set(k, Math.max(0.25, Math.min(4.0, num / den)));
      }
    }

    // Normalizar fuerza promedio de equipos por temporada a 1.0
    for (const s of seasonMu.keys()) {
      const prefix = `${s}-`;
      const keys = Array.from(teamFactors.keys()).filter((k) =>
        k.startsWith(prefix)
      );
      if (keys.length > 0) {
        const mean =
          keys.reduce((acc, k) => acc + (teamFactors.get(k) ?? 1.0), 0) /
          keys.length;
        if (mean > 0) {
          for (const k of keys) {
            teamFactors.set(k, (teamFactors.get(k) ?? 1.0) / mean);
          }
        }
      }
    }

    const vNum = new Map<string, number>();
    const vDen = new Map<string, number>();
    for (const g of games) {
      const mu = seasonMu.get(g.season) ?? 1;
      const val = Number(g.metrics[metric] ?? 0);
      const fh = getTeamFactor(g.season, g.homeTeamId);
      const fa = getTeamFactor(g.season, g.awayTeamId);

      vNum.set(g.venueId, (vNum.get(g.venueId) ?? 0) + val);
      vDen.set(g.venueId, (vDen.get(g.venueId) ?? 0) + mu * fh * fa);
    }

    for (const v of venues) {
      const den = vDen.get(v) ?? 0;
      if (den > 0) {
        pf.set(v, Math.max(0.2, Math.min(3.0, (vNum.get(v) ?? 0) / den)));
      }
    }

    // Normalizar promedio ponderado por juegos de la liga a 1.000
    const totalGames = games.length;
    const weightedSum = venues.reduce(
      (acc, v) => acc + (venueGames.get(v) ?? 0) * (pf.get(v) ?? 1.0),
      0
    );
    const leagueMean = totalGames > 0 ? weightedSum / totalGames : 1.0;
    if (leagueMean > 0) {
      for (const v of venues) {
        pf.set(v, (pf.get(v) ?? 1.0) / leagueMean);
      }
    }
  }

  for (const v of venues) {
    const n = venueGames.get(v) ?? 0;
    const sum = venueSum.get(v) ?? 0;
    const raw = pf.get(v) ?? 1.0;
    const stabilized =
      n + priorWeight > 0
        ? (n * raw + priorWeight * 1.0) / (n + priorWeight)
        : 1.0;

    result.set(v, {
      games: n,
      raw: Number(raw.toFixed(3)),
      stabilized: Number(stabilized.toFixed(3)),
      perGame: n > 0 ? Number((sum / n).toFixed(2)) : 0,
      total: sum,
    });
  }

  return result;
}

function isFinalStatus(status?: string | null, abstractState?: string | null): boolean {
  if (abstractState && abstractState.trim().toLowerCase() === "final") {
    return true;
  }
  return Boolean(status && FINALIZED_SET.has(status.trim().toLowerCase()));
}

async function fetchMlbRegularRunsGames(
  season: number
): Promise<ParkFactorGameRecord[]> {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${season}&gameType=R`;
  const revalidate = season < ACTIVE_SEASON ? 86400 : 300;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      next: { revalidate },
      headers: MLB_FETCH_HEADERS,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const byPk = new Map<number, ParkFactorGameRecord>();

    for (const dateEntry of data?.dates || []) {
      for (const g of dateEntry?.games || []) {
        const pk = Number(g?.gamePk ?? 0);
        if (!pk) continue;
        if (!isFinalStatus(g?.status?.detailedState, g?.status?.abstractGameState)) {
          continue;
        }
        const homeId = Number(g?.teams?.home?.team?.id ?? 0);
        const awayId = Number(g?.teams?.away?.team?.id ?? 0);
        if (!LVBP_TEAM_SET.has(homeId) || !LVBP_TEAM_SET.has(awayId)) continue;

        const homeScore = g?.teams?.home?.score;
        const awayScore = g?.teams?.away?.score;
        if (homeScore === undefined || homeScore === null || awayScore === undefined || awayScore === null) {
          continue;
        }

        const totalRuns = Number(homeScore) + Number(awayScore);
        const resolved = resolveCanonicalVenueId(g?.venue?.name, homeId);

        byPk.set(pk, {
          gameId: pk,
          season,
          venueId: resolved.venueId,
          venueDisplayName: resolved.displayName,
          homeTeamId: homeId,
          awayTeamId: awayId,
          metrics: {
            r: totalRuns,
            hr: 0,
            h: 0,
            doubles: 0,
            triples: 0,
            bb: 0,
            so: 0,
          },
        });
      }
    }

    return Array.from(byPk.values());
  } catch (err) {
    console.warn(`Error consultando schedule MLB (${season}) para park factors:`, err);
    return [];
  }
}

interface SupabaseBoxGameRow {
  id: number;
  season: number;
  game_type?: string | null;
  status?: string | null;
  venue?: string | null;
  home_team_id: number;
  away_team_id: number;
  home_score?: number | null;
  away_score?: number | null;
}

interface SupabaseBatEventRow {
  game_id: number;
  r?: number | null;
  h?: number | null;
  doubles?: number | null;
  triples?: number | null;
  hr?: number | null;
  bb?: number | null;
  so?: number | null;
}

async function fetchSupabaseBoxscoreGames(
  seasons: number[]
): Promise<ParkFactorGameRecord[]> {
  if (!supabase || seasons.length === 0) return [];

  try {
    const { data: rawGames, error: gamesErr } = await fetchAllSupabasePages<SupabaseBoxGameRow>(
      () =>
        supabase!
          .from("games")
          .select(
            "id, season, game_type, status, venue, home_team_id, away_team_id, home_score, away_score",
            { count: "exact" }
          )
          .in("season", seasons)
    );

    if (gamesErr || !Array.isArray(rawGames)) {
      if (gamesErr) {
        console.warn("Error consultando games en Supabase (park factors):", gamesErr);
      }
      return [];
    }

    const regGamesMap = new Map<number, SupabaseBoxGameRow>();
    for (const g of rawGames) {
      const gt = String(g.game_type || "").trim().toLowerCase();
      if (gt !== "r" && gt !== "regular") continue;
      if (!isFinalStatus(g.status)) continue;
      const homeId = Number(g.home_team_id);
      const awayId = Number(g.away_team_id);
      if (!LVBP_TEAM_SET.has(homeId) || !LVBP_TEAM_SET.has(awayId)) continue;
      regGamesMap.set(Number(g.id), g);
    }

    const gameIds = Array.from(regGamesMap.keys());
    if (gameIds.length === 0) return [];

    // Consultar batting_stats en lotes de 30 juegos con paginación determinística
    const CHUNK_SIZE = 30;
    const chunks: number[][] = [];
    for (let i = 0; i < gameIds.length; i += CHUNK_SIZE) {
      chunks.push(gameIds.slice(i, i + CHUNK_SIZE));
    }

    const batRowsPerChunk = await Promise.all(
      chunks.map(async (chunkIds) => {
        const { data, error } = await fetchAllSupabasePages<SupabaseBatEventRow>(
          () =>
            supabase!
              .from("batting_stats")
              .select("game_id, r, h, doubles, triples, hr, bb, so", { count: "exact" })
              .in("game_id", chunkIds)
        );
        if (error) {
          console.warn("Error consultando batting_stats para park factors:", error);
          return [];
        }
        return data || [];
      })
    );

    const totalsByGame = new Map<number, Record<ParkFactorMetricKey, number>>();
    for (const rows of batRowsPerChunk) {
      for (const b of rows) {
        const gid = Number(b.game_id);
        let acc = totalsByGame.get(gid);
        if (!acc) {
          acc = { r: 0, hr: 0, h: 0, doubles: 0, triples: 0, bb: 0, so: 0 };
          totalsByGame.set(gid, acc);
        }
        acc.r += Number(b.r || 0);
        acc.hr += Number(b.hr || 0);
        acc.h += Number(b.h || 0);
        acc.doubles += Number(b.doubles || 0);
        acc.triples += Number(b.triples || 0);
        acc.bb += Number(b.bb || 0);
        acc.so += Number(b.so || 0);
      }
    }

    const records: ParkFactorGameRecord[] = [];
    for (const [gid, g] of regGamesMap.entries()) {
      const box = totalsByGame.get(gid);
      if (!box || (box.h === 0 && box.r === 0)) continue;
      const resolved = resolveCanonicalVenueId(g.venue, Number(g.home_team_id));
      const scoreRuns =
        g.home_score !== null && g.home_score !== undefined && g.away_score !== null && g.away_score !== undefined
          ? Number(g.home_score) + Number(g.away_score)
          : box.r;

      records.push({
        gameId: gid,
        season: Number(g.season),
        venueId: resolved.venueId,
        venueDisplayName: resolved.displayName,
        homeTeamId: Number(g.home_team_id),
        awayTeamId: Number(g.away_team_id),
        metrics: {
          ...box,
          r: scoreRuns,
        },
      });
    }

    return records;
  } catch (err) {
    console.warn("Excepción consultando boxscores Supabase (park factors):", err);
    return [];
  }
}

function getScopeConfig(scope: ParkFactorScope): {
  label: string;
  runsSeasons: number[];
  boxscoreSeasons: number[];
} {
  switch (scope) {
    case "2026":
      return {
        label: "Temporada 2026-27 (En Curso)",
        runsSeasons: [2026],
        boxscoreSeasons: [2026],
      };
    case "2025":
      return {
        label: "Temporada 2025-26",
        runsSeasons: [2025],
        boxscoreSeasons: [2025],
      };
    case "2024":
      return {
        label: "Temporada 2024-25",
        runsSeasons: [2024],
        boxscoreSeasons: [],
      };
    case "multi":
    default:
      return {
        label: "Multi-Año (2024–2026)",
        runsSeasons: [2024, 2025, 2026],
        boxscoreSeasons: [2025, 2026],
      };
  }
}

export function isValidParkFactorScope(val?: string | null): val is ParkFactorScope {
  return Boolean(val && VALID_PARK_FACTOR_SCOPES.includes(val as ParkFactorScope));
}

export async function getParkFactorsData(
  scope: ParkFactorScope = "multi"
): Promise<ParkFactorsResponse> {
  const cached = parkFactorsCache.get(scope);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const config = getScopeConfig(scope);

  const [mlbSeasonArrays, boxscoreGames] = await Promise.all([
    Promise.all(config.runsSeasons.map((s) => fetchMlbRegularRunsGames(s))),
    fetchSupabaseBoxscoreGames(config.boxscoreSeasons),
  ]);

  const mlbRunsGames = mlbSeasonArrays.flat();
  const runsGames = mlbRunsGames.length > 0 ? mlbRunsGames : boxscoreGames;

  const runsPfMap = computeIterativeParkFactors(
    runsGames,
    "r",
    PARK_FACTOR_PRIOR_WEIGHT
  );

  const eventKeys: Exclude<ParkFactorMetricKey, "r">[] = [
    "hr",
    "h",
    "doubles",
    "triples",
    "bb",
    "so",
  ];
  const hasEventFactors = boxscoreGames.length > 0;
  const eventPfMaps = new Map<
    Exclude<ParkFactorMetricKey, "r">,
    Map<string, ParkMetricFactor & { games: number }>
  >();

  if (hasEventFactors) {
    for (const key of eventKeys) {
      eventPfMaps.set(
        key,
        computeIterativeParkFactors(boxscoreGames, key, PARK_FACTOR_PRIOR_WEIGHT)
      );
    }
  }

  const venueNames = new Map<string, string>();
  for (const g of runsGames) {
    if (!venueNames.has(g.venueId)) {
      venueNames.set(g.venueId, g.venueDisplayName);
    }
  }

  const stadiums: StadiumParkFactorRow[] = [];
  const alternateVenues: AlternateVenueNotice[] = [];

  for (const [venueId, runsMetric] of runsPfMap.entries()) {
    const catalogStadium = LVBP_STADIUMS[venueId];
    if (!catalogStadium && runsMetric.games < 5) {
      alternateVenues.push({
        stadiumId: venueId,
        stadiumName: venueNames.get(venueId) || venueId,
        games: runsMetric.games,
        runsPerGame: runsMetric.perGame,
      });
      continue;
    }

    const getEventMetric = (
      key: Exclude<ParkFactorMetricKey, "r">
    ): ParkMetricFactor | null => {
      const m = eventPfMaps.get(key)?.get(venueId);
      if (!m) return null;
      return {
        raw: m.raw,
        stabilized: m.stabilized,
        perGame: m.perGame,
        total: m.total,
      };
    };

    const boxCount = eventPfMaps.get("hr")?.get(venueId)?.games ?? 0;

    stadiums.push({
      stadiumId: venueId,
      stadiumName: catalogStadium?.name || venueNames.get(venueId) || venueId,
      shortName: catalogStadium?.shortName || venueNames.get(venueId) || venueId,
      city: catalogStadium?.city || "Venezuela",
      teamId: catalogStadium?.teamId ?? 0,
      teamAbbr: catalogStadium?.teamAbbr ?? "LVBP",
      teamName: catalogStadium?.teamName ?? "Plaza Alterna",
      teamLogo: catalogStadium?.teamLogo ?? "/assets/logo.png",
      color: catalogStadium?.color ?? "#FDB827",
      elevationMeters: catalogStadium?.elevationMeters ?? 0,
      dimensions: {
        lf: catalogStadium?.lf ?? 335,
        lcf: catalogStadium?.lcf ?? 370,
        cf: catalogStadium?.cf ?? 400,
        rcf: catalogStadium?.rcf ?? 370,
        rf: catalogStadium?.rf ?? 335,
        wallHeightFt: catalogStadium?.wallHeightFt ?? 8,
      },
      isCanonical8: Boolean(catalogStadium?.isCanonical8),
      runsGames: runsMetric.games,
      boxscoreGames: boxCount,
      runsPerGame: runsMetric.perGame,
      metrics: {
        r: {
          raw: runsMetric.raw,
          stabilized: runsMetric.stabilized,
          perGame: runsMetric.perGame,
          total: runsMetric.total,
        },
        hr: hasEventFactors ? getEventMetric("hr") : null,
        h: hasEventFactors ? getEventMetric("h") : null,
        doubles: hasEventFactors ? getEventMetric("doubles") : null,
        triples: hasEventFactors ? getEventMetric("triples") : null,
        bb: hasEventFactors ? getEventMetric("bb") : null,
        so: hasEventFactors ? getEventMetric("so") : null,
      },
    });
  }

  stadiums.sort((a, b) => b.metrics.r.stabilized - a.metrics.r.stabilized);
  alternateVenues.sort((a, b) => b.games - a.games);

  const totalRunsSum = runsGames.reduce((acc, g) => acc + g.metrics.r, 0);
  const leagueRunsPerGame =
    runsGames.length > 0 ? Number((totalRunsSum / runsGames.length).toFixed(2)) : 0;

  const response: ParkFactorsResponse = {
    scope,
    scopeLabel: config.label,
    runsSeasons: config.runsSeasons,
    boxscoreSeasons: config.boxscoreSeasons,
    totalRunsGames: runsGames.length,
    totalBoxscoreGames: boxscoreGames.length,
    leagueRunsPerGame,
    priorWeight: PARK_FACTOR_PRIOR_WEIGHT,
    hasEventFactors,
    stadiums,
    alternateVenues,
    updatedAt: new Date().toISOString(),
  };

  const ttl =
    scope === "2024" || scope === "2025" ? CACHE_TTL_PAST_MS : CACHE_TTL_ACTIVE_MS;
  parkFactorsCache.set(scope, {
    expiresAt: Date.now() + ttl,
    data: response,
  });

  return response;
}
