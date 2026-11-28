import {
  XInsightCardVisualData,
  XInsightDraft,
  XInsightFocus,
  XInsightsContextSummary,
  XInsightsResponseData,
} from "@/types/x-insights";
import { TeamStanding } from "@/types/sports";
import {
  BatterLeaderItem,
  HeadToHeadRecord,
  LastGameDetail,
  LeonesAdvancedStats,
  PitcherLeaderItem,
  TrendGameItem,
} from "@/types/leones-stats";
import { RachasTabData } from "@/types/streaks";
import { CollectiveStatsResult } from "@/types/collective";
import { SeasonWpaLeader } from "@/types/wpa";
import { ACTIVE_SEASON, formatSeason } from "./constants";
import { getStandings } from "./supabase";
import {
  getCaracasTeamLeaders,
  getHeadToHeadRecords,
  getLastGameDetail,
  getLeonesAdvancedStats,
  getRecentTrends,
} from "./leones-stats-service";
import { getStreaksData } from "./streaks-service";
import { getCollectiveStats } from "./collective";
import { fetchSeasonWpaLeaders } from "./wpa-engine";

const LEONES_TEAM_ID = 695;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_MANUAL_CONTEXT_CHARS = 400;
const MAX_TWEET_CHARS = 280;
const GEMINI_TIMEOUT_MS = 25_000;
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const DEFAULT_SOURCE_FOOTER = "@RepubCaraquista • Datos LVBP verificados";

export const VALID_X_INSIGHT_FOCUSES: readonly XInsightFocus[] = [
  "auto",
  "postgame",
  "tendencia",
  "debate",
  "hilo",
] as const;

export type XInsightsErrorCode =
  | "MISSING_API_KEY"
  | "UNAUTHORIZED"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "UPSTREAM_ERROR"
  | "VALIDATION_ERROR";

export class XInsightsError extends Error {
  readonly code: XInsightsErrorCode;
  readonly status: number;

  constructor(code: XInsightsErrorCode, message: string, status: number) {
    super(message);
    this.name = "XInsightsError";
    this.code = code;
    this.status = status;
  }
}

export interface LvbpContextSnapshot {
  season: number;
  seasonLabel: string;
  collectedAt: string;
  leonesSummary: {
    record: string;
    position: number;
    gamesBack: string;
    pct: string;
    totalGames: number;
    homeRecord: string;
    awayRecord: string;
    dayRecord: string;
    nightRecord: string;
    streak: string;
    last10: string;
    oneRun: string;
    extraInning: string;
    shutouts: number;
    remontados: number;
    up: string;
    terreneadas: number;
    pechofriadas: number;
    starters: string;
    relievers: string;
    saves: number;
    withRondon: string;
    withoutRondon: string;
    runsScored: number;
    runsAllowed: number;
    runDifferential: number;
  };
  lastGame: {
    date: string;
    formattedDate: string;
    venue: string;
    homeTeam: string;
    homeAbbr: string;
    homeScore: number;
    awayTeam: string;
    awayAbbr: string;
    awayScore: number;
    isHomeLeones: boolean;
    leonesWon: boolean;
    headline: string;
    mvp: {
      name: string;
      wpaTotal: number;
      clutch: number;
      headline: string;
      statsSummary?: string;
    } | null;
  } | null;
  recentTrends: Array<{
    fecha: string;
    rivalAbbr: string;
    rivalName: string;
    isHome: boolean;
    score: string;
    won: boolean;
  }>;
  teamLeaders: {
    batters: Array<{
      name: string;
      avg: string;
      hr: number;
      rbi: number;
      ops: string;
      ab: number;
      h: number;
    }>;
    pitchers: Array<{
      name: string;
      era: string;
      whip: string;
      ip: string;
      so: number;
      bb: number;
    }>;
  };
  headToHead: Array<{
    rivalName: string;
    rivalAbbr: string;
    record: string;
    pct: string;
    gamesPlayed: number;
    remainingGames: number;
    runDiff: string;
    homeRecord: string;
    awayRecord: string;
    statusText: string;
  }>;
  streaks: {
    general: string;
    home: string;
    away: string;
    hitting: Array<{ playerName: string; streakLength: number; statsSummary: string }>;
    onBase: Array<{ playerName: string; streakLength: number; statsSummary: string }>;
    pitching: Array<{ playerName: string; streakLength: number; statsSummary: string }>;
  };
  wpaLeaders: Array<{
    player: string;
    type: "batter" | "pitcher";
    games: number;
    wpa: number;
    liAvg: number;
    clutch: number;
  }>;
  leagueStandings: Array<{
    position: number;
    teamId: number;
    teamName: string;
    abbreviation: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    pct: string;
    gamesBack: string;
    runsScored: number;
    runsAllowed: number;
    runDifferential: number;
    homeRecord: string;
    awayRecord: string;
    streak: string;
    last10: string;
  }>;
  collectiveComparison: {
    leonesRanks: {
      opsRank: number | null;
      avgRank: number | null;
      hrRank: number | null;
      runsRank: number | null;
      eraRank: number | null;
      whipRank: number | null;
      soPitchingRank: number | null;
      fpctRank: number | null;
      totalTeams: number;
    };
    batting: Array<{
      teamName: string;
      teamAbbr: string;
      isLeones: boolean;
      games: number;
      r: number;
      h: number;
      hr: number;
      bb: number;
      so: number;
      sb: number;
      avg: string;
      obp: string;
      slg: string;
      ops: string;
      lob: number;
    }>;
    pitching: Array<{
      teamName: string;
      teamAbbr: string;
      isLeones: boolean;
      games: number;
      era: string;
      whip: string;
      sv: number;
      holds: number;
      blownSaves: number;
      so: number;
      bb: number;
      hr: number;
      k9: string;
      bb9: string;
      baa: string;
    }>;
    fielding: Array<{
      teamName: string;
      teamAbbr: string;
      isLeones: boolean;
      games: number;
      e: number;
      dp: number;
      fpct: string;
      csPct: string;
    }>;
  };
}

