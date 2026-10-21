import {
  LeonesAdvancedStats,
  WeeklyRecord,
  LastGameDetail,
  TrendGameItem,
  BatterLeaderItem,
  PitcherLeaderItem,
  BroadcastChannelRecord,
  HeadToHeadRecord,
  DashboardTabsData,
} from "@/types/leones-stats";
import { ACTIVE_SEASON, getTeam, getPlayerHeadshotUrl } from "./constants";
import { supabase, getBattingStats, getPitchingStats } from "./supabase";
import { getSeasonWpaLeaders } from "./wpa-engine";
import { isDayGame } from "./utils";
import { fetchGameLiveFeed } from "./game-feed-service";
import calendarData from "@/data/calendar_2026_27.json";

// ── LÍNEA BASE LIMPIA / INICIAL EN CERO PARA NUEVAS TEMPORADAS ────────────────
const CLEAN_ZERO_STATS: LeonesAdvancedStats = {
  totalGames: 0,
  record: "0-0",
  homeRecord: "0-0",
  awayRecord: "0-0",
  nightRecord: "0-0",
  dayRecord: "0-0",
  shutouts: 0,
  streak: "-",
  extraInning: "0-0",
  last10: "0-0",
  oneRun: "0-0",
  remontados: 0,
  up: "0-0",
  terreneadas: 0,
  starters: "0-0",
  relievers: "0-0",
  saves: 0,
  oct: "0G-0P",
  nov: "0G-0P",
  dec: "0G-0P",
  daysRecord: {
    lunes: "0G-0P",
    martes: "0G-0P",
    miercoles: "0G-0P",
    jueves: "0G-0P",
    viernes: "0G-0P",
    sabado: "0G-0P",
    domingo: "0G-0P",
  },
};

// ── SEMANAS CANÓNICAS OFICIALES TEMPORADA 2026-2027 ──────────────────────────
const WEEKS_2026_CONFIG = [
  { weekNum: 1, semana: "Semana 1 (12/10 - 18/10)", startDate: "2026-10-12", endDate: "2026-10-18" },
  { weekNum: 2, semana: "Semana 2 (19/10 - 25/10)", startDate: "2026-10-19", endDate: "2026-10-25" },
  { weekNum: 3, semana: "Semana 3 (26/10 - 01/11)", startDate: "2026-10-26", endDate: "2026-11-01" },
  { weekNum: 4, semana: "Semana 4 (02/11 - 08/11)", startDate: "2026-11-02", endDate: "2026-11-08" },
  { weekNum: 5, semana: "Semana 5 (09/11 - 15/11)", startDate: "2026-11-09", endDate: "2026-11-15" },
  { weekNum: 6, semana: "Semana 6 (16/11 - 22/11)", startDate: "2026-11-16", endDate: "2026-11-22" },
  { weekNum: 7, semana: "Semana 7 (23/11 - 29/11)", startDate: "2026-11-23", endDate: "2026-11-29" },
  { weekNum: 8, semana: "Semana 8 (30/11 - 06/12)", startDate: "2026-11-30", endDate: "2026-12-06" },
  { weekNum: 9, semana: "Semana 9 (07/12 - 13/12)", startDate: "2026-12-07", endDate: "2026-12-13" },
  { weekNum: 10, semana: "Semana 10 (14/12 - 20/12)", startDate: "2026-12-14", endDate: "2026-12-20" },
  { weekNum: 11, semana: "Semana 11 (21/12 - 27/12)", startDate: "2026-12-21", endDate: "2026-12-27" },
];

// ── LÍNEA BASE AUDITADA TEMPORADA 2025 (LEONES DEL CARACAS) ─────────────────
const BASELINE_2025_STATS: LeonesAdvancedStats = {
  totalGames: 56,
  record: "24-32",
  homeRecord: "14-14",
  awayRecord: "10-18",
  nightRecord: "16-21",
  dayRecord: "8-11",
  shutouts: 1,
  streak: "2 L",
  extraInning: "1-2",
  last10: "3-7",
  oneRun: "6-11",
  remontados: 2,
  up: "21-5",
  terreneadas: 2,
  starters: "7-15",
  relievers: "17-17",
  saves: 12,
  oct: "6G-6P",
  nov: "10G-14P",
  dec: "8G-12P",
  daysRecord: {
    lunes: "1G-1P",
    martes: "5G-3P",
    miercoles: "2G-4P",
    jueves: "1G-8P",
    viernes: "8G-2P",
    sabado: "4G-7P",
    domingo: "3G-7P",
  },
};

const BASELINE_2025_WEEKS: WeeklyRecord[] = [
  { weekNum: 1, semana: "Semana 1 (13/10 - 19/10)", juegos: 4, w: 3, l: 1, pct: ".750", cf: 29, cp: 23, dif: "+6", record: "3G-1P" },
  { weekNum: 2, semana: "Semana 2 (20/10 - 26/10)", juegos: 4, w: 1, l: 3, pct: ".250", cf: 24, cp: 27, dif: "-3", record: "1G-3P" },
  { weekNum: 3, semana: "Semana 3 (27/10 - 02/11)", juegos: 6, w: 2, l: 4, pct: ".333", cf: 31, cp: 39, dif: "-8", record: "2G-4P" },
  { weekNum: 4, semana: "Semana 4 (03/11 - 09/11)", juegos: 6, w: 5, l: 1, pct: ".833", cf: 48, cp: 33, dif: "+15", record: "5G-1P" },
  { weekNum: 5, semana: "Semana 5 (10/11 - 16/11)", juegos: 3, w: 0, l: 3, pct: ".000", cf: 10, cp: 22, dif: "-12", record: "0G-3P" },
  { weekNum: 6, semana: "Semana 6 (17/11 - 23/11)", juegos: 7, w: 3, l: 4, pct: ".428", cf: 37, cp: 40, dif: "-3", record: "3G-4P" },
  { weekNum: 7, semana: "Semana 7 (24/11 - 30/11)", juegos: 6, w: 2, l: 4, pct: ".333", cf: 41, cp: 44, dif: "-3", record: "2G-4P" },
  { weekNum: 8, semana: "Semana 8 (01/12 - 07/12)", juegos: 6, w: 3, l: 3, pct: ".500", cf: 26, cp: 28, dif: "-2", record: "3G-3P" },
  { weekNum: 9, semana: "Semana 9 (08/12 - 14/12)", juegos: 5, w: 2, l: 3, pct: ".400", cf: 22, cp: 33, dif: "-11", record: "2G-3P" },
  { weekNum: 10, semana: "Semana 10 (15/12 - 21/12)", juegos: 6, w: 2, l: 4, pct: ".333", cf: 26, cp: 45, dif: "-19", record: "2G-4P" },
  { weekNum: 11, semana: "Semana 11 (22/12 - 28/12)", juegos: 3, w: 1, l: 2, pct: ".333", cf: 25, cp: 22, dif: "+3", record: "1G-2P" },
];

