import {
  BattedBall,
  SprayStats,
  PitchEvent,
  StrikeZoneMetrics,
  SprayPlayerOption,
  EVENT_COLORS,
  TRAJECTORY_COLORS,
  HARDNESS_COLORS,
} from "@/types/spray";
import sprayDataRaw from "@/data/lvbp_spray_2025.json";

export { EVENT_COLORS, TRAJECTORY_COLORS, HARDNESS_COLORS };

export const EVENT_TRANSLATIONS: Record<string, string> = {
  Single: "Sencillo (1B)",
  Double: "Doble (2B)",
  Triple: "Triple (3B)",
  "Home Run": "Jonrón (HR)",
  Flyout: "Elevado de out",
  Groundout: "Rolling de out",
  Lineout: "Línea de out",
  "Pop Out": "Foul/Pop out",
  Forceout: "Out forzado",
  "Field Error": "Error de fildeo",
  "Sac Fly": "Elevado de sacrificio",
  "Sac Bunt": "Toque de sacrificio",
  "Double Play": "Doble Play",
  "Grounded Into DP": "Rolling para DP",
};

export function transformCoordinates(coordX: number, coordY: number): {
  xFt: number;
  yFt: number;
  distFt: number;
  angleDeg: number;
} {
  if (coordX == null || coordY == null) {
    return { xFt: 0, yFt: 0, distFt: 0, angleDeg: 0 };
  }
  // Coordenadas Gameday 250x250, home plate en (125, 204.5)
  const xFt = (coordX - 125.0) * 2.5;
  const yFt = (204.5 - coordY) * 2.5;
  const distFt = Math.sqrt(xFt * xFt + yFt * yFt);
  const angleDeg = (Math.atan2(xFt, yFt) * 180) / Math.PI;

  return {
    xFt: Math.round(xFt * 10) / 10,
    yFt: Math.round(yFt * 10) / 10,
    distFt: Math.round(distFt * 10) / 10,
    angleDeg: Math.round(angleDeg * 10) / 10,
  };
}

export function classifyDirection(angleDeg: number, batSide: string = "R"): "Pull" | "Center" | "Oppo" {
  const side = batSide.toUpperCase();
  if (side === "R") {
    if (angleDeg < -15.0) return "Pull";
    if (angleDeg > 15.0) return "Oppo";
    return "Center";
  } else {
    if (angleDeg > 15.0) return "Pull";
    if (angleDeg < -15.0) return "Oppo";
    return "Center";
  }
}

/**
 * Modelo determinístico BIS (Baseball Info Solutions) de dureza de contacto.
 * PROHIBICIÓN ESTRICTA: No utiliza Statcast ya que no existe en LVBP.
 */
export function classifyHardness(
  event: string,
  trajectory: string,
  distFt: number,
  rawHardness: string = "medium"
): "hard" | "medium" | "soft" {
  const ev = event || "Out";
  const traj = trajectory || "unknown";

  // 1. Extremos de poder indiscutibles
  if (ev === "Home Run" || ev === "Triple") return "hard";
  if (ev === "Double" && traj !== "popup") return "hard";
  if (rawHardness === "hard") return "hard";

  // 2. Contacto débil (Soft)
  if (traj === "popup" || traj.includes("bunt") || ev.includes("Bunt") || ev.includes("Pop Out")) {
    return "soft";
  }
  if (rawHardness === "soft") return "soft";
  if (traj === "fly_ball" && distFt < 185) return "soft";
  if (traj === "ground_ball" && distFt < 85 && ev.includes("out")) return "soft";

  // 3. Contacto fuerte (Hard)
  if (traj === "line_drive") {
    if (distFt >= 200 || ev === "Double" || ev === "Single" && distFt >= 150) return "hard";
  }
  if (traj === "fly_ball" && distFt >= 310) return "hard";
  if (traj === "ground_ball" && distFt >= 155) return "hard";

  return "medium";
}

export function convertPitchCoordinates(
  xRaw: number,
  yRaw: number,
  szTop: number = 3.4,
  szBot: number = 1.5
): { xFt: number; zFt: number; zone: number } {
  const xFt = Math.round((xRaw - 110.0) * (1.417 / 35.0) * 100) / 100;
  const zFt = Math.round((szBot + (szTop - szBot) * ((176.0 - yRaw) / 40.0)) * 100) / 100;

  // Determinar zona 1-9 dentro de la zona de strike
  let zone = 0;
  const inHoriz = xFt >= -0.71 && xFt <= 0.71;
  const inVert = zFt >= szBot && zFt <= szTop;

  if (inHoriz && inVert) {
    const col = xFt < -0.24 ? 0 : xFt < 0.24 ? 1 : 2;
    const rowHeight = (szTop - szBot) / 3;
    const row = zFt > szTop - rowHeight ? 0 : zFt > szTop - 2 * rowHeight ? 1 : 2;
    zone = row * 3 + col + 1;
  }

  return { xFt, zFt, zone };
}

/**
 * Obtiene los batazos reales de la temporada 2025 para el jugador indicado o para toda la ofensiva (id: 0).
 */
export function getPlayerBattedBalls(playerId: number): BattedBall[] {
  const allBalls = (sprayDataRaw.battedBalls || []) as BattedBall[];
  if (!playerId || playerId === 0) {
    return allBalls;
  }
  const filtered = allBalls.filter((b) => b.batterId === playerId);
  return filtered.length > 0 ? filtered : allBalls;
}

