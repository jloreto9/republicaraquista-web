export interface RelieverInheritedStat {
  pitcherId: number;
  pitcherName: string;
  appearances: number;
  ir: number;
  irs: number;
  irsPct: string;
  irsPctNum: number;
}

export interface InheritedLog {
  gamePk: number;
  gameDate: string;
  opp: string;
  inning: number;
  pitcher: string;
  ir: number;
  irs: number;
}

export interface StarterSlot {
  order: number;
  playerId: number;
  playerName: string;
  position: string;
  badgeColor?: string;
}

export interface GameLineup {
  gamePk: number;
  gameDate: string;
  opp: string;
  oppLogo?: string;
  isHome: boolean;
  leonesScore: number;
  oppScore: number;
  won: boolean;
  scoreStr: string;
  starters: StarterSlot[];
}

export interface TopLineup {
  rank: number;
  games: number;
  record: string;
  pct: string;
  starters: StarterSlot[];
  gamesDetail: string;
}

export interface PlayerSlotBreakdown {
  slot: string;
  starts: number;
  wins: number;
  losses: number;
  pct: string;
}

export interface PlayerLineupImpact {
  playerName: string;
  games: number;
  record: string;
  pct: string;
  breakdown: PlayerSlotBreakdown[];
}

export interface BullpenAndLineupsData {
  bullpen: {
    kpis: {
      totalIr: number;
      totalIrs: number;
      irsPct: string;
      bestReliever: string;
      bestRelieverSub: string;
    };
    relievers: RelieverInheritedStat[];
    logs: InheritedLog[];
  };
  lineups: {
    kpis: {
      totalGames: number;
      totalPlayers: number;
      topStarter: string;
      topStarterJj: string;
      topCleanup: string;
      topCleanupJj: string;
    };
    gameLineups: GameLineup[];
    topFrequentLineups: TopLineup[];
    heatmap: {
      player: string;
      counts: number[]; // índices 0..8 para turnos 1..9
      total: number;
    }[];
    playerImpacts: Record<string, PlayerLineupImpact>;
    availablePlayers: string[];
  };
}
