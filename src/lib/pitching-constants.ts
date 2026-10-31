import { PitcherProfile } from "@/types/pitching";
import { getPlayerHeadshotUrl, getMlbFallbackHeadshotUrl } from "@/lib/constants";

export { getPlayerHeadshotUrl, getMlbFallbackHeadshotUrl };

export const CANONICAL_PITCH_COLORS: Record<string, { color: string; name: string }> = {
  FF: { color: "#FF007D", name: "4-Seam Fastball" },
  FA: { color: "#FF007D", name: "Fastball" },
  SI: { color: "#98165D", name: "Sinker" },
  FC: { color: "#BE5FA0", name: "Cutter" },
  CH: { color: "#F79E70", name: "Changeup" },
  FS: { color: "#FE6100", name: "Splitter" },
  SL: { color: "#67E18D", name: "Slider" },
  ST: { color: "#1BB999", name: "Sweeper" },
  SV: { color: "#376748", name: "Slurve" },
  KC: { color: "#311D8B", name: "Knuckle Curve" },
  CU: { color: "#3025CE", name: "Curveball" },
  CS: { color: "#274BFC", name: "Slow Curve" },
  KN: { color: "#867A08", name: "Knuckleball" },
  EP: { color: "#64748B", name: "Eephus" },
  UN: { color: "#9C8975", name: "Unknown" },
};

export function getPitchColor(pitchName: string, pitchType?: string): string {
  if (pitchType && CANONICAL_PITCH_COLORS[pitchType]) {
    return CANONICAL_PITCH_COLORS[pitchType].color;
  }
  const lower = pitchName.toLowerCase();
  if (lower.includes("4-seam") || lower.includes("four-seam")) return "#FF007D";
  if (lower.includes("sinker")) return "#98165D";
  if (lower.includes("cutter")) return "#BE5FA0";
  if (lower.includes("sweeper")) return "#1BB999";
  if (lower.includes("slider") || lower.includes("slurve")) return "#67E18D";
  if (lower.includes("changeup")) return "#F79E70";
  if (lower.includes("split")) return "#FE6100";
  if (lower.includes("knuckle curve")) return "#311D8B";
  if (lower.includes("curve")) return "#3025CE";
  if (lower.includes("fastball")) return "#FF007D";
  return "#9C8975";
}

export const DEFAULT_LEAGUE_PITCHING_CONSTANTS = {
  lvbp: { lgEra: 4.85, cFip: 3.45 },
  mlb: { lgEra: 4.15, cFip: 3.15 },
} as const;

export function parseIpToOuts(ip: string | number | null | undefined): number {
  if (ip === null || ip === undefined) return 0;
  const raw = String(ip).trim();
  if (!raw) return 0;
  const [wholeStr, remStr] = raw.split(".");
  const whole = parseInt(wholeStr, 10) || 0;
  const rem = parseInt(remStr || "0", 10) || 0;
  return whole * 3 + Math.min(2, Math.max(0, rem));
}

export function outsToIp(outs: number): string {
  const safe = Math.max(0, Math.round(outs));
  return `${Math.floor(safe / 3)}.${safe % 3}`;
}

/**
 * Tangotiger Game Score v2 (GSv2):
 * GSv2 = 40 + 2*Outs + 1*SO - 2*BB - 2*H - 3*ER - 6*HR
 */
export function computeGSv2(line: {
  outs: number;
  so: number;
  bb: number;
  h: number;
  er: number;
  hr: number;
}): number {
  return (
    40 +
    2 * (line.outs || 0) +
    1 * (line.so || 0) -
    2 * (line.bb || 0) -
    2 * (line.h || 0) -
    3 * (line.er || 0) -
    6 * (line.hr || 0)
  );
}

/**
 * Fielding Independent Pitching (FIP):
 * FIP = ((13*HR + 3*(BB + HBP) - 2*SO) / IP) + cFIP
 */
export function computeFIP(
  stats: { hr: number; bb: number; hbp: number; so: number; outs: number },
  cFip: number = DEFAULT_LEAGUE_PITCHING_CONSTANTS.lvbp.cFip
): number | null {
  if (!stats.outs || stats.outs <= 0) return null;
  const ip = stats.outs / 3;
  const raw = (13 * (stats.hr || 0) + 3 * ((stats.bb || 0) + (stats.hbp || 0)) - 2 * (stats.so || 0)) / ip;
  const val = raw + cFip;
  return Number.isFinite(val) ? Number(val.toFixed(2)) : null;
}

/**
 * ERA- ajustado al entorno ofensivo de la liga (100 = promedio liga; menor es mejor):
 * ERA- = round(100 * (ERA / lgERA))
 */
export function computeERAMinus(era: number | null | undefined, lgEra: number): number | null {
  if (era === null || era === undefined || !Number.isFinite(era) || lgEra <= 0) return null;
  return Math.round((era / lgEra) * 100);
}

