export type CompareType = "Bateadores" | "Lanzadores";

export interface RadarAxis {
  name: string;
  key: string;
  higherBetter: boolean;
  val1: string | number;
  val2: string | number;
  pct1: number;
  pct2: number;
  leader: string;
  leaderScheme: "amber" | "blue" | "gray";
}

export interface H2HRow {
  category: string;
  metric: string;
  val1: string;
  val2: string;
  winner: string;
  winnerColor: string;
  winnerScheme: "amber" | "blue" | "gray";
  isHeader?: boolean;
}

export interface PlayerProfileCardData {
  playerId: number;
  name: string;
  team: string;
  teamAbbr: string;
  teamLogo?: string;
  pos: string;
  headshot?: string;
  phase: string;
  mainStats: { label: string; value: string }[];
}

export interface MatchupComparisonData {
  compareType: CompareType;
  player1: PlayerProfileCardData;
  player2: PlayerProfileCardData;
  radarAxes: RadarAxis[];
  h2hRows: H2HRow[];
  verdict: string;
  p1Wins: number;
  p2Wins: number;
  ties: number;
}

export type MatchupCardWinner = "p1" | "p2" | "tie";

export interface MatchupCardRow {
  key: string;
  label: string;
  val1: string;
  val2: string;
  winner: MatchupCardWinner;
}

export interface MatchupCardSection {
  title: string;
  rows: MatchupCardRow[];
}

export interface MatchupCardPlayerMeta {
  playerId: number;
  name: string;
  teamName: string;
  teamAbbr: string;
  teamLogo: string;
  headshot: string;
  seasonLabel: string;
  phaseLabel: string;
}

export interface MatchupCardData {
  compareType: CompareType;
  player1: MatchupCardPlayerMeta;
  player2: MatchupCardPlayerMeta;
  sections: MatchupCardSection[];
  p1Wins: number;
  p2Wins: number;
  ties: number;
  footerNote: string;
}
