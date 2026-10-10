# Data Model: Splits Individuales Exhaustivos

**Identificador**: `individuales-splits`  
**Archivo de Tipos**: `src/types/player-splits.ts`  

---

## 1. Entidades y Modelos TypeScript

### 1.1 `PlayerSplitRow` (Fila Genérica de Split Ofensivo)
```typescript
export interface PlayerSplitRow {
  splitName: string;       // Ej: "En Casa (Home)", "vs RHP", "Con 2 Outs", "RISP"
  category: "context" | "situational" | "opponent" | "calendar" | "count";
  badge?: string;          // Ej: "Local", "Platoon", "Clutch"
  icon?: string;           // Ej: "home", "moon", "target"
  pa: number;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  hbp?: number;
  sf?: number;
  sb?: number;
  avg: string;             // Ej: ".325"
  obp: string;             // Ej: ".410"
  slg: string;             // Ej: ".580"
  ops: string;             // Ej: ".990"
  avgNum: number;
  opsNum: number;
}
```

### 1.2 `PitcherSplitRow` (Fila Genérica de Split de Pitcheo)
```typescript
export interface PitcherSplitRow {
  splitName: string;
  category: "context" | "situational" | "opponent" | "calendar";
  badge?: string;
  games: number;
  starts: number;
  ip: number;
  ipDisplay: string;       // Ej: "24.1"
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  era: string;             // Ej: "2.85"
  whip: string;            // Ej: "1.15"
  kPer9: string;           // Ej: "9.50"
  bbPer9: string;          // Ej: "2.80"
  baa: string;             // Batting Average Against (ej: ".220")
}
```

### 1.3 `PlayerSplitsProfile` (Perfil Consolidado de Splits del Jugador)
```typescript
export interface PlayerSplitsProfile {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  teamId: number;
  teamName: string;
  teamAbbr: string;
  teamLogo: string;
  type: "batter" | "pitcher";
  season: number;
  totalGames: number;
  
  // Grupos de Splits
  contextSplits: PlayerSplitRow[];      // Home/Away, Día/Noche, Victorias/Derrotas
  situationalSplits: PlayerSplitRow[];  // Bases Limpias, Hombres en Base, RISP, RISP 2-Outs, Bases Llenas
  platoonSplits: PlayerSplitRow[];      // vs RHP / vs LHP (o vs RHB / vs LHB)
  inningSplits: PlayerSplitRow[];       // Inicios (1-3), Medios (4-6), Tardíos (7-9+)
  opponentSplits: PlayerSplitRow[];     // vs los 7 rivales de la LVBP
  monthlySplits: PlayerSplitRow[];      // Octubre, Noviembre, Diciembre, Enero
  outsSplits: PlayerSplitRow[];         // 0 Outs, 1 Out, 2 Outs
  
  // Para lanzadores
  pitcherSplits?: PitcherSplitRow[];
}
```
