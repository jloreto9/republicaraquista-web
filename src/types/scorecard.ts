export interface ScorecardDiamond {
  reach1B: boolean;
  reach2B: boolean;
  reach3B: boolean;
  scored: boolean;
  outAt?: "1B" | "2B" | "3B" | "HP" | null;
}

export interface ScorecardCell {
  playId: string;
  atBatIndex: number;
  inning: number;
  isTopInning: boolean;
  batterId: number;
  batterName: string;
  pitcherName?: string;
  event: string;
  eventCode: string; // ej: "1B", "2B", "3B", "HR", "K", "ꓘ", "BB", "6-3", "F8", "DP 6-4-3"
  description: string;
  rbi: number;
  diamond: ScorecardDiamond;
  outNumber: number | null; // 1, 2, 3 o null si no generó out en la entrada
  countText?: string; // ej: "3-2"
  isHit: boolean;
  isOut: boolean;
  isScoringPlay: boolean;
}

export interface ScorecardBatterRow {
  id: number;
  name: string;
  jersey: string;
  position: string;
  slot: number; // 1 a 9
  order: number; // 100, 101...
  isSubstitute: boolean;
  note?: string; // "a-", "b-", "1-"
  todaySummary?: string;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  avg: string;
  ops?: string;
  // Celdas organizadas por número de entrada (soporta múltiples turnos en un mismo inning)
  innings: Record<number, ScorecardCell[]>;
}

export interface ScorecardInningSummary {
  inning: number;
  runs: number;
  hits: number;
  errors: number;
  lob: number;
}

export interface TeamScorecard {
  teamId: number;
  teamName: string;
  abbreviation: string;
  logoUrl: string;
  isHome: boolean;
  isLeones: boolean;
  batters: ScorecardBatterRow[];
  inningsSummary: ScorecardInningSummary[];
  totals: {
    runs: number;
    hits: number;
    errors: number;
    lob: number;
  };
}

export interface GameCenterScorecard {
  maxInnings: number;
  away: TeamScorecard;
  home: TeamScorecard;
}
