export interface BattedBall {
  gamePk: number;
  gameDate: string;
  batterId: number;
  batterName: string;
  pitcherId: number;
  pitcherName: string;
  event: string;
  eventGroup: "Single" | "Double" | "Triple" | "Home Run" | "Out" | "Field Error" | "Other";
  eventEs: string;
  isHit: boolean;
  description: string;
  rbi: number;
  coordX: number;
  coordY: number;
  xFt: number;
  yFt: number;
  distanceFt: number;
  sprayAngle: number;
  direction: "Pull" | "Center" | "Oppo";
  trajectory: "ground_ball" | "line_drive" | "fly_ball" | "popup" | "unknown";
  trajectoryEs: string;
  hardness: "hard" | "medium" | "soft" | "unknown";
  hardnessEs: string;
}

export interface SprayStats {
  totalBatted: number;
  totalHits: number;
  babip: string;
  hardPct: string;
  mediumPct: string;
  softPct: string;
  pullPct: string;
  centerPct: string;
  oppoPct: string;
  gbPct: string;
  ldPct: string;
  fbPct: string;
  puPct: string;
}

export interface PitchEvent {
  pitchNumber: number;
  callDesc: string;
  callGroup: "Whiff" | "Called Strike" | "Foul" | "In Play" | "Ball" | "Other";
  xFt: number;
  zFt: number;
  zone: number;
  isSwing: boolean;
  isWhiff: boolean;
  isContact: boolean;
  isCalledStrike: boolean;
  isBall: boolean;
  isStrike: boolean;
  inZone: boolean;
}

export interface StrikeZoneMetrics {
  totalPitches: number;
  zonePct: string;
  oSwingPct: string;
  zSwingPct: string;
  zContactPct: string;
  oContactPct: string;
  whiffPct: string;
  cswPct: string;
  swStrPct: string;
  zoneCounts: Record<number, number>; // 1-9 count
}
