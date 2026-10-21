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

export interface RelieverDayUsage {
  date: string;
  dayLabel: string;
  dayOfWeek: string;
  gamePk: number;
  opponent: string;
  isOffDay?: boolean;
  isStarter?: boolean;
  isGS?: boolean;
  pitched: boolean;
  pitches: number;
  strikes: number;
  ip: string;
  ipDecimal: number;
  er: number;
  so: number;
  bb: number;
  h: number;
  decision?: "W" | "L" | "SV" | "HLD" | "";
  loadLevel: "rest" | "low" | "medium" | "high";
}

export interface RelieverBudgetItem {
  pitcherId: number;
  pitcherName: string;
  headshot: string;
  role: "Starter" | "Closer" | "Setup" | "High Leverage" | "Middle Relief" | "Long Relief";
  roleAbbr: "SP" | "CL" | "SU" | "HL" | "MR" | "LR";
  throws: "R" | "L";
  isStarterStaff?: boolean;
  seasonStats: {
    games: number;
    gs: number;
    era: string;
    whip: string;
    sv: number;
    holds: number;
    so: number;
    totalIp: string;
  };
  dailyUsage: RelieverDayUsage[];
  summary: {
    pitchesLast3Days: number;
    pitchesLast5Days: number;
    totalPitchesWeek: number;
    totalInningsWeek: string;
    totalOutsWeek: number;
    consecutiveDaysPitched: number;
    daysSinceLastPitched: number;
    availabilityStatus: "available" | "caution" | "unavailable";
    availabilityLabel: "Disponible" | "Precaución" | "Fatiga / Descanso";
  };
}

export interface BullpenBudgetData {
  teamId: number;
  teamName: string;
  teamLogo?: string;
  season: number;
  dates: {
    date: string;
    dayLabel: string;
    dayOfWeek: string;
    opponent: string;
    gamePk: number;
    isOffDay?: boolean;
  }[];
  relievers: RelieverBudgetItem[];
  kpis: {
    availableArms: number;
    cautionArms: number;
    unavailableArms: number;
    totalRelievers: number;
    teamPitchesLast3Days: number;
    teamPitchesLast5Days: number;
    mostWorkedReliever: string;
    mostWorkedPitches: number;
  };
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
  bullpenBudget?: BullpenBudgetData;
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
