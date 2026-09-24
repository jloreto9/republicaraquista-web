export interface CollectiveBattingTeam {
  teamId: number;
  teamName: string;
  teamAbbr: string;
  logo: string;
  games: number;
  pa: number;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sb: number;
  avg: number;
  avgStr: string;
  obp: number;
  obpStr: string;
  slg: number;
  slgStr: string;
  ops: number;
  opsStr: string;
  lob: number;
  babip: number;
  babipStr: string;
  isLeones: boolean;
}

export interface CollectivePitchingTeam {
  teamId: number;
  teamName: string;
  teamAbbr: string;
  logo: string;
  games: number;
  wins: number;
  losses: number;
  era: number;
  eraStr: string;
  whip: number;
  whipStr: string;
  sv: number;
  holds: number;
  blownSaves: number;
  ip: number;
  ipStr: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  k9: number;
  k9Str: string;
  bb9: number;
  bb9Str: string;
  kbb: number;
  kbbStr: string;
  baa: number;
  baaStr: string;
  isLeones: boolean;
}

export interface CollectiveFieldingTeam {
  teamId: number;
  teamName: string;
  teamAbbr: string;
  logo: string;
  games: number;
  innings: string;
  po: number;
  a: number;
  e: number;
  tc: number;
  fpct: number;
  fpctStr: string;
  dp: number;
  tp: number;
  pb: number;
  cs: number;
  sb: number;
  csPct: number;
  csPctStr: string;
  rf9: number;
  rf9Str: string;
  isLeones: boolean;
}

export interface CollectiveKPICardData {
  title: string;
  value: string;
  teamName: string;
  iconName: string;
}

export interface CollectiveStatsResult {
  batting: CollectiveBattingTeam[];
  pitching: CollectivePitchingTeam[];
  fielding: CollectiveFieldingTeam[];
  battingKpis: {
    avgVal: string;
    avgTeam: string;
    opsVal: string;
    opsTeam: string;
    hrVal: string;
    hrTeam: string;
    rVal: string;
    rTeam: string;
  };
  pitchingKpis: {
    eraVal: string;
    eraTeam: string;
    whipVal: string;
    whipTeam: string;
    soVal: string;
    soTeam: string;
    svVal: string;
    svTeam: string;
  };
  fieldingKpis: {
    fpctVal: string;
    fpctTeam: string;
    eVal: string;
    eTeam: string;
    dpVal: string;
    dpTeam: string;
    csPctVal: string;
    csPctTeam: string;
  };
}
