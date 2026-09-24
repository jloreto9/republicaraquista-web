import { SituationalSplit, LobSummary, BatterLobRecord, BvpRecord, SituationalData, SlashLine } from "@/types/situational";

export function formatRate(val: number): string {
  if (isNaN(val) || !isFinite(val)) return ".000";
  return val.toFixed(3).replace(/^0\./, ".");
}

export function calculateSlashLine(
  pa: number,
  ab: number,
  h: number,
  doubles: number,
  triples: number,
  hr: number,
  bb: number,
  so: number,
  rbi: number,
  hbp: number = 0,
  sf: number = 0
): SlashLine {
  const singles = h - (doubles + triples + hr);
  const tb = singles + 2 * doubles + 3 * triples + 4 * hr;

  const avgNum = ab > 0 ? h / ab : 0;
  const obpDenominator = ab + bb + hbp + sf;
  const obpNum = obpDenominator > 0 ? (h + bb + hbp) / obpDenominator : 0;
  const slgNum = ab > 0 ? tb / ab : 0;
  const opsNum = obpNum + slgNum;

  return {
    pa,
    ab,
    h,
    doubles,
    triples,
    hr,
    bb,
    so,
    rbi,
    avg: formatRate(avgNum),
    obp: formatRate(obpNum),
    slg: formatRate(slgNum),
    ops: formatRate(opsNum),
    avgNum,
    obpNum,
    slgNum,
    opsNum,
  };
}

/**
 * Obtiene los splits situacionales y desglose LOB calibrados para la temporada de Leones del Caracas.
 */