const BASELINE_2025_TRENDS: TrendGameItem[] = [
  { id: 829871, fecha: "27/12", rivalId: 698, rivalName: "Tiburones de La Guaira", rivalAbbr: "LAG", rivalLogo: getTeam(698).logoUrl, isHome: true, score: "4-5", won: false },
  { id: 829786, fecha: "26/12", rivalId: 693, rivalName: "Cardenales de Lara", rivalAbbr: "LAR", rivalLogo: getTeam(693).logoUrl, isHome: false, score: "13-15", won: false },
  { id: 829870, fecha: "22/12", rivalId: 697, rivalName: "Bravos de Margarita", rivalAbbr: "MAR", rivalLogo: getTeam(697).logoUrl, isHome: true, score: "8-2", won: true },
  { id: 829872, fecha: "21/12", rivalId: 696, rivalName: "Navegantes del Magallanes", rivalAbbr: "MAG", rivalLogo: getTeam(696).logoUrl, isHome: true, score: "7-3", won: true },
  { id: 829873, fecha: "20/12", rivalId: 693, rivalName: "Cardenales de Lara", rivalAbbr: "LAR", rivalLogo: getTeam(693).logoUrl, isHome: true, score: "3-12", won: false },
  { id: 829731, fecha: "19/12", rivalId: 692, rivalName: "Águilas del Zulia", rivalAbbr: "ZUL", rivalLogo: getTeam(692).logoUrl, isHome: false, score: "3-14", won: false },
  { id: 829733, fecha: "18/12", rivalId: 692, rivalName: "Águilas del Zulia", rivalAbbr: "ZUL", rivalLogo: getTeam(692).logoUrl, isHome: false, score: "3-6", won: false },
  { id: 829874, fecha: "16/12", rivalId: 694, rivalName: "Caribes de Anzoátegui", rivalAbbr: "ANZ", rivalLogo: getTeam(694).logoUrl, isHome: true, score: "8-7", won: true },
  { id: 829875, fecha: "15/12", rivalId: 697, rivalName: "Bravos de Margarita", rivalAbbr: "MAR", rivalLogo: getTeam(697).logoUrl, isHome: true, score: "2-3", won: false },
  { id: 829791, fecha: "14/12", rivalId: 693, rivalName: "Cardenales de Lara", rivalAbbr: "LAR", rivalLogo: getTeam(693).logoUrl, isHome: false, score: "5-14", won: false },
];

const BASELINE_2025_BATTERS: BatterLeaderItem[] = [
  { playerId: 660681, playerName: "Leandro Cedeño", avatarUrl: getPlayerHeadshotUrl(660681), avg: ".333", hr: 8, rbi: 28, ops: "1.042", ab: 126, h: 42 },
  { playerId: 682900, playerName: "Brainer Bonaci", avatarUrl: getPlayerHeadshotUrl(682900), avg: ".315", hr: 4, rbi: 22, ops: ".895", ab: 162, h: 51 },
  { playerId: 625506, playerName: "Aldrem Corredor", avatarUrl: getPlayerHeadshotUrl(625506), avg: ".298", hr: 7, rbi: 34, ops: ".882", ab: 188, h: 56 },
  { playerId: 605612, playerName: "Harold Castro", avatarUrl: getPlayerHeadshotUrl(605612), avg: ".305", hr: 5, rbi: 26, ops: ".820", ab: 164, h: 50 },
  { playerId: 682674, playerName: "Víctor Bericoto", avatarUrl: getPlayerHeadshotUrl(682674), avg: ".285", hr: 4, rbi: 18, ops: ".812", ab: 112, h: 32 },
];

const BASELINE_2025_PITCHERS: PitcherLeaderItem[] = [
  { playerId: 600965, playerName: "Ricardo Rodríguez", avatarUrl: getPlayerHeadshotUrl(600965), era: "1.52", whip: "0.93", ip: "23.2", so: 22, bb: 10 },
  { playerId: 660508, playerName: "Norwith Gudiño", avatarUrl: getPlayerHeadshotUrl(660508), era: "3.85", whip: "1.25", ip: "35.0", so: 37, bb: 20 },
  { playerId: 600526, playerName: "José Torres", avatarUrl: getPlayerHeadshotUrl(600526), era: "3.62", whip: "1.15", ip: "49.2", so: 45, bb: 11 },
  { playerId: 663778, playerName: "Sam Bordner", avatarUrl: getPlayerHeadshotUrl(663778), era: "3.45", whip: "1.25", ip: "21.0", so: 19, bb: 8 },
  { playerId: 468504, playerName: "Jhoulys Chacín", avatarUrl: getPlayerHeadshotUrl(468504), era: "4.15", whip: "1.38", ip: "43.1", so: 31, bb: 16 },
];

