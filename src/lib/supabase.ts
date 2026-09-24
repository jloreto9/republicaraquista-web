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
  if (!supabase) return getMockStandings(season);

  try {
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

    const games = rawGames as SupabaseGameRow[] | null;

    if (error || !games || games.length === 0) {
      console.warn("Sin juegos en Supabase para standings, usando fallback", error);
      return getMockStandings(season);
    }

    // Filtrar solo juegos donde participen equipos LVBP
    const validGames = games.filter(
      (g: SupabaseGameRow) =>
        LVBP_TEAM_IDS.includes(Number(g.home_team_id)) ||
        LVBP_TEAM_IDS.includes(Number(g.away_team_id))
    );

    // Agrupar por equipo
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

      if (homeScore === awayScore) return; // Empates o suspendidos raros

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

    return standings;
  } catch (err) {
    console.error("Error al calcular standings:", err);
    return getMockStandings(season);
  }
}

/**
 * Obtiene los últimos encuentros disputados o activos.
 */
export async function getRecentGames(
  season = 2025,
  limit = 8
): Promise<GameSummary[]> {
  if (!supabase) return getMockGames();

  try {
    const { data: rawGames, error } = await supabase
      .from("games")
      .select("*")
      .eq("season", season)
      .order("game_date", { ascending: false })
      .limit(limit);

    const games = rawGames as SupabaseGameRow[] | null;

    if (error || !games || games.length === 0) {
      return getMockGames();
    }

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
  } catch (err) {
    console.error("Error al obtener juegos recientes:", err);
    return getMockGames();
  }
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
    try {
      const { data: rawGames } = await supabase
        .from("games")
        .select("*")
        .eq("season", season)
        .in("status", ["Final", "Completed", "Completed Early"])
        .or("home_team_id.eq.695,away_team_id.eq.695");

      const caracasGames = rawGames as SupabaseGameRow[] | null;

      if (caracasGames) {
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
    } catch {
      // fallback
    }
  }

  return {
    season,
    totalGames: caracasStanding?.gamesPlayed || 0,
    caracasWins: caracasStanding?.wins || 0,
    caracasLosses: caracasStanding?.losses || 0,
    caracasPct: caracasStanding?.pct || 0.0,
    caracasStreak: caracasStanding?.streak || "-",
    caracasRunDiff: caracasStanding?.runDifferential || 0,
    caracasPosition: pos || 1,
    dayWins,
    dayLosses,
    nightWins,
    nightLosses,
  };
}

