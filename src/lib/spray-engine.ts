import { BattedBall, SprayStats, PitchEvent, StrikeZoneMetrics } from "@/types/spray";

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

export const EVENT_COLORS: Record<string, string> = {
  Single: "#2ecc71",     // Verde
  Double: "#3498db",     // Azul
  Triple: "#f39c12",     // Naranja / Oro
  "Home Run": "#e74c3c", // Rojo
  Out: "#64748b",        // Pizarra / Gris
  "Field Error": "#a855f7", // Morado
  Other: "#94a3b8",
};

export const TRAJECTORY_COLORS: Record<string, string> = {
  ground_ball: "#eab308", // Amarillo
  line_drive: "#3b82f6",  // Azul cielo
  fly_ball: "#ec4899",    // Magenta
  popup: "#64748b",       // Gris
  unknown: "#94a3b8",
};

export const HARDNESS_COLORS: Record<string, string> = {
  hard: "#ef4444",   // Rojo intenso (Hard)
  medium: "#3b82f6", // Azul (Medium)
  soft: "#10b981",   // Verde (Soft)
  unknown: "#64748b",
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
 * Genera datos de muestra consistentes y calibrados de spray charts para un jugador de Leones.
 */
export function getPlayerBattedBalls(playerId: number): BattedBall[] {
  // Lista de bateadores con semillas de dispersión
  const isCedeño = playerId === 660821;
  const isBonaci = playerId === 683748;
  const isCorredor = playerId === 672580;
  const count = isCedeño ? 54 : isBonaci ? 78 : isCorredor ? 95 : 60;
  const playerName = isCedeño ? "Leandro Cedeño" : isBonaci ? "Brainer Bonaci" : isCorredor ? "Aldrem Corredor" : "Víctor Bericoto";
  const batSide = isCorredor ? "L" : "R";

  const balls: BattedBall[] = [];

  for (let i = 0; i < count; i++) {
    // Generar dispersión realista
    const isOut = i % 3 !== 0;
    let event = isOut ? (i % 2 === 0 ? "Groundout" : "Flyout") : (i % 6 === 0 ? "Home Run" : i % 4 === 0 ? "Double" : "Single");
    if (i === 12 && isCedeño) event = "Triple";

    let distFt: number;
    let angleDeg: number;

    if (event === "Home Run") {
      distFt = 370 + ((i * 17) % 55);
      angleDeg = batSide === "R" ? -35 + ((i * 9) % 45) : 10 + ((i * 9) % 35);
    } else if (event === "Double") {
      distFt = 280 + ((i * 13) % 60);
      angleDeg = -40 + ((i * 11) % 80);
    } else if (event === "Single") {
      distFt = 160 + ((i * 14) % 80);
      angleDeg = -35 + ((i * 15) % 70);
    } else if (event === "Flyout") {
      distFt = 240 + ((i * 12) % 80);
      angleDeg = -40 + ((i * 7) % 80);
    } else {
      // Groundout
      distFt = 70 + ((i * 9) % 65);
      angleDeg = batSide === "R" ? -40 + ((i * 6) % 35) : 5 + ((i * 6) % 35);
    }

    const rad = (angleDeg * Math.PI) / 180;
    const xFt = Math.round(distFt * Math.sin(rad) * 10) / 10;
    const yFt = Math.round(distFt * Math.cos(rad) * 10) / 10;

    // Convertir de vuelta a coordenadas Gameday (250x250)
    const coordX = Math.round((xFt / 2.5 + 125.0) * 10) / 10;
    const coordY = Math.round((204.5 - yFt / 2.5) * 10) / 10;

    const traj = event === "Home Run" || event === "Flyout" ? "fly_ball" : (event === "Double" || (event === "Single" && distFt > 190)) ? "line_drive" : "ground_ball";
    const hardness = classifyHardness(event, traj, distFt);
    const direction = classifyDirection(angleDeg, batSide);

    balls.push({
      gamePk: 829925 + (i % 10),
      gameDate: "2025-11-15",
      batterId: playerId,
      batterName: playerName,
      pitcherId: 666687,
      pitcherName: "Lanzador Rival",
      event,
      eventGroup: event === "Home Run" ? "Home Run" : event === "Double" ? "Double" : event === "Triple" ? "Triple" : event === "Single" ? "Single" : "Out",
      eventEs: EVENT_TRANSLATIONS[event] || event,
      isHit: ["Single", "Double", "Triple", "Home Run"].includes(event),
      description: `${event} de ${playerName} a ${distFt} ft`,
      rbi: event === "Home Run" ? 2 : event === "Double" ? 1 : 0,
      coordX,
      coordY,
      xFt,
      yFt,
      distanceFt: distFt,
      sprayAngle: angleDeg,
      direction,
      trajectory: traj,
      trajectoryEs: traj === "fly_ball" ? "Elevado (FB)" : traj === "line_drive" ? "Línea (LD)" : "Rolling (GB)",
      hardness,
      hardnessEs: hardness === "hard" ? "Fuerte (Hard)" : hardness === "medium" ? "Medio (Medium)" : "Suave (Soft)",
    });
  }

  return balls;
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
 * Genera lanzamientos y métricas de disciplina en zona de strike para el bateador.
 */
export function getPlayerStrikeZoneData(playerId: number): {
  pitches: PitchEvent[];
  metrics: StrikeZoneMetrics;
} {
  const isCedeño = playerId === 660821;
  const total = isCedeño ? 140 : 180;
  const pitches: PitchEvent[] = [];
  const zoneCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };

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

  for (let i = 0; i < total; i++) {
    // Generar coordenadas de pitch simuladas alrededor de home plate
    const inZone = i % 10 < 6; // 60% en zona
    let xFt: number;
    let zFt: number;

    if (inZone) {
      xFt = -0.65 + ((i * 13) % 130) / 100;
      zFt = 1.6 + ((i * 17) % 170) / 100;
    } else {
      xFt = -1.2 + ((i * 23) % 240) / 100;
      zFt = 1.0 + ((i * 29) % 280) / 100;
    }

    const { zone } = convertPitchCoordinates(xFt * (35.0 / 1.417) + 110.0, 176.0 - ((zFt - 1.5) / 1.9) * 40.0);
    if (zone >= 1 && zone <= 9) {
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    }

    let isSwing = false;
    let isWhiff = false;
    let isContact = false;
    let isCalledStrike = false;
    let isBall = false;

    if (inZone) {
      inZoneCount++;
      zTotal++;
      // 68% swing en zona
      if (i % 10 < 7) {
        isSwing = true;
        swings++;
        zSwing++;
        // 82% contact en zona
        if (i % 10 < 8) {
          isContact = true;
          zContact++;
        } else {
          isWhiff = true;
          whiffs++;
        }
      } else {
        isCalledStrike = true;
        calledStrikes++;
      }
    } else {
      oTotal++;
      // 28% chase (O-Swing) fuera de zona
      if (i % 10 < 3) {
        isSwing = true;
        swings++;
        oSwing++;
        // 50% contact fuera de zona
        if (i % 2 === 0) {
          isContact = true;
          oContact++;
        } else {
          isWhiff = true;
          whiffs++;
        }
      } else {
        isBall = true;
      }
    }

    let callGroup: "Whiff" | "Called Strike" | "Foul" | "In Play" | "Ball" | "Other" = "Ball";
    if (isWhiff) callGroup = "Whiff";
    else if (isCalledStrike) callGroup = "Called Strike";
    else if (isContact) callGroup = i % 2 === 0 ? "Foul" : "In Play";

    pitches.push({
      pitchNumber: i + 1,
      callDesc: callGroup,
      callGroup,
      xFt,
      zFt,
      zone,
      isSwing,
      isWhiff,
      isContact,
      isCalledStrike,
      isBall,
      isStrike: isCalledStrike || isSwing,
      inZone,
    });
  }

  const metrics: StrikeZoneMetrics = {
    totalPitches: total,
    zonePct: `${((inZoneCount / total) * 100).toFixed(1)}%`,
    oSwingPct: `${((oSwing / Math.max(1, oTotal)) * 100).toFixed(1)}%`,
    zSwingPct: `${((zSwing / Math.max(1, zTotal)) * 100).toFixed(1)}%`,
    zContactPct: `${((zContact / Math.max(1, zSwing)) * 100).toFixed(1)}%`,
    oContactPct: `${((oContact / Math.max(1, oSwing)) * 100).toFixed(1)}%`,
    whiffPct: `${((whiffs / Math.max(1, swings)) * 100).toFixed(1)}%`,
    cswPct: `${(((calledStrikes + whiffs) / total) * 100).toFixed(1)}%`,
    swStrPct: `${((whiffs / total) * 100).toFixed(1)}%`,
    zoneCounts,
  };

  return { pitches, metrics };
}

export const LEONES_SPRAY_PLAYERS = [
  { id: 660821, name: "Leandro Cedeño" },
  { id: 683748, name: "Brainer Bonaci" },
  { id: 672580, name: "Aldrem Corredor" },
  { id: 666971, name: "Víctor Bericoto" },
  { id: 660688, name: "Harold Castro" },
  { id: 682626, name: "Liván Soto" },
];