export function computeSprayStats(balls: BattedBall[]): SprayStats {
  if (!balls.length) {
    return {
      totalBatted: 0,
      totalHits: 0,
      babip: ".000",
      hardPct: "0.0%",
      mediumPct: "0.0%",
      softPct: "0.0%",
      pullPct: "0.0%",
      centerPct: "0.0%",
      oppoPct: "0.0%",
      gbPct: "0.0%",
      ldPct: "0.0%",
      fbPct: "0.0%",
      puPct: "0.0%",
    };
  }

  const total = balls.length;
  const hits = balls.filter((b) => b.isHit).length;
  const hr = balls.filter((b) => b.event === "Home Run").length;

  const abInPlay = total;
  const babipNum = abInPlay - hr > 0 ? (hits - hr) / (abInPlay - hr) : 0;

  const hard = balls.filter((b) => b.hardness === "hard").length;
  const medium = balls.filter((b) => b.hardness === "medium").length;
  const soft = balls.filter((b) => b.hardness === "soft").length;

  const pull = balls.filter((b) => b.direction === "Pull").length;
  const center = balls.filter((b) => b.direction === "Center").length;
  const oppo = balls.filter((b) => b.direction === "Oppo").length;

  const gb = balls.filter((b) => b.trajectory === "ground_ball").length;
  const ld = balls.filter((b) => b.trajectory === "line_drive").length;
  const fb = balls.filter((b) => b.trajectory === "fly_ball").length;
  const pu = balls.filter((b) => b.trajectory === "popup").length;

  return {
    totalBatted: total,
    totalHits: hits,
    babip: babipNum.toFixed(3).replace(/^0\./, "."),
    hardPct: `${((hard / total) * 100).toFixed(1)}%`,
    mediumPct: `${((medium / total) * 100).toFixed(1)}%`,
    softPct: `${((soft / total) * 100).toFixed(1)}%`,
    pullPct: `${((pull / total) * 100).toFixed(1)}%`,
    centerPct: `${((center / total) * 100).toFixed(1)}%`,
    oppoPct: `${((oppo / total) * 100).toFixed(1)}%`,
    gbPct: `${((gb / total) * 100).toFixed(1)}%`,
    ldPct: `${((ld / total) * 100).toFixed(1)}%`,
    fbPct: `${((fb / total) * 100).toFixed(1)}%`,
    puPct: `${((pu / total) * 100).toFixed(1)}%`,
  };
}

/**
 * Obtiene lanzamientos reales y métricas de disciplina en zona de strike para el bateador.
 */
export function getPlayerStrikeZoneData(playerId: number): {
  pitches: PitchEvent[];
  metrics: StrikeZoneMetrics;
} {
  const pitchesMap = sprayDataRaw.pitchesByBatter as Record<string, PitchEvent[]>;
  let playerPitches: PitchEvent[] = [];

  if (!playerId || playerId === 0) {
    const all = Object.values(pitchesMap).flat();
    playerPitches = all.slice(0, 300);
  } else {
    playerPitches = pitchesMap[String(playerId)] || [];
  }

  if (!playerPitches.length) {
    return {
      pitches: [],
      metrics: {
        totalPitches: 0,
        zonePct: "0.0%",
        oSwingPct: "0.0%",
        zSwingPct: "0.0%",
        zContactPct: "0.0%",
        oContactPct: "0.0%",
        whiffPct: "0.0%",
        cswPct: "0.0%",
        swStrPct: "0.0%",
        zoneCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      },
    };
  }

  const total = playerPitches.length;
  let inZoneCount = 0;
  let oSwing = 0;
  let oTotal = 0;
  let zSwing = 0;
  let zTotal = 0;
  let zContact = 0;
  let oContact = 0;
  let whiffs = 0;
  let calledStrikes = 0;
  let swings = 0;
  const zoneCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };

  for (const p of playerPitches) {
    if (p.zone >= 1 && p.zone <= 9) {
      zoneCounts[p.zone] = (zoneCounts[p.zone] || 0) + 1;
    }
    if (p.inZone) {
      inZoneCount++;
      zTotal++;
      if (p.isSwing) {
        swings++;
        zSwing++;
        if (p.isContact) zContact++;
      } else if (p.isCalledStrike) {
        calledStrikes++;
      }
    } else {
      oTotal++;
      if (p.isSwing) {
        swings++;
        oSwing++;
        if (p.isContact) oContact++;
      }
    }
    if (p.isWhiff) whiffs++;
  }

  const metrics: StrikeZoneMetrics = {
    totalPitches: total,
    zonePct: `${((inZoneCount / Math.max(1, total)) * 100).toFixed(1)}%`,
    oSwingPct: `${((oSwing / Math.max(1, oTotal)) * 100).toFixed(1)}%`,
    zSwingPct: `${((zSwing / Math.max(1, zTotal)) * 100).toFixed(1)}%`,
    zContactPct: `${((zContact / Math.max(1, zSwing)) * 100).toFixed(1)}%`,
    oContactPct: `${((oContact / Math.max(1, oSwing)) * 100).toFixed(1)}%`,
    whiffPct: `${((whiffs / Math.max(1, swings)) * 100).toFixed(1)}%`,
    cswPct: `${(((calledStrikes + whiffs) / Math.max(1, total)) * 100).toFixed(1)}%`,
    swStrPct: `${((whiffs / Math.max(1, total)) * 100).toFixed(1)}%`,
    zoneCounts,
  };

  return { pitches: playerPitches.slice(0, 250), metrics };
}

export const LEONES_SPRAY_PLAYERS: SprayPlayerOption[] =
  (sprayDataRaw.players as SprayPlayerOption[]) || [];

