export interface WpaPlay {
  atbatIndex: number;
  inning: number;
  halfInning: string;
  isBottom: boolean;
  outsBefore: number;
  baseStateBefore: number;
  baseIcons: string;
  batterId: number;
  batter: string;
  pitcherId: number;
  pitcher: string;
  eventType: string;
  description: string;
  runsInPlay: number;
  homeScoreAfter: number;
  awayScoreAfter: number;
  leonesScoreAfter: number;
  oppScoreAfter: number;
  scoreStr: string;
  wpBefore: number;
  wpAfter: number;
  wpa: number;
  li: number;
  wpaLi: number;
  leonesBatting: boolean;
}

export interface GameWpaData {
  gameId: number;
  gameDate: string;
  homeTeam: string;
  awayTeam: string;
  leonesIsHome: boolean;
  homeFinalScore: number;
  awayFinalScore: number;
  totalPlays: number;
  plays: WpaPlay[];
}

export interface PlayerGameWpa {
  playerId: number;
  player: string;
  wpaTotal: number;
  wpaLiTotal: number;
  clutch: number;
  paCount?: number;
  bfCount?: number;
}

export interface SeasonWpaLeader {
  playerId: number;
  player: string;
  games: number;
  paOrBf: number;
  wpa: number;
  wpaLi: number;
  liAvg: number;
  clutch: number;
  type: "batter" | "pitcher";
}

export interface GameOption {
  id: number;
  date: string;
  opponent: string;
  score: string;
  result: "W" | "L";
  gameNumber?: number;
}

