import { createClient } from "@supabase/supabase-js";
import {
  LVBP_TEAM_IDS,
  getTeam,
  calculatePythagorean,
} from "./constants";
import { TeamStanding, GameSummary, SeasonKPIs, BattingStats, PitchingStats } from "@/types/sports";

interface SupabaseGameRow {
  id: number;
  game_pk?: number;
  game_date?: string;
  season?: number;
  game_type?: string;
  status?: string;
  home_team_id: number;
  away_team_id: number;
  home_score?: number;
  away_score?: number;
  current_inning?: number;
  inning_state?: string;
  is_day_game?: boolean;
}

interface RawBattingRow {
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
  players?: { full_name?: string | null } | null;
  games?: { season?: number | null; game_type?: string | null } | null;
}

interface RawPitchingRow {
  player_id: number;
  team_id: number;
  ip_decimal?: number | null;
  h?: number | null;
  r?: number | null;
  er?: number | null;
  bb?: number | null;
  so?: number | null;
  hr?: number | null;
  players?: { full_name?: string | null } | null;
  games?: { season?: number | null; game_type?: string | null } | null;
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

/**
 * Obtiene los standings calculados a partir de los partidos finalizados en Supabase.
 */
export async function getStandings(
  season = 2025,
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

  if (!supabase) {
    console.warn("Supabase no configurado; retornando standings base.");
    return defaultStandings();
  }

  const phaseTypeMap: Record<string, string[]> = {
    regular: ["R"],
    round_robin: ["L"],
    final: ["F"],
    all: ["R", "L", "D", "F"],
  };
  const gameTypes = phaseTypeMap[phase] || ["R"];

  const { data: rawGames, error } = await supabase
    .from("games")
    .select("*")
    .eq("season", season)
    .in("status", ["Final", "Completed", "Completed Early"])
    .in("game_type", gameTypes);

  if (error) {
    console.error("Error en consulta de juegos de Supabase:", error);
    return defaultStandings();
  }

  const games = (rawGames || []) as SupabaseGameRow[];

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

  // Ordenar por fecha cronológica para racha y L10
  const sortedGames = [...validGames].sort((a, b) =>
    (a.game_date || "").localeCompare(b.game_date || "")
  );

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

    // Rating ELO estimado base
    const eloRating = Math.round(1500 + (pct - 0.5) * 400 + (rec.runsFor - rec.runsAgainst) * 1.2);

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

  return standings;
}

/**
 * Obtiene los últimos encuentros disputados o activos.
 */
export async function getRecentGames(
  season = 2025,
  limit = 8
): Promise<GameSummary[]> {
  if (!supabase) {
    console.warn("Supabase no configurado; retornando juegos vacíos.");
    return [];
  }

  const { data: rawGames, error } = await supabase
    .from("games")
    .select("*")
    .eq("season", season)
    .in("status", ["Final", "Completed", "Completed Early"])
    .order("game_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error en consulta de juegos recientes:", error);
    return [];
  }

  const games = (rawGames || []) as SupabaseGameRow[];

  return games.map((g: SupabaseGameRow) => {
    const homeTeam = getTeam(Number(g.home_team_id));
    const awayTeam = getTeam(Number(g.away_team_id));
    return {
      id: Number(g.id),
      gamePk: Number(g.game_pk ?? g.id),
      gameDate: g.game_date || "",
      season: Number(g.season),
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
      isDayGame: Boolean(g.is_day_game),
    };
  });
}

/**
 * Obtiene los KPIs de resumen de los Leones del Caracas para la temporada.
 */
export async function getSeasonKPIs(season = 2025): Promise<SeasonKPIs> {
  const standings = await getStandings(season);
  const caracasStanding = standings.find((s) => s.teamId === 695);
  const pos = standings.findIndex((s) => s.teamId === 695) + 1;

  let dayWins = 0;
  let dayLosses = 0;
  let nightWins = 0;
  let nightLosses = 0;

  if (supabase) {
    const { data: rawGames } = await supabase
      .from("games")
      .select("*")
      .eq("season", season)
      .in("status", ["Final", "Completed", "Completed Early"])
      .or("home_team_id.eq.695,away_team_id.eq.695");

    const caracasGames = (rawGames || []) as SupabaseGameRow[];

    caracasGames.forEach((g: SupabaseGameRow) => {
      const isHome = Number(g.home_team_id) === 695;
      const caracasScore = isHome ? Number(g.home_score) : Number(g.away_score);
      const oppScore = isHome ? Number(g.away_score) : Number(g.home_score);
      const won = caracasScore > oppScore;
      const isDay = Boolean(g.is_day_game);

      if (isDay) {
        if (won) dayWins++;
        else dayLosses++;
      } else {
        if (won) nightWins++;
        else nightLosses++;
      }
    });
  }

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

/**
 * Obtiene estadísticas agregadas de bateo por jugador para una temporada y fase.
 */
export async function getBattingStats(
  season = 2025,
  phase = "R",
  teamId: string | number = "all",
  limit = 50,
  minAb = 10
): Promise<BattingStats[]> {
  if (!supabase) {
    console.warn("Supabase no configurado; retornando bateo vacío.");
    return [];
  }

  let query = supabase
    .from("batting_stats")
    .select(
      "player_id, team_id, ab, r, h, doubles, triples, hr, rbi, bb, so, sb, cs, hbp, sf, sh, players!inner(full_name), games!inner(season, game_type)"
    )
    .eq("games.season", season);

  if (phase && phase !== "all") {
    query = query.eq("games.game_type", phase);
  }

  if (teamId && teamId !== "all") {
    query = query.eq("team_id", Number(teamId));
  }

  const { data: rawData, error } = await query;

  if (error) {
    console.error("Error al consultar batting_stats:", error);
    return [];
  }

  if (!rawData || rawData.length === 0) {
    return [];
  }

  // Agrupar por player_id
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

  (rawData as unknown as RawBattingRow[]).forEach((row: RawBattingRow) => {
    const pId = Number(row.player_id);
    const pName = row.players?.full_name || "Desconocido";
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

    return {
      playerId: p.playerId,
      playerName: p.playerName,
      playerAvatar: `https://midfield.mlbstatic.com/v1/people/${p.playerId}/spots/120`,
      teamId: team.id,
      teamName: team.name,
      teamAbbr: team.abbreviation,
      teamLogo: team.logoUrl,
      games: p.gamesCount,
      atBats: p.ab,
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
  season = 2025,
  phase = "R",
  teamId: string | number = "all",
  limit = 50,
  minIp = 3.0
): Promise<PitchingStats[]> {
  if (!supabase) {
    console.warn("Supabase no configurado; retornando pitcheo vacío.");
    return [];
  }

  let query = supabase
    .from("pitching_stats")
    .select(
      "player_id, team_id, ip_decimal, h, r, er, bb, so, hr, players!inner(full_name), games!inner(season, game_type)"
    )
    .eq("games.season", season);

  if (phase && phase !== "all") {
    query = query.eq("games.game_type", phase);
  }

  if (teamId && teamId !== "all") {
    query = query.eq("team_id", Number(teamId));
  }

  const { data: rawData, error } = await query;

  if (error) {
    console.error("Error al consultar pitching_stats:", error);
    return [];
  }

  if (!rawData || rawData.length === 0) {
    return [];
  }

  // Agrupar por player_id
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

  (rawData as unknown as RawPitchingRow[]).forEach((row: RawPitchingRow) => {
    const pId = Number(row.player_id);
    const pName = row.players?.full_name || "Desconocido";
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
      playerAvatar: `https://midfield.mlbstatic.com/v1/people/${p.playerId}/spots/120`,
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
