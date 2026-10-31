export type PitchingBranch = "lvbp" | "mlb";
export type TimeMode = "game" | "season";

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
  mlbPhotoUrl?: string;
  age?: number;
  height?: string;
  weight?: number;
}

export interface PitcherGameLog {
  gamePk: number;
  date: string;
  opponent: string;
  isHome?: boolean;
  isStarter: boolean;
  role: "Abridor" | "Relevista" | "Temporada";
  gameType: string;
  phase: string;
  ip: string;
  outs?: number;
  bf?: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  hbp?: number;
  pitches: number;
  strikes: number;
  era: string;
  decision: "W" | "L" | "SV" | "HLD" | "";
  league: "LVBP" | "MLB" | "MiLB";
  cswPct?: string;
  whiffPct?: string;
  fStrikePct?: string;
  gsv2?: number | null;
  isQS?: boolean;
  wpa?: number | null;
  re24?: number | null;
  aLI?: number | null;
  ir?: number;
  irs?: number;
}

export interface PitchDetail {
  pitchNumber: number;
  pitchName: string;
  pitchType: string;
  speed: number | null;
  spin: number | null;
  ivb: number | null; // Induced Vertical Break (pulgadas)
  hb: number | null;  // Horizontal Break (pulgadas)
  ext?: number | null; // Release Extension (pies)
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
  isChase?: boolean;
  isZoneContact?: boolean;
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
  extAvg?: number | string | null;
  whiffPct: string;
  cswPct: string;
  zonePct: string;
  chasePct?: string;
  zContactPct?: string;
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
  swStrPct?: string;
  putAwayPct?: string;
  twoStrikePitches?: number;
  twoStrikeK?: number;
  chasePct?: string;
  zContactPct?: string;
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

export interface PitchingSplitRow {
  key: string;
  label: string;
  bf: number;
  ab: number;
  h: number;
  doubles?: number;
  triples?: number;
  hr: number;
  bb: number;
  hbp?: number;
  so: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
  kPct: number;
  bbPct: number;
  fStrikePct: number;
  cswPct: number;
  whiffPct: number;
  pitches?: number;
}

export interface ContactProfileSummary {
  bip: number;
  gb: number;
  ld: number;
  fb: number;
  pu: number;
  gbPct: number;
  ldPct: number;
  fbPct: number;
  puPct: number;
  goAoRatio: string;
  hard: number;
  med: number;
  soft: number;
  hardPct: number;
  medPct: number;
  softPct: number;
  // Exclusivo para MLB con Hawk-Eye (hasStatcast === true)
  avgEv?: number | null;
  maxEv?: number | null;
  hardHitPct?: number | null;
  barrelPct?: number | null;
}

export interface PitchingContextMetrics {
  wpa: number;
  re24: number;
  aLI: number;
  gmLI: number;
  gsv2: number | null;
  isQS: boolean;
  qsCount?: number;
  gsCount?: number;
  avgGsv2?: number | null;
  ir: number;
  irs: number;
  irsPct: number | null;
  shutdowns?: number;
  meltdowns?: number;
}

export interface PitchBoxscoreSummary {
  ip: string;
  outs?: number;
  bf?: number;
  ab?: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  ibb?: number;
  so: number;
  hr?: number;
  hbp?: number;
  wp?: number;
  pitches: number;
  strikes: number;
  strikePct?: string;
  cswPct: string;
  whiffPct: string;
  fStrikePct?: string;
  swStrPct?: string;
  putAwayPct?: string;
  era?: string;
  whip?: string;
  fip?: string;
  eraMinus?: number | null;
  kPct?: string;
  bbPct?: string;
  kMinusBbPct?: string;
  babip?: string;
  lobPct?: string;
  baa?: string;
  opsAgainst?: string;
  wins?: number;
  losses?: number;
  saves?: number;
  holds?: number;
  gamesPlayed?: number;
  gamesStarted?: number;
  go?: number;
  ao?: number;
  ir?: number;
  irs?: number;
  gsv2?: number | null;
  isQS?: boolean;
}

export interface PitchGameDataResponse {
  gamePk: number;
  pitcherId: number;
  timeMode?: TimeMode;
  gamesCount?: number;
  gamesSampled?: number;
  effectiveSeason?: number;
  fallbackUsed?: boolean;
  fallbackMessage?: string | null;
  isStarter: boolean;
  role: "Abridor" | "Relevista" | "Temporada";
  decision: string;
  totalPitches: number;
  hasStatcast: boolean;
  mlbPhotoUrl?: string;
  boxscore: PitchBoxscoreSummary;
  contextMetrics?: PitchingContextMetrics;
  contactProfile?: ContactProfileSummary;
  situationalSplits?: PitchingSplitRow[];
  ttoSplits?: PitchingSplitRow[];
  statcastTable: StatcastPitchRow[];
  pbpTable: PBPDestinationRow[];
  pbpKpis: PBPKPIs;
  inningsWorkload: InningWorkloadItem[];
  splitsPlatoon: PlatoonSplits;
  pitches: PitchDetail[];
}

export type PitchingCardData = PitchGameDataResponse;
export type PitchArsenalRow = StatcastPitchRow;
