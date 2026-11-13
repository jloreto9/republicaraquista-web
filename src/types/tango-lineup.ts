export type TangoStatsSource = "supabase" | "mlb" | "canonical_map" | "synthetic";

export interface TangoPlayer {
  playerId: number;
  playerName: string;
  position: string;
  bats: 'R' | 'L' | 'S'; // R: Derecho, L: Zurdo, S: Ambidiestro
  avg: number;
  obp: number;
  slg: number;
  woba: number;
  wrcPlus: number;
  iso: number;
  headshot?: string;
  statsSource?: TangoStatsSource;
}

export interface TangoSlotContribution {
  slot: number;
  player: TangoPlayer;
  role: string;
  roleDesc: string;
  paGame: number;
  paSeason: number;
  runsContributedGame: number;
  runsContributedSeason: number;
  explanation: string;
}

export interface TangoLineupMetrics {
  runsPerGame: number;
  runsPerSeason: number;
  teamWoba: number;
  platoonBalanceScore: number;
  contributions: TangoSlotContribution[];
}

export interface TangoOptimizationResult {
  currentLineup: TangoSlotContribution[];
  optimizedLineup: TangoSlotContribution[];
  currentMetrics: TangoLineupMetrics;
  optimizedMetrics: TangoLineupMetrics;
  deltaRunsPerGame: number;
  deltaRunsPerSeason: number;
}

export type TangoPositionSlot =
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF"
  | "OF"
  | "DH";

export interface ActiveRosterBatter extends TangoPlayer {
  plateAppearances: number;
  atBats: number;
  gamesPlayed?: number;
  eligiblePositions: string[];
  rosterStatus?: string;
}

export type BestLineupConstraintMode = "defensive_valid" | "pure_bats";

export interface BuildBestAvailableLineupParams {
  pool: ActiveRosterBatter[];
  mode?: BestLineupConstraintMode;
  minPlateAppearances?: number;
  excludedPlayerIds?: number[];
  referenceLineup?: TangoPlayer[];
}

export interface BestAvailableLineupResult {
  optimization: TangoOptimizationResult;
  assignedPositions: Record<number, string>;
  benchPlayers: ActiveRosterBatter[];
  modeUsed: BestLineupConstraintMode;
  effectiveMinPa: number;
  relaxedConstraintNote?: string;
}
