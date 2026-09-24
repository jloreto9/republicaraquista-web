import { PitcherProfile } from "@/types/pitching";

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

export const CARACAS_FEATURED_PITCHERS: PitcherProfile[] = [
  {
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
    photoUrl: "https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current/w_213,q_auto:best/v1/people/544150/headshot/67/current",
    age: 35,
    height: "6' 3\"",
    weight: 235,
  },
  {
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
    photoUrl: "https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current/w_213,q_auto:best/v1/people/612797/headshot/67/current",
    age: 31,
    height: "6' 3\"",
    weight: 180,
  },
  {
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
    photoUrl: "https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current/w_213,q_auto:best/v1/people/660508/headshot/67/current",
    age: 29,
    height: "6' 2\"",
    weight: 200,
  },
  {
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
    photoUrl: "https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current/w_213,q_auto:best/v1/people/468504/headshot/67/current",
    age: 37,
    height: "6' 3\"",
    weight: 220,
  },
  {
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
    photoUrl: "https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current/w_213,q_auto:best/v1/people/600965/headshot/67/current",
    age: 33,
    height: "6' 2\"",
    weight: 215,
  },
  {
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
    photoUrl: "https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current/w_213,q_auto:best/v1/people/642570/headshot/67/current",
    age: 29,
    height: "6' 2\"",
    weight: 250,
  },
];
