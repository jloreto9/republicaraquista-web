export interface LeonesAdvancedStats {
  // Condiciones Generales & Racha (Columna 1)
  totalGames: number;
  record: string;         // Ej: "17-20" o "28-28"
  homeRecord: string;     // Ej: "10-10"
  awayRecord: string;     // Ej: "7-10"
  nightRecord: string;    // Ej: "14-16"
  dayRecord: string;      // Ej: "3-4"
  shutouts: number;       // Blanqueos (ej: 1)
  streak: string;         // Ej: "1 L" o "3 W"
  extraInning: string;    // Ej: "2-1"
  last10: string;         // Ej: "5-5"

  // Situaciones de Presión & Decisiones (Columna 2)
  oneRun: string;         // Ej: "4-7"
  remontados: number;     // Victorias viniendo de atrás tras el 6to inning (ej: 4)
  up: string;             // Récord ganando tras el 6to inning (ej: 18-2)
  terreneadas: number;    // Walk-off wins en 9na o extras (ej: 2)
  starters: string;       // SP ganados-perdidos (ej: 8-12)
  relievers: string;      // RP ganados-perdidos (ej: 9-8)
  saves: number;          // Salvados totales (ej: 11)
  oct: string;            // Ej: "6G-6P"
  nov: string;            // Ej: "10G-14P"
  dec: string;            // Ej: "12G-8P"

  // Por Día de Semana (Columna 3)
  daysRecord: {
    lunes: string;        // Ej: "0G-0P"
    martes: string;       // Ej: "3G-2P"
    miercoles: string;    // Ej: "4G-3P"
    jueves: string;       // Ej: "2G-4P"
    viernes: string;      // Ej: "3G-3P"
    sabado: string;       // Ej: "2G-4P"
    domingo: string;      // Ej: "3G-4P"
  };
}

export interface WeeklyRecord {
  weekNum: number;
  semana: string;        // Ej: "Semana 1 (12/10 - 18/10)"
  juegos: number;
  w: number;
  l: number;
  pct: string;           // Ej: ".500"
  cf: number;            // Carreras a Favor
  cp: number;            // Carreras en Contra
  dif: string;           // Ej: "+5" o "-3"
  record: string;        // Ej: "3G-3P"
}

export interface GameMVP {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  wpaTotal: number;      // Ej: +0.285
  wpaBat: number;        // Ej: +0.210
  wpaPit: number;        // Ej: +0.075
  clutch: number;        // Ej: +0.142
  headline: string;      // Resumen narrativo
}

export interface LastGameDetail {
  id: number;
  gamePk: number;
  gameDate: string;
  gameDateFormatted: string;
  venue: string;
  homeTeamName: string;
  homeTeamAbbr: string;
  homeTeamLogo: string;
  homeScore: number;
  awayTeamName: string;
  awayTeamAbbr: string;
  awayTeamLogo: string;
  awayScore: number;
  isHomeLeones: boolean;
  leonesWon: boolean;
  mvp: GameMVP | null;
}

export interface TrendGameItem {
  id: number;
  fecha: string;         // Ej: "27/12"
  rivalId: number;
  rivalName: string;
  rivalAbbr: string;
  rivalLogo: string;
  isHome: boolean;
  score: string;         // Ej: "4-5"
  won: boolean;
}

export interface BatterLeaderItem {
  playerId: number;
  playerName: string;
  avatarUrl: string;
  avg: string;
  hr: number;
  rbi: number;
  ops: string;
  ab: number;
  h: number;
}

export interface PitcherLeaderItem {
  playerId: number;
  playerName: string;
  avatarUrl: string;
  era: string;
  whip: string;
  ip: string;
  so: number;
  bb: number;
}

export interface BroadcastChannelRecord {
  channelKey: string;      // Ej: "bym", "televen", "venevision"
  channelName: string;     // Ej: "ByM Sport", "Televen"
  logoUrl: string;         // Ej: "/assets/channels/bym.png"
  scheduledGames: number;  // Total de partidos asignados en el calendario (ej: 16)
  gamesPlayed: number;     // Partidos ya disputados
  wins: number;            // Victorias de Leones
  losses: number;          // Derrotas de Leones
  record: string;          // Ej: "0G-0P"
  pct: string;             // Ej: ".000"
}

export interface DashboardTabsData {
  advancedStats: LeonesAdvancedStats;
  weeklyRecords: WeeklyRecord[];
  lastGame: LastGameDetail | null;
  trends: TrendGameItem[];
  leaders: {
    batters: BatterLeaderItem[];
    pitchers: PitcherLeaderItem[];
  };
  channelRecords: BroadcastChannelRecord[];
}
