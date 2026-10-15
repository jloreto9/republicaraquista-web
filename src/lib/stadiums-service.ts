import { BattedBall } from "@/types/spray";
import { LVBPStadium, WouldItDongResult, StadiumCheck, DongClassification } from "@/types/stadiums";
import { LVBP_TEAMS } from "./constants";

export const LVBP_STADIUMS: Record<string, LVBPStadium> = {
  monumental: {
    id: "monumental",
    name: "Estadio Monumental Simón Bolívar",
    shortName: "Monumental",
    city: "Caracas (La Rinconada)",
    teamId: 695,
    teamAbbr: "CAR",
    teamName: "Leones del Caracas",
    teamLogo: LVBP_TEAMS[695]?.logoUrl || "",
    lf: 338,
    lcf: 375,
    cf: 403,
    rcf: 375,
    rf: 338,
    wallHeightFt: 10,
    color: "#FDB827",
    elevationMeters: 950,
    isCanonical8: true,
  },
  universitario: {
    id: "universitario",
    name: "Estadio Universitario de Caracas",
    shortName: "Universitario UCV",
    city: "Caracas",
    teamId: 698,
    teamAbbr: "UCV",
    teamName: "Universitario (Tiburones / Leones)",
    teamLogo: LVBP_TEAMS[698]?.logoUrl || "",
    lf: 347,
    lcf: 385,
    cf: 407,
    rcf: 385,
    rf: 347,
    wallHeightFt: 8,
    color: "#0ea5e9",
    elevationMeters: 900,
    isCanonical8: false,
  },
  valencia: {
    id: "valencia",
    name: "Estadio José Bernardo Pérez",
    shortName: "Valencia",
    city: "Valencia",
    teamId: 696,
    teamAbbr: "MAG",
    teamName: "Navegantes del Magallanes",
    teamLogo: LVBP_TEAMS[696]?.logoUrl || "",
    lf: 347,
    lcf: 365,
    cf: 385,
    rcf: 365,
    rf: 347,
    wallHeightFt: 8,
    color: "#FFC72C",
    elevationMeters: 450,
    isCanonical8: true,
  },
  macuto: {
    id: "macuto",
    name: "Estadio Jorge Luis García Carneiro",
    shortName: "Forum La Guaira",
    city: "Macuto / La Guaira",
    teamId: 698,
    teamAbbr: "LAG",
    teamName: "Tiburones de La Guaira",
    teamLogo: LVBP_TEAMS[698]?.logoUrl || "",
    lf: 335,
    lcf: 370,
    cf: 395,
    rcf: 370,
    rf: 335,
    wallHeightFt: 8,
    color: "#D8252C",
    elevationMeters: 5,
    isCanonical8: true,
  },
  barquisimeto: {
    id: "barquisimeto",
    name: "Estadio Antonio Herrera Gutiérrez",
    shortName: "Barquisimeto",
    city: "Barquisimeto",
    teamId: 693,
    teamAbbr: "LAR",
    teamName: "Cardenales de Lara",
    teamLogo: LVBP_TEAMS[693]?.logoUrl || "",
    lf: 338,
    lcf: 375,
    cf: 407,
    rcf: 375,
    rf: 338,
    wallHeightFt: 8,
    color: "#BA0C2F",
    elevationMeters: 560,
    isCanonical8: true,
  },
  maracay: {
    id: "maracay",
    name: "Estadio José Pérez Colmenares",
    shortName: "Maracay",
    city: "Maracay",
    teamId: 699,
    teamAbbr: "ARA",
    teamName: "Tigres de Aragua",
    teamLogo: LVBP_TEAMS[699]?.logoUrl || "",
    lf: 335,
    lcf: 360,
    cf: 380,
    rcf: 360,
    rf: 335,
    wallHeightFt: 8,
    color: "#E31837",
    elevationMeters: 440,
    isCanonical8: true,
  },
  maracaibo: {
    id: "maracaibo",
    name: "Estadio Luis Aparicio 'El Grande'",
    shortName: "Maracaibo",
    city: "Maracaibo",
    teamId: 692,
    teamAbbr: "ZUL",
    teamName: "Águilas del Zulia",
    teamLogo: LVBP_TEAMS[692]?.logoUrl || "",
    lf: 348,
    lcf: 378,
    cf: 401,
    rcf: 378,
    rf: 348,
    wallHeightFt: 8,
    color: "#E05A10",
    elevationMeters: 15,
    isCanonical8: true,
  },
  plc: {
    id: "plc",
    name: "Estadio Alfonso 'Chico' Carrasquel",
    shortName: "Puerto La Cruz",
    city: "Puerto La Cruz",
    teamId: 694,
    teamAbbr: "ORI",
    teamName: "Caribes de Anzoátegui",
    teamLogo: LVBP_TEAMS[694]?.logoUrl || "",
    lf: 325,
    lcf: 360,
    cf: 380,
    rcf: 360,
    rf: 325,
    wallHeightFt: 10,
    color: "#FF6720",
    elevationMeters: 10,
    isCanonical8: true,
  },
  margarita: {
    id: "margarita",
    name: "Estadio Nueva Esparta",
    shortName: "Guatamare",
    city: "Porlamar",
    teamId: 697,
    teamAbbr: "MAR",
    teamName: "Bravos de Margarita",
    teamLogo: LVBP_TEAMS[697]?.logoUrl || "",
    lf: 335,
    lcf: 370,
    cf: 395,
    rcf: 370,
    rf: 335,
    wallHeightFt: 8,
    color: "#41748D",
    elevationMeters: 30,
    isCanonical8: true,
  },
};

