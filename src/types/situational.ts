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

export interface PitchingSituationalSplit {
  situacion: string;
  badge?: string;
  bf: number;       // Batters Faced / PA
  ab: number;       // At Bats rivales
  h: number;        // Hits permitidos
  doubles: number;  // Dobles permitidos
  triples: number;  // Triples permitidos
  hr: number;       // Jonrones permitidos
  bb: number;       // Boletos concedidos
  so: number;       // Ponches propinados
  er: number;       // Carreras limpias
  ipDisplay: string;// Innings (ej. "45.1")
  ipDecimal: number;
  era: string;      // Efectividad en la situación
  whip: string;     // WHIP en la situación
  baa: string;      // Promedio de bateo en contra (.AVG)
  obp: string;      // OBP rival
  slg: string;      // SLG rival
  ops: string;      // OPS rival
  kPer9: string;    // Ponches por 9 IP
  bbPer9: string;   // Boletos por 9 IP
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
  pitchingSplits?: PitchingSituationalSplit[];
  lobSummary: LobSummary;
  lobBatterRanking: BatterLobRecord[];
  bvpRecords: BvpRecord[];
}
