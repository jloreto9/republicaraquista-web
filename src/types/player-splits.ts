export type SplitCategory =
  | "context"
  | "situational"
  | "platoon"
  | "count"
  | "role"
  | "opponent"
  | "calendar"
  | "inning"
  | "outs";

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
  contextSplits: PlayerSplitRow[];
  opponentSplits: PlayerSplitRow[];
  calendarSplits: PlayerSplitRow[];
  situationalSplits: PlayerSplitRow[];
  platoonSplits: PlayerSplitRow[];
  countSplits?: PlayerSplitRow[];
  inningSplits: PlayerSplitRow[];
  outsSplits: PlayerSplitRow[];
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