const BASELINE_2025_LAST_GAME: LastGameDetail = {
  id: 829871,
  gamePk: 829871,
  gameDate: "2025-12-27",
  gameDateFormatted: "27 de Diciembre, 2025",
  venue: "Estadio Monumental Simón Bolívar",
  homeTeamName: "Leones del Caracas",
  homeTeamAbbr: "CAR",
  homeTeamLogo: getTeam(695).logoUrl,
  homeScore: 4,
  awayTeamName: "Tiburones de La Guaira",
  awayTeamAbbr: "LAG",
  awayTeamLogo: getTeam(698).logoUrl,
  awayScore: 5,
  isHomeLeones: true,
  leonesWon: false,
  mvp: {
    playerId: 660681,
    playerName: "Leandro Cedeño",
    playerAvatar: getPlayerHeadshotUrl(660681),
    wpaTotal: 0.320,
    wpaBat: 0.320,
    wpaPit: 0.000,
    clutch: 0.180,
    headline: "Jonrón solitario y sencillo remolcador para empatar las acciones",
  },
};

/**
 * Obtiene las estadísticas de situación de Leones del Caracas.
 */
export async function getLeonesAdvancedStats(season = ACTIVE_SEASON): Promise<LeonesAdvancedStats> {
  // Para temporada 2025 usamos los datos auditados canónicos garantizados
  if (season === 2025) {
    return BASELINE_2025_STATS;
  }

  // Si estamos en otra temporada o 2026-2027 sin conexión Supabase, retornamos base limpia
  if (!supabase) {
    return CLEAN_ZERO_STATS;
  }

  try {
    const { data: rawGames } = await supabase
      .from("games")
      .select("*")
      .eq("season", season)
      .in("status", ["Final", "Completed", "Completed Early", "Game Over"])
      .in("game_type", ["R", "regular"])
      .or("home_team_id.eq.695,away_team_id.eq.695");

    if (!rawGames || rawGames.length === 0) {
      return CLEAN_ZERO_STATS;
    }

    // Ordenar cronológicamente para racha y últimos 10 juegos
    const sortedGames = [...rawGames].sort((a, b) => {
      const da = a.game_date ? new Date(a.game_date).getTime() : 0;
      const db = b.game_date ? new Date(b.game_date).getTime() : 0;
      return da !== db ? da - db : Number(a.id) - Number(b.id);
    });

    let wins = 0;
    let losses = 0;
    let homeWins = 0;
    let homeLosses = 0;
    let awayWins = 0;
    let awayLosses = 0;
    let nightWins = 0;
    let nightLosses = 0;
    let dayWins = 0;
    let dayLosses = 0;
    let shutouts = 0;
    let oneRunWins = 0;
    let oneRunLosses = 0;
    let extraWins = 0;
    let extraLosses = 0;

    const daysCount = { 0: { w: 0, l: 0 }, 1: { w: 0, l: 0 }, 2: { w: 0, l: 0 }, 3: { w: 0, l: 0 }, 4: { w: 0, l: 0 }, 5: { w: 0, l: 0 }, 6: { w: 0, l: 0 } };
    let octW = 0, octL = 0, novW = 0, novL = 0, decW = 0, decL = 0;

    const gameOutcomes: boolean[] = [];

    sortedGames.forEach((g) => {
      const isHome = Number(g.home_team_id) === 695;
      const cScore = isHome ? Number(g.home_score ?? 0) : Number(g.away_score ?? 0);
      const oScore = isHome ? Number(g.away_score ?? 0) : Number(g.home_score ?? 0);
      const won = cScore > oScore;
      gameOutcomes.push(won);

      if (won) wins++; else losses++;
      if (isHome) { if (won) homeWins++; else homeLosses++; }
      else { if (won) awayWins++; else awayLosses++; }

      const isDay = isDayGame(g.game_datetime, g.is_day_game);
      if (isDay) { if (won) dayWins++; else dayLosses++; }
      else { if (won) nightWins++; else nightLosses++; }

      if (won && oScore === 0) shutouts++;
      if (Math.abs(cScore - oScore) === 1) { if (won) oneRunWins++; else oneRunLosses++; }

      if (g.current_inning && g.current_inning > 9) {
        if (won) extraWins++; else extraLosses++;
      }

      if (g.game_date) {
        const d = new Date(g.game_date);
        const wd = (d.getUTCDay() + 6) % 7; // Lunes=0, Domingo=6
        if (won) (daysCount as Record<number, { w: number; l: number }>)[wd].w++;
        else (daysCount as Record<number, { w: number; l: number }>)[wd].l++;

        const m = d.getUTCMonth() + 1;
        if (m === 10) { if (won) octW++; else octL++; }
        else if (m === 11) { if (won) novW++; else novL++; }
        else if (m === 12) { if (won) decW++; else decL++; }
      }
    });

    // Racha actual precisa
    let streak = "-";
    if (gameOutcomes.length > 0) {
      const lastWon = gameOutcomes[gameOutcomes.length - 1];
      let sCount = 0;
      for (let i = gameOutcomes.length - 1; i >= 0; i--) {
        if (gameOutcomes[i] === lastWon) {
          sCount++;
        } else {
          break;
        }
      }
      streak = lastWon ? `${sCount} W` : `${sCount} L`;
    }

    // Últimos hasta 10 juegos
    const last10Slice = gameOutcomes.slice(-10);
    const l10Wins = last10Slice.filter(Boolean).length;
    const l10Losses = last10Slice.filter((w) => !w).length;
    const last10 = `${l10Wins}-${l10Losses}`;

    // Cálculo dinámico de situaciones de presión y decisiones de pitcheo vía MLB Stats API
    let remontados = 0;
    let arribaWins = 0;
    let arribaLosses = 0;
    let terreneadas = 0;
    let starterWins = 0;
    let starterLosses = 0;
    let relieverWins = 0;
    let relieverLosses = 0;
    let saves = 0;

    await Promise.all(
      sortedGames.map(async (g) => {
        try {
          const feed = await fetchGameLiveFeed(Number(g.id));
          if (!feed) return;

          const isHome = Number(g.home_team_id) === 695;
          const live = feed.liveData || {};
          const linescore = live.linescore || {};
          const box = live.boxscore || {};
          const dec = live.decisions || {};

          const hScore = Number(linescore.teams?.home?.runs ?? g.home_score ?? 0);
          const aScore = Number(linescore.teams?.away?.runs ?? g.away_score ?? 0);
          const cScore = isHome ? hScore : aScore;
          const oScore = isHome ? aScore : hScore;
          const won = cScore > oScore;

          // Carreras acumuladas al término del 6to inning
          let cRuns6 = 0;
          let oRuns6 = 0;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (linescore.innings || []).slice(0, 6).forEach((inn: any) => {
            cRuns6 += Number((isHome ? inn.home?.runs : inn.away?.runs) || 0);
            oRuns6 += Number((isHome ? inn.away?.runs : inn.home?.runs) || 0);
          });

          const ledAfter6 = cRuns6 > oRuns6;
          const trailedAfter6 = cRuns6 < oRuns6;

          if (trailedAfter6 && won) remontados++;
          if (ledAfter6 && won) arribaWins++;
          if (ledAfter6 && !won) arribaLosses++;

          // Terreneadas: Leones como home team gana en el 9no o extrainning dejando en el terreno
          const allPlays = live.plays?.allPlays || [];
          const lastPlay = allPlays[allPlays.length - 1] || {};
          const lastPlayHalf = lastPlay.about?.halfInning;
          const lastPlayInning = Number(lastPlay.about?.inning || 1);
          const isWalkoffPlay = Boolean(lastPlay.about?.isWalkOff);

          if (isHome && won && ((lastPlayHalf === "bottom" && lastPlayInning >= 9) || isWalkoffPlay)) {
            terreneadas++;
          }

          // Decisiones oficiales de pitcheo
          const winnerId = dec.winner?.id;
          const loserId = dec.loser?.id;
          const saveId = dec.save?.id;

          const leoBox = box.teams?.[isHome ? "home" : "away"] || {};
          const pitchers = (leoBox.pitchers || []).map(Number);
          const starterId = pitchers[0];
          const relievers = pitchers.slice(1);

          if (won && winnerId && winnerId === starterId) starterWins++;
          if (!won && loserId && loserId === starterId) starterLosses++;
          if (won && winnerId && relievers.includes(winnerId)) relieverWins++;
          if (!won && loserId && relievers.includes(loserId)) relieverLosses++;
          if (won && saveId && pitchers.includes(saveId)) saves++;
        } catch (err) {
          console.warn(`Error procesando feed de juego ${g.id} para métricas avanzadas:`, err);
        }
      })
    );

    // Fallbacks defensivos si fallara la red de MLB
    const effectiveStarters =
      starterWins + starterLosses > 0 ? `${starterWins}-${starterLosses}` : `0-${losses}`;
    const effectiveRelievers =
      relieverWins + relieverLosses > 0 ? `${relieverWins}-${relieverLosses}` : `${wins}-0`;

    return {
      totalGames: rawGames.length,
      record: `${wins}-${losses}`,
      homeRecord: `${homeWins}-${homeLosses}`,
      awayRecord: `${awayWins}-${awayLosses}`,
      nightRecord: `${nightWins}-${nightLosses}`,
      dayRecord: `${dayWins}-${dayLosses}`,
      shutouts,
      streak,
      extraInning: `${extraWins}-${extraLosses}`,
      last10,
      oneRun: `${oneRunWins}-${oneRunLosses}`,
      remontados,
      up: `${arribaWins}-${arribaLosses}`,
      terreneadas,
      starters: effectiveStarters,
      relievers: effectiveRelievers,
      saves,
      oct: `${octW}G-${octL}P`,
      nov: `${novW}G-${novL}P`,
      dec: `${decW}G-${decL}P`,
      daysRecord: {
        lunes: `${daysCount[0].w}G-${daysCount[0].l}P`,
        martes: `${daysCount[1].w}G-${daysCount[1].l}P`,
        miercoles: `${daysCount[2].w}G-${daysCount[2].l}P`,
        jueves: `${daysCount[3].w}G-${daysCount[3].l}P`,
        viernes: `${daysCount[4].w}G-${daysCount[4].l}P`,
        sabado: `${daysCount[5].w}G-${daysCount[5].l}P`,
        domingo: `${daysCount[6].w}G-${daysCount[6].l}P`,
      },
    };
  } catch (error) {
    console.warn("Fallo cálculo dinámico de estadísticas de Leones, usando base limpia:", error);
    return CLEAN_ZERO_STATS;
  }
}

