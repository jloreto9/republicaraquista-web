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

// ── DATASET TEMPORADA 2026-2027 (EN CURSO) ──────────────────────────────
export const LEONES_SITUATIONAL_2026: SituationalData = {
  splits: [
    {
      situacion: "Total General",
      badge: "Baseline",
      ...calculateSlashLine(35, 27, 2, 1, 0, 0, 7, 6, 0, 1, 0),
    },
    {
      situacion: "Bases Limpias",
      badge: "Bases Vacías",
      ...calculateSlashLine(16, 16, 1, 1, 0, 0, 0, 3, 0, 0, 0),
    },
    {
      situacion: "Hombres en Base",
      badge: "Tráfico",
      ...calculateSlashLine(19, 11, 1, 0, 0, 0, 7, 3, 0, 1, 0),
    },
    {
      situacion: "Posición Anotadora (RISP)",
      badge: "Oportunidad",
      ...calculateSlashLine(13, 9, 1, 0, 0, 0, 4, 3, 0, 0, 0),
    },
    {
      situacion: "RISP con 2 Outs (Clutch)",
      badge: "Alta Presión",
      ...calculateSlashLine(11, 8, 1, 0, 0, 0, 3, 3, 0, 0, 0),
    },
    {
      situacion: "Bases Llenas",
      badge: "Grand Slam Threat",
      ...calculateSlashLine(1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0),
    },
    {
      situacion: "vs Lanzadores Derechos (RHP)",
      badge: "Platoon RHP",
      ...calculateSlashLine(35, 27, 2, 1, 0, 0, 7, 6, 0, 1, 0),
    },
    {
      situacion: "vs Lanzadores Zurdos (LHP)",
      badge: "Platoon LHP",
      ...calculateSlashLine(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    },
    {
      situacion: "Entradas Tempranas (1-3)",
      badge: "Apertura",
      ...calculateSlashLine(13, 10, 1, 1, 0, 0, 2, 2, 0, 1, 0),
    },
    {
      situacion: "Entradas Medias (4-6)",
      badge: "Desarrollo",
      ...calculateSlashLine(11, 10, 1, 0, 0, 0, 1, 3, 0, 0, 0),
    },
    {
      situacion: "Entradas Tardías / Clutch (7-9+)",
      badge: "Definición",
      ...calculateSlashLine(11, 7, 0, 0, 0, 0, 4, 1, 0, 0, 0),
    },
  ],
  lobSummary: {
    totalPa: 35,
    totalLobEnding: 10,
    totalRispLobEnding: 7,
    totalRispLobMid: 5,
    totalRispLob: 12,
  },
  lobBatterRanking: [
    {
      batterId: 541600,
      batterName: "Wilfredo Tovar",
      pa: 3,
      paRisp: 1,
      rbi: 0,
      avgRisp: ".000",
      lobEnding: 3,
      rispLobEnding: 3,
      rispLobMid: 0,
      totalRispLob: 3,
    },
    {
      batterId: 660821,
      batterName: "Leandro Cedeño",
      pa: 4,
      paRisp: 1,
      rbi: 0,
      avgRisp: ".000",
      lobEnding: 2,
      rispLobEnding: 1,
      rispLobMid: 1,
      totalRispLob: 2,
    },
    {
      batterId: 602922,
      batterName: "José Rondón",
      pa: 4,
      paRisp: 2,
      rbi: 0,
      avgRisp: ".000",
      lobEnding: 2,
      rispLobEnding: 1,
      rispLobMid: 1,
      totalRispLob: 2,
    },
    {
      batterId: 808967,
      batterName: "Marvin Alcántara",
      pa: 1,
      paRisp: 1,
      rbi: 0,
      avgRisp: ".000",
      lobEnding: 2,
      rispLobEnding: 1,
      rispLobMid: 1,
      totalRispLob: 2,
    },
    {
      batterId: 678876,
      batterName: "Kenedy Corona",
      pa: 3,
      paRisp: 0,
      rbi: 0,
      avgRisp: ".000",
      lobEnding: 1,
      rispLobEnding: 0,
      rispLobMid: 0,
      totalRispLob: 0,
    },
    {
      batterId: 814407,
      batterName: "Alfredo Duno",
      pa: 4,
      paRisp: 2,
      rbi: 0,
      avgRisp: ".000",
      lobEnding: 0,
      rispLobEnding: 1,
      rispLobMid: 1,
      totalRispLob: 2,
    },
    {
      batterId: 672580,
      batterName: "Aldrem Corredor",
      pa: 4,
      paRisp: 1,
      rbi: 0,
      avgRisp: ".000",
      lobEnding: 0,
      rispLobEnding: 0,
      rispLobMid: 0,
      totalRispLob: 0,
    },
    {
      batterId: 682900,
      batterName: "Brainer Bonaci",
      pa: 4,
      paRisp: 1,
      rbi: 0,
      avgRisp: ".000",
      lobEnding: 0,
      rispLobEnding: 0,
      rispLobMid: 0,
      totalRispLob: 0,
    },
    {
      batterId: 672820,
      batterName: "Lenyn Sosa",
      pa: 4,
      paRisp: 2,
      rbi: 0,
      avgRisp: ".000",
      lobEnding: 0,
      rispLobEnding: 0,
      rispLobMid: 0,
      totalRispLob: 0,
    },
    {
      batterId: 602074,
      batterName: "Yonathan Daza",
      pa: 3,
      paRisp: 2,
      rbi: 0,
      avgRisp: ".500",
      lobEnding: 0,
      rispLobEnding: 0,
      rispLobMid: 0,
      totalRispLob: 0,
    },
  ],
  bvpRecords: [
    {
      pitcherId: 692369,
      pitcherName: "José Dávila",
      opposingTeam: "Águilas del Zulia",
      ...calculateSlashLine(13, 10, 1, 1, 0, 0, 2, 2, 0, 1, 0),
    },
    {
      pitcherId: 683518,
      pitcherName: "Giussepe Velásquez",
      opposingTeam: "Águilas del Zulia",
      ...calculateSlashLine(8, 7, 1, 0, 0, 0, 1, 2, 0, 0, 0),
    },
    {
      pitcherId: 669065,
      pitcherName: "Michael Gómez",
      opposingTeam: "Águilas del Zulia",
      ...calculateSlashLine(3, 3, 0, 0, 0, 0, 0, 1, 0, 0, 0),
    },
    {
      pitcherId: 663673,
      pitcherName: "Will Kincanon",
      opposingTeam: "Águilas del Zulia",
      ...calculateSlashLine(3, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0),
    },
    {
      pitcherId: 592229,
      pitcherName: "Dylan Covey",
      opposingTeam: "Águilas del Zulia",
      ...calculateSlashLine(3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    },
    {
      pitcherId: 683515,
      pitcherName: "José G. González",
      opposingTeam: "Águilas del Zulia",
      ...calculateSlashLine(5, 2, 0, 0, 0, 0, 3, 0, 0, 0, 0),
    },
  ],
};

// ── DATASET HISTÓRICO TEMPORADA 2024-2025 ──────────────────────────────
export const LEONES_SITUATIONAL_2025: SituationalData = {
  splits: [
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
      badge: "Tráfico",
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
  ],
  lobSummary: {
    totalPa: 2182,
    totalLobEnding: 412,
    totalRispLobEnding: 242,
    totalRispLobMid: 188,
    totalRispLob: 430,
  },
  lobBatterRanking: [
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
  ],
  bvpRecords: [
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
  ],
};

/**
 * Obtiene los splits situacionales y desglose LOB calibrados para la temporada solicitada de Leones del Caracas.
 * Por defecto retorna la temporada activa oficial (2026).
 */
export function getLeonesSituationalData(season: number = 2026): SituationalData {
  if (season === 2025) {
    return LEONES_SITUATIONAL_2025;
  }
  return LEONES_SITUATIONAL_2026;
}
