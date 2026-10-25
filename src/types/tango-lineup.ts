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
