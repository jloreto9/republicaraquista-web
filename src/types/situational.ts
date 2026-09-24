export interface SlashLine {
  pa: number;
  ab: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  bb: number;
  so: number;
  rbi: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
  avgNum: number;
  obpNum: number;
  slgNum: number;
  opsNum: number;
}

export interface SituationalSplit extends SlashLine {
  situacion: string;
  badge?: string;
}

export interface LobSummary {
  totalPa: number;
  totalLobEnding: number;
  totalRispLobEnding: number;
  totalRispLobMid: number;
  totalRispLob: number;
}

export interface BatterLobRecord {
  batterId: number;
  batterName: string;
  pa: number;
  paRisp: number;
  rbi: number;
  avgRisp: string;
  lobEnding: number;
  rispLobEnding: number;
  rispLobMid: number;
  totalRispLob: number;
}

export interface BvpRecord extends SlashLine {
  pitcherId: number;
  pitcherName: string;
  opposingTeam: string;
}

export interface SituationalData {
  splits: SituationalSplit[];
  lobSummary: LobSummary;
  lobBatterRanking: BatterLobRecord[];
  bvpRecords: BvpRecord[];
}
