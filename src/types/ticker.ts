export interface TickerGameTeam {
  id: number;
  name: string;
  abbreviation: string;
  score: number;
  isLeones: boolean;
  isWinner?: boolean;
}

export interface TickerGame {
  id: number;
  gamePk: number;
  gameDate: string;
  status: "Preview" | "Live" | "Final";
  statusLabel: string; // ej: "FINAL", "ALTA 6.ª", "HOY 7:00 PM"
  isLive: boolean;
  homeTeam: TickerGameTeam;
  awayTeam: TickerGameTeam;
  currentInning?: number;
  isTopInning?: boolean;
  venue?: string;
}

export interface TickerResponse {
  success: boolean;
  dateLabel: string; // ej: "Jornada de Hoy", "Resultados de Ayer"
  games: TickerGame[];
  lastUpdated: string;
}