/**
 * Obtiene el desglose semana a semana ISO de campeonato.
 */
export async function getWeeklyRecords(season = ACTIVE_SEASON): Promise<WeeklyRecord[]> {
  if (season === 2025) {
    return BASELINE_2025_WEEKS;
  }

  // Generación limpia por defecto para 2026-2027
  const buildEmptyWeeks = () =>
    WEEKS_2026_CONFIG.map((w) => ({
      weekNum: w.weekNum,
      semana: w.semana,
      juegos: 0,
      w: 0,
      l: 0,
      pct: ".000",
      cf: 0,
      cp: 0,
      dif: "0",
      record: "0G-0P",
    }));

  if (!supabase) {
    return buildEmptyWeeks();
  }

  try {
    const { data: rawGames } = await supabase
      .from("games")
      .select("*")
      .eq("season", season)
      .in("status", ["Final", "Completed", "Completed Early", "Game Over"])
      .in("game_type", ["R", "regular"])
      .or("home_team_id.eq.695,away_team_id.eq.695");

    const games = rawGames || [];

    return WEEKS_2026_CONFIG.map((w) => {
      const weekGames = games.filter((g) => {
        if (!g.game_date) return false;
        const d = g.game_date.slice(0, 10);
        return d >= w.startDate && d <= w.endDate;
      });

      let wWins = 0;
      let wLosses = 0;
      let wCf = 0;
      let wCp = 0;

      weekGames.forEach((g) => {
        const isHome = Number(g.home_team_id) === 695;
        const cScore = isHome ? Number(g.home_score ?? 0) : Number(g.away_score ?? 0);
        const oScore = isHome ? Number(g.away_score ?? 0) : Number(g.home_score ?? 0);
        if (cScore > oScore) wWins++;
        else wLosses++;
        wCf += cScore;
        wCp += oScore;
      });

      const totalPlayed = weekGames.length;
      const pctVal = totalPlayed > 0 ? (wWins / totalPlayed).toFixed(3).replace(/^0+/, "") : ".000";
      const difNum = wCf - wCp;
      const difStr = difNum > 0 ? `+${difNum}` : `${difNum}`;

      return {
        weekNum: w.weekNum,
        semana: w.semana,
        juegos: totalPlayed,
        w: wWins,
        l: wLosses,
        pct: pctVal.startsWith(".") ? pctVal : `.${pctVal}`,
        cf: wCf,
        cp: wCp,
        dif: difStr,
        record: `${wWins}G-${wLosses}P`,
      };
    });
  } catch (err) {
    console.warn("Fallo cálculo dinámico de semanas 2026, usando semanas limpias:", err);
    return buildEmptyWeeks();
  }
}