export interface GenerateXInsightsOptions {
  focus?: XInsightFocus;
  manualContext?: string;
  forceRefresh?: boolean;
  season?: number;
  snapshot?: LvbpContextSnapshot;
}

interface CacheEntry {
  expiresAt: number;
  data: XInsightsResponseData;
}

const xInsightsCache = new Map<string, CacheEntry>();

export function clearXInsightsCache(): void {
  xInsightsCache.clear();
}

export function isValidXInsightFocus(value: unknown): value is XInsightFocus {
  return (
    typeof value === "string" &&
    (VALID_X_INSIGHT_FOCUSES as readonly string[]).includes(value)
  );
}

export function sanitizeManualContext(manualContext?: string): string {
  if (!manualContext || typeof manualContext !== "string") return "";
  return manualContext
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MANUAL_CONTEXT_CHARS);
}

export function sanitizeBannedTerms(text: string): string {
  if (!text || typeof text !== "string") return "";
  let cleaned = text
    .replace(/\bpower\s+rankings?\s+elo\b/gi, "Power Rankings")
    .replace(/\brating\s+elo\b/gi, "índice de rendimiento")
    .replace(/\bpuntaje\s+elo\b/gi, "índice de rendimiento")
    .replace(/\bmodelo\s+elo\b/gi, "modelo de probabilidades")
    .replace(/\belo\b/gi, "índice de fuerza")
    .replace(/\bsabermetr[íi]a\b/gi, "analítica avanzada")
    .replace(/\bsaberm[ée]tric(o|a)(s)?\b/gi, (_m, gender: string, plural?: string) =>
      `analític${gender.toLowerCase()}${plural ? "s" : ""}`
    )
    .replace(/\bexit\s*velocity\b/gi, "contacto sólido")
    .replace(/\blaunch\s*angle\b/gi, "trayectoria del batazo")
    .replace(/\bbarrels?\b/gi, "batazos de calidad")
    .replace(/\bsprint\s*speed\b/gi, "velocidad en bases")
    .replace(/\bvelocidad\s+de\s+salida\b/gi, "contacto sólido")
    .replace(/\b[áa]ngulo\s+de\s+salida\b/gi, "trayectoria del batazo");

  cleaned = cleaned.replace(/[ \t]{2,}/g, " ").trim();
  return cleaned;
}

export function enforceTweetLimit(text: string, maxLen = MAX_TWEET_CHARS): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  const slice = normalized.slice(0, maxLen - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cutoff = lastSpace >= Math.floor(maxLen * 0.65) ? slice.slice(0, lastSpace) : slice;
  return `${cutoff.trimEnd()}…`;
}

function formatStandingPct(pct: number): string {
  if (!Number.isFinite(pct) || pct <= 0) return ".000";
  return pct.toFixed(3).replace(/^0/, "");
}

function buildLastGameHeadline(lastGame: LastGameDetail | null): string {
  if (!lastGame) return "Sin juegos finalizados registrados en la temporada";
  const leonesScore = lastGame.isHomeLeones ? lastGame.homeScore : lastGame.awayScore;
  const oppScore = lastGame.isHomeLeones ? lastGame.awayScore : lastGame.homeScore;
  const oppName = lastGame.isHomeLeones ? lastGame.awayTeamName : lastGame.homeTeamName;
  const verb = lastGame.leonesWon ? "Victoria" : "Derrota";
  const loc = lastGame.isHomeLeones ? "en casa vs" : "de visitante @";
  return `${verb} ${leonesScore}-${oppScore} ${loc} ${oppName} (${lastGame.gameDateFormatted})`;
}

