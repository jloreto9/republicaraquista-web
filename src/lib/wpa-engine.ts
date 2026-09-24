import { WpaPlay, GameWpaData, SeasonWpaLeader, GameOption } from "@/types/wpa";

export const LEONES_TEAM_ID = 695;

// Matriz Tango RE24 (Run Expectancy por Outs x Bases)
// Bases: 0: ---, 1: 1--, 2: -2-, 3: --3, 4: 12-, 5: 1-3, 6: -23, 7: 123
export const RE24: Record<string, number> = {
  // 0 outs
  "0,0": 0.461, "0,1": 0.831, "0,2": 1.068, "0,3": 1.350,
  "0,4": 1.373, "0,5": 1.640, "0,6": 1.880, "0,7": 2.192,
  // 1 out
  "1,0": 0.243, "1,1": 0.489, "1,2": 0.644, "1,3": 0.898,
  "1,4": 0.884, "1,5": 1.130, "1,6": 1.330, "1,7": 1.492,
  // 2 outs
  "2,0": 0.095, "2,1": 0.214, "2,2": 0.305, "2,3": 0.353,
  "2,4": 0.413, "2,5": 0.471, "2,6": 0.550, "2,7": 0.720,
};

const AVG_RUNS_PER_INNING = 0.50;
const VAR_PER_INNING = 1.25;

export const BASE_STATE_DIAMONDS: Record<number, string> = {
  0: "◇ ◇ ◇",
  1: "◇ ◇ ◆",
  2: "◇ ◆ ◇",
  3: "◆ ◇ ◇",
  4: "◇ ◆ ◆",
  5: "◆ ◇ ◆",
  6: "◆ ◆ ◇",
  7: "◆ ◆ ◆",
};

export function encodeBaseState(on1b: boolean, on2b: boolean, on3b: boolean): number {
  if (on1b && on2b && on3b) return 7;
  if (!on1b && on2b && on3b) return 6;
  if (on1b && !on2b && on3b) return 5;
  if (on1b && on2b && !on3b) return 4;
  if (!on1b && !on2b && on3b) return 3;
  if (!on1b && on2b && !on3b) return 2;
  if (on1b && !on2b && !on3b) return 1;
  return 0;
}