/**
 * Obtiene los detalles y el MVP del último encuentro jugado.
 */
export async function getLastGameDetail(season = ACTIVE_SEASON): Promise<LastGameDetail | null> {
  if (supabase) {
    try {
      const { data: rawGames } = await supabase
        .from("games")
        .select("*")
        .eq("season", season)
        .in("status", ["Final", "Completed", "Completed Early", "Game Over"])
        .in("game_type", ["R", "regular"])
        .or("home_team_id.eq.695,away_team_id.eq.695")
        .order("game_date", { ascending: false })
        .limit(1);

      if (rawGames && rawGames.length > 0) {
        const g = rawGames[0];
        const isHomeLeones = Number(g.home_team_id) === 695;
        const homeTeam = getTeam(Number(g.home_team_id));
        const awayTeam = getTeam(Number(g.away_team_id));
        const homeScore = Number(g.home_score ?? 0);
        const awayScore = Number(g.away_score ?? 0);
        const leonesScore = isHomeLeones ? homeScore : awayScore;
        const oppScore = isHomeLeones ? awayScore : homeScore;
        const leonesWon = leonesScore > oppScore;

        let gameDateFormatted = g.game_date || "";
        if (g.game_date && g.game_date.length >= 10) {
          const parts = g.game_date.slice(0, 10).split("-");
          const months = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
          ];
          const mIndex = parseInt(parts[1], 10) - 1;
          gameDateFormatted = `${parseInt(parts[2], 10)} de ${months[mIndex]}, ${parts[0]}`;
        }

        let mvp = season === 2025 ? BASELINE_2025_LAST_GAME.mvp : null;
        try {
          // Obtener el jugador de mayor impacto de victoria (WPA) en este juego específico
          const { processGameWpa, fetchSeasonWpaLeaders } = await import("./wpa-engine");
          let topLeader: {
            playerId: number;
            player: string;
            type: "batter" | "pitcher";
            wpa: number;
            clutch: number;
          } | null = null;

          const gameWpa = await processGameWpa(g.id);
          if (gameWpa && gameWpa.plays && gameWpa.plays.length > 0) {
            const playerWpa: Record<
              number,
              { id: number; name: string; type: "batter" | "pitcher"; wpa: number; clutch: number }
            > = {};

            for (const p of gameWpa.plays) {
              const isBatter = p.leonesBatting;
              const pId = isBatter ? p.batterId : p.pitcherId;
              const pName = isBatter ? p.batter : p.pitcher;
              if (!pId) continue;
              if (!playerWpa[pId]) {
                playerWpa[pId] = {
                  id: pId,
                  name: pName,
                  type: isBatter ? "batter" : "pitcher",
                  wpa: 0,
                  clutch: 0,
                };
              }
              playerWpa[pId].wpa += p.wpa;
              playerWpa[pId].clutch += p.wpa - p.wpaLi;
            }

            const sorted = Object.values(playerWpa).sort((a, b) => b.wpa - a.wpa);
            if (sorted.length > 0) {
              const top = sorted[0];
              topLeader = {
                playerId: top.id,
                player: top.name,
                type: top.type,
                wpa: Number(top.wpa.toFixed(3)),
                clutch: Number(top.clutch.toFixed(3)),
              };
            }
          }

          if (!topLeader) {
            const wpaLeaders = await fetchSeasonWpaLeaders(season);
            if (wpaLeaders && wpaLeaders.length > 0) {
              const top = [...wpaLeaders].sort((a, b) => b.wpa - a.wpa)[0];
              topLeader = {
                playerId: top.playerId,
                player: top.player,
                type: top.type,
                wpa: top.wpa,
                clutch: top.clutch,
              };
            }
          }

          if (topLeader) {
            let headline = "";
            if (topLeader.type === "pitcher") {
              const { data: pitData } = await supabase
                .from("pitching_stats")
                .select("ip_string, er, so")
                .eq("game_id", g.id)
                .eq("player_id", topLeader.playerId)
                .limit(1);

              if (pitData && pitData.length > 0) {
                const p = pitData[0];
                headline = `${p.ip_string || "0.0"} IP, ${p.er ?? 0} CL, ${p.so ?? 0} K — Mayor impacto de victoria (+${topLeader.wpa.toFixed(3)} WPA)`;
              } else {
                headline = `Líder de WPA de Leones (+${topLeader.wpa.toFixed(3)})`;
              }
            } else {
              const { data: batData } = await supabase
                .from("batting_stats")
                .select("ab, h, hr, rbi")
                .eq("game_id", g.id)
                .eq("player_id", topLeader.playerId)
                .limit(1);

              if (batData && batData.length > 0) {
                const b = batData[0];
                headline = `${b.h}-${b.ab}${b.hr > 0 ? `, ${b.hr} HR` : ""}, ${b.rbi} CI — Mayor impacto de victoria (+${topLeader.wpa.toFixed(3)} WPA)`;
              } else {
                headline = `Líder de WPA de Leones (+${topLeader.wpa.toFixed(3)})`;
              }
            }

            mvp = {
              playerId: topLeader.playerId,
              playerName: topLeader.player,
              playerAvatar: getPlayerHeadshotUrl(topLeader.playerId),
              wpaTotal: topLeader.wpa,
              wpaBat: topLeader.type === "batter" ? topLeader.wpa : 0.0,
              wpaPit: topLeader.type === "pitcher" ? topLeader.wpa : 0.0,
              clutch: topLeader.clutch,
              headline,
            };
          }
        } catch {
          // Mantener MVP base
        }

        return {
          id: Number(g.id),
          gamePk: Number(g.game_pk ?? g.id),
          gameDate: g.game_date || "",
          gameDateFormatted,
          venue: g.venue || (isHomeLeones ? "Estadio Monumental Simón Bolívar" : "Estadio Rival"),
          homeTeamName: homeTeam.name,
          homeTeamAbbr: homeTeam.abbreviation,
          homeTeamLogo: homeTeam.logoUrl,
          homeScore,
          awayTeamName: awayTeam.name,
          awayTeamAbbr: awayTeam.abbreviation,
          awayTeamLogo: awayTeam.logoUrl,
          awayScore,
          isHomeLeones,
          leonesWon,
          mvp,
        };
      }
    } catch (err) {
      console.warn("Error consultando último juego de Leones:", err);
    }
  }
  return BASELINE_2025_LAST_GAME;
}

