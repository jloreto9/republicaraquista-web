import { BattedBall } from "./spray";

export interface LVBPStadium {
  id: string;
  name: string;
  shortName: string;
  city: string;
  teamId: number;
  teamAbbr: string;
  teamName: string;
  teamLogo: string;
  lf: number; // pies en poste izquierdo
  lcf: number; // pies en callejón izquierdo
  cf: number; // pies en jardín central
  rcf: number; // pies en callejón derecho
  rf: number; // pies en poste derecho
  wallHeightFt: number; // altura aproximada de pared
  color: string; // color temático del equipo/estadio
  elevationMeters: number;
  isCanonical8: boolean; // Pertenece a las 8 franquicias oficiales
}

export interface StadiumCheck {
  stadium: LVBPStadium;
  isHr: boolean;
  fenceDistanceFt: number;
  marginFt: number; // Positivo si superó la barda, negativo si se quedó corto
}

export type DongClassification =
  | "no_doubter"
  | "mostly_gone"
  | "wall_scraper"
  | "unicorn"
  | "no_hr";

export interface WouldItDongResult {
  ball: BattedBall;
  angleDeg: number;
  distanceFt: number;
  totalParks: number;
  hrParksCount: number;
  classification: DongClassification;
  classificationLabel: string;
  classificationBadgeColor: string;
  checks: StadiumCheck[];
}