/**
 * Retorna la lista de estadios ordenados según el modo seleccionado
 */
export function getStadiumsList(mode: "8-teams" | "9-stadiums" = "8-teams"): LVBPStadium[] {
  const all = Object.values(LVBP_STADIUMS);
  if (mode === "8-teams") {
    return all.filter((s) => s.isCanonical8);
  }
  return all;
}

/**
 * Calcula la distancia radial a la barda en pies para cualquier ángulo θ (-45° a +45°)
 */
export function getStadiumFenceDistance(stadium: LVBPStadium, angleDeg: number): number {
  const angle = Math.max(-45, Math.min(45, angleDeg));

  if (angle <= -22.5) {
    // Sector LF -> LCF (-45° a -22.5°)
    const t = (angle - -45) / 22.5;
    return stadium.lf + t * (stadium.lcf - stadium.lf);
  } else if (angle <= 0) {
    // Sector LCF -> CF (-22.5° a 0°)
    const t = (angle - -22.5) / 22.5;
    return stadium.lcf + t * (stadium.cf - stadium.lcf);
  } else if (angle <= 22.5) {
    // Sector CF -> RCF (0° a 22.5°)
    const t = angle / 22.5;
    return stadium.cf + t * (stadium.rcf - stadium.cf);
  } else {
    // Sector RCF -> RF (22.5° a 45°)
    const t = (angle - 22.5) / 22.5;
    return stadium.rcf + t * (stadium.rf - stadium.rcf);
  }
}

/**
 * Genera el arreglo de puntos SVG del arco del outfield para un estadio específico
 */
export function generateStadiumWallSvgPoints(
  stadium: LVBPStadium,
  toSvgX: (xFt: number) => number,
  toSvgY: (yFt: number) => number,
  steps: number = 60
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    // theta en radianes de -PI/4 a +PI/4
    const thetaRad = -Math.PI / 4 + (i / steps) * (Math.PI / 2);
    const angleDeg = (thetaRad * 180) / Math.PI;
    const rWall = getStadiumFenceDistance(stadium, angleDeg);

    const xFt = rWall * Math.sin(thetaRad);
    const yFt = rWall * Math.cos(thetaRad);

    points.push({ x: toSvgX(xFt), y: toSvgY(yFt) });
  }

  return points;
}

/**
 * Motor Evaluador Sabermétrico "Would It Dong?" (HR en X/8)
 */
export function evaluateWouldItDong(
  ball: BattedBall,
  mode: "8-teams" | "9-stadiums" = "8-teams"
): WouldItDongResult {
  const stadiums = getStadiumsList(mode);
  const angleDeg = ball.sprayAngle ?? 0;
  const distanceFt = ball.distanceFt ?? 0;
  const isFair = angleDeg >= -45 && angleDeg <= 45;

  const checks: StadiumCheck[] = stadiums.map((stadium) => {
    const fenceDistance = Math.round(getStadiumFenceDistance(stadium, angleDeg));
    const margin = Math.round(distanceFt - fenceDistance);
    
    // Si fue Home Run real, o si la distancia supera la barda en fair y no es rolling
    const isHr =
      isFair &&
      ball.trajectory !== "ground_ball" &&
      (ball.event === "Home Run" && margin >= -3 ? true : margin >= 0);

    return {
      stadium,
      isHr,
      fenceDistanceFt: fenceDistance,
      marginFt: margin,
    };
  });

  const hrParksCount = checks.filter((c) => c.isHr).length;
  const totalParks = stadiums.length;

  let classification: DongClassification = "no_hr";
  let classificationLabel = "Sin Jonrón";
  let classificationBadgeColor = "bg-slate-700/50 text-slate-400 border-slate-600";

  if (hrParksCount === totalParks) {
    classification = "no_doubter";
    classificationLabel = `No-Doubter (${hrParksCount}/${totalParks})`;
    classificationBadgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  } else if (hrParksCount >= Math.ceil(totalParks * 0.6)) {
    classification = "mostly_gone";
    classificationLabel = `Mayoría de Parques (${hrParksCount}/${totalParks})`;
    classificationBadgeColor = "bg-blue-500/20 text-blue-400 border-blue-500/40";
  } else if (hrParksCount >= 2) {
    classification = "wall_scraper";
    classificationLabel = `Wall Scraper (${hrParksCount}/${totalParks})`;
    classificationBadgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/40";
  } else if (hrParksCount === 1) {
    classification = "unicorn";
    classificationLabel = `Unicornio (${hrParksCount}/${totalParks})`;
    classificationBadgeColor = "bg-purple-500/20 text-purple-400 border-purple-500/40";
  } else {
    classification = "no_hr";
    classificationLabel = `0/${totalParks} Parques`;
    classificationBadgeColor = "bg-slate-800 text-slate-400 border-slate-700";
  }

  return {
    ball,
    angleDeg,
    distanceFt,
    totalParks,
    hrParksCount,
    classification,
    classificationLabel,
    classificationBadgeColor,
    checks,
  };
}