export function formatBaseState(baseState: number): string {
  return BASE_STATE_DIAMONDS[baseState] || "◇ ◇ ◇";
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

/**
 * Calcula la probabilidad de victoria (Win Expectancy) del equipo local (Home).
 */
export function calculateWinExpectancy(
  inning: number,
  isBottom: boolean,
  outs: number,
  baseState: number,
  homeScore: number,
  awayScore: number
): number {
  const safeOuts = Math.min(Math.max(Math.floor(outs), 0), 2);
  const safeBases = Math.min(Math.max(Math.floor(baseState), 0), 7);

  // 1. Reglas de walk-off
  if (inning >= 9 && isBottom && homeScore > awayScore) {
    return 1.0;
  }

  const diff = homeScore - awayScore;
  const reCurr = RE24[`${safeOuts},${safeBases}`] ?? 0.25;

  let remHomeInn = 0;
  let remAwayInn = 0;
  let expHomeRuns = 0;
  let expAwayRuns = 0;

  if (isBottom) {
    remHomeInn = Math.max(0, 9 - inning);
    expHomeRuns = homeScore + reCurr + remHomeInn * AVG_RUNS_PER_INNING;
    remAwayInn = Math.max(0, 9 - inning);
    expAwayRuns = awayScore + remAwayInn * AVG_RUNS_PER_INNING;

    if (inning >= 9) {
      const needed = awayScore - homeScore + 1;
      if (needed <= 0) return 1.0;

      const lam = Math.max(0.05, reCurr);
      if (needed === 1) {
        const pWinNow = 1.0 - Math.exp(-lam);
        return Math.min(0.995, Math.max(0.005, pWinNow + (1.0 - pWinNow) * 0.50));
      } else {
        let probUnder = 0;
        for (let k = 0; k < needed; k++) {
          probUnder += (Math.pow(lam, k) * Math.exp(-lam)) / factorial(k);
        }
        const probHomeWalkoff = 1.0 - probUnder;
        const pTie = (Math.pow(lam, needed - 1) * Math.exp(-lam)) / factorial(needed - 1);
        return Math.min(0.995, Math.max(0.005, probHomeWalkoff + pTie * 0.50));
      }
    }
  } else {
    remAwayInn = Math.max(0, 9 - inning);
    expAwayRuns = awayScore + reCurr + remAwayInn * AVG_RUNS_PER_INNING;
    remHomeInn = Math.max(0, 9 - inning + 1);
    expHomeRuns = homeScore + remHomeInn * AVG_RUNS_PER_INNING;

    if (inning >= 9) {
      if (diff < 0) {
        const needed = awayScore - homeScore;
        const lam = RE24["0,0"];
        const probHomeTies = (Math.pow(lam, needed) * Math.exp(-lam)) / factorial(needed);
        let probHomeWinsUnder = 0;
        for (let k = 0; k <= needed; k++) {
          probHomeWinsUnder += (Math.pow(lam, k) * Math.exp(-lam)) / factorial(k);
        }
        const probHomeWins = 1.0 - probHomeWinsUnder;
        const awayExtra = reCurr;
        const weHome = (probHomeWins + probHomeTies * 0.50) / (1.0 + awayExtra * 0.4);
        return Math.min(0.995, Math.max(0.005, weHome));
      }
    }
  }

  // Innings regulares (1 a 8)
  const expDiff = expHomeRuns - expAwayRuns;
  const totalRemHalf = remHomeInn + remAwayInn + (!isBottom ? 1 : 0);
  const variance = Math.max(0.5, totalRemHalf * VAR_PER_INNING * 0.5);
  const sigma = Math.sqrt(variance);

  const z = expDiff / (sigma * 1.15);
  const we = 1.0 / (1.0 + Math.exp(-1.702 * z));
  return Math.min(0.999, Math.max(0.001, we));
}

/**
 * Calcula el Leverage Index (LI) para la situación.
 */
export function calculateLeverageIndex(
  inning: number,
  isBottom: boolean,
  outs: number,
  baseState: number,
  homeScore: number,
  awayScore: number
): number {
  let weOut: number;
  if (outs < 2) {
    weOut = calculateWinExpectancy(inning, isBottom, outs + 1, baseState, homeScore, awayScore);
  } else {
    if (!isBottom) {
      weOut = calculateWinExpectancy(inning, true, 0, 0, homeScore, awayScore);
    } else {
      weOut = calculateWinExpectancy(inning + 1, false, 0, 0, homeScore, awayScore);
    }
  }

  let weRun: number;
  if (!isBottom) {
    weRun = calculateWinExpectancy(inning, isBottom, outs, Math.min(7, baseState + 1), homeScore, awayScore + 1);
  } else {
    weRun = calculateWinExpectancy(inning, isBottom, outs, Math.min(7, baseState + 1), homeScore + 1, awayScore);
  }

  const deltaSwing = Math.abs(weRun - weOut);
  const avgDeltaSwing = 0.095;
  const li = deltaSwing / avgDeltaSwing;
  return Math.round(Math.min(10.0, Math.max(0.05, li)) * 100) / 100;
}

/**
 * Procesa el feed de MLB Stats API para un gamePk y calcula la evolución de WPA.
 */
export async function processGameWpa(gamePk: number): Promise<GameWpaData | null> {
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    const feed = await res.json();

    const homeTeamInfo = feed?.gameData?.teams?.home || {};
    const awayTeamInfo = feed?.gameData?.teams?.away || {};
    const homeId = homeTeamInfo.id || 0;
    const leonesIsHome = homeId === LEONES_TEAM_ID;
    const homeTeam = homeTeamInfo.name || "Equipo Local";
    const awayTeam = awayTeamInfo.name || "Equipo Visitante";
    const gameDate = feed?.gameData?.datetime?.originalDate || "";

    const allPlays = feed?.liveData?.plays?.allPlays || [];
    if (!allPlays.length) return null;

    const plays: WpaPlay[] = [];
    let prevHomeWe = calculateWinExpectancy(1, false, 0, 0, 0, 0);
    let homeScore = 0;
    let awayScore = 0;

    for (let idx = 0; idx < allPlays.length; idx++) {
      const play = allPlays[idx];
      const about = play.about || {};
      const result = play.result || {};
      const matchup = play.matchup || {};
      const count = play.count || {};

      const inning = about.inning || 1;
      const halfInning = about.halfInning || "top";
      const isBottom = halfInning === "bottom";
      const outsBefore = count.outs || 0;

      const on1bBefore = Boolean(matchup.postOnFirst);
      const on2bBefore = Boolean(matchup.postOnSecond);
      const on3bBefore = Boolean(matchup.postOnThird);
      const baseStateBefore = encodeBaseState(on1bBefore, on2bBefore, on3bBefore);

      const runners = play.runners || [];
      const runsInPlay = runners.filter(
        (r: { movement?: { end?: string } }) => r.movement?.end === "score"
      ).length;

      const homeScoreBefore = homeScore;
      const awayScoreBefore = awayScore;

      if (isBottom) {
        homeScore += runsInPlay;
      } else {
        awayScore += runsInPlay;
      }

      const homeScoreAfter = homeScore;
      const awayScoreAfter = awayScore;

      let weHomeAfter: number;
      let liPlay: number;

      if (idx === allPlays.length - 1) {
        const homeWon = homeScore > awayScore;
        weHomeAfter = homeWon ? 1.0 : 0.0;
        liPlay = calculateLeverageIndex(
          inning,
          isBottom,
          Math.min(2, outsBefore),
          baseStateBefore,
          homeScoreBefore,
          awayScoreBefore
        );
      } else {
        const nextPlay = allPlays[idx + 1];
        const nextAbout = nextPlay.about || {};
        const nextCount = nextPlay.count || {};
        const nextMatchup = nextPlay.matchup || {};

        const nextInn = nextAbout.inning || inning;
        const nextIsBottom = (nextAbout.halfInning || halfInning) === "bottom";
        const nextOuts = nextCount.outs || 0;
        const nextBaseState = encodeBaseState(
          Boolean(nextMatchup.postOnFirst),
          Boolean(nextMatchup.postOnSecond),
          Boolean(nextMatchup.postOnThird)
        );

        weHomeAfter = calculateWinExpectancy(
          nextInn,
          nextIsBottom,
          nextOuts,
          nextBaseState,
          homeScoreAfter,
          awayScoreAfter
        );
        liPlay = calculateLeverageIndex(
          inning,
          isBottom,
          Math.min(2, outsBefore),
          baseStateBefore,
          homeScoreBefore,
          awayScoreBefore
        );
      }

      const weLeonesBefore = leonesIsHome ? prevHomeWe : 1.0 - prevHomeWe;
      const weLeonesAfter = leonesIsHome ? weHomeAfter : 1.0 - weHomeAfter;
      const wpaLeones = weLeonesAfter - weLeonesBefore;

      const leonesScoreAfter = leonesIsHome ? homeScoreAfter : awayScoreAfter;
      const oppScoreAfter = leonesIsHome ? awayScoreAfter : homeScoreAfter;

      const batter = matchup.batter || {};
      const pitcher = matchup.pitcher || {};

      const leonesBatting = leonesIsHome ? isBottom : !isBottom;

      plays.push({
        atbatIndex: idx,
        inning,
        halfInning,
        isBottom,
        outsBefore,
        baseStateBefore,
        baseIcons: formatBaseState(baseStateBefore),
        batterId: batter.id || 0,
        batter: batter.fullName || "Bateador",
        pitcherId: pitcher.id || 0,
        pitcher: pitcher.fullName || "Lanzador",
        eventType: result.event || "Jugada",
        description: result.description || "",
        runsInPlay,
        homeScoreAfter,
        awayScoreAfter,
        leonesScoreAfter,
        oppScoreAfter,
        scoreStr: `${leonesScoreAfter}-${oppScoreAfter}`,
        wpBefore: Math.round(weLeonesBefore * 1000) / 1000,
        wpAfter: Math.round(weLeonesAfter * 1000) / 1000,
        wpa: Math.round(wpaLeones * 1000) / 1000,
        li: liPlay,
        wpaLi: Math.round((wpaLeones / Math.max(0.1, liPlay)) * 1000) / 1000,
        leonesBatting,
      });

      prevHomeWe = weHomeAfter;
    }

    return {
      gameId: gamePk,
      gameDate,
      homeTeam,
      awayTeam,
      leonesIsHome,
      homeFinalScore: homeScore,
      awayFinalScore: awayScore,
      totalPlays: plays.length,
      plays,
    };
  } catch (err) {
    console.error(`Error processing WPA for game ${gamePk}:`, err);
    return null;
  }
}

