export interface GameCenterTeam {
  id: number;
  name: string;
  abbreviation: string;
  logoUrl: string;
  isHome: boolean;
  isLeones: boolean;
  score: number;
  hits: number;
  errors: number;
  lob: number;
}

export interface InningLinescore {
  num: number;
  away: number | null;
  home: number | null;
}

export interface GameCenterLinescore {
  innings: InningLinescore[];
  awayTotals: { runs: number; hits: number; errors: number; lob: number };
  homeTotals: { runs: number; hits: number; errors: number; lob: number };
  currentInning: number;
  currentInningOrdinal: string;
  inningHalf: "Top" | "Bottom" | "Middle" | "End" | "";
  isTopInning: boolean;
}

export interface GameCenterCount {
  balls: number;
  strikes: number;
  outs: number;
}

export interface BaseRunner {
  occupied: boolean;
  runnerName?: string;
  runnerId?: number;
}

export interface GameCenterBases {
  first: BaseRunner;
  second: BaseRunner;
  third: BaseRunner;
}

export interface GameCenterPlayerMatchup {
  id: number;
  name: string;
  side: string; // 'Z' | 'D' | 'A'
  jerseyNumber?: string;
  position?: string;
  todaySummary: string; // ej: "1-3, HR, 2 RBI" o "4.2 IP, 3 H, 1 ER, 5 K"
  seasonSlash?: string; // ej: ".312 / .385 / .540" o "3.45 ERA / 1.15 WHIP"
  headshotUrl: string;
}

export interface GameCenterPlay {
  id: string;
  inning: number;
  half: "Alta" | "Baja";
  event: string; // ej: "Jonrón", "Sencillo", "Ponche"
  eventType: string;
  description: string;
  score: string;
  outs: number;
  isCaracasBatting: boolean;
  isScoringPlay: boolean;
  isHit: boolean;
  isOut: boolean;
  badgeColor: "gold" | "emerald" | "crimson" | "blue" | "slate";
}

export interface GameCenterBoxscoreBatter {
  id: number;
  name: string;
  jersey: string;
  position: string;
  order: number;
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
  ops: string;
}

export interface GameCenterBoxscorePitcher {
  id: number;
  name: string;
  jersey: string;
  ip: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  era: string;
  pitches: number;
  strikes: number;
}

export interface GameCenterAvailableGame {
  id: number;
  gamePk: number;
  date: string;
  opponent: string;
  opponentLogo: string;
  score: string;
  status: string;
  isHome: boolean;
  isLive: boolean;
}

export interface GameCenterData {
  gamePk: number;
  season: number;
  status: "Live" | "Final" | "Preview";
  statusLabel: string; // 'EN VIVO', 'FINAL', 'PRE-JUEGO'
  detailedState: string;
  date: string;
  time: string;
  venue: string;
  venueCity: string;
  homeTeam: GameCenterTeam;
  awayTeam: GameCenterTeam;
  isHomeLeones: boolean;
  currentInning: number;
  inningHalf: string;
  isTopInning: boolean;
  count: GameCenterCount;
  bases: GameCenterBases;
  batter: GameCenterPlayerMatchup | null;
  pitcher: GameCenterPlayerMatchup | null;
  linescore: GameCenterLinescore;
  plays: GameCenterPlay[];
  boxscore: {
    awayBatters: GameCenterBoxscoreBatter[];
    homeBatters: GameCenterBoxscoreBatter[];
    awayPitchers: GameCenterBoxscorePitcher[];
    homePitchers: GameCenterBoxscorePitcher[];
  };
  availableGames: GameCenterAvailableGame[];
}