function buildCacheKey(season: number, focus: XInsightFocus, manualContext?: string): string {
  const normalizedManual = sanitizeManualContext(manualContext).toLowerCase();
  return `${season}:${focus}:${normalizedManual}`;
}

function cloneResponseData(data: XInsightsResponseData, cached: boolean): XInsightsResponseData {
  return {
    ...data,
    cached,
    contextSummary: { ...data.contextSummary },
    drafts: data.drafts.map((d) => ({
      ...d,
      tweets: [...d.tweets],
      pollOptions: d.pollOptions ? [...d.pollOptions] : undefined,
      cardSuggestion: { ...d.cardSuggestion },
    })),
  };
}

function computeRank<T>(
  items: T[],
  targetPredicate: (item: T) => boolean,
  compareFn: (a: T, b: T) => number
): number | null {
  if (!items.length) return null;
  const sorted = [...items].sort(compareFn);
  const idx = sorted.findIndex(targetPredicate);
  return idx >= 0 ? idx + 1 : null;
}

const DEFAULT_ADVANCED_STATS: LeonesAdvancedStats = {
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
  withRondon: "0-0",
  withoutRondon: "0-0",
  oneRun: "0-0",
  remontados: 0,
  up: "0-0",
  terreneadas: 0,
  pechofriadas: 0,
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

const DEFAULT_STREAKS_DATA: RachasTabData = {
  teamStreaks: {
    general: { category: "General", streak: "-", trend: "neutral", details: "", count: 0 },
    home: { category: "Local", streak: "-", trend: "neutral", details: "", count: 0 },
    away: { category: "Visitante", streak: "-", trend: "neutral", details: "", count: 0 },
    rivals: [],
  },
  hittingStreaks: [],
  onBaseStreaks: [],
  pitchingStreaks: [],
  updatedAt: "",
};

const DEFAULT_COLLECTIVE_STATS: CollectiveStatsResult = {
  batting: [],
  pitching: [],
  fielding: [],
  battingKpis: {
    avgVal: ".000",
    avgTeam: "-",
    opsVal: ".000",
    opsTeam: "-",
    hrVal: "0",
    hrTeam: "-",
    rVal: "0",
    rTeam: "-",
  },
  pitchingKpis: {
    eraVal: "0.00",
    eraTeam: "-",
    whipVal: "0.00",
    whipTeam: "-",
    soVal: "0",
    soTeam: "-",
    svVal: "0",
    svTeam: "-",
  },
  fieldingKpis: {
    fpctVal: ".000",
    fpctTeam: "-",
    eVal: "0",
    eTeam: "-",
    dpVal: "0",
    dpTeam: "-",
    csPctVal: ".000",
    csPctTeam: "-",
  },
};

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" && result.value !== undefined && result.value !== null
    ? result.value
    : fallback;
}

