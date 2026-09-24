import { createClient } from "@supabase/supabase-js";
import {
  LVBP_TEAM_IDS,
  getTeam,
  calculatePythagorean,
} from "./constants";
import { TeamStanding, GameSummary, SeasonKPIs } from "@/types/sports";

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

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  "";

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
  if (!supabase) {
    throw new Error(
      "Credenciales de Supabase no configuradas. Por favor define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
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
    throw new Error(`Error en consulta de juegos de Supabase: ${error.message}`);
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
    throw new Error(
      "Credenciales de Supabase no configuradas. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const { data: rawGames, error } = await supabase
    .from("games")
    .select("*")
    .eq("season", season)
    .in("status", ["Final", "Completed", "Completed Early"])
    .order("game_date", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Error en consulta de juegos recientes: ${error.message}`);
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
