export interface BatterStreakItem {
  playerId: number;
  playerName: string;
  playerPhoto: string;
  position: string;
  streakType: "hitting" | "on_base" | "rbi" | "runs";
  streakLabel: string; // Ej: "Juegos con Hit", "Juegos Embasándose"
  streakLength: number; // Consecutivos
  statsSummary: string; // Ej: "10 H en 24 VB (.417)", "5 BB, .480 OBP"
  active: boolean;
  gamesList?: Array<{
    date: string;
    rival: string;
    stat: string;
  }>;
}

export interface PitcherStreakItem {
  playerId: number;
  playerName: string;
  playerPhoto: string;
  role: "Closer" | "Setup" | "Reliever" | "Starter";
  streakType: "scoreless_app" | "scoreless_ip" | "saves" | "strikeouts";
  streakLabel: string; // Ej: "Apariciones sin Carreras Limpias", "Salvados Consecutivos"
  streakLength: number; // Consecutivos
  statsSummary: string; // Ej: "5.1 IP • 7 K • 0.00 ERA", "4/4 Salvados"
  active: boolean;
  gamesList?: Array<{
    date: string;
    rival: string;
    stat: string;
  }>;
}

export interface TeamStreakItem {
  category: string; // "General", "Local", "Visitante", "vs Magallanes", etc.
  streak: string;   // "3 W", "2 L", "-"
  trend: "winning" | "losing" | "neutral";
  details: string;  // "Estadio Monumental", "Últimos 10 juegos", etc.
  count: number;
  lastResult?: {
    rival: string;
    rivalLogo?: string;
    score: string;
    won: boolean;
    date: string;
  };
}

export interface RachasTabData {
  teamStreaks: {
    general: TeamStreakItem;
    home: TeamStreakItem;
    away: TeamStreakItem;
    rivals: TeamStreakItem[];
  };
  hittingStreaks: BatterStreakItem[];
  onBaseStreaks: BatterStreakItem[];
  pitchingStreaks: PitcherStreakItem[];
  updatedAt: string;
}
