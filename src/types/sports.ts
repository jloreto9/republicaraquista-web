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

export interface BattingStats {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  teamId: number;
  teamName: string;
  teamAbbr: string;
  teamLogo: string;
  games: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  iso: number;
  babip: number;
}

export interface PitchingStats {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  teamId: number;
  teamName: string;
  teamAbbr: string;
  teamLogo: string;
  games: number;
  gamesStarted: number;
  inningsPitched: number;
  inningsDisplay: string;
  hits: number;
  runs: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRuns: number;
  era: number;
  whip: number;
  kPer9: number;
  bbPer9: number;
  kToBb: number;
  saves?: number;
  wins?: number;
  losses?: number;
}

export interface FieldingStats {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  teamId: number;
  teamName: string;
  teamAbbr: string;
  teamLogo: string;
  position: string;
  games: number;
  putouts: number;
  assists: number;
  errors: number;
  totalChances: number;
  fieldingPct: number;
  doublePlays: number;
}