/**
 * Obtiene los últimos 10 encuentros jugados por Leones.
 */
export async function getRecentTrends(limit = 10, season = ACTIVE_SEASON): Promise<TrendGameItem[]> {
  if (supabase) {
    try {
      const { data: rawGames } = await supabase
        .from("games")
        .select("*")
        .eq("season", season)
        .in("status", ["Final", "Completed", "Completed Early", "Game Over"])
        .in("game_type", ["R", "regular"])
        .or("home_team_id.eq.695,away_team_id.eq.695")
        .order("game_date", { ascending: false })
        .limit(limit);

      if (rawGames && rawGames.length > 0) {
        return rawGames.map((g) => {
          const isHome = Number(g.home_team_id) === 695;
          const rivalId = isHome ? Number(g.away_team_id) : Number(g.home_team_id);
          const rivalTeam = getTeam(rivalId);
          const caracasScore = isHome ? Number(g.home_score ?? 0) : Number(g.away_score ?? 0);
          const rivalScore = isHome ? Number(g.away_score ?? 0) : Number(g.home_score ?? 0);
          const won = caracasScore > rivalScore;

          let fecha = g.game_date?.slice(5) || "";
          if (g.game_date && g.game_date.length >= 10) {
            const parts = g.game_date.slice(0, 10).split("-");
            fecha = `${parts[2]}/${parts[1]}`;
          }

          return {
            id: Number(g.id),
            fecha,
            rivalId,
            rivalName: rivalTeam.name,
            rivalAbbr: rivalTeam.abbreviation,
            rivalLogo: rivalTeam.logoUrl,
            isHome,
            score: `${caracasScore}-${rivalScore}`,
            won,
          };
        });
      }
    } catch (err) {
      console.warn("Error consultando tendencias de Leones:", err);
    }
  }
  return BASELINE_2025_TRENDS.slice(0, limit);
}

/**
 * Obtiene los líderes de bateo y pitcheo de Leones del Caracas.
 */
export async function getCaracasTeamLeaders(season = ACTIVE_SEASON): Promise<{
  batters: BatterLeaderItem[];
  pitchers: PitcherLeaderItem[];
}> {
  try {
    const rawBatters = await getBattingStats(season, "R", 695, 10, 0);
    // Filtrar con mínimo 0.1 IP para excluir bateadores o lanzadores sin outs registrados
    const rawPitchers = await getPitchingStats(season, "R", 695, 10, 0.1);

    const batters: BatterLeaderItem[] =
      rawBatters && rawBatters.length > 0
        ? rawBatters.slice(0, 5).map((b) => ({
            playerId: b.playerId,
            playerName: b.playerName,
            avatarUrl: b.playerAvatar,
            avg: b.avg ? b.avg.toFixed(3).replace(/^0+/, "") : ".000",
            hr: b.homeRuns,
            rbi: b.rbi,
            ops: b.ops ? b.ops.toFixed(3).replace(/^0+/, "") : ".000",
            ab: b.atBats,
            h: b.hits,
          }))
        : (season === 2025 ? BASELINE_2025_BATTERS : []);

    // Filtrar estrictamente lanzadores con al menos 0.1 IP (1 out registrado)
    const qualifiedPitchers = (rawPitchers || []).filter(
      (p) => (p.inningsPitched || 0) >= 0.1
    );

    const pitchers: PitcherLeaderItem[] =
      qualifiedPitchers.length > 0
        ? qualifiedPitchers.slice(0, 5).map((p) => ({
            playerId: p.playerId,
            playerName: p.playerName,
            avatarUrl: p.playerAvatar,
            era: p.era.toFixed(2),
            whip: p.whip.toFixed(2),
            ip: p.inningsDisplay,
            so: p.strikeouts,
            bb: p.walks,
          }))
        : (season === 2025 ? BASELINE_2025_PITCHERS : []);

    return { batters, pitchers };
  } catch (error) {
    console.warn("Fallo consulta de líderes, usando baseline:", error);
    return {
      batters: season === 2025 ? BASELINE_2025_BATTERS : [],
      pitchers: season === 2025 ? BASELINE_2025_PITCHERS : [],
    };
  }
}