export async function collectLvbpContextSnapshot(
  season = ACTIVE_SEASON
): Promise<LvbpContextSnapshot> {
  const [
    standingsRes,
    advStatsRes,
    lastGameRes,
    trendsRes,
    leadersRes,
    h2hRes,
    streaksRes,
    collectiveRes,
    wpaRes,
  ] = await Promise.allSettled([
    getStandings(season, "regular"),
    getLeonesAdvancedStats(season),
    getLastGameDetail(season),
    getRecentTrends(10, season),
    getCaracasTeamLeaders(season),
    getHeadToHeadRecords(season),
    getStreaksData(season),
    getCollectiveStats(season, "R"),
    fetchSeasonWpaLeaders(season),
  ]);

  const standings: TeamStanding[] = settledValue(standingsRes, []);
  const advStats: LeonesAdvancedStats = settledValue(advStatsRes, DEFAULT_ADVANCED_STATS);
  const lastGame: LastGameDetail | null = settledValue(lastGameRes, null);
  const recentTrends: TrendGameItem[] = settledValue(trendsRes, []);
  const leaders: { batters: BatterLeaderItem[]; pitchers: PitcherLeaderItem[] } = settledValue(
    leadersRes,
    { batters: [], pitchers: [] }
  );
  const h2h: HeadToHeadRecord[] = settledValue(h2hRes, []);
  const streaks: RachasTabData = settledValue(streaksRes, DEFAULT_STREAKS_DATA);
  const collective: CollectiveStatsResult = settledValue(collectiveRes, DEFAULT_COLLECTIVE_STATS);
  const wpaLeadersRaw: SeasonWpaLeader[] = settledValue(wpaRes, []);

  const sortedStandings = [...standings].sort((a, b) => {
    if (b.pct !== a.pct) return b.pct - a.pct;
    return b.wins - a.wins;
  });

  const leonesIdx = sortedStandings.findIndex((t) => Number(t.teamId) === LEONES_TEAM_ID);
  const leonesStanding = leonesIdx >= 0 ? sortedStandings[leonesIdx] : undefined;
  const leonesPosition = leonesIdx >= 0 ? leonesIdx + 1 : 0;

  const standingRecord = leonesStanding
    ? `${leonesStanding.wins}-${leonesStanding.losses}`
    : advStats.record || "0-0";

  const batting = collective.batting || [];
  const pitching = collective.pitching || [];
  const fielding = collective.fielding || [];
  const pitchingWithIp = pitching.filter((p) => p.ip > 0);

  return {
    season,
    seasonLabel: formatSeason(season),
    collectedAt: new Date().toISOString(),
    leonesSummary: {
      record: advStats.totalGames > 0 ? advStats.record : standingRecord,
      position: leonesPosition,
      gamesBack: String(leonesStanding?.gamesBack ?? "-"),
      pct: leonesStanding ? formatStandingPct(leonesStanding.pct) : ".000",
      totalGames: advStats.totalGames || leonesStanding?.gamesPlayed || 0,
      homeRecord: advStats.homeRecord || leonesStanding?.homeRecord || "0-0",
      awayRecord: advStats.awayRecord || leonesStanding?.awayRecord || "0-0",
      dayRecord: advStats.dayRecord || "0-0",
      nightRecord: advStats.nightRecord || "0-0",
      streak:
        advStats.streak && advStats.streak !== "-"
          ? advStats.streak
          : leonesStanding?.streak || streaks.teamStreaks?.general?.streak || "-",
      last10: advStats.last10 || leonesStanding?.last10 || "0-0",
      oneRun: advStats.oneRun || "0-0",
      extraInning: advStats.extraInning || "0-0",
      shutouts: advStats.shutouts || 0,
      remontados: advStats.remontados || 0,
      up: advStats.up || "0-0",
      terreneadas: advStats.terreneadas || 0,
      pechofriadas: advStats.pechofriadas || 0,
      starters: advStats.starters || "0-0",
      relievers: advStats.relievers || "0-0",
      saves: advStats.saves || 0,
      withRondon: advStats.withRondon || "0-0",
      withoutRondon: advStats.withoutRondon || "0-0",
      runsScored: leonesStanding?.runsScored ?? 0,
      runsAllowed: leonesStanding?.runsAllowed ?? 0,
      runDifferential: leonesStanding?.runDifferential ?? 0,
    },
    lastGame: lastGame
      ? {
          date: lastGame.gameDate,
          formattedDate: lastGame.gameDateFormatted,
          venue: lastGame.venue,
          homeTeam: lastGame.homeTeamName,
          homeAbbr: lastGame.homeTeamAbbr,
          homeScore: lastGame.homeScore,
          awayTeam: lastGame.awayTeamName,
          awayAbbr: lastGame.awayTeamAbbr,
          awayScore: lastGame.awayScore,
          isHomeLeones: lastGame.isHomeLeones,
          leonesWon: lastGame.leonesWon,
          headline: buildLastGameHeadline(lastGame),
          mvp: lastGame.mvp
            ? {
                name: lastGame.mvp.playerName,
                wpaTotal: Number(lastGame.mvp.wpaTotal.toFixed(3)),
                clutch: Number(lastGame.mvp.clutch.toFixed(3)),
                headline: lastGame.mvp.headline,
                statsSummary: lastGame.mvp.statsSummary,
              }
            : null,
        }
      : null,
    recentTrends: recentTrends.slice(0, 10).map((t) => ({
      fecha: t.fecha,
      rivalAbbr: t.rivalAbbr,
      rivalName: t.rivalName,
      isHome: t.isHome,
      score: t.score,
      won: t.won,
    })),
    teamLeaders: {
      batters: (leaders.batters || []).slice(0, 5).map((b) => ({
        name: b.playerName,
        avg: b.avg,
        hr: b.hr,
        rbi: b.rbi,
        ops: b.ops,
        ab: b.ab,
        h: b.h,
      })),
      pitchers: (leaders.pitchers || []).slice(0, 5).map((p) => ({
        name: p.playerName,
        era: p.era,
        whip: p.whip,
        ip: p.ip,
        so: p.so,
        bb: p.bb,
      })),
    },
    headToHead: h2h.map((r) => ({
      rivalName: r.rivalName,
      rivalAbbr: r.rivalAbbr,
      record: r.record,
      pct: r.pct,
      gamesPlayed: r.gamesPlayed,
      remainingGames: r.remainingGames,
      runDiff: r.runDiff,
      homeRecord: r.homeRecord,
      awayRecord: r.awayRecord,
      statusText: r.statusText,
    })),
    streaks: {
      general: streaks.teamStreaks?.general?.streak || "-",
      home: streaks.teamStreaks?.home?.streak || "-",
      away: streaks.teamStreaks?.away?.streak || "-",
      hitting: (streaks.hittingStreaks || []).slice(0, 4).map((s) => ({
        playerName: s.playerName,
        streakLength: s.streakLength,
        statsSummary: s.statsSummary,
      })),
      onBase: (streaks.onBaseStreaks || []).slice(0, 4).map((s) => ({
        playerName: s.playerName,
        streakLength: s.streakLength,
        statsSummary: s.statsSummary,
      })),
      pitching: (streaks.pitchingStreaks || []).slice(0, 4).map((s) => ({
        playerName: s.playerName,
        streakLength: s.streakLength,
        statsSummary: s.statsSummary,
      })),
    },
    wpaLeaders: [...wpaLeadersRaw]
      .sort((a, b) => Math.abs(b.wpa) - Math.abs(a.wpa))
      .slice(0, 8)
      .map((w) => ({
        player: w.player,
        type: w.type,
        games: w.games,
        wpa: Number(w.wpa.toFixed(3)),
        liAvg: Number(w.liAvg.toFixed(2)),
        clutch: Number(w.clutch.toFixed(3)),
      })),
    leagueStandings: sortedStandings.map((t, idx) => ({
      position: idx + 1,
      teamId: t.teamId,
      teamName: t.teamName,
      abbreviation: t.abbreviation,
      gamesPlayed: t.gamesPlayed,
      wins: t.wins,
      losses: t.losses,
      pct: formatStandingPct(t.pct),
      gamesBack: String(t.gamesBack ?? "-"),
      runsScored: t.runsScored,
      runsAllowed: t.runsAllowed,
      runDifferential: t.runDifferential,
      homeRecord: t.homeRecord,
      awayRecord: t.awayRecord,
      streak: t.streak,
      last10: t.last10,
    })),
    collectiveComparison: {
      leonesRanks: {
        opsRank: computeRank(batting, (t) => t.isLeones, (a, b) => b.ops - a.ops),
        avgRank: computeRank(batting, (t) => t.isLeones, (a, b) => b.avg - a.avg),
        hrRank: computeRank(batting, (t) => t.isLeones, (a, b) => b.hr - a.hr),
        runsRank: computeRank(batting, (t) => t.isLeones, (a, b) => b.r - a.r),
        eraRank: computeRank(
          pitchingWithIp.length ? pitchingWithIp : pitching,
          (t) => t.isLeones,
          (a, b) => a.era - b.era
        ),
        whipRank: computeRank(
          pitchingWithIp.length ? pitchingWithIp : pitching,
          (t) => t.isLeones,
          (a, b) => a.whip - b.whip
        ),
        soPitchingRank: computeRank(pitching, (t) => t.isLeones, (a, b) => b.so - a.so),
        fpctRank: computeRank(fielding, (t) => t.isLeones, (a, b) => b.fpct - a.fpct),
        totalTeams: Math.max(batting.length, pitching.length, sortedStandings.length, 8),
      },
      batting: batting.map((b) => ({
        teamName: b.teamName,
        teamAbbr: b.teamAbbr,
        isLeones: b.isLeones,
        games: b.games,
        r: b.r,
        h: b.h,
        hr: b.hr,
        bb: b.bb,
        so: b.so,
        sb: b.sb,
        avg: b.avgStr,
        obp: b.obpStr,
        slg: b.slgStr,
        ops: b.opsStr,
        lob: b.lob,
      })),
      pitching: pitching.map((p) => ({
        teamName: p.teamName,
        teamAbbr: p.teamAbbr,
        isLeones: p.isLeones,
        games: p.games,
        era: p.eraStr,
        whip: p.whipStr,
        sv: p.sv,
        holds: p.holds,
        blownSaves: p.blownSaves,
        so: p.so,
        bb: p.bb,
        hr: p.hr,
        k9: p.k9Str,
        bb9: p.bb9Str,
        baa: p.baaStr,
      })),
      fielding: fielding.map((f) => ({
        teamName: f.teamName,
        teamAbbr: f.teamAbbr,
        isLeones: f.isLeones,
        games: f.games,
        e: f.e,
        dp: f.dp,
        fpct: f.fpctStr,
        csPct: f.csPctStr,
      })),
    },
  };
}

