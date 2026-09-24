export interface Team {
  id: number;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

export interface TeamStanding {
  teamId: number;
  teamName: string;
  abbreviation: string;
  logoUrl: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pct: number;
  gamesBack: number | string;
  runsScored: number;
  runsAllowed: number;
  runDifferential: number;
  homeRecord: string;
  awayRecord: string;
  streak: string;
  last10: string;
  pythagoreanPct: number;
  expectedWins: number;
  expectedLosses: number;
  eloRating: number;
}

export interface GameSummary {
  id: number;
  gamePk: number;
  gameDate: string;
  season: number;
  gameType: string;
  status: string;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamAbbr: string;
  homeTeamLogo: string;
  homeScore: number;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamAbbr: string;
  awayTeamLogo: string;
  awayScore: number;
  currentInning?: number;
  inningState?: string;
  isDayGame?: boolean;
}

export interface SeasonKPIs {
  season: number;
  totalGames: number;
  caracasWins: number;
  caracasLosses: number;
  caracasPct: number;
  caracasStreak: string;
  caracasRunDiff: number;
  caracasPosition: number;
  dayWins: number;
  dayLosses: number;
  nightWins: number;
  nightLosses: number;
}