/**
 * Mapeo de metadata de canales lineales y de señal abierta.
 */
interface ChannelConfig {
  key: string;
  name: string;
  logo: string;
}

const LINEAR_CHANNELS: Record<string, ChannelConfig> = {
  "bym sport": { key: "bym", name: "ByM Sport", logo: "/assets/channels/bym.png" },
  "1baseball": { key: "1baseball", name: "1Baseball Network", logo: "/assets/channels/one_baseball.png" },
  "ivc": { key: "ivc", name: "IVC", logo: "/assets/channels/ivc.png" },
  "televen": { key: "televen", name: "Televen", logo: "/assets/channels/televen.svg" },
  "venevisión": { key: "venevision", name: "Venevisión", logo: "/assets/channels/venevision.svg" },
  "venevision": { key: "venevision", name: "Venevisión", logo: "/assets/channels/venevision.svg" },
  "meridiano tv": { key: "meridiano", name: "Meridiano TV", logo: "/assets/channels/meridiano.png" },
  "meridiano": { key: "meridiano", name: "Meridiano TV", logo: "/assets/channels/meridiano.png" },
  "lvbp youtube": { key: "youtube", name: "LVBP YouTube", logo: "/assets/channels/youtube.svg" },
  "youtube": { key: "youtube", name: "LVBP YouTube", logo: "/assets/channels/youtube.svg" },
  "simpletv": { key: "simpletv", name: "SimpleTV", logo: "/assets/channels/simpletv.png" },
};

/**
 * Calcula el récord y cantidad de juegos asignados por cada canal de transmisión.
 * Excluye rigurosamente a BeisbolPlay de la comparativa competitiva.
 */
export async function getBroadcastChannelRecords(season = 2026): Promise<BroadcastChannelRecord[]> {
  const events = calendarData?.events || [];
  const channelMap: Record<
    string,
    {
      name: string;
      logo: string;
      scheduled: number;
      played: number;
      wins: number;
      losses: number;
    }
  > = {};

  // Inicializar canales lineales estándar
  Object.values(LINEAR_CHANNELS).forEach((cfg) => {
    if (!channelMap[cfg.key]) {
      channelMap[cfg.key] = {
        name: cfg.name,
        logo: cfg.logo,
        scheduled: 0,
        played: 0,
        wins: 0,
        losses: 0,
      };
    }
  });

  // Contabilizar juegos asignados en el calendario oficial 2026-2027
  events.forEach((ev) => {
    const rawTransmission = (ev.transmission || "").toLowerCase();
    const parts = rawTransmission.split(",").map((p) => p.trim());

    parts.forEach((part) => {
      // Excluir BeisbolPlay (transmite el 100%)
      if (part.includes("beisbolplay")) return;

      for (const [pattern, cfg] of Object.entries(LINEAR_CHANNELS)) {
        if (part === pattern || part.includes(pattern)) {
          if (channelMap[cfg.key]) {
            channelMap[cfg.key].scheduled += 1;
          }
          break;
        }
      }
    });
  });

  // Si existen resultados jugados cruzados con Supabase, acumular wins y losses
  if (supabase) {
    try {
      const { data: rawGames } = await supabase
        .from("games")
        .select("game_date, home_score, away_score, home_team_id")
        .eq("season", season)
        .in("status", ["Final", "Completed", "Completed Early", "Game Over"])
        .in("game_type", ["R", "regular"])
        .or("home_team_id.eq.695,away_team_id.eq.695");

      if (rawGames && rawGames.length > 0) {
        rawGames.forEach((g) => {
          const matchedEvent = events.find((ev) => ev.date === g.game_date?.slice(0, 10));
          if (!matchedEvent) return;

          const isHome = Number(g.home_team_id) === 695;
          const leonesScore = isHome ? Number(g.home_score) : Number(g.away_score);
          const oppScore = isHome ? Number(g.away_score) : Number(g.home_score);
          const won = leonesScore > oppScore;

          const rawTrans = (matchedEvent.transmission || "").toLowerCase();
          const parts = rawTrans.split(",").map((p) => p.trim());

          parts.forEach((part) => {
            if (part.includes("beisbolplay")) return;
            for (const [pattern, cfg] of Object.entries(LINEAR_CHANNELS)) {
              if (part === pattern || part.includes(pattern)) {
                if (channelMap[cfg.key]) {
                  channelMap[cfg.key].played += 1;
                  if (won) channelMap[cfg.key].wins += 1;
                  else channelMap[cfg.key].losses += 1;
                }
                break;
              }
            }
          });
        });
      }
    } catch {
      // Silencioso: mantendrá scheduled y played=0
    }
  }

  // Filtrar solo los canales que tienen al menos 1 juego programado o jugado
  const results: BroadcastChannelRecord[] = Object.entries(channelMap)
    .filter(([_, data]) => data.scheduled > 0 || data.played > 0)
    .map(([key, data]) => {
      const pctVal = data.played > 0 ? (data.wins / data.played).toFixed(3).replace(/^0+/, "") : ".000";
      return {
        channelKey: key,
        channelName: data.name,
        logoUrl: data.logo,
        scheduledGames: data.scheduled,
        gamesPlayed: data.played,
        wins: data.wins,
        losses: data.losses,
        record: `${data.wins}G-${data.losses}P`,
        pct: pctVal.startsWith(".") ? pctVal : `.${pctVal}`,
      };
    });

  // Ordenar descendentemente por juegos asignados
  results.sort((a, b) => b.scheduledGames - a.scheduledGames);
  return results;
}