export function deriveContextSummary(snapshot: LvbpContextSnapshot): XInsightsContextSummary {
  const headline = snapshot.lastGame?.headline
    ? sanitizeBannedTerms(snapshot.lastGame.headline)
    : "Sin juegos finalizados registrados en la temporada";

  return {
    leonesRecord: snapshot.leonesSummary?.record || "0-0",
    leonesPosition: Number(snapshot.leonesSummary?.position || 0),
    streak: sanitizeBannedTerms(snapshot.leonesSummary?.streak || "-"),
    lastGameHeadline: headline,
  };
}

const FOCUS_DIRECTIVES: Record<XInsightFocus, string> = {
  auto: "Selecciona automáticamente los 3 o 4 ángulos de mayor impacto noticioso y estadístico según los datos verificados (combinando resultado reciente, rachas, comparativa colectiva LVBP y debate).",
  postgame:
    "Prioriza el análisis postgame del último compromiso de Leones del Caracas: figura del juego (WPA/Clutch), punto de quiebre, desempeño de abridores vs relevo y efecto inmediato en la tabla de posiciones.",
  tendencia:
    "Enfócate en tendencias verificadas y comparativas colectivas en la LVBP: rachas activas de bateadores/lanzadores, splits (local/visitante, día/noche, juegos por 1 carrera) y ranking de Caracas frente a los otros 7 equipos.",
  debate:
    "Diseña ángulos que disparen conversación genuina entre caraquistas y fanáticos de la LVBP, respaldados por cifras reales. Incluye pollOptions concretas (2 a 4 opciones cortas) y preguntas directas de debate.",
  hilo:
    "Incluye al menos un borrador en formato 'thread' de 3 a 4 tuits conectados con narrativa progresiva (gancho inicial, desarrollo con cifras clave de Leones y la liga, cierre con llamado a la acción), además de borradores complementarios.",
};

