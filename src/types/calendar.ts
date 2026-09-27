export interface CalendarGameResult {
  isCompleted: boolean;
  status: string; // "Final", "Completed", etc.
  homeScore: number;
  awayScore: number;
  caracasScore: number;
  opponentScore: number;
  won: boolean;
  innings?: number;
}

export interface CalendarGameEvent {
  uid: string;
  date: string; // "YYYY-MM-DD"
  dayOfWeek: number; // 0=Dom, 1=Lun, ..., 6=Sáb
  dayNumber: number; // 1-31
  month: number; // 1-12
  year: number; // 2026
  summary: string;
  isHome: boolean; // true = Blanco (Casa), false = Dorado (Visita)
  opponentId: number;
  opponentName: string;
  opponentAbbr: string;
  opponentLogo: string;
  stadiumName: string;
  city: string;
  timeDisplay: string; // "7:00 PM" o "Hora por confirmar"
  isTimePending: boolean;
  transmission: string; // "Televen", "IVC", "Por confirmar", etc.
  rawDescription?: string;
  result?: CalendarGameResult;
}

export interface MonthCalendarData {
  year: number;
  month: number; // 1-12
  monthName: string; // "Octubre", "Noviembre", "Diciembre"
  totalGames: number;
  homeGames: number;
  awayGames: number;
  events: CalendarGameEvent[];
}

export interface CalendarApiResponse {
  season: string; // "2026-2027"
  totalGames: number;
  homeGames: number;
  awayGames: number;
  months: MonthCalendarData[];
  events: CalendarGameEvent[];
  lastUpdated: string;
}
