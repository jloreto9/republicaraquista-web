# Data Model: Centro de Mando — Suite de Pestañas y Leones Stats

**Identificador**: `centro-mando-leones-stats`  
**Archivo de Tipos**: `src/types/leones-stats.ts`  

---

## 1. Entidades y Modelos TypeScript

### 1.1 `LeonesAdvancedStats` (Estadísticas de Situación)
Representa todas las métricas de la pantalla `🦁 Leones Stats` (como se observa en la captura del usuario):

```typescript
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
```

### 1.2 `WeeklyRecord` (Desglose Semana a Semana ISO)
Representa una fila de la tabla semanal de campeonato:

```typescript
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
```

### 1.3 `GameMVP` (⭐ MVP de Leones del Último Juego)
Representa la tarjeta de jugador más valioso por Win Probability Added:

```typescript
export interface GameMVP {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  wpaTotal: number;      // Ej: +0.285
  wpaBat: number;        // Ej: +0.210
  wpaPit: number;        // Ej: +0.075
  clutch: number;        // Ej: +0.142
  headline: string;      // Resumen narrativo del impacto
}
```

### 1.4 `LastGameDetail` (📅 Último Resultado Detallado)
```typescript
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
```

### 1.5 `TrendGameItem` (📈 Últimos 10 Juegos)
```typescript
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
```

### 1.6 `TeamLeaderItem` (🌟 Líderes del Equipo)
```typescript
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

### 1.7 `BroadcastChannelRecord` (📺 Récord por Canal de Transmisión)
Representa el rendimiento y seguimiento por cada televisora/plataforma lineal:

```typescript
export interface BroadcastChannelRecord {
  channelKey: string;      // Ej: "bym", "televen", "venevision"
  channelName: string;     // Ej: "ByM Sport", "Televen"
  logoUrl: string;         // Ej: "/assets/channels/bym.png"
  scheduledGames: number;  // Total de partidos asignados en la temporada (ej: 16)
  gamesPlayed: number;     // Partidos ya jugados
  wins: number;            // Victorias de Leones
  losses: number;          // Derrotas de Leones
  record: string;          // Ej: "0G-0P" o "10G-6P"
  pct: string;             // Ej: ".625" o ".000"
}
```

