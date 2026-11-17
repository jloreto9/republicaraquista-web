export type ParkFactorScope = "multi" | "2026" | "2025" | "2024";

export type ParkFactorMetricKey =
  | "r"
  | "hr"
  | "h"
  | "doubles"
  | "triples"
  | "bb"
  | "so";

export interface ParkMetricFactor {
  raw: number;
  stabilized: number;
  perGame: number;
  total: number;
}

export interface StadiumParkFactorRow {
  stadiumId: string;
  stadiumName: string;
  shortName: string;
  city: string;
  teamId: number;
  teamAbbr: string;
  teamName: string;
  teamLogo: string;
  color: string;
  elevationMeters: number;
  dimensions: {
    lf: number;
    lcf: number;
    cf: number;
    rcf: number;
    rf: number;
    wallHeightFt: number;
  };
  isCanonical8: boolean;
  runsGames: number;
  boxscoreGames: number;
  runsPerGame: number;
  metrics: {
    r: ParkMetricFactor;
    hr: ParkMetricFactor | null;
    h: ParkMetricFactor | null;
    doubles: ParkMetricFactor | null;
    triples: ParkMetricFactor | null;
    bb: ParkMetricFactor | null;
    so: ParkMetricFactor | null;
  };
}

export interface AlternateVenueNotice {
  stadiumId: string;
  stadiumName: string;
  games: number;
  runsPerGame: number;
}

export interface ParkFactorsResponse {
  scope: ParkFactorScope;
  scopeLabel: string;
  runsSeasons: number[];
  boxscoreSeasons: number[];
  totalRunsGames: number;
  totalBoxscoreGames: number;
  leagueRunsPerGame: number;
  priorWeight: number;
  hasEventFactors: boolean;
  stadiums: StadiumParkFactorRow[];
  alternateVenues: AlternateVenueNotice[];
  updatedAt: string;
}
