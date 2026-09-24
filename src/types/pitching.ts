export interface PitcherProfile {
  id: number;
  name: string;
  position: string;
  team: string;
  throws: "R" | "L";
  hasLvbpHistory: boolean;
  hasCaracasHistory: boolean;
  lvbpTeamId?: number;
  lvbpTeamName?: string;
  lvbpTeamAbbr?: string;
  photoUrl: string;
  age?: number;
  height?: string;
  weight?: number;
}

export interface PitcherGameLog {
  gamePk: number;
  date: string;
  opponent: string;
  isStarter: boolean;
  role: "Abridor" | "Relevista" | "Temporada";
  gameType: string;
  phase: string;
  ip: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  pitches: number;
  strikes: number;
  era: string;
  decision: "W" | "L" | "SV" | "HLD" | "";
  league: "LVBP" | "MLB" | "MiLB";
  cswPct?: string;
  whiffPct?: string;
}

export interface PitchDetail {
  pitchNumber: number;
  pitchName: string;
  pitchType: string;
  speed: number | null;
  spin: number | null;
  ivb: number | null; // Induced Vertical Break (pulgadas)
  hb: number | null;  // Horizontal Break (pulgadas)
  plateX: number | null;
  plateZ: number | null;
  szTop: number;
  szBot: number;
  inning: number;
  stand: "R" | "L";
  result: string;
  isWhiff: boolean;
  isCalled: boolean;
  isFoul: boolean;
  isInPlay: boolean;
  isBall: boolean;
  isStrike: boolean;
  isZone: boolean;
  outs: number;
  strikes: number;
  balls: number;
  leverageIndex: number;
}

export interface StatcastPitchRow {
  pitchName: string;
  pitchType: string;
  count: number;
  usagePct: string;
  usageVal: number;
  veloAvg: number | string;
  veloMax: number | string;
  spinAvg: number | string;
  ivb: number | string;
  hb: number | string;
  whiffPct: string;
  cswPct: string;
  zonePct: string;
  color: string;
}

export interface PBPDestinationRow {
  destination: string;
  count: number;
  pct: string;
  color: string;
}

export interface PBPKPIs {
  totalPitches: number;
  strikes: number;
  balls: number;
  strikePct: string;
  cswPct: string;
  whiffPct: string;
  fpsPct: string;
  swings: number;
  calledStrikes: number;
  fouls: number;
  inPlay: number;
}

export interface InningWorkloadItem {
  inning: number;
  pitches: number;
  strikes: number;
  balls: number;
  whiffs: number;
  avgLi: number;
}

export interface PlatoonSplitItem {
  pitches: number;
  cswPct: string;
  whiffPct: string;
  strikePct: string;
}

export interface PlatoonSplits {
  vsLhb: PlatoonSplitItem;
  vsRhb: PlatoonSplitItem;
}

export type TimeMode = "game" | "season";

export interface PitchGameDataResponse {
  gamePk: number;
  pitcherId: number;
  timeMode?: TimeMode;
  gamesCount?: number;
  isStarter: boolean;
  role: "Abridor" | "Relevista" | "Temporada";
  decision: string;
  totalPitches: number;
  hasStatcast: boolean;
  boxscore: {
    ip: string;
    h: number;
    r: number;
    er: number;
    bb: number;
    so: number;
    pitches: number;
    strikes: number;
    cswPct: string;
    whiffPct: string;
    era?: string;
    whip?: string;
  };
  statcastTable: StatcastPitchRow[];
  pbpTable: PBPDestinationRow[];
  pbpKpis: PBPKPIs;
  inningsWorkload: InningWorkloadItem[];
  splitsPlatoon: PlatoonSplits;
  pitches: PitchDetail[];
}