export function buildXInsightsPrompt(
  snapshot: LvbpContextSnapshot,
  focus: XInsightFocus = "auto",
  manualContext?: string
): string {
  const safeFocus: XInsightFocus = isValidXInsightFocus(focus) ? focus : "auto";
  const safeManualContext = sanitizeManualContext(manualContext);
  const verifiedPayload = JSON.stringify(snapshot);

  return [
    `<role>`,
    `Eres el estratega editorial y analista de béisbol venezolano de RepubliCaraquista (@RepubCaraquista) en X (Twitter).`,
    `Tu misión es redactar 3 o 4 borradores de publicaciones de alto engagement en español deportivo venezolano auténtico, directo, apasionado y rigurosamente respaldado por datos.`,
    `</role>`,
    `<constraints>`,
    `1. El estadio sede oficial de Leones del Caracas es el Estadio Monumental Simón Bolívar (Caracas). Nunca menciones otro estadio como sede de Leones.`,
    `2. PROHIBIDO inventar números, récords, fechas, nombres de peloteros o estadísticas que no aparezcan exactamente en <verified_data>.`,
    `3. PROHIBIDO mencionar términos de Statcast o Hawk-Eye (Exit Velocity, Launch Angle, Barrels, Sprint Speed, velocidad de salida, ángulo de salida). La LVBP no usa esa tecnología.`,
    `4. PROHIBIDO usar las palabras "ELO", "elo", "sabermétrico", "sabermétrica", "sabermétricos", "sabermétricas" o "sabermetría". Usa términos naturales de béisbol y analítica avanzada ("rendimiento", "impacto en victorias", "ranking de fuerza", "estadísticas avanzadas").`,
    `5. Cada elemento dentro de tweets[] debe tener MÁXIMO 280 caracteres (incluyendo espacios, emojis y hashtags).`,
    `6. Cada borrador debe incluir: id, angleLabel, format ("single" o "thread"), tweets (1 tuit para "single"; 3-4 tuits para "thread"), backingFact (dato exacto tomado de <verified_data>), engagementHook (CTA de respuesta o debate), pollOptions (opcional, 2 a 4 opciones cortas cuando aporte valor) y cardSuggestion (kicker, headline, primaryStatValue, primaryStatLabel, comparisonText, sourceFooter = "${DEFAULT_SOURCE_FOOTER}").`,
    `7. Responde ÚNICAMENTE con JSON válido siguiendo el esquema solicitado, sin texto fuera del JSON.`,
    `</constraints>`,
    `<focus_directive>`,
    `Enfoque solicitado: ${safeFocus}.`,
    FOCUS_DIRECTIVES[safeFocus],
    `</focus_directive>`,
    `<verified_data>`,
    verifiedPayload,
    `</verified_data>`,
    `<manual_context>`,
    safeManualContext || "Sin contexto manual adicional.",
    `</manual_context>`,
  ].join("\n");
}

function stripMarkdownFences(rawText: string): string {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJsonSafely(rawText: string): Record<string, unknown> {
  const stripped = stripMarkdownFences(rawText);
  try {
    const parsed = JSON.parse(stripped);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const firstBrace = stripped.indexOf("{");
    const lastBrace = stripped.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = stripped.slice(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // manejado abajo
      }
    }
  }
  throw new XInsightsError(
    "INVALID_RESPONSE",
    "La respuesta de Gemini no contiene un JSON válido.",
    502
  );
}

