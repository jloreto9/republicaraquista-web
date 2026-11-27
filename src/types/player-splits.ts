import { BattingStats, PitchingStats, FieldingStats } from "./sports";

export type SplitCategory =
  | "context"
  | "situational"
  | "platoon"
  | "count"
  | "role"
  | "opponent"
  | "calendar"
  | "inning"
  | "outs"
  | "leverage"
  | "trend"
  | "score"
  | "lineup"
  | "fatigue";

export type LeverageTier = "high" | "mid" | "low";

export interface PlayerSplitRow {
  splitName: string;
  category: SplitCategory;
  badge?: string;
  games?: number;
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
  hbp?: number;
  sf?: number;
  sb?: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
  iso: string;
  babip: string;
  bbPct: string;
  kPct: string;
  avgNum: number;
  obpNum: number;
  slgNum: number;
  opsNum: number;
}

export interface PitcherSplitRow {
  splitName: string;
  category: SplitCategory;
  badge?: string;
  games: number;
  starts: number;
  ip: number;
  ipDisplay: string;
  bf?: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  era: string;
  eraAvailable?: boolean;
  whip: string;
  baa: string;
  oppObp?: string;
  oppSlg?: string;
  oppOps?: string;
  kPer9: string;
  bbPer9: string;
  kPerBb?: string;
  kPct?: string;
  bbPct?: string;
  babip?: string;
  hrPer9?: string;
  eraNum: number;
  whipNum: number;
}

export interface PlayerLeverageRow extends PlayerSplitRow {
  tier: LeverageTier;
  avgLi: number;
  avgLiStr: string;
  wpa: number;
  wpaStr: string;
}

export interface PitcherLeverageRow extends PitcherSplitRow {
  tier: LeverageTier;
  avgLi: number;
  avgLiStr: string;
  wpa: number;
  wpaStr: string;
}

export interface PlayerLeverageResult {
  playerId: number;
  type: "batter" | "pitcher";
  season: number;
  gamesAnalyzed: number;
  avgLi: number;
  avgLiStr: string;
  totalWpa: number;
  totalWpaStr: string;
  thresholds: {
    lowMax: number;
    highMin: number;
  };
  batterRows?: PlayerLeverageRow[];
  pitcherRows?: PitcherLeverageRow[];
}

export interface PlayerBatterGameLog {
  gameId: number;
  date: string;
  opponentId: number;
  opponentAbbr: string;
  opponentName: string;
  isHome: boolean;
  result: "G" | "P";
  score: string;
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
  avg: string;
}

export interface PlayerPitcherGameLog {
  gameId: number;
  date: string;
  opponentId: number;
  opponentAbbr: string;
  opponentName: string;
  isHome: boolean;
  result: "G" | "P";
  score: string;
  isStart: boolean;
  ipDisplay: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  eraGame: string;
}

export interface PlayerGeneralProfile {
  seasonsBatting: Array<{ season: number; stats: BattingStats }>;
  seasonsPitching: Array<{ season: number; stats: PitchingStats }>;
  postseasonBatting?: Array<{
    season: number;
    phase: "D" | "L" | "F";
    phaseLabel: string;
    stats: BattingStats;
  }>;
  postseasonPitching?: Array<{
    season: number;
    phase: "D" | "L" | "F";
    phaseLabel: string;
    stats: PitchingStats;
  }>;
  fielding: FieldingStats[];
  batterGameLogs: PlayerBatterGameLog[];
  pitcherGameLogs: PlayerPitcherGameLog[];
}

export interface PlayerSplitsProfile {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  teamId: number;
  teamName: string;
  teamAbbr: string;
  teamLogo: string;
  type: "batter" | "pitcher";
  season: number;
  totalGames: number;
  overview: {
    kpiPrimary: string;
    labelPrimary: string;
    kpiSecondary: string;
    labelSecondary: string;
    slashLine: string;
  };
  general?: PlayerGeneralProfile;
  contextSplits: PlayerSplitRow[];
  opponentSplits: PlayerSplitRow[];
  calendarSplits: PlayerSplitRow[];
  situationalSplits: PlayerSplitRow[];
  platoonSplits: PlayerSplitRow[];
  countSplits?: PlayerSplitRow[];
  inningSplits: PlayerSplitRow[];
  outsSplits: PlayerSplitRow[];
  lateCloseSplits?: PlayerSplitRow[];
  trendSplits?: PlayerSplitRow[];
  scoreSplits?: PlayerSplitRow[];
  detailedCountSplits?: PlayerSplitRow[];
  countMatrixSplits?: PlayerSplitRow[];
  lineupSplits?: PlayerSplitRow[];
  exactBaseSplits?: PlayerSplitRow[];
  pitcherSplits?: PitcherSplitRow[];
  pitcherPlatoonSplits?: PitcherSplitRow[];
  pitcherSituationalSplits?: PitcherSplitRow[];
  pitcherCountSplits?: PitcherSplitRow[];
  pitcherInningSplits?: PitcherSplitRow[];
  pitcherOutsSplits?: PitcherSplitRow[];
  pitcherRoleSplits?: PitcherSplitRow[];
  pitcherContextSplits?: PitcherSplitRow[];
  pitcherOpponentSplits?: PitcherSplitRow[];
  pitcherCalendarSplits?: PitcherSplitRow[];
  pitcherLateCloseSplits?: PitcherSplitRow[];
  pitcherTrendSplits?: PitcherSplitRow[];
  pitcherScoreSplits?: PitcherSplitRow[];
  pitcherDetailedCountSplits?: PitcherSplitRow[];
  pitcherCountMatrixSplits?: PitcherSplitRow[];
  pitcherExactBaseSplits?: PitcherSplitRow[];
  pitcherRestSplits?: PitcherSplitRow[];
  pitcherFatigueSplits?: PitcherSplitRow[];
  lobStats?: {
    lobEnding: number;
    rispLobEnding: number;
    rispLobMid: number;
    totalRispLob: number;
  };
}

export interface PlayerSelectorItem {
  id: number;
  name: string;
  avatarUrl: string;
  teamId: number;
  teamAbbr: string;
  teamLogo: string;
  type: "batter" | "pitcher";
  subtitle: string;
}

export type CareerDataSource = "supabase" | "mlb_api";

export interface PlayerCareerSeasonEntry<T> {
  season: number;
  stats: T;
  source: CareerDataSource;
  isCombined?: boolean;
  isTeamSplit?: boolean;
  teamCount?: number;
}

export interface PlayerCareerPostseasonEntry<T> {
  season: number;
  phase: "D" | "L" | "F" | "P";
  phaseLabel: string;
  stats: T;
  source: CareerDataSource;
  isCombined?: boolean;
  isTeamSplit?: boolean;
  teamCount?: number;
}

export interface PlayerLvbpCareerResult {
  playerId: number;
  type: "batter" | "pitcher";
  regularBatting: PlayerCareerSeasonEntry<BattingStats>[];
  regularPitching: PlayerCareerSeasonEntry<PitchingStats>[];
  postseasonBatting: PlayerCareerPostseasonEntry<BattingStats>[];
  postseasonPitching: PlayerCareerPostseasonEntry<PitchingStats>[];
  fetchedAt: string;
}
