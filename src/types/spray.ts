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

export interface SprayPlayerOption {
  id: number;
  name: string;
  count?: number;
}

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