function asNonEmptyString(val: unknown, fallback: string): string {
  if (typeof val !== "string") return fallback;
  const cleaned = sanitizeBannedTerms(val);
  return cleaned || fallback;
}

function normalizeCardSuggestion(
  rawCard: unknown,
  snapshot: LvbpContextSnapshot,
  backingFact: string
): XInsightCardVisualData {
  const obj =
    rawCard && typeof rawCard === "object" && !Array.isArray(rawCard)
      ? (rawCard as Record<string, unknown>)
      : {};

  return {
    kicker: asNonEmptyString(obj.kicker, `LVBP ${snapshot.seasonLabel}`),
    headline: asNonEmptyString(obj.headline, "Pulso de Leones del Caracas"),
    primaryStatValue: asNonEmptyString(
      obj.primaryStatValue,
      snapshot.leonesSummary?.record || "0-0"
    ),
    primaryStatLabel: asNonEmptyString(obj.primaryStatLabel, "Récord Temporada Regular"),
    comparisonText: asNonEmptyString(obj.comparisonText, backingFact),
    sourceFooter: asNonEmptyString(obj.sourceFooter, DEFAULT_SOURCE_FOOTER),
  };
}

export function normalizeXInsightsResponse(
  rawText: string,
  snapshot: LvbpContextSnapshot,
  focus: XInsightFocus,
  model: string,
  cached: boolean
): XInsightsResponseData {
  const parsed = parseJsonSafely(rawText);
  const fallbackSummary = deriveContextSummary(snapshot);

  const rawSummary =
    parsed.contextSummary &&
    typeof parsed.contextSummary === "object" &&
    !Array.isArray(parsed.contextSummary)
      ? (parsed.contextSummary as Record<string, unknown>)
      : {};

  const parsedPos = Number(rawSummary.leonesPosition);
  const contextSummary: XInsightsContextSummary = {
    leonesRecord: asNonEmptyString(rawSummary.leonesRecord, fallbackSummary.leonesRecord),
    leonesPosition:
      Number.isFinite(parsedPos) && parsedPos >= 0
        ? Math.trunc(parsedPos)
        : fallbackSummary.leonesPosition,
    streak: asNonEmptyString(rawSummary.streak, fallbackSummary.streak),
    lastGameHeadline: asNonEmptyString(
      rawSummary.lastGameHeadline,
      fallbackSummary.lastGameHeadline
    ),
  };

  const rawDrafts = Array.isArray(parsed.drafts) ? parsed.drafts : [];
  if (rawDrafts.length === 0) {
    throw new XInsightsError(
      "INVALID_RESPONSE",
      "Gemini no devolvió borradores válidos para X.",
      502
    );
  }

  const drafts: XInsightDraft[] = rawDrafts.slice(0, 4).map((item, idx) => {
    const raw =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {};

    const backingFact = asNonEmptyString(
      raw.backingFact,
      `Récord de Leones: ${fallbackSummary.leonesRecord} | Racha: ${fallbackSummary.streak}`
    );
    const engagementHook = asNonEmptyString(
      raw.engagementHook,
      "¿Qué ajuste necesita el Caracas para el próximo compromiso?"
    );

    const rawTweets = Array.isArray(raw.tweets) ? raw.tweets : [];
    const sanitizedTweets = rawTweets
      .filter((t): t is string => typeof t === "string")
      .map((t) => enforceTweetLimit(sanitizeBannedTerms(t), MAX_TWEET_CHARS))
      .filter((t) => t.length > 0);

    const tweets =
      sanitizedTweets.length > 0
        ? sanitizedTweets
        : [enforceTweetLimit(`${backingFact} ${engagementHook}`, MAX_TWEET_CHARS)];

    const format: "single" | "thread" =
      raw.format === "thread" || tweets.length > 1 ? "thread" : "single";

    const rawPolls = Array.isArray(raw.pollOptions) ? raw.pollOptions : [];
    const pollOptions = rawPolls
      .filter((p): p is string => typeof p === "string")
      .map((p) => sanitizeBannedTerms(p).slice(0, 25).trim())
      .filter((p) => p.length > 0)
      .slice(0, 4);

    return {
      id: asNonEmptyString(raw.id, `draft-${idx + 1}`),
      angleLabel: asNonEmptyString(raw.angleLabel, `Ángulo ${idx + 1}`),
      format,
      tweets,
      backingFact,
      engagementHook,
      ...(pollOptions.length >= 2 ? { pollOptions } : {}),
      cardSuggestion: normalizeCardSuggestion(raw.cardSuggestion, snapshot, backingFact),
    };
  });

  return {
    season: snapshot.season,
    model,
    generatedAt: new Date().toISOString(),
    focus,
    cached,
    contextSummary,
    drafts,
  };
}

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: ["contextSummary", "drafts"],
  properties: {
    contextSummary: {
      type: "OBJECT",
      required: ["leonesRecord", "leonesPosition", "streak", "lastGameHeadline"],
      properties: {
        leonesRecord: { type: "STRING" },
        leonesPosition: { type: "INTEGER" },
        streak: { type: "STRING" },
        lastGameHeadline: { type: "STRING" },
      },
    },
    drafts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: [
          "id",
          "angleLabel",
          "format",
          "tweets",
          "backingFact",
          "engagementHook",
          "cardSuggestion",
        ],
        properties: {
          id: { type: "STRING" },
          angleLabel: { type: "STRING" },
          format: { type: "STRING", enum: ["single", "thread"] },
          tweets: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          backingFact: { type: "STRING" },
          engagementHook: { type: "STRING" },
          pollOptions: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          cardSuggestion: {
            type: "OBJECT",
            required: [
              "kicker",
              "headline",
              "primaryStatValue",
              "primaryStatLabel",
              "comparisonText",
              "sourceFooter",
            ],
            properties: {
              kicker: { type: "STRING" },
              headline: { type: "STRING" },
              primaryStatValue: { type: "STRING" },
              primaryStatLabel: { type: "STRING" },
              comparisonText: { type: "STRING" },
              sourceFooter: { type: "STRING" },
            },
          },
        },
      },
    },
  },
} as const;