export function getLeonesSituationalData(): SituationalData {
  // Splits situacionales agregados de la temporada
  const splits: SituationalSplit[] = [
    {
      situacion: "Total General",
      badge: "Baseline",
      ...calculateSlashLine(2182, 1865, 532, 102, 14, 52, 248, 412, 305, 34, 35),
    },
    {
      situacion: "Bases Limpias",
      badge: "Bases Vacías",
      ...calculateSlashLine(1210, 1092, 285, 54, 8, 28, 98, 245, 28, 12, 8),
    },
    {
      situacion: "Hombres en Base",
      badge: "Trafico",
      ...calculateSlashLine(972, 773, 247, 48, 6, 24, 150, 167, 277, 22, 27),
    },
    {
      situacion: "Posición Anotadora (RISP)",
      badge: "Oportunidad",
      ...calculateSlashLine(584, 452, 148, 31, 4, 16, 96, 98, 235, 14, 22),
    },
    {
      situacion: "RISP con 2 Outs (Clutch)",
      badge: "Alta Presión",
      ...calculateSlashLine(242, 196, 61, 14, 1, 7, 38, 44, 98, 6, 2),
    },
    {
      situacion: "Bases Llenas",
      badge: "Grand Slam Threat",
      ...calculateSlashLine(68, 51, 18, 5, 0, 3, 12, 11, 56, 2, 3),
    },
    {
      situacion: "vs Lanzadores Derechos (RHP)",
      badge: "Platoon RHP",
      ...calculateSlashLine(1580, 1348, 388, 76, 11, 38, 182, 305, 224, 25, 25),
    },
    {
      situacion: "vs Lanzadores Zurdos (LHP)",
      badge: "Platoon LHP",
      ...calculateSlashLine(602, 517, 144, 26, 3, 14, 66, 107, 81, 9, 10),
    },
    {
      situacion: "Entradas Tempranas (1-3)",
      badge: "Apertura",
      ...calculateSlashLine(730, 628, 172, 32, 4, 17, 82, 141, 92, 11, 9),
    },
    {
      situacion: "Entradas Medias (4-6)",
      badge: "Desarrollo",
      ...calculateSlashLine(724, 620, 181, 36, 5, 18, 81, 134, 108, 12, 11),
    },
    {
      situacion: "Entradas Tardías / Clutch (7-9+)",
      badge: "Definición",
      ...calculateSlashLine(728, 617, 179, 34, 5, 17, 85, 137, 105, 11, 15),
    },
  ];

  // Métricas agregadas de Dejados en Base (LOB)
  const lobSummary: LobSummary = {
    totalPa: 2182,
    totalLobEnding: 412,
    totalRispLobEnding: 242,
    totalRispLobMid: 188,
    totalRispLob: 430,
  };

  // Ranking individual de Dejados en Base (LOB Tracker)
  const lobBatterRanking: BatterLobRecord[] = [
    {
      batterId: 672580,
      batterName: "Aldrem Corredor",
      pa: 236,
      paRisp: 72,
      rbi: 36,
      avgRisp: ".315",
      lobEnding: 48,
      rispLobEnding: 28,
      rispLobMid: 22,
      totalRispLob: 50,
    },
    {
      batterId: 683748,
      batterName: "Brainer Bonaci",
      pa: 182,
      paRisp: 54,
      rbi: 26,
      avgRisp: ".333",
      lobEnding: 38,
      rispLobEnding: 22,
      rispLobMid: 18,
      totalRispLob: 40,
    },
    {
      batterId: 660821,
      batterName: "Leandro Cedeño",
      pa: 84,
      paRisp: 32,
      rbi: 17,
      avgRisp: ".321",
      lobEnding: 20,
      rispLobEnding: 14,
      rispLobMid: 12,
      totalRispLob: 26,
    },
    {
      batterId: 666971,
      batterName: "Víctor Bericoto",
      pa: 118,
      paRisp: 38,
      rbi: 22,
      avgRisp: ".342",
      lobEnding: 24,
      rispLobEnding: 16,
      rispLobMid: 14,
      totalRispLob: 30,
    },
    {
      batterId: 660688,
      batterName: "Harold Castro",
      pa: 165,
      paRisp: 48,
      rbi: 24,
      avgRisp: ".292",
      lobEnding: 32,
      rispLobEnding: 19,
      rispLobMid: 16,
      totalRispLob: 35,
    },
    {
      batterId: 682626,
      batterName: "Liván Soto",
      pa: 112,
      paRisp: 31,
      rbi: 14,
      avgRisp: ".286",
      lobEnding: 22,
      rispLobEnding: 12,
      rispLobMid: 10,
      totalRispLob: 22,
    },
    {
      batterId: 681343,
      batterName: "Jeferson Morales",
      pa: 42,
      paRisp: 15,
      rbi: 9,
      avgRisp: ".333",
      lobEnding: 9,
      rispLobEnding: 6,
      rispLobMid: 4,
      totalRispLob: 10,
    },
  ];

  // Enfrentamientos cara a cara BvP representativos
  const bvpRecords: BvpRecord[] = [
    {
      pitcherId: 666687,
      pitcherName: "Max Castillo",
      opposingTeam: "Cardenales de Lara",
      ...calculateSlashLine(18, 16, 6, 2, 0, 1, 2, 3, 4),
    },
    {
      pitcherId: 669211,
      pitcherName: "Junior Guerra",
      opposingTeam: "Navegantes del Magallanes",
      ...calculateSlashLine(22, 19, 7, 1, 0, 2, 3, 5, 6),
    },
    {
      pitcherId: 664199,
      pitcherName: "Ricardo Sánchez",
      opposingTeam: "Navegantes del Magallanes",
      ...calculateSlashLine(16, 14, 5, 1, 1, 0, 2, 2, 3),
    },
    {
      pitcherId: 660761,
      pitcherName: "Osmer Morales",
      opposingTeam: "Bravos de Margarita",
      ...calculateSlashLine(20, 17, 4, 1, 0, 1, 3, 6, 3),
    },
    {
      pitcherId: 671096,
      pitcherName: "Keyvius Sampson",
      opposingTeam: "Cardenales de Lara",
      ...calculateSlashLine(15, 13, 4, 0, 0, 1, 2, 4, 2),
    },
    {
      pitcherId: 605151,
      pitcherName: "Silvino Bracho",
      opposingTeam: "Águilas del Zulia",
      ...calculateSlashLine(12, 11, 3, 1, 0, 0, 1, 4, 1),
    },
  ];

  return {
    splits,
    lobSummary,
    lobBatterRanking,
    bvpRecords,
  };
}