const LVBP_RIVALS: number[] = [696, 698, 693, 699, 692, 694, 697];

/**
 * Obtiene el récord de series particulares de Leones del Caracas contra los otros 7 rivales de la LVBP.
 * Programados: 8 encuentros contra cada franquicia en la serie regular oficial.
 */
export async function getHeadToHeadRecords(season = ACTIVE_SEASON): Promise<HeadToHeadRecord[]> {
  const defaultRecords: HeadToHeadRecord[] = LVBP_RIVALS.map((rivalId) => {
    const rival = getTeam(rivalId);
    return {
      rivalId,
      rivalName: rival.name,
      rivalAbbr: rival.abbreviation,
      rivalLogo: rival.logoUrl,
      scheduledGames: 8,
      gamesPlayed: 0,
      remainingGames: 8,
      wins: 0,
      losses: 0,
      record: "0G-0P",
      pct: ".000",
      runsFor: 0,
      runsAgainst: 0,
      runDiff: "0",
      homeRecord: "0-0",
      awayRecord: "0-0",
      statusText: "Sin disputar",
    };
  });

  if (!supabase) {
    return defaultRecords;
  }

  try {
    const { data: rawGames } = await supabase
      .from("games")
      .select("*")
      .eq("season", season)
      .in("status", ["Final", "Completed", "Completed Early", "Game Over"])
      .in("game_type", ["R", "regular"])
      .or("home_team_id.eq.695,away_team_id.eq.695");

    if (!rawGames || rawGames.length === 0) {
      return defaultRecords;
    }

    const rivalMap: Record<
      number,
      {
        played: number;
        wins: number;
        losses: number;
        homeWins: number;
        homeLosses: number;
        awayWins: number;
        awayLosses: number;
        runsFor: number;
        runsAgainst: number;
      }
    > = {};

    LVBP_RIVALS.forEach((id) => {
      rivalMap[id] = {
        played: 0,
        wins: 0,
        losses: 0,
        homeWins: 0,
        homeLosses: 0,
        awayWins: 0,
        awayLosses: 0,
        runsFor: 0,
        runsAgainst: 0,
      };
    });

    rawGames.forEach((g) => {
      const isHome = Number(g.home_team_id) === 695;
      const rivId = isHome ? Number(g.away_team_id) : Number(g.home_team_id);
      if (!rivalMap[rivId]) return;

      const cScore = isHome ? Number(g.home_score ?? 0) : Number(g.away_score ?? 0);
      const oScore = isHome ? Number(g.away_score ?? 0) : Number(g.home_score ?? 0);
      const won = cScore > oScore;

      rivalMap[rivId].played += 1;
      if (won) {
        rivalMap[rivId].wins += 1;
        if (isHome) rivalMap[rivId].homeWins += 1;
        else rivalMap[rivId].awayWins += 1;
      } else {
        rivalMap[rivId].losses += 1;
        if (isHome) rivalMap[rivId].homeLosses += 1;
        else rivalMap[rivId].awayLosses += 1;
      }
      rivalMap[rivId].runsFor += cScore;
      rivalMap[rivId].runsAgainst += oScore;
    });

    return LVBP_RIVALS.map((rivalId) => {
      const rival = getTeam(rivalId);
      const stats = rivalMap[rivalId];
      const scheduledGames = 8;
      const remainingGames = Math.max(0, scheduledGames - stats.played);
      const pctVal =
        stats.played > 0
          ? (stats.wins / stats.played).toFixed(3).replace(/^0+/, "")
          : ".000";
      const diffVal = stats.runsFor - stats.runsAgainst;
      const runDiff = diffVal > 0 ? `+${diffVal}` : `${diffVal}`;

      let statusText = "Sin disputar";
      if (stats.played > 0) {
        if (stats.wins > stats.losses) {
          statusText = `Leones lidera ${stats.wins}-${stats.losses}`;
        } else if (stats.losses > stats.wins) {
          statusText = `${rival.abbreviation} lidera ${stats.losses}-${stats.wins}`;
        } else {
          statusText = `Empatada ${stats.wins}-${stats.losses}`;
        }
      }

      return {
        rivalId,
        rivalName: rival.name,
        rivalAbbr: rival.abbreviation,
        rivalLogo: rival.logoUrl,
        scheduledGames,
        gamesPlayed: stats.played,
        remainingGames,
        wins: stats.wins,
        losses: stats.losses,
        record: `${stats.wins}G-${stats.losses}P`,
        pct: pctVal.startsWith(".") ? pctVal : `.${pctVal}`,
        runsFor: stats.runsFor,
        runsAgainst: stats.runsAgainst,
        runDiff,
        homeRecord: `${stats.homeWins}-${stats.homeLosses}`,
        awayRecord: `${stats.awayWins}-${stats.awayLosses}`,
        statusText,
      };
    });
  } catch (error) {
    console.warn("Fallo cálculo de series particulares, usando predeterminadas:", error);
    return defaultRecords;
  }
}

/**
 * Obtiene toda la información consolidada para la suite de pestañas del Centro de Mando.
 */
export async function getDashboardTabsData(season = ACTIVE_SEASON): Promise<DashboardTabsData> {
  const [advancedStats, weeklyRecords, lastGame, trends, leaders, channelRecords, h2hRecords] =
    await Promise.all([
      getLeonesAdvancedStats(season),
      getWeeklyRecords(season),
      getLastGameDetail(season),
      getRecentTrends(10, season),
      getCaracasTeamLeaders(season),
      getBroadcastChannelRecords(2026),
      getHeadToHeadRecords(season),
    ]);

  return {
    advancedStats,
    weeklyRecords,
    lastGame,
    trends,
    leaders,
    channelRecords,
    h2hRecords,
  };
}