interface GeminiCandidatePart {
  text?: string;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiCandidatePart[];
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
  };
}

export async function generateXInsightsWithGemini(
  options: GenerateXInsightsOptions = {}
): Promise<XInsightsResponseData> {
  const focus = options.focus ?? "auto";
  if (!isValidXInsightFocus(focus)) {
    throw new XInsightsError(
      "VALIDATION_ERROR",
      "Enfoque inválido. Usa: auto, postgame, tendencia, debate o hilo.",
      400
    );
  }

  const season =
    typeof options.season === "number" && Number.isInteger(options.season) && options.season >= 2000
      ? options.season
      : ACTIVE_SEASON;

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new XInsightsError(
      "MISSING_API_KEY",
      "Falta configurar GEMINI_API_KEY en el servidor.",
      503
    );
  }

  const model = (process.env.GEMINI_MODEL || "").trim() || DEFAULT_GEMINI_MODEL;
  const cacheKey = buildCacheKey(season, focus, options.manualContext);

  if (!options.forceRefresh) {
    const cached = xInsightsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cloneResponseData(cached.data, true);
    }
    if (cached) {
      xInsightsCache.delete(cacheKey);
    }
  }

  const snapshot = options.snapshot ?? (await collectLvbpContextSnapshot(season));
  const prompt = buildXInsightsPrompt(snapshot, focus, options.manualContext);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.75,
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError")
    ) {
      throw new XInsightsError(
        "TIMEOUT",
        "Tiempo de espera agotado al consultar Gemini API. Intenta de nuevo.",
        504
      );
    }
    throw new XInsightsError(
      "UPSTREAM_ERROR",
      "Error de red al conectar con Gemini API.",
      502
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new XInsightsError(
      "UNAUTHORIZED",
      "La clave de Gemini API fue rechazada o no tiene permisos (401/403).",
      502
    );
  }

  if (res.status === 429) {
    throw new XInsightsError(
      "RATE_LIMIT",
      "Límite de solicitudes alcanzado en Gemini API (429). Intenta nuevamente en unos segundos.",
      429
    );
  }

  if (!res.ok) {
    throw new XInsightsError(
      "UPSTREAM_ERROR",
      `Error al consultar Gemini API (HTTP ${res.status}).`,
      502
    );
  }

  let payload: GeminiGenerateResponse;
  try {
    payload = (await res.json()) as GeminiGenerateResponse;
  } catch {
    throw new XInsightsError(
      "INVALID_RESPONSE",
      "Gemini devolvió una respuesta ilegible.",
      502
    );
  }

  const candidate = payload?.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    throw new XInsightsError(
      "INVALID_RESPONSE",
      "La generación fue bloqueada por los filtros de seguridad de Gemini.",
      502
    );
  }

  const rawText = (candidate?.content?.parts || [])
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (!rawText) {
    throw new XInsightsError(
      "INVALID_RESPONSE",
      "Gemini devolvió una respuesta vacía.",
      502
    );
  }

  const normalized = normalizeXInsightsResponse(rawText, snapshot, focus, model, false);
  xInsightsCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: cloneResponseData(normalized, false),
  });

  return normalized;
}