/**
 * Left On Base Percentage (LOB%):
 * LOB% = ((H + BB + HBP - R) / (H + BB + HBP - 1.4 * HR)) * 100
 */
export function computeLOBPct(stats: {
  h: number;
  bb: number;
  hbp: number;
  r: number;
  hr: number;
}): number | null {
  const baserunners = (stats.h || 0) + (stats.bb || 0) + (stats.hbp || 0);
  if (baserunners <= 0) return null;
  const denom = baserunners - 1.4 * (stats.hr || 0);
  if (denom <= 0) return null;
  const pct = ((baserunners - (stats.r || 0)) / denom) * 100;
  if (!Number.isFinite(pct)) return null;
  return Number(Math.max(0, Math.min(100, pct)).toFixed(1));
}

/**
 * Batting Average on Balls In Play (BABIP):
 * BABIP = (H - HR) / (AB - SO - HR + SF)
 */
export function computeBABIP(stats: {
  h: number;
  hr: number;
  ab: number;
  so: number;
  sf?: number;
}): number | null {
  const denom = (stats.ab || 0) - (stats.so || 0) - (stats.hr || 0) + (stats.sf || 0);
  if (denom <= 0) return null;
  const num = Math.max(0, (stats.h || 0) - (stats.hr || 0));
  const val = num / denom;
  return Number.isFinite(val) ? Number(val.toFixed(3)) : null;
}

export interface MetricCellShade {
  bg: string;
  fg: string;
  border: string;
  tier: "elite" | "neutral" | "poor";
}

const SHADE_ELITE: MetricCellShade = {
  bg: "rgba(16, 185, 129, 0.14)",
  fg: "#065F46",
  border: "rgba(16, 185, 129, 0.35)",
  tier: "elite",
};

const SHADE_NEUTRAL: MetricCellShade = {
  bg: "#FFFFFF",
  fg: "#0F172A",
  border: "#CBD5E1",
  tier: "neutral",
};

const SHADE_POOR: MetricCellShade = {
  bg: "rgba(239, 68, 68, 0.12)",
  fg: "#991B1B",
  border: "rgba(239, 68, 68, 0.32)",
  tier: "poor",
};

/**
 * Sombreado semántico editorial para celdas KPI en Canvas y UI.
 */
export function getMetricCellShade(
  metric: string,
  value: number | null | undefined
): MetricCellShade {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return SHADE_NEUTRAL;
  }

  switch (metric) {
    case "cswPct":
      if (value >= 30) return SHADE_ELITE;
      if (value < 24) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "whiffPct":
      if (value >= 28) return SHADE_ELITE;
      if (value < 18) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "fStrikePct":
      if (value >= 62) return SHADE_ELITE;
      if (value < 54) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "swStrPct":
      if (value >= 12.5) return SHADE_ELITE;
      if (value < 8.0) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "putAwayPct":
      if (value >= 22) return SHADE_ELITE;
      if (value < 13) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "strikePct":
      if (value >= 65) return SHADE_ELITE;
      if (value < 58) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "kMinusBbPct":
      if (value >= 15) return SHADE_ELITE;
      if (value < 7) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "kPct":
      if (value >= 24) return SHADE_ELITE;
      if (value < 15) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "bbPct":
      if (value <= 7.0) return SHADE_ELITE;
      if (value >= 11.5) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "era":
      if (value <= 3.30) return SHADE_ELITE;
      if (value >= 4.90) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "whip":
      if (value <= 1.18) return SHADE_ELITE;
      if (value >= 1.50) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "fip":
      if (value <= 3.60) return SHADE_ELITE;
      if (value >= 4.80) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "eraMinus":
      if (value <= 90) return SHADE_ELITE;
      if (value >= 115) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "lobPct":
      if (value >= 76) return SHADE_ELITE;
      if (value < 66) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "babip":
      if (value <= 0.275) return SHADE_ELITE;
      if (value >= 0.335) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "wpa":
      if (value >= 0.06) return SHADE_ELITE;
      if (value <= -0.06) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "re24":
      if (value >= 0.5) return SHADE_ELITE;
      if (value <= -0.5) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "gsv2":
      if (value >= 60) return SHADE_ELITE;
      if (value < 45) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "gbPct":
      if (value >= 48) return SHADE_ELITE;
      if (value < 36) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "hardPct":
      if (value <= 28) return SHADE_ELITE;
      if (value >= 40) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "chasePct":
      if (value >= 31) return SHADE_ELITE;
      if (value < 24) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "zContactPct":
      if (value <= 81) return SHADE_ELITE;
      if (value >= 88) return SHADE_POOR;
      return SHADE_NEUTRAL;
    case "opsAgainst":
      if (value <= 0.660) return SHADE_ELITE;
      if (value >= 0.810) return SHADE_POOR;
      return SHADE_NEUTRAL;
    default:
      return SHADE_NEUTRAL;
  }
}