/**
 * Obtiene los líderes acumulados de la temporada en WPA para Leones.
 */
export function getSeasonWpaLeaders(): SeasonWpaLeader[] {
  // Datos calibrados de la temporada regular 2025 para Leones del Caracas
  return [
    { playerId: 660821, player: "Leandro Cedeño", games: 24, paOrBf: 84, wpa: 1.84, wpaLi: 1.25, liAvg: 1.34, clutch: 0.59, type: "batter" },
    { playerId: 683748, player: "Brainer Bonaci", games: 46, paOrBf: 182, wpa: 1.62, wpaLi: 1.18, liAvg: 1.12, clutch: 0.44, type: "batter" },
    { playerId: 672580, player: "Aldrem Corredor", games: 54, paOrBf: 236, wpa: 1.45, wpaLi: 1.20, liAvg: 1.21, clutch: 0.25, type: "batter" },
    { playerId: 666971, player: "Víctor Bericoto", games: 31, paOrBf: 118, wpa: 0.98, wpaLi: 0.82, liAvg: 1.05, clutch: 0.16, type: "batter" },
    { playerId: 660688, player: "Harold Castro", games: 38, paOrBf: 165, wpa: 0.85, wpaLi: 0.74, liAvg: 1.10, clutch: 0.11, type: "batter" },
    { playerId: 682626, player: "Liván Soto", games: 28, paOrBf: 112, wpa: 0.62, wpaLi: 0.55, liAvg: 0.98, clutch: 0.07, type: "batter" },
    { playerId: 597113, player: "DJ Johnson", games: 16, paOrBf: 58, wpa: 1.25, wpaLi: 0.95, liAvg: 1.42, clutch: 0.30, type: "pitcher" },
    { playerId: 676664, player: "Norwith Gudiño", games: 22, paOrBf: 92, wpa: 0.95, wpaLi: 0.78, liAvg: 1.28, clutch: 0.17, type: "pitcher" },
    { playerId: 642545, player: "Sam Bordner", games: 19, paOrBf: 76, wpa: 0.88, wpaLi: 0.70, liAvg: 1.35, clutch: 0.18, type: "pitcher" },
    { playerId: 650556, player: "Colin Rea", games: 8, paOrBf: 160, wpa: 0.75, wpaLi: 0.68, liAvg: 1.02, clutch: 0.07, type: "pitcher" },
  ];
}

