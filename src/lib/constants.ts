import { Team } from "@/types/sports";

export const MLB_SPOT_BASE = "https://midfield.mlbstatic.com/v1/team";

export const LVBP_TEAMS: Record<number, Team> = {
  695: {
    id: 695,
    name: "Leones del Caracas",
    abbreviation: "CAR",
    primaryColor: "#002D62",
    secondaryColor: "#FDB827",
    logoUrl: `${MLB_SPOT_BASE}/695/spots/120`,
  },
  696: {
    id: 696,
    name: "Navegantes del Magallanes",
    abbreviation: "MAG",
    primaryColor: "#003876",
    secondaryColor: "#FFC72C",
    logoUrl: `${MLB_SPOT_BASE}/696/spots/120`,
  },
  698: {
    id: 698,
    name: "Tiburones de La Guaira",
    abbreviation: "LAG",
    primaryColor: "#002B49",
    secondaryColor: "#D8252C",
    logoUrl: `${MLB_SPOT_BASE}/698/spots/120`,
  },
  699: {
    id: 699,
    name: "Tigres de Aragua",
    abbreviation: "ARA",
    primaryColor: "#0C2340",
    secondaryColor: "#E31837",
    logoUrl: `${MLB_SPOT_BASE}/699/spots/120`,
  },
  693: {
    id: 693,
    name: "Cardenales de Lara",
    abbreviation: "LAR",
    primaryColor: "#BA0C2F",
    secondaryColor: "#000000",
    logoUrl: `${MLB_SPOT_BASE}/693/spots/120`,
  },
  692: {
    id: 692,
    name: "Águilas del Zulia",
    abbreviation: "ZUL",
    primaryColor: "#E05A10",
    secondaryColor: "#000000",
    logoUrl: `${MLB_SPOT_BASE}/692/spots/120`,
  },
  694: {
    id: 694,
    name: "Caribes de Anzoátegui",
    abbreviation: "ORI",
    primaryColor: "#002D62",
    secondaryColor: "#FF6720",
    logoUrl: `${MLB_SPOT_BASE}/694/spots/120`,
  },
  697: {
    id: 697,
    name: "Bravos de Margarita",
    abbreviation: "MAR",
    primaryColor: "#41748D",
    secondaryColor: "#000000",
    logoUrl: `${MLB_SPOT_BASE}/697/spots/120`,
  },
};

export const LVBP_TEAM_IDS = [695, 696, 698, 699, 693, 692, 694, 697];

export const AVAILABLE_SEASONS = [2025, 2024, 2023, 2022];

export const PHASE_NAMES: Record<string, string> = {
  regular: "Temporada Regular",
  round_robin: "Round Robin",
  final: "Serie Final",
  all: "Todas las Fases",
};

export function getTeam(teamId: number | string): Team {
  const id = typeof teamId === "string" ? parseInt(teamId, 10) : teamId;
  return (
    LVBP_TEAMS[id] || {
      id: id || 0,
      name: `Equipo ${id || ""}`,
      abbreviation: "LVBP",
      primaryColor: "#002D62",
      secondaryColor: "#FDB827",
      logoUrl: `${MLB_SPOT_BASE}/695/spots/120`,
    }
  );
}

export function getCurrentSeason(): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  // Temporada LVBP inicia en octubre
  return month >= 10 ? year : year - 1;
}

// Exponente sabermétrico canónico para béisbol profesional (Pythagorean)
export const PYTHAGOREAN_EXPONENT = 1.83;

export function calculatePythagorean(runsFor: number, runsAgainst: number): number {
  if (runsFor === 0 && runsAgainst === 0) return 0.5;
  const rfExp = Math.pow(runsFor, PYTHAGOREAN_EXPONENT);
  const raExp = Math.pow(runsAgainst, PYTHAGOREAN_EXPONENT);
  const total = rfExp + raExp;
  return total > 0 ? rfExp / total : 0.5;
}