function makeFeaturedCaracasPitcher(
  p: Omit<PitcherProfile, "photoUrl" | "mlbPhotoUrl">
): PitcherProfile {
  return {
    ...p,
    photoUrl: getPlayerHeadshotUrl(p.id),
    mlbPhotoUrl: getMlbFallbackHeadshotUrl(p.id),
  };
}

export const CARACAS_FEATURED_PITCHERS: PitcherProfile[] = [
  makeFeaturedCaracasPitcher({
    id: 612797,
    name: "Erick Leal",
    position: "RHP",
    team: "Leones del Caracas",
    throws: "R",
    hasLvbpHistory: true,
    hasCaracasHistory: true,
    lvbpTeamId: 695,
    lvbpTeamName: "Leones del Caracas",
    lvbpTeamAbbr: "CAR",
    age: 31,
    height: "6' 3\"",
    weight: 180,
  }),
  makeFeaturedCaracasPitcher({
    id: 544150,
    name: "Albert Suárez",
    position: "RHP",
    team: "Baltimore Orioles / Leones",
    throws: "R",
    hasLvbpHistory: true,
    hasCaracasHistory: true,
    lvbpTeamId: 695,
    lvbpTeamName: "Leones del Caracas",
    lvbpTeamAbbr: "CAR",
    age: 35,
    height: "6' 3\"",
    weight: 235,
  }),
  makeFeaturedCaracasPitcher({
    id: 660508,
    name: "Norwith Gudiño",
    position: "RHP",
    team: "Leones del Caracas",
    throws: "R",
    hasLvbpHistory: true,
    hasCaracasHistory: true,
    lvbpTeamId: 695,
    lvbpTeamName: "Leones del Caracas",
    lvbpTeamAbbr: "CAR",
    age: 29,
    height: "6' 2\"",
    weight: 200,
  }),
  makeFeaturedCaracasPitcher({
    id: 468504,
    name: "Jhoulys Chacín",
    position: "RHP",
    team: "Leones del Caracas",
    throws: "R",
    hasLvbpHistory: true,
    hasCaracasHistory: true,
    lvbpTeamId: 695,
    lvbpTeamName: "Leones del Caracas",
    lvbpTeamAbbr: "CAR",
    age: 37,
    height: "6' 3\"",
    weight: 220,
  }),
  makeFeaturedCaracasPitcher({
    id: 600965,
    name: "Ricardo Rodríguez",
    position: "RHP",
    team: "Leones del Caracas",
    throws: "R",
    hasLvbpHistory: true,
    hasCaracasHistory: true,
    lvbpTeamId: 695,
    lvbpTeamName: "Leones del Caracas",
    lvbpTeamAbbr: "CAR",
    age: 33,
    height: "6' 2\"",
    weight: 215,
  }),
  makeFeaturedCaracasPitcher({
    id: 642570,
    name: "José Mujica",
    position: "RHP",
    team: "Leones del Caracas",
    throws: "R",
    hasLvbpHistory: true,
    hasCaracasHistory: true,
    lvbpTeamId: 695,
    lvbpTeamName: "Leones del Caracas",
    lvbpTeamAbbr: "CAR",
    age: 29,
    height: "6' 2\"",
    weight: 250,
  }),
  makeFeaturedCaracasPitcher({
    id: 646242,
    name: "Jhonathan Díaz",
    position: "LHP",
    team: "Leones del Caracas",
    throws: "L",
    hasLvbpHistory: true,
    hasCaracasHistory: true,
    lvbpTeamId: 695,
    lvbpTeamName: "Leones del Caracas",
    lvbpTeamAbbr: "CAR",
    age: 30,
    height: "6' 0\"",
    weight: 170,
  }),
  makeFeaturedCaracasPitcher({
    id: 672712,
    name: "Luis Palacios",
    position: "LHP",
    team: "Leones del Caracas",
    throws: "L",
    hasLvbpHistory: true,
    hasCaracasHistory: true,
    lvbpTeamId: 695,
    lvbpTeamName: "Leones del Caracas",
    lvbpTeamAbbr: "CAR",
    age: 26,
    height: "6' 2\"",
    weight: 160,
  }),
  makeFeaturedCaracasPitcher({
    id: 682845,
    name: "Rito Lugo",
    position: "LHP",
    team: "Leones del Caracas",
    throws: "L",
    hasLvbpHistory: true,
    hasCaracasHistory: true,
    lvbpTeamId: 695,
    lvbpTeamName: "Leones del Caracas",
    lvbpTeamAbbr: "CAR",
    age: 30,
    height: "5' 10\"",
    weight: 185,
  }),
  makeFeaturedCaracasPitcher({
    id: 600526,
    name: "José Torres",
    position: "LHP",
    team: "Leones del Caracas",
    throws: "L",
    hasLvbpHistory: true,
    hasCaracasHistory: true,
    lvbpTeamId: 695,
    lvbpTeamName: "Leones del Caracas",
    lvbpTeamAbbr: "CAR",
    age: 33,
    height: "6' 2\"",
    weight: 175,
  }),
];