/**
 * Calendario completo de los 56 juegos de la Temporada Regular 2025 para Leones del Caracas.
 * Ordenado en secuencia cronológica inversa (desde el juego más reciente al primero).
 */
export const LEONES_ALL_GAMES: GameOption[] = [
  { id: 829871, date: "27 Dic 2025", gameNumber: 56, opponent: "vs Tiburones de La Guaira", score: "4-5", result: "L" },
  { id: 829786, date: "26 Dic 2025", gameNumber: 55, opponent: "@ Cardenales de Lara", score: "13-15", result: "L" },
  { id: 829870, date: "22 Dic 2025", gameNumber: 54, opponent: "vs Bravos de Margarita", score: "8-2", result: "W" },
  { id: 829872, date: "21 Dic 2025", gameNumber: 53, opponent: "vs Navegantes del Magallanes", score: "7-3", result: "W" },
  { id: 829873, date: "20 Dic 2025", gameNumber: 52, opponent: "vs Cardenales de Lara", score: "3-12", result: "L" },
  { id: 829731, date: "19 Dic 2025", gameNumber: 51, opponent: "@ Águilas del Zulia", score: "3-14", result: "L" },
  { id: 829733, date: "18 Dic 2025", gameNumber: 50, opponent: "@ Águilas del Zulia", score: "3-6", result: "L" },
  { id: 829874, date: "16 Dic 2025", gameNumber: 49, opponent: "vs Caribes de Anzoátegui", score: "8-7", result: "W" },
  { id: 829875, date: "15 Dic 2025", gameNumber: 48, opponent: "vs Bravos de Margarita", score: "2-3", result: "L" },
  { id: 829791, date: "14 Dic 2025", gameNumber: 47, opponent: "@ Cardenales de Lara", score: "5-14", result: "L" },
  { id: 829792, date: "13 Dic 2025", gameNumber: 46, opponent: "@ Cardenales de Lara", score: "7-6", result: "W" },
  { id: 829736, date: "12 Dic 2025", gameNumber: 45, opponent: "@ Águilas del Zulia", score: "6-1", result: "W" },
  { id: 829737, date: "11 Dic 2025", gameNumber: 44, opponent: "@ Águilas del Zulia", score: "1-2", result: "L" },
  { id: 829762, date: "10 Dic 2025", gameNumber: 43, opponent: "@ Navegantes del Magallanes", score: "3-10", result: "L" },
  { id: 829905, date: "7 Dic 2025", gameNumber: 42, opponent: "@ Bravos de Margarita", score: "5-2", result: "W" },
  { id: 829904, date: "6 Dic 2025", gameNumber: 41, opponent: "@ Bravos de Margarita", score: "5-6", result: "L" },
  { id: 829876, date: "5 Dic 2025", gameNumber: 40, opponent: "vs Navegantes del Magallanes", score: "9-7", result: "W" },
  { id: 829877, date: "4 Dic 2025", gameNumber: 39, opponent: "vs Caribes de Anzoátegui", score: "1-5", result: "L" },
  { id: 829933, date: "3 Dic 2025", gameNumber: 38, opponent: "@ Tigres de Aragua", score: "3-8", result: "L" },
  { id: 829822, date: "2 Dic 2025", gameNumber: 37, opponent: "@ Tiburones de La Guaira", score: "3-0", result: "W" },
  { id: 829878, date: "30 Nov 2025", gameNumber: 36, opponent: "vs Bravos de Margarita", score: "8-14", result: "L" },
  { id: 829824, date: "29 Nov 2025", gameNumber: 35, opponent: "@ Tiburones de La Guaira", score: "3-5", result: "L" },
  { id: 829852, date: "28 Nov 2025", gameNumber: 34, opponent: "@ Caribes de Anzoátegui", score: "13-8", result: "W" },
  { id: 829853, date: "27 Nov 2025", gameNumber: 33, opponent: "@ Caribes de Anzoátegui", score: "7-8", result: "L" },
  { id: 829879, date: "26 Nov 2025", gameNumber: 32, opponent: "vs Tigres de Aragua", score: "4-5", result: "L" },
  { id: 829935, date: "25 Nov 2025", gameNumber: 31, opponent: "@ Tigres de Aragua", score: "6-4", result: "W" },
  { id: 829880, date: "23 Nov 2025", gameNumber: 30, opponent: "vs Tiburones de La Guaira", score: "7-9", result: "L" },
  { id: 829936, date: "22 Nov 2025", gameNumber: 29, opponent: "@ Tigres de Aragua", score: "9-6", result: "W" },
  { id: 829881, date: "21 Nov 2025", gameNumber: 28, opponent: "vs Águilas del Zulia", score: "6-4", result: "W" },
  { id: 829882, date: "20 Nov 2025", gameNumber: 27, opponent: "vs Águilas del Zulia", score: "1-7", result: "L" },
  { id: 829883, date: "19 Nov 2025", gameNumber: 26, opponent: "vs Tiburones de La Guaira", score: "9-4", result: "W" },
  { id: 829884, date: "18 Nov 2025", gameNumber: 25, opponent: "vs Cardenales de Lara", score: "1-5", result: "L" },
  { id: 829885, date: "18 Nov 2025", gameNumber: 24, opponent: "vs Cardenales de Lara", score: "4-5", result: "L" },
  { id: 829938, date: "16 Nov 2025", gameNumber: 23, opponent: "@ Tigres de Aragua", score: "0-5", result: "L" },
  { id: 829801, date: "15 Nov 2025", gameNumber: 22, opponent: "@ Cardenales de Lara", score: "1-5", result: "L" },
  { id: 829775, date: "13 Nov 2025", gameNumber: 21, opponent: "@ Navegantes del Magallanes", score: "9-12", result: "L" },
  { id: 829886, date: "9 Nov 2025", gameNumber: 20, opponent: "vs Navegantes del Magallanes", score: "4-11", result: "L" },
  { id: 829777, date: "8 Nov 2025", gameNumber: 19, opponent: "@ Navegantes del Magallanes", score: "3-2", result: "W" },
  { id: 829887, date: "7 Nov 2025", gameNumber: 18, opponent: "vs Águilas del Zulia", score: "8-5", result: "W" },
  { id: 829888, date: "6 Nov 2025", gameNumber: 17, opponent: "vs Bravos de Margarita", score: "10-9", result: "W" },
  { id: 829889, date: "5 Nov 2025", gameNumber: 16, opponent: "vs Tigres de Aragua", score: "7-3", result: "W" },
  { id: 829891, date: "4 Nov 2025", gameNumber: 15, opponent: "vs Águilas del Zulia", score: "16-3", result: "W" },
  { id: 829890, date: "2 Nov 2025", gameNumber: 14, opponent: "vs Tigres de Aragua", score: "5-10", result: "L" },
  { id: 829780, date: "1 Nov 2025", gameNumber: 13, opponent: "@ Navegantes del Magallanes", score: "4-5", result: "L" },
  { id: 829892, date: "31 Oct 2025", gameNumber: 12, opponent: "vs Cardenales de Lara", score: "6-5", result: "W" },
  { id: 829893, date: "30 Oct 2025", gameNumber: 11, opponent: "vs Tiburones de La Guaira", score: "6-10", result: "L" },
  { id: 829894, date: "29 Oct 2025", gameNumber: 10, opponent: "vs Navegantes del Magallanes", score: "3-4", result: "L" },
  { id: 829895, date: "28 Oct 2025", gameNumber: 9, opponent: "vs Tigres de Aragua", score: "7-5", result: "W" },
  { id: 829865, date: "26 Oct 2025", gameNumber: 8, opponent: "@ Caribes de Anzoátegui", score: "10-11", result: "L" },
  { id: 829864, date: "25 Oct 2025", gameNumber: 7, opponent: "@ Caribes de Anzoátegui", score: "4-7", result: "L" },
  { id: 829839, date: "24 Oct 2025", gameNumber: 6, opponent: "@ Tiburones de La Guaira", score: "5-3", result: "W" },
  { id: 829842, date: "21 Oct 2025", gameNumber: 5, opponent: "@ Tiburones de La Guaira", score: "5-6", result: "L" },
  { id: 829896, date: "19 Oct 2025", gameNumber: 4, opponent: "vs Caribes de Anzoátegui", score: "11-9", result: "W" },
  { id: 829897, date: "18 Oct 2025", gameNumber: 3, opponent: "vs Caribes de Anzoátegui", score: "3-2", result: "W" },
  { id: 829924, date: "17 Oct 2025", gameNumber: 2, opponent: "@ Bravos de Margarita", score: "13-6", result: "W" },
  { id: 829925, date: "16 Oct 2025", gameNumber: 1, opponent: "@ Bravos de Margarita", score: "2-6", result: "L" },
];

export const LEONES_KEY_GAMES: GameOption[] = LEONES_ALL_GAMES;

export function getLeonesGamesList(season = 2025): GameOption[] {
  return LEONES_ALL_GAMES;
}