// Fallback datasets elegantes para pruebas sin conexión
function getMockStandings(season: number): TeamStanding[] {
  return [
    {
      teamId: 695,
      teamName: "Leones del Caracas",
      abbreviation: "CAR",
      logoUrl: `${getTeam(695).logoUrl}`,
      gamesPlayed: 56,
      wins: 34,
      losses: 22,
      pct: 0.607,
      gamesBack: "-",
      runsScored: 342,
      runsAllowed: 280,
      runDifferential: 62,
      homeRecord: "19-9",
      awayRecord: "15-13",
      streak: "G3",
      last10: "7-3",
      pythagoreanPct: 0.589,
      expectedWins: 33,
      expectedLosses: 23,
      eloRating: 1564,
    },
    {
      teamId: 693,
      teamName: "Cardenales de Lara",
      abbreviation: "LAR",
      logoUrl: `${getTeam(693).logoUrl}`,
      gamesPlayed: 56,
      wins: 33,
      losses: 23,
      pct: 0.589,
      gamesBack: "1.0",
      runsScored: 320,
      runsAllowed: 275,
      runDifferential: 45,
      homeRecord: "18-10",
      awayRecord: "15-13",
      streak: "P1",
      last10: "6-4",
      pythagoreanPct: 0.568,
      expectedWins: 32,
      expectedLosses: 24,
      eloRating: 1548,
    },
    {
      teamId: 698,
      teamName: "Tiburones de La Guaira",
      abbreviation: "LAG",
      logoUrl: `${getTeam(698).logoUrl}`,
      gamesPlayed: 56,
      wins: 30,
      losses: 26,
      pct: 0.536,
      gamesBack: "4.0",
      runsScored: 310,
      runsAllowed: 295,
      runDifferential: 15,
      homeRecord: "16-12",
      awayRecord: "14-14",
      streak: "G1",
      last10: "5-5",
      pythagoreanPct: 0.523,
      expectedWins: 29,
      expectedLosses: 27,
      eloRating: 1515,
    },
    {
      teamId: 697,
      teamName: "Bravos de Margarita",
      abbreviation: "MAR",
      logoUrl: `${getTeam(697).logoUrl}`,
      gamesPlayed: 56,
      wins: 29,
      losses: 27,
      pct: 0.518,
      gamesBack: "5.0",
      runsScored: 298,
      runsAllowed: 305,
      runDifferential: -7,
      homeRecord: "15-13",
      awayRecord: "14-14",
      streak: "P2",
      last10: "4-6",
      pythagoreanPct: 0.490,
      expectedWins: 27,
      expectedLosses: 29,
      eloRating: 1502,
    },
    {
      teamId: 696,
      teamName: "Navegantes del Magallanes",
      abbreviation: "MAG",
      logoUrl: `${getTeam(696).logoUrl}`,
      gamesPlayed: 56,
      wins: 27,
      losses: 29,
      pct: 0.482,
      gamesBack: "7.0",
      runsScored: 285,
      runsAllowed: 310,
      runDifferential: -25,
      homeRecord: "14-14",
      awayRecord: "13-15",
      streak: "G2",
      last10: "5-5",
      pythagoreanPct: 0.462,
      expectedWins: 26,
      expectedLosses: 30,
      eloRating: 1485,
    },
    {
      teamId: 699,
      teamName: "Tigres de Aragua",
      abbreviation: "ARA",
      logoUrl: `${getTeam(699).logoUrl}`,
      gamesPlayed: 56,
      wins: 26,
      losses: 30,
      pct: 0.464,
      gamesBack: "8.0",
      runsScored: 270,
      runsAllowed: 295,
      runDifferential: -25,
      homeRecord: "13-15",
      awayRecord: "13-15",
      streak: "P1",
      last10: "4-6",
      pythagoreanPct: 0.460,
      expectedWins: 26,
      expectedLosses: 30,
      eloRating: 1478,
    },
    {
      teamId: 692,
      teamName: "Águilas del Zulia",
      abbreviation: "ZUL",
      logoUrl: `${getTeam(692).logoUrl}`,
      gamesPlayed: 56,
      wins: 24,
      losses: 32,
      pct: 0.429,
      gamesBack: "10.0",
      runsScored: 260,
      runsAllowed: 300,
      runDifferential: -40,
      homeRecord: "13-15",
      awayRecord: "11-17",
      streak: "P3",
      last10: "3-7",
      pythagoreanPct: 0.435,
      expectedWins: 24,
      expectedLosses: 32,
      eloRating: 1452,
    },
    {
      teamId: 694,
      teamName: "Caribes de Anzoátegui",
      abbreviation: "ORI",
      logoUrl: `${getTeam(694).logoUrl}`,
      gamesPlayed: 56,
      wins: 21,
      losses: 35,
      pct: 0.375,
      gamesBack: "13.0",
      runsScored: 250,
      runsAllowed: 320,
      runDifferential: -70,
      homeRecord: "11-17",
      awayRecord: "10-18",
      streak: "G1",
      last10: "4-6",
      pythagoreanPct: 0.388,
      expectedWins: 22,
      expectedLosses: 34,
      eloRating: 1420,
    },
  ];
}

function getMockGames(): GameSummary[] {
  return [
    {
      id: 1,
      gamePk: 101,
      gameDate: "2025-12-23",
      season: 2025,
      gameType: "R",
      status: "Final",
      homeTeamId: 695,
      homeTeamName: "Leones del Caracas",
      homeTeamAbbr: "CAR",
      homeTeamLogo: getTeam(695).logoUrl,
      homeScore: 7,
      awayTeamId: 696,
      awayTeamName: "Navegantes del Magallanes",
      awayTeamAbbr: "MAG",
      awayTeamLogo: getTeam(696).logoUrl,
      awayScore: 4,
      isDayGame: false,
    },
    {
      id: 2,
      gamePk: 102,
      gameDate: "2025-12-23",
      season: 2025,
      gameType: "R",
      status: "Final",
      homeTeamId: 698,
      homeTeamName: "Tiburones de La Guaira",
      homeTeamAbbr: "LAG",
      homeTeamLogo: getTeam(698).logoUrl,
      homeScore: 5,
      awayTeamId: 693,
      awayTeamName: "Cardenales de Lara",
      awayTeamAbbr: "LAR",
      awayTeamLogo: getTeam(693).logoUrl,
      awayScore: 3,
      isDayGame: false,
    },
    {
      id: 3,
      gamePk: 103,
      gameDate: "2025-12-22",
      season: 2025,
      gameType: "R",
      status: "Final",
      homeTeamId: 699,
      homeTeamName: "Tigres de Aragua",
      homeTeamAbbr: "ARA",
      homeTeamLogo: getTeam(699).logoUrl,
      homeScore: 2,
      awayTeamId: 695,
      awayTeamName: "Leones del Caracas",
      awayTeamAbbr: "CAR",
      awayTeamLogo: getTeam(695).logoUrl,
      awayScore: 6,
      isDayGame: false,
    },
  ];
}
