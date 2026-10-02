export type SportsbookId =
  | "juegaenlinea"
  | "betcris"
  | "sellatuparley"
  | "apuestasroyal"
  | "custom";

export type OddsFormat = "american" | "decimal";

export interface SportsbookMeta {
  id: SportsbookId;
  name: string;
  shortName: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
}

export interface SportsbookOdds {
  sportsbookId: SportsbookId;
  sportsbookName: string;
  homeMl: number | null;       // Cuota decimal (null si la casa no ha publicado línea)
  awayMl: number | null;       // Cuota decimal (null si la casa no ha publicado línea)
  overTotal?: number | null;   // Línea de carreras (ej. 9.0)
  overOdds?: number | null;    // Cuota Over (ej. 1.90)
  underOdds?: number | null;   // Cuota Under (ej. 1.90)
  runlineSpread?: number | null; // Spread local (ej. -1.5)
  runlineHomeOdds?: number | null; // Cuota local RL (ej. 2.40)
  runlineAwayOdds?: number | null; // Cuota visitante RL (ej. 1.55)
  isOpen?: boolean;            // true solo si la casa publicó cuotas o el usuario las ingresó
  updatedAt?: string;
}

export interface ProbablePitcher {
  id: number;
  name: string;
  teamId: number;
  teamAbbr: string;
  throws: "R" | "L";
  era: number;
  fip: number;
  whip: number;
  k9: number;
  bb9: number;
  inningsPitched: number;
  headshotUrl?: string;
}

export interface ParkFactor {
  stadiumName: string;
  city: string;
  runFactor: number;   // 1.00 = neutral, >1.00 = bateador, <1.00 = lanzador
  hrFactor: number;
  elevationMeters: number;
  description: string;
}

export interface ModelProbabilities {
  homeWinProb: number;       // 0.0 - 1.0
  awayWinProb: number;       // 0.0 - 1.0
  homeExpectedRuns: number;  // ej. 5.2
  awayExpectedRuns: number;  // ej. 4.3
  totalExpectedRuns: number; // ej. 9.5
  fairHomeDecimal: number;   // ej. 1.74
  fairAwayDecimal: number;   // ej. 2.35
  fairHomeAmerican: number;  // ej. -135
  fairAwayAmerican: number;  // ej. +135
  runlineHomeProb: number;   // Cubre -1.5
  runlineAwayProb: number;   // Cubre +1.5
  fairRunlineHomeDecimal: number;
  fairRunlineAwayDecimal: number;
  overProb: number;          // Probabilidad de Over para el total proyectado
  underProb: number;
  recommendedTotal: number;  // Línea sugerida (ej. 9.0 u 9.5)
}

export type EvRating = "neutral" | "value" | "mispriced";

export interface ValueAssessment {
  selection: "home_ml" | "away_ml" | "over" | "under" | "home_rl" | "away_rl";
  label: string;
  teamAbbr?: string;
  sportsbookId: SportsbookId;
  sportsbookName: string;
  marketOdds: number;
  fairOdds: number;
  winProb: number;
  evPercent: number;          // Porcentaje de Expected Value (+EV)
  rating: EvRating;           // 'neutral' | 'value' | 'mispriced'
  kellyStakePercent: number;  // Quarter-Kelly sugerido (0.0 - 5.0%)
  explanation?: string;       // Argumento causal sabermétrico
}

export interface BestOddsSummary {
  hasMarketOdds: boolean;
  bestHomeMl?: { odds: number; sportsbookId: SportsbookId; sportsbookName: string };
  bestAwayMl?: { odds: number; sportsbookId: SportsbookId; sportsbookName: string };
  bestOver?: { odds: number; line: number; sportsbookId: SportsbookId; sportsbookName: string };
  bestUnder?: { odds: number; line: number; sportsbookId: SportsbookId; sportsbookName: string };
}

export interface GameProjection {
  gameId: string;
  gameDate: string;
  gameTime?: string;
  isToday?: boolean;
  status: "scheduled" | "in_progress" | "final";
  homeTeamId: number;
  homeTeamName: string;
  homeTeamAbbr: string;
  homeTeamLogo: string;
  homeScore?: number;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamAbbr: string;
  awayTeamLogo: string;
  awayScore?: number;
  stadium: string;
  city: string;
  parkFactor: ParkFactor;
  homePitcher: ProbablePitcher;
  awayPitcher: ProbablePitcher;
  oddsByBook: Record<SportsbookId, SportsbookOdds>;
  bestOdds: BestOddsSummary;
  model: ModelProbabilities;
  assessments: ValueAssessment[];
  topPick?: ValueAssessment;
  isOfficialCalendarGame?: boolean;
}

export interface NextScheduledGameSummary {
  date: string;
  opponentId: number;
  opponentName: string;
  opponentAbbr: string;
  opponentLogo: string;
  isHome: boolean;
  stadiumName: string;
  timeDisplay: string;
  transmission: string;
  daysUntil: number;
}

export interface TipsterDailyCard {
  date: string;
  season: number;
  totalGames: number;
  projections: GameProjection[];
  topPicks: ValueAssessment[];
  mispricedAlerts: ValueAssessment[];
  hasLiveMarketOdds?: boolean;
  isCalendarScheduled?: boolean;
  calendarEventSummary?: string;
  isRestDay?: boolean;
  nextScheduledGame?: NextScheduledGameSummary;
}
